import "server-only";
import {
  Prisma,
  type AgendaItemMajority,
  type AgendaItemVoteKind,
  type AssemblyStatus,
  type AssemblyType,
  type AssemblyVoteChoice,
} from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertBuildingBelongsToOrg } from "@/server/services/manager/buildings.service";
import { sendEmail } from "@/server/auth/email";
import { appOrigin } from "@/server/http/app-origin";
import { decisionPassed, sharesMeetQuorum } from "@/server/services/manager/assembly-tally";
import { publishLinkedNotice } from "@/server/services/manager/notices.service";
import { logger } from "@/server/logger";
import type { AssemblyPresenceMode } from "@prisma/client";

/**
 * Faza 11 — Assemblies ("skupština stanara") service.
 *
 * Lifecycle:
 *   SCHEDULED  → OPEN_FOR_VOTING → COMPLETED
 *            ↳  CANCELED
 *
 * Voting mechanics:
 *   - One unit, one vote. Weight = `participationShare`.
 *   - Quorum: present share must be more than half of the building share.
 *     Without quorum, decisions and elections fail.
 *   - Majorities: SIMPLE (>50% of cast), ABSOLUTE (>50% of total shares),
 *     TWO_THIRDS (⅔ of total shares). INFORMATION items are not voted.
 *   - YES/NO/ABSTAIN; ABSTAIN counts toward "cast" but not toward YES.
 *   - A portal vote or a manager-recorded vote also marks the unit present.
 *
 * Minutes PDF: generated at `closeVoting` time from the final tally and
 * uploaded as a `Document` with category `ASSEMBLY`.
 */

// ---------------------------------------------------------------------------
// Assembly CRUD + state transitions
// ---------------------------------------------------------------------------

export interface CreateAssemblyInput {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  title: string;
  description?: string | null;
  type?: AssemblyType;
  scheduledAt: Date;
  votingOpensAt?: Date | null;
  votingClosesAt?: Date | null;
  location?: string | null;
  quorumNote?: string | null;
  agenda?: Array<{
    title: string;
    description?: string | null;
    voteKind?: AgendaItemVoteKind;
    majority?: AgendaItemMajority;
    sortOrder?: number;
  }>;
}

export async function createAssembly(input: CreateAssemblyInput) {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);

  const code = await nextAssemblyCode(input.organizationId);

  const assembly = await prisma.$transaction(async (tx) => {
    const row = await tx.assembly.create({
      data: {
        organizationId: input.organizationId,
        buildingId: input.buildingId,
        code,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        type: input.type ?? "REGULAR",
        status: "SCHEDULED",
        scheduledAt: input.scheduledAt,
        votingOpensAt: input.votingOpensAt ?? null,
        votingClosesAt: input.votingClosesAt ?? null,
        location: input.location?.trim() || null,
        quorumNote: input.quorumNote?.trim() || null,
      },
    });

    if (input.agenda && input.agenda.length > 0) {
      await tx.agendaItem.createMany({
        data: input.agenda.map((a, i) => ({
          assemblyId: row.id,
          sortOrder: a.sortOrder ?? i,
          title: a.title.trim(),
          description: a.description?.trim() || null,
          voteKind: a.voteKind ?? "DECISION",
          majority: a.majority ?? "SIMPLE",
        })),
      });
    }

    return row;
  });

  await recordAudit({
    action: "manager.assembly_created",
    entityType: "Assembly",
    entityId: assembly.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { code: assembly.code, title: assembly.title },
  });

  return assembly;
}

