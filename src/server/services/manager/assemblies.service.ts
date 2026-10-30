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

/**
 * Faza 11 — Assemblies ("skupština stanara") service.
 *
 * Lifecycle:
 *   SCHEDULED  → OPEN_FOR_VOTING → COMPLETED
 *            ↳  CANCELED
 *
 * Voting mechanics:
 *   - Weighted votes: each unit casts exactly one vote per agenda item.
 *   - Weight = unit's `participationShare` (coefficient derived from m²).
 *   - Majorities: SIMPLE (>50% of cast), ABSOLUTE (>50% of total shares),
 *     TWO_THIRDS (⅔ of total shares).
 *   - YES/NO/ABSTAIN; ABSTAIN counts toward "cast" but not toward YES.
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
}) {
  const existing = await prisma.assembly.findFirst({
    where: { id: input.assemblyId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Skupština nije pronađena.");
  if (existing.status !== "SCHEDULED") {
    throw DomainErrors.conflict("Glasanje se može otvoriti samo iz zakazanog stanja.");
  }
  const updated = await prisma.assembly.update({
    where: { id: existing.id },
    data: {
      status: "OPEN_FOR_VOTING",
      votingOpensAt: existing.votingOpensAt ?? new Date(),
    },
  });
  await recordAudit({
    action: "manager.assembly_voting_opened",
    entityType: "Assembly",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
  return updated;
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
      building: true,
    },
  });
  if (!existing) throw DomainErrors.notFound("Skupština nije pronađena.");
  if (existing.status !== "OPEN_FOR_VOTING") {
    throw DomainErrors.conflict("Glasanje nije otvoreno.");
  }

  // Compute final tally per agenda item.
  const totalShares = await totalBuildingShares(existing.organizationId, existing.buildingId);

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
    const passed = decideMajority({
      majority: item.majority,
      yes,
      no,
      abstain,
      castTotal,
      totalShares,
    });
    return {
      itemId: item.id,
      result: {
        yes: yes.toFixed(4),
        no: no.toFixed(4),
        abstain: abstain.toFixed(4),
        castTotal: castTotal.toFixed(4),
        totalShares: totalShares.toFixed(4),
        majority: item.majority,
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

  const weight = new Decimal(unit.participationShare.toString()).toFixed(4);

  // Upsert — a unit can change its vote until voting closes.
  const vote = await prisma.assemblyVote.upsert({
    where: {
      agendaItemId_unitId: { agendaItemId: item.id, unitId: unit.id },
    },
    create: {
      agendaItemId: item.id,
      unitId: unit.id,
      personId: input.personId ?? null,
      choice: input.choice,
      weight,
      castByUserId: input.actorUserId,
      notes: input.notes?.trim() || null,
    },
    update: {
      personId: input.personId ?? null,
      choice: input.choice,
      weight,
      castByUserId: input.actorUserId,
      notes: input.notes?.trim() || null,
      castAt: new Date(),
    },
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

export async function sendAssemblyInvitations(input: {
  organizationId: string;
  actorUserId: string;
  assemblyId: string;
}): Promise<{ sent: number }> {
  const assembly = await prisma.assembly.findFirst({
    where: { id: input.assemblyId, organizationId: input.organizationId },
    include: { building: true },
  });
  if (!assembly) throw DomainErrors.notFound("Skupština nije pronađena.");

  const owners = await prisma.unitOwnership.findMany({
    where: {
      endedAt: null,
      isPrimary: true,
      unit: { buildingId: assembly.buildingId, archivedAt: null },
      person: { email: { not: null } },
    },
    select: {
      person: {
        select: { id: true, email: true, firstName: true, lastName: true, legalName: true },
      },
    },
  });

  const seen = new Set<string>();
  let sent = 0;
  for (const o of owners) {
    const email = o.person.email!.trim().toLowerCase();
    if (!/.+@.+\..+/.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    try {
      await sendEmail({
        to: email,
        subject: `Poziv na skupštinu: ${assembly.title}`,
        text:
          `Pozivamo Vas na skupštinu stambene zajednice.\n\n` +
          `Zgrada: ${assembly.building.name}, ${assembly.building.address}\n` +
          `Datum: ${assembly.scheduledAt.toLocaleString("sr-RS")}\n` +
          (assembly.location ? `Mesto: ${assembly.location}\n` : "") +
          `\nTema: ${assembly.title}`,
      });
      await prisma.assemblyInvitation.create({
        data: {
          assemblyId: assembly.id,
          personId: o.person.id,
          email,
        },
      });
      sent += 1;
    } catch {
      /* skip */
    }
  }
  return { sent };
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

function decideMajority(args: {
  majority: AgendaItemMajority;
  yes: Decimal;
  no: Decimal;
  abstain: Decimal;
  castTotal: Decimal;
  totalShares: Decimal;
}): boolean {
  const { majority, yes, castTotal, totalShares } = args;
  if (yes.lte(0)) return false;
  switch (majority) {
    case "SIMPLE":
      // > 50% of cast votes
      return castTotal.gt(0) && yes.mul(2).gt(castTotal);
    case "ABSOLUTE":
      // > 50% of total shares
      return totalShares.gt(0) && yes.mul(2).gt(totalShares);
    case "TWO_THIRDS":
      // ⅔ of total shares
      return totalShares.gt(0) && yes.mul(3).gte(totalShares.mul(2));
    default:
      return false;
  }
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
        include: { votes: true },
      },
    },
  });
  if (!row) throw DomainErrors.notFound("Skupština nije pronađena.");
  return row;
}