export async function updateAssembly(input: {
  organizationId: string;
  actorUserId: string;
  assemblyId: string;
  patch: Partial<
    Omit<CreateAssemblyInput, "organizationId" | "actorUserId" | "buildingId" | "agenda">
  >;
}) {
  const existing = await prisma.assembly.findFirst({
    where: { id: input.assemblyId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Skupština nije pronađena.");
  if (existing.status === "COMPLETED" || existing.status === "CANCELED") {
    throw DomainErrors.conflict("Zatvorena skupština se ne može menjati.");
  }

  const data: Prisma.AssemblyUpdateInput = {};
  if (input.patch.title !== undefined) data.title = input.patch.title.trim();
  if (input.patch.description !== undefined)
    data.description = input.patch.description?.trim() || null;
  if (input.patch.type !== undefined) data.type = input.patch.type;
  if (input.patch.scheduledAt !== undefined) data.scheduledAt = input.patch.scheduledAt;
  if (input.patch.votingOpensAt !== undefined)
    data.votingOpensAt = input.patch.votingOpensAt ?? null;
  if (input.patch.votingClosesAt !== undefined)
    data.votingClosesAt = input.patch.votingClosesAt ?? null;
  if (input.patch.location !== undefined) data.location = input.patch.location?.trim() || null;
  if (input.patch.quorumNote !== undefined)
    data.quorumNote = input.patch.quorumNote?.trim() || null;

  const updated = await prisma.assembly.update({
    where: { id: existing.id },
    data,
  });

  await recordAudit({
    action: "manager.assembly_updated",
    entityType: "Assembly",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: existing,
    newValues: updated,
  });

  return updated;
}

export async function openVoting(input: {
  organizationId: string;
  actorUserId: string;
  assemblyId: string;
  votingClosesAt?: Date | null;
}) {
  const existing = await prisma.assembly.findFirst({
    where: { id: input.assemblyId, organizationId: input.organizationId },
    include: {
      _count: { select: { items: true } },
      items: { orderBy: { sortOrder: "asc" }, select: { title: true } },
      building: { select: { name: true, address: true } },
    },
  });
  if (!existing) throw DomainErrors.notFound("Skupština nije pronađena.");
  if (existing.status !== "SCHEDULED") {
    throw DomainErrors.conflict("Glasanje se može otvoriti samo iz zakazanog stanja.");
  }
  if (existing._count.items === 0) {
    throw DomainErrors.badRequest("Skupština nema dnevni red.");
  }
  const closesAt = input.votingClosesAt ?? existing.votingClosesAt;
  if (closesAt && closesAt.getTime() <= Date.now()) {
    throw DomainErrors.badRequest("Rok glasanja mora biti u budućnosti.");
  }
  const updated = await prisma.assembly.update({
    where: { id: existing.id },
    data: {
      status: "OPEN_FOR_VOTING",
      votingOpensAt: existing.votingOpensAt ?? new Date(),
      votingClosesAt: closesAt,
    },
  });
  await recordAudit({
    action: "manager.assembly_voting_opened",
    entityType: "Assembly",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
  await publishAssemblyBoardNotice({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    assemblyId: existing.id,
    buildingId: existing.buildingId,
    originKey: `assembly:${existing.id}:invite`,
    title: `Skupština: ${existing.title}`,
    body: assemblyInviteBody({
      title: existing.title,
      buildingName: existing.building.name,
      address: existing.building.address,
      scheduledAt: existing.scheduledAt,
      location: existing.location,
      items: existing.items,
      assemblyId: existing.id,
      votingOpen: true,
    }),
  });
  return updated;
}

export async function cancelAssembly(input: {
  organizationId: string;
  actorUserId: string;
  assemblyId: string;
}) {
  const existing = await prisma.assembly.findFirst({
    where: { id: input.assemblyId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Skupština nije pronađena.");
  if (existing.status === "COMPLETED" || existing.status === "CANCELED") {
    throw DomainErrors.conflict("Zatvorena skupština se ne može otkazati.");
  }
  const updated = await prisma.assembly.update({
    where: { id: existing.id },
    data: { status: "CANCELED" },
  });
  await recordAudit({
    action: "manager.assembly_canceled",
    entityType: "Assembly",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
  return updated;
}

export async function addAgendaItem(input: {
  organizationId: string;
  actorUserId: string;
  assemblyId: string;
  title: string;
  description?: string | null;
  voteKind?: AgendaItemVoteKind;
  majority?: AgendaItemMajority;
}) {
  const assembly = await prisma.assembly.findFirst({
    where: { id: input.assemblyId, organizationId: input.organizationId },
    include: { items: { select: { sortOrder: true } } },
  });
  if (!assembly) throw DomainErrors.notFound("Skupština nije pronađena.");
  if (assembly.status !== "SCHEDULED") {
    throw DomainErrors.conflict("Dnevni red se menja samo dok je skupština zakazana.");
  }
  const title = input.title.trim();
  if (title.length < 2) throw DomainErrors.badRequest("Tačka dnevnog reda je prekratka.");
  const sortOrder = assembly.items.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
  const item = await prisma.agendaItem.create({
    data: {
      assemblyId: assembly.id,
      sortOrder,
      title,
      description: input.description?.trim() || null,
      voteKind: input.voteKind ?? "DECISION",
      majority: input.majority ?? "SIMPLE",
    },
  });
  await recordAudit({
    action: "manager.agenda_item_added",
    entityType: "Assembly",
    entityId: assembly.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { itemId: item.id, title: item.title },
  });
  return item;
}

export async function removeAgendaItem(input: {
  organizationId: string;
  actorUserId: string;
  assemblyId: string;
  itemId: string;
}) {
  const item = await prisma.agendaItem.findFirst({
    where: { id: input.itemId, assemblyId: input.assemblyId },
    include: {
      assembly: { select: { organizationId: true, status: true } },
      _count: { select: { votes: true } },
    },
  });
  if (!item || item.assembly.organizationId !== input.organizationId) {
    throw DomainErrors.notFound("Tačka dnevnog reda");
  }
  if (item.assembly.status !== "SCHEDULED" || item._count.votes > 0) {
    throw DomainErrors.conflict("Tačka se briše samo pre otvaranja glasanja.");
  }
  await prisma.agendaItem.delete({ where: { id: item.id } });
  await recordAudit({
    action: "manager.agenda_item_removed",
    entityType: "Assembly",
    entityId: input.assemblyId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: { itemId: item.id, title: item.title },
  });
}

export async function closeVoting(input: {
  organizationId: string;
  actorUserId: string;
  assemblyId: string;
}) {
  const existing = await prisma.assembly.findFirst({
    where: { id: input.assemblyId, organizationId: input.organizationId },
    include: {
      items: { include: { votes: true } },
      attendance: { select: { unitId: true } },
      building: true,
    },
  });
  if (!existing) throw DomainErrors.notFound("Skupština nije pronađena.");
  if (existing.status !== "OPEN_FOR_VOTING") {
    throw DomainErrors.conflict("Glasanje nije otvoreno.");
  }

  const totalShares = await totalBuildingShares(existing.organizationId, existing.buildingId);
  const presentIds = new Set(existing.attendance.map((row) => row.unitId));
  for (const item of existing.items) {
    for (const vote of item.votes) presentIds.add(vote.unitId);
  }
  const presentShares = await shareSumForUnits(existing.organizationId, [...presentIds]);
  const quorumMet = sharesMeetQuorum(presentShares, totalShares);

  const results = existing.items.map((item) => {
    let yes = new Decimal(0);
    let no = new Decimal(0);
    let abstain = new Decimal(0);
    for (const v of item.votes) {
      const w = new Decimal(v.weight.toString());
      if (v.choice === "YES") yes = yes.plus(w);
      else if (v.choice === "NO") no = no.plus(w);
      else abstain = abstain.plus(w);
    }
    const castTotal = yes.plus(no).plus(abstain);
    const passed = decisionPassed({
      voteKind: item.voteKind,
      majority: item.majority,
      yes,
      no,
      abstain,
      totalShares,
      quorumMet,
    });
    return {
      itemId: item.id,
      result: {
        yes: yes.toFixed(4),
        no: no.toFixed(4),
        abstain: abstain.toFixed(4),
        castTotal: castTotal.toFixed(4),
        totalShares: totalShares.toFixed(4),
        presentShares: presentShares.toFixed(4),
        majority: item.majority,
        quorumMet,
        informational: item.voteKind === "INFORMATION",
        passed,
      },
    };
  });

  const updated = await prisma.$transaction(async (tx) => {
    for (const r of results) {
      await tx.agendaItem.update({
        where: { id: r.itemId },
        data: { resultSummary: r.result as Prisma.InputJsonValue },
      });
    }
    return tx.assembly.update({
      where: { id: existing.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        presentShare: presentShares.toFixed(4),
        quorumMet,
      },
    });
  });

  await recordAudit({
    action: "manager.assembly_voting_closed",
    entityType: "Assembly",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { items: results.map((r) => r.result) },
  });

  const lines = existing.items.map((item, index) => {
    const result = results.find((row) => row.itemId === item.id)?.result;
    if (!result || result.informational || result.passed == null) {
      return `${index + 1}. ${item.title} — informacija`;
    }
    if (!result.quorumMet) return `${index + 1}. ${item.title} — nema kvoruma`;
    return `${index + 1}. ${item.title} — ${result.passed ? "usvojeno" : "nije usvojeno"}`;
  });
  await publishAssemblyBoardNotice({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    assemblyId: existing.id,
    buildingId: existing.buildingId,
    originKey: `assembly:${existing.id}:result`,
    title: `Rezultat skupštine: ${existing.title}`,
    channel: "PORTAL_AND_EMAIL",
    body:
      `Skupština je zatvorena. Kvorum: ${quorumMet ? "ispunjen" : "nije ispunjen"}.\n\n` +
      `${lines.join("\n")}\n\n` +
      `Detalj: ${appOrigin()}/stanar/glasanje/${existing.id}`,
  });

  return { assembly: updated, results };
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

export interface CastVoteInput {
  organizationId: string;
  actorUserId: string | null;
  agendaItemId: string;
  unitId: string;
  personId?: string | null;
  choice: AssemblyVoteChoice;
  notes?: string | null;
}

export async function castVote(input: CastVoteInput) {
  const item = await prisma.agendaItem.findFirst({
    where: { id: input.agendaItemId },
    include: {
      assembly: {
        select: {
          id: true,
          organizationId: true,
          buildingId: true,
          status: true,
          votingOpensAt: true,
          votingClosesAt: true,
        },
      },
    },
  });
  if (!item) throw DomainErrors.notFound("Tačka dnevnog reda nije pronađena.");
  if (item.assembly.organizationId !== input.organizationId) {
    throw DomainErrors.forbidden("Pristup odbijen.");
  }
  if (item.voteKind === "INFORMATION") {
    throw DomainErrors.conflict("Informativna tačka se ne glasa.");
  }
  if (item.assembly.status !== "OPEN_FOR_VOTING") {
    throw DomainErrors.conflict("Glasanje nije otvoreno.");
  }
  const now = new Date();
  if (item.assembly.votingOpensAt && now < item.assembly.votingOpensAt) {
    throw DomainErrors.conflict("Glasanje još nije započeto.");
  }
  if (item.assembly.votingClosesAt && now > item.assembly.votingClosesAt) {
    throw DomainErrors.conflict("Glasanje je zatvoreno.");
  }

  const unit = await prisma.managedUnit.findFirst({
    where: {
      id: input.unitId,
      organizationId: input.organizationId,
      buildingId: item.assembly.buildingId,
      archivedAt: null,
    },
    select: { id: true, participationShare: true },
  });
  if (!unit) throw DomainErrors.notFound("Posebni deo ne pripada ovoj zgradi.");

  let personId = input.personId ?? null;
  if (input.actorUserId === null) {
    if (!personId) throw DomainErrors.forbidden("Glas može dati samo vlasnik posebnog dela.");
    const ownership = await prisma.unitOwnership.findFirst({
      where: { unitId: unit.id, personId, endedAt: null, role: "OWNER" },
      select: { id: true },
    });
    if (!ownership) {
      throw DomainErrors.forbidden("Glas može dati samo vlasnik posebnog dela.");
    }
  } else if (!personId) {
    const primary = await prisma.unitOwnership.findFirst({
      where: { unitId: unit.id, endedAt: null, role: "OWNER", isPrimary: true },
      select: { personId: true },
    });
    personId = primary?.personId ?? null;
  }

  const weight = new Decimal(unit.participationShare.toString()).toFixed(4);
  const existingPresence = await prisma.assemblyAttendance.findUnique({
    where: { assemblyId_unitId: { assemblyId: item.assembly.id, unitId: unit.id } },
    select: { mode: true },
  });
  const mode: AssemblyPresenceMode =
    existingPresence?.mode === "PROXY" && input.actorUserId
      ? "PROXY"
      : input.actorUserId
        ? "IN_PERSON"
        : "ELECTRONIC";

  // Upsert — a unit can change its vote until voting closes.
  const vote = await prisma.$transaction(async (tx) => {
    const row = await tx.assemblyVote.upsert({
      where: {
        agendaItemId_unitId: { agendaItemId: item.id, unitId: unit.id },
      },
      create: {
        agendaItemId: item.id,
        unitId: unit.id,
        personId,
        choice: input.choice,
        weight,
        castByUserId: input.actorUserId,
        notes: input.notes?.trim() || null,
      },
      update: {
        personId,
        choice: input.choice,
        weight,
        castByUserId: input.actorUserId,
        notes: input.notes?.trim() || null,
        castAt: new Date(),
      },
    });
    await tx.assemblyAttendance.upsert({
      where: { assemblyId_unitId: { assemblyId: item.assembly.id, unitId: unit.id } },
      create: {
        assemblyId: item.assembly.id,
        unitId: unit.id,
        personId,
        mode,
        recordedByUserId: input.actorUserId,
      },
      update: {
        personId,
        mode,
        recordedByUserId: input.actorUserId,
        recordedAt: new Date(),
      },
    });
    return row;
  });

  await recordAudit({
    action: "manager.vote_cast",
    entityType: "AssemblyVote",
    entityId: vote.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? undefined,
    newValues: { choice: vote.choice, weight: vote.weight.toString() },
  });

  return vote;
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export async function markAttendance(input: {
  organizationId: string;
  actorUserId: string;
  assemblyId: string;
  unitId: string;
  mode: AssemblyPresenceMode;
  note?: string | null;
}) {
  const assembly = await prisma.assembly.findFirst({
    where: { id: input.assemblyId, organizationId: input.organizationId },
    select: { id: true, buildingId: true, status: true },
  });
  if (!assembly) throw DomainErrors.notFound("Skupština nije pronađena.");
  if (assembly.status !== "SCHEDULED" && assembly.status !== "OPEN_FOR_VOTING") {
    throw DomainErrors.conflict("Prisustvo se evidentira dok skupština nije zatvorena.");
  }
  const unit = await prisma.managedUnit.findFirst({
    where: {
      id: input.unitId,
      organizationId: input.organizationId,
      buildingId: assembly.buildingId,
      archivedAt: null,
    },
    select: { id: true },
  });
  if (!unit) throw DomainErrors.notFound("Posebni deo");
  const primary = await prisma.unitOwnership.findFirst({
    where: { unitId: unit.id, endedAt: null, role: "OWNER", isPrimary: true },
    select: { personId: true },
  });
  const row = await prisma.assemblyAttendance.upsert({
    where: { assemblyId_unitId: { assemblyId: assembly.id, unitId: unit.id } },
    create: {
      assemblyId: assembly.id,
      unitId: unit.id,
      personId: primary?.personId ?? null,
      mode: input.mode,
      note: input.note?.trim() || null,
      recordedByUserId: input.actorUserId,
    },
    update: {
      mode: input.mode,
      note: input.note?.trim() || null,
      recordedByUserId: input.actorUserId,
      recordedAt: new Date(),
    },
  });
  await recordAudit({
    action: "manager.assembly_attendance_recorded",
    entityType: "Assembly",
    entityId: assembly.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { unitId: unit.id, mode: input.mode },
  });
  return row;
}

export async function sendAssemblyInvitations(input: {
  organizationId: string;
  actorUserId: string;
  assemblyId: string;
}): Promise<{ sent: number; skipped: number }> {
  const assembly = await prisma.assembly.findFirst({
    where: { id: input.assemblyId, organizationId: input.organizationId },
    include: {
      building: true,
      items: { orderBy: { sortOrder: "asc" }, select: { title: true, voteKind: true } },
    },
  });
  if (!assembly) throw DomainErrors.notFound("Skupština nije pronađena.");
  if (assembly.status === "CANCELED" || assembly.status === "COMPLETED") {
    throw DomainErrors.conflict("Pozivnice se šalju samo za aktivnu skupštinu.");
  }

  const owners = await prisma.unitOwnership.findMany({
    where: {
      endedAt: null,
      role: "OWNER",
      unit: {
        buildingId: assembly.buildingId,
        organizationId: input.organizationId,
        archivedAt: null,
      },
    },
    select: {
      unit: { select: { code: true } },
      person: {
        select: { id: true, email: true, firstName: true, lastName: true, legalName: true },
      },
    },
  });

  const byEmail = new Map<string, { personIds: string[]; name: string; units: string[] }>();
  let skipped = 0;
  for (const owner of owners) {
    const email = owner.person.email?.trim().toLowerCase() ?? "";
    const name =
      owner.person.legalName ??
      ([owner.person.firstName, owner.person.lastName].filter(Boolean).join(" ") || "vlasniče");
    if (!/.+@.+\..+/.test(email)) {
      skipped += 1;
      continue;
    }
    const row = byEmail.get(email) ?? { personIds: [], name, units: [] };
    if (!row.personIds.includes(owner.person.id)) row.personIds.push(owner.person.id);
    if (!row.units.includes(owner.unit.code)) row.units.push(owner.unit.code);
    byEmail.set(email, row);
  }

  const agenda = assembly.items.map((item, index) => `${index + 1}. ${item.title}`).join("\n");
  const when = assembly.scheduledAt.toLocaleString("sr-RS", { timeZone: "Europe/Belgrade" });
  const link = `${appOrigin()}/stanar/glasanje/${assembly.id}`;
  let sent = 0;

  for (const [email, row] of byEmail) {
    try {
      await sendEmail({
        to: email,
        subject: `Poziv na skupštinu: ${assembly.title}`,
        text:
          `Poštovani ${row.name},\n\n` +
          `Pozivamo Vas na skupštinu stambene zajednice.\n\n` +
          `Zgrada: ${assembly.building.name}, ${assembly.building.address}\n` +
          `Datum: ${when}\n` +
          (assembly.location ? `Mesto: ${assembly.location}\n` : "") +
          `Vaši posebni delovi: ${row.units.join(", ")}\n\n` +
          `Dnevni red:\n${agenda || "(biće naknadno dopunjen)"}\n\n` +
          `Svaki posebni deo ima jedan glas, ponderisan učešćem. ` +
          `Glas možete dati na portalu: ${link}\n` +
          `Ako dolazite lično ili preko punomoćja, upravnik evidentira prisustvo.\n\n` +
          `Ovo je evidencija glasanja u PropertyDesk-u.\n\n` +
          `Srdačno,\nUpravnik zgrade`,
      });
      await prisma.assemblyInvitation.createMany({
        data: row.personIds.map((personId) => ({
          assemblyId: assembly.id,
          personId,
          email,
        })),
      });
      sent += 1;
    } catch {
      /* skip a single failed mailbox */
    }
  }
  await publishAssemblyBoardNotice({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    assemblyId: assembly.id,
    buildingId: assembly.buildingId,
    originKey: `assembly:${assembly.id}:invite`,
    title: `Skupština: ${assembly.title}`,
    body: assemblyInviteBody({
      title: assembly.title,
      buildingName: assembly.building.name,
      address: assembly.building.address,
      scheduledAt: assembly.scheduledAt,
      location: assembly.location,
      items: assembly.items,
      assemblyId: assembly.id,
      votingOpen: assembly.status === "OPEN_FOR_VOTING",
    }),
  });

  return { sent, skipped };
}

async function publishAssemblyBoardNotice(input: {
  organizationId: string;
  actorUserId: string;
  assemblyId: string;
  buildingId: string;
  originKey: string;
  title: string;
  body: string;
  channel?: "PORTAL_ONLY" | "PORTAL_AND_EMAIL";
}) {
  try {
    await publishLinkedNotice({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      buildingId: input.buildingId,
      title: input.title,
      body: input.body,
      channel: input.channel ?? "PORTAL_ONLY",
      audience: "ALL",
      assemblyId: input.assemblyId,
      originKey: input.originKey,
      publishNow: true,
    });
  } catch (err) {
    logger.warn("manager.assembly.notice_failed", {
      assemblyId: input.assemblyId,
      error: (err as Error)?.message,
    });
  }
}

function assemblyInviteBody(input: {
  title: string;
  buildingName: string;
  address: string;
  scheduledAt: Date;
  location: string | null;
  items: Array<{ title: string }>;
  assemblyId: string;
  votingOpen: boolean;
}): string {
  const when = input.scheduledAt.toLocaleString("sr-RS", { timeZone: "Europe/Belgrade" });
  const agenda = input.items.map((item, index) => `${index + 1}. ${item.title}`).join("\n");
  return (
    `Poziv na skupštinu „${input.title}”.\n` +
    `${input.buildingName}, ${input.address}\n` +
    `Datum: ${when}\n` +
    (input.location ? `Mesto: ${input.location}\n` : "") +
    (agenda ? `\nDnevni red:\n${agenda}\n` : "") +
    (input.votingOpen ? "\nGlasanje je otvoreno.\n" : "\nGlasanje još nije otvoreno.\n") +
    `\nDetalj: ${appOrigin()}/stanar/glasanje/${input.assemblyId}`
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function nextAssemblyCode(organizationId: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const count = await prisma.assembly.count({
    where: {
      organizationId,
      code: { startsWith: `SZ-${year}-` },
    },
  });
  return `SZ-${year}-${String(count + 1).padStart(2, "0")}`;
}

async function totalBuildingShares(organizationId: string, buildingId: string): Promise<Decimal> {
  const agg = await prisma.managedUnit.aggregate({
    where: { organizationId, buildingId, archivedAt: null },
    _sum: { participationShare: true },
  });
  return new Decimal(agg._sum.participationShare?.toString() ?? "0");
}

async function shareSumForUnits(organizationId: string, unitIds: string[]): Promise<Decimal> {
  if (unitIds.length === 0) return new Decimal(0);
  const agg = await prisma.managedUnit.aggregate({
    where: { organizationId, id: { in: unitIds }, archivedAt: null },
    _sum: { participationShare: true },
  });
  return new Decimal(agg._sum.participationShare?.toString() ?? "0");
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listAssemblies(input: { organizationId: string; buildingId?: string }) {
  return prisma.assembly.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.buildingId ? { buildingId: input.buildingId } : {}),
    },
    include: {
      building: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ scheduledAt: "desc" }],
  });
}

export async function getAssembly(organizationId: string, assemblyId: string) {
  const row = await prisma.assembly.findFirst({
    where: { id: assemblyId, organizationId },
    include: {
      building: true,
      items: {
        orderBy: { sortOrder: "asc" },
        include: { votes: { include: { unit: { select: { id: true, code: true } } } } },
      },
      attendance: {
        orderBy: { recordedAt: "asc" },
        include: { unit: { select: { id: true, code: true, participationShare: true } } },
      },
      invitations: { orderBy: { sentAt: "desc" }, take: 100 },
      notices: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, publishedAt: true },
      },
    },
  });
  if (!row) throw DomainErrors.notFound("Skupština nije pronađena.");
  return row;
}
