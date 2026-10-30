import "server-only";
import type {
  BuildingHandoverStatus,
  ManagedPersonRole,
  ManagedUnitType,
  Prisma,
  SaleStatus,
  UnitType,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertQuota } from "@/server/services/quotas.service";
import { sendEmail } from "@/server/auth/email";
import { appOrigin } from "@/server/http/app-origin";

/**
 * Faza 11 — Handover of a project/building from an INVESTOR organization
 * to a MANAGER organization.
 *
 * Lifecycle:
 *   PENDING  (requested by investor)
 *   ACCEPTED (manager clicked "Prihvati" → structure + owners copied)
 *   REJECTED (manager declined)
 *   CANCELED (investor withdrew while still PENDING)
 *
 * Data boundaries:
 *   - On ACCEPT we COPY (never share) `Unit` → `ManagedUnit` and
 *     `Buyer`/`Reservation.buyer` → `BuildingPerson` + `UnitOwnership`.
 *   - **JMBG / identityNumber / taxId are NEVER copied** (ZZPL — data
 *     minimization). The manager only gets the fields they need to send
 *     uplatnicas and host assemblies: name, email, phone, address.
 *   - Only `Sale` rows in `PAID` or `HANDED_OVER` seed ownership; others
 *     stay with the investor and can be handed over later.
 *   - Each copied `ManagedUnit` keeps `sourceUnitId` so an investor can
 *     see "this unit now lives at manager X" without any shared tables.
 *
 * The copy runs in a single transaction so partial handovers are
 * impossible. Audit is recorded outside the tx (`recordAudit` is not
 * transactional in this codebase).
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

const COPY_SALE_STATUSES: SaleStatus[] = ["PAID", "HANDED_OVER"];

const UNIT_TYPE_MAP: Record<UnitType, ManagedUnitType> = {
  APARTMENT: "APARTMENT",
  GARAGE: "GARAGE",
  PARKING_SPACE: "PARKING_SPACE",
  STORAGE: "STORAGE",
  COMMERCIAL: "COMMERCIAL",
  HOUSE: "OTHER", // Managed buildings don't track houses as a type.
  OTHER: "OTHER",
};

export interface CreateHandoverRequestInput {
  sourceOrganizationId: string;
  sourceProjectId: string;
  actorUserId: string;
  // Either targetOrganizationId OR targetContactEmail must be provided.
  targetOrganizationId?: string | null;
  targetContactEmail: string;
  targetContactName?: string | null;
  targetTaxNumber?: string | null;
  notes?: string | null;
}

export interface AcceptHandoverInput {
  targetOrganizationId: string;
  actorUserId: string;
  requestId: string;
  // Manager chooses which existing managed building to populate,
  // or null to create a new one from the project.
  targetBuildingId?: string | null;
  newBuildingName?: string | null;
  newBuildingAddress?: string | null;
  newBuildingCity?: string | null;
}

export interface HandoverSummary {
  projectName: string;
  projectCode: string;
  eligibleUnitCount: number;
  totalUnitCount: number;
  ownersPreview: Array<{ unitCode: string; buyerName: string }>;
}

// -----------------------------------------------------------------------------
// Summary (what will be copied) — used for both the request panel and the
// accept confirmation.
// -----------------------------------------------------------------------------

export async function buildHandoverSummary(
  sourceOrganizationId: string,
  sourceProjectId: string,
): Promise<HandoverSummary> {
  const project = await prisma.project.findFirst({
    where: { id: sourceProjectId, organizationId: sourceOrganizationId },
    select: {
      name: true,
      code: true,
      _count: { select: { units: true } },
    },
  });
  if (!project) throw DomainErrors.notFound("Projekat");

  const eligibleSales = await prisma.sale.findMany({
    where: {
      organizationId: sourceOrganizationId,
      projectId: sourceProjectId,
      status: { in: COPY_SALE_STATUSES },
    },
    select: {
      unit: { select: { code: true } },
      buyer: { select: { firstName: true, lastName: true, legalName: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const previewMap = new Map<string, { unitCode: string; buyerName: string }>();
  for (const s of eligibleSales) {
    if (previewMap.has(s.unit.code)) continue;
    previewMap.set(s.unit.code, {
      unitCode: s.unit.code,
      buyerName:
        s.buyer.legalName ??
        ([s.buyer.firstName, s.buyer.lastName].filter(Boolean).join(" ") || "—"),
    });
  }

  return {
    projectName: project.name,
    projectCode: project.code,
    eligibleUnitCount: previewMap.size,
    totalUnitCount: project._count.units,
    ownersPreview: Array.from(previewMap.values()).slice(0, 10),
  };
}

// -----------------------------------------------------------------------------
// Requests — investor side
// -----------------------------------------------------------------------------

export async function createHandoverRequest(input: CreateHandoverRequestInput) {
  const email = input.targetContactEmail.trim().toLowerCase();
  if (!email || !email.includes("@"))
    throw DomainErrors.validation("Email upravnika nije ispravan.");

  const project = await prisma.project.findFirst({
    where: { id: input.sourceProjectId, organizationId: input.sourceOrganizationId },
    select: { id: true, name: true, code: true },
  });
  if (!project) throw DomainErrors.notFound("Projekat");

  // Prevent duplicate active request for same project.
  const existing = await prisma.buildingHandoverRequest.findFirst({
    where: {
      sourceProjectId: project.id,
      status: { in: ["PENDING"] },
    },
  });
  if (existing) throw DomainErrors.conflict("Već postoji aktivan zahtev za predaju ovog projekta.");

  // If targetOrganizationId is provided, verify it exists and is MANAGER.
  if (input.targetOrganizationId) {
    const target = await prisma.organization.findFirst({
      where: { id: input.targetOrganizationId },
      select: { id: true, profile: { select: { type: true, status: true } } },
    });
    if (!target) throw DomainErrors.notFound("Upravnička organizacija");
    if (target.profile?.type !== "MANAGER")
      throw DomainErrors.validation("Odabrana organizacija nije upravnik.");
    if (target.profile?.status !== "ACTIVE")
      throw DomainErrors.validation("Upravnička organizacija nije aktivna.");
  }

  const summary = await buildHandoverSummary(input.sourceOrganizationId, project.id);

  const created = await prisma.buildingHandoverRequest.create({
    data: {
      sourceOrganizationId: input.sourceOrganizationId,
      sourceProjectId: project.id,
      targetOrganizationId: input.targetOrganizationId ?? null,
      targetContactEmail: email,
      targetContactName: input.targetContactName ?? null,
      targetTaxNumber: input.targetTaxNumber ?? null,
      summary: summary as unknown as Prisma.InputJsonValue,
      status: "PENDING",
      initiatedByUserId: input.actorUserId,
      initiatedAt: new Date(),
      notes: input.notes ?? null,
    },
  });

  await recordAudit({
    action: "manager.handover_requested",
    entityType: "BuildingHandoverRequest",
    entityId: created.id,
    organizationId: input.sourceOrganizationId,
    actorUserId: input.actorUserId,
    newValues: {
      projectCode: project.code,
      projectName: project.name,
      targetEmail: email,
    },
  });

  // Best-effort notification. If the target org exists we can also show it
  // in-app, but email is the common denominator.
  const acceptUrl = `${appOrigin()}/zgrade/predaje/${created.id}`;
  await sendEmail({
    to: email,
    subject: `PropertyDesk — predaja zgrade: ${project.name}`,
    text: [
      `Investitor je pokrenuo predaju projekta "${project.name}" (${project.code}) na upravljanje.`,
      ``,
      `Pregledajte šta se predaje i prihvatite (ili odbijte) zahtev u panelu upravnika:`,
      acceptUrl,
      ``,
      `Posle prihvatanja, struktura i vlasnici se kopiraju u Vašu organizaciju. Nema deljenja baze posle prenosa.`,
    ].join("\n"),
    html: `
      <p>Investitor je pokrenuo predaju projekta <strong>${escapeHtml(project.name)}</strong> (${escapeHtml(project.code)}) na upravljanje.</p>
      <p>Pregledajte šta se predaje i prihvatite (ili odbijte) zahtev u panelu upravnika:</p>
      <p><a href="${acceptUrl}">${acceptUrl}</a></p>
      <p>Posle prihvatanja, struktura i vlasnici se kopiraju u Vašu organizaciju. Nema deljenja baze posle prenosa.</p>
    `.trim(),
  }).catch(() => undefined);

  return created;
}

export async function cancelHandoverRequest(input: {
  sourceOrganizationId: string;
  actorUserId: string;
  requestId: string;
  reason?: string | null;
}) {
  const row = await prisma.buildingHandoverRequest.findFirst({
    where: { id: input.requestId, sourceOrganizationId: input.sourceOrganizationId },
  });
  if (!row) throw DomainErrors.notFound("Zahtev za predaju");
  if (row.status !== "PENDING")
    throw DomainErrors.conflict("Zahtev više nije u statusu na čekanju.");

  const updated = await prisma.buildingHandoverRequest.update({
    where: { id: row.id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      notes: input.reason ? `${row.notes ?? ""}\n[cancel] ${input.reason}`.trim() : row.notes,
    },
  });

  await recordAudit({
    action: "manager.handover_canceled",
    entityType: "BuildingHandoverRequest",
    entityId: row.id,
    organizationId: input.sourceOrganizationId,
    actorUserId: input.actorUserId,
    previousValues: { status: row.status },
    newValues: { status: updated.status, reason: input.reason ?? null },
  });

  return updated;
}

// -----------------------------------------------------------------------------
// Listing — both sides
// -----------------------------------------------------------------------------

export async function listSourceHandovers(input: {
  sourceOrganizationId: string;
  status?: BuildingHandoverStatus;
}) {
  return prisma.buildingHandoverRequest.findMany({
    where: {
      sourceOrganizationId: input.sourceOrganizationId,
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      sourceProject: { select: { id: true, name: true, code: true } },
      targetOrganization: { select: { id: true, name: true } },
      targetBuilding: { select: { id: true, name: true } },
    },
  });
}

export async function listTargetHandovers(input: {
  targetOrganizationId: string;
  targetContactEmail?: string | null;
  status?: BuildingHandoverStatus;
}) {
  return prisma.buildingHandoverRequest.findMany({
    where: {
      OR: [
        { targetOrganizationId: input.targetOrganizationId },
        ...(input.targetContactEmail
          ? [{ targetContactEmail: input.targetContactEmail.toLowerCase() }]
          : []),
      ],
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      sourceOrganization: { select: { id: true, name: true } },
      sourceProject: { select: { id: true, name: true, code: true } },
      targetBuilding: { select: { id: true, name: true } },
    },
  });
}

export async function getHandoverRequestForTarget(input: {
  targetOrganizationId: string;
  requestId: string;
}) {
  const row = await prisma.buildingHandoverRequest.findFirst({
    where: {
      id: input.requestId,
      OR: [
        { targetOrganizationId: input.targetOrganizationId },
        { targetOrganizationId: null }, // not yet linked, allow MANAGER to see it
      ],
    },
    include: {
      sourceOrganization: { select: { id: true, name: true } },
      sourceProject: {
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          address: true,
          _count: { select: { units: true } },
        },
      },
      targetBuilding: { select: { id: true, name: true } },
    },
  });
  if (!row) throw DomainErrors.notFound("Zahtev za predaju");
  return row;
}

// -----------------------------------------------------------------------------
// Reject
// -----------------------------------------------------------------------------

export async function rejectHandoverRequest(input: {
  targetOrganizationId: string;
  actorUserId: string;
  requestId: string;
  reason?: string | null;
}) {
  const row = await prisma.buildingHandoverRequest.findFirst({
    where: { id: input.requestId },
  });
  if (!row) throw DomainErrors.notFound("Zahtev za predaju");
  if (row.status !== "PENDING")
    throw DomainErrors.conflict("Zahtev više nije u statusu na čekanju.");
  // Allow reject if targetOrganization matches OR if request is unassigned
  // and the caller's org is MANAGER (email match is enforced by caller).
  if (row.targetOrganizationId && row.targetOrganizationId !== input.targetOrganizationId)
    throw DomainErrors.forbidden("Zahtev nije namenjen vašoj organizaciji.");

  const updated = await prisma.buildingHandoverRequest.update({
    where: { id: row.id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectedByUserId: input.actorUserId,
      rejectedReason: input.reason ?? null,
      targetOrganizationId: input.targetOrganizationId,
    },
  });

  await recordAudit({
    action: "manager.handover_rejected",
    entityType: "BuildingHandoverRequest",
    entityId: row.id,
    organizationId: input.targetOrganizationId,
    actorUserId: input.actorUserId,
    previousValues: { status: row.status },
    newValues: { status: updated.status, reason: input.reason ?? null },
  });

  return updated;
}

// -----------------------------------------------------------------------------
// Accept — the big one. One transaction, no partial copy, no JMBG.
// -----------------------------------------------------------------------------

export async function acceptHandoverRequest(input: AcceptHandoverInput) {
  const req = await prisma.buildingHandoverRequest.findFirst({
    where: { id: input.requestId },
    include: {
      sourceProject: { select: { id: true, name: true, code: true, city: true, address: true } },
    },
  });
  if (!req) throw DomainErrors.notFound("Zahtev za predaju");
  if (req.status !== "PENDING")
    throw DomainErrors.conflict("Zahtev više nije u statusu na čekanju.");
  if (req.targetOrganizationId && req.targetOrganizationId !== input.targetOrganizationId)
    throw DomainErrors.forbidden("Zahtev nije namenjen vašoj organizaciji.");

  // Load everything we need up front so the transaction stays short.
  const [units, sales] = await Promise.all([
    prisma.unit.findMany({
      where: {
        organizationId: req.sourceOrganizationId,
        projectId: req.sourceProjectId,
        archivedAt: null,
      },
      select: {
        id: true,
        code: true,
        type: true,
        floor: true,
        floorId: true,
        totalArea: true,
        roomCount: true,
      },
    }),
    prisma.sale.findMany({
      where: {
        organizationId: req.sourceOrganizationId,
        projectId: req.sourceProjectId,
        status: { in: COPY_SALE_STATUSES },
      },
      select: {
        unitId: true,
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            legalName: true,
            email: true,
            phone: true,
            addressLine1: true,
            city: true,
            postalCode: true,
            country: true,
          },
        },
      },
    }),
  ]);

  const salesByUnitId = new Map<string, (typeof sales)[number]["buyer"]>();
  for (const s of sales) {
    // Prefer first encountered; sales should be at most one per unit.
    if (!salesByUnitId.has(s.unitId)) salesByUnitId.set(s.unitId, s.buyer);
  }
  const eligibleUnits = units.filter((u) => salesByUnitId.has(u.id));

  if (eligibleUnits.length === 0) {
    throw DomainErrors.validation(
      "Nema jedinica u statusu PAID/HANDED_OVER — nema šta da se preda.",
    );
  }

  // Quota check — if the manager would blow the limit we abort before any
  // writes.
  await assertQuota(input.targetOrganizationId, "managedUnits", eligibleUnits.length);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Ensure a target ManagedBuilding exists.
    let buildingId: string | null = input.targetBuildingId ?? null;
    if (buildingId) {
      const existing = await tx.managedBuilding.findFirst({
        where: { id: buildingId, organizationId: input.targetOrganizationId },
        select: { id: true },
      });
      if (!existing) throw DomainErrors.notFound("Ciljna zgrada");
    } else {
      await assertQuota(input.targetOrganizationId, "managedBuildings", 1);
      const newBuilding = await tx.managedBuilding.create({
        data: {
          organizationId: input.targetOrganizationId,
          name: input.newBuildingName?.trim() || req.sourceProject.name,
          address: input.newBuildingAddress?.trim() || req.sourceProject.address || "—",
          city: input.newBuildingCity?.trim() || req.sourceProject.city || "—",
          country: "RS",
          entranceCount: 1,
          sourceProjectId: req.sourceProjectId,
        },
      });
      // Default entrance "A".
      await tx.buildingEntranceSection.create({
        data: {
          buildingId: newBuilding.id,
          code: "A",
          sortOrder: 0,
        },
      });
      buildingId = newBuilding.id;
    }

    const defaultEntrance = await tx.buildingEntranceSection.findFirst({
      where: { buildingId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    if (!defaultEntrance)
      throw DomainErrors.validation("Zgrada nema nijedan ulaz. Dodajte ulaz pre prihvatanja.");

    // 2. For each eligible unit — upsert ManagedUnit, upsert BuildingPerson,
    //    create UnitOwnership.
    let copiedUnits = 0;
    let copiedPeople = 0;
    // Dedup people by email first, then by (firstName+lastName+phone).
    const personKey = (b: (typeof sales)[number]["buyer"]) =>
      b.email?.toLowerCase().trim() ||
      [b.firstName, b.lastName, b.phone].filter(Boolean).join("|").toLowerCase() ||
      `anon-${b.id}`;
    const personCache = new Map<string, string>();

    for (const u of eligibleUnits) {
      const buyer = salesByUnitId.get(u.id);
      if (!buyer) continue;

      // Create or find ManagedUnit by sourceUnitId so re-running is idempotent.
      const existingUnit = await tx.managedUnit.findFirst({
        where: {
          organizationId: input.targetOrganizationId,
          buildingId,
          OR: [{ sourceUnitId: u.id }, { code: u.code }],
        },
      });

      let managedUnitId: string;
      if (existingUnit) {
        managedUnitId = existingUnit.id;
      } else {
        const created = await tx.managedUnit.create({
          data: {
            organizationId: input.targetOrganizationId,
            buildingId,
            entranceId: defaultEntrance.id,
            code: u.code,
            type: UNIT_TYPE_MAP[u.type],
            floor: u.floor != null ? Number(u.floor) : null,
            totalArea: u.totalArea,
            roomCount: u.roomCount ?? null,
            participationShare: 1,
            sourceUnitId: u.id,
          },
        });
        managedUnitId = created.id;
        copiedUnits += 1;
      }

      // Upsert BuildingPerson (per buyer, scoped to this managed building).
      // IMPORTANT: NO JMBG, NO identityNumber, NO taxId.
      const key = personKey(buyer);
      let personId = personCache.get(key);
      if (!personId) {
        const existingPerson = await tx.buildingPerson.findFirst({
          where: {
            organizationId: input.targetOrganizationId,
            buildingId,
            OR: [
              ...(buyer.email
                ? [{ email: { equals: buyer.email, mode: "insensitive" as const } }]
                : []),
              ...(buyer.phone ? [{ phone: buyer.phone }] : []),
            ],
          },
        });
        if (existingPerson) {
          personId = existingPerson.id;
        } else {
          const createdPerson = await tx.buildingPerson.create({
            data: {
              organizationId: input.targetOrganizationId,
              buildingId,
              firstName: buyer.firstName ?? null,
              lastName: buyer.lastName ?? null,
              legalName: buyer.legalName ?? null,
              email: buyer.email ?? null,
              phone: buyer.phone ?? null,
              address:
                [buyer.addressLine1, buyer.city, buyer.postalCode, buyer.country]
                  .filter(Boolean)
                  .join(", ") || null,
              primaryRole: "OWNER" satisfies ManagedPersonRole,
            },
          });
          personId = createdPerson.id;
          copiedPeople += 1;
        }
        personCache.set(key, personId);
      }

      // Create UnitOwnership if not already active.
      const existingOwnership = await tx.unitOwnership.findFirst({
        where: { unitId: managedUnitId, personId, endedAt: null },
      });
      if (!existingOwnership) {
        await tx.unitOwnership.create({
          data: {
            unitId: managedUnitId,
            personId,
            role: "OWNER",
            sharePercent: 100,
            isPrimary: true,
            startedAt: new Date(),
          },
        });
      }
    }

    // 3. Flip the handover request.
    const updated = await tx.buildingHandoverRequest.update({
      where: { id: req.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByUserId: input.actorUserId,
        targetOrganizationId: input.targetOrganizationId,
        targetBuildingId: buildingId,
      },
    });

    return { updated, buildingId, copiedUnits, copiedPeople };
  });

  await recordAudit({
    action: "manager.handover_accepted",
    entityType: "BuildingHandoverRequest",
    entityId: req.id,
    organizationId: input.targetOrganizationId,
    actorUserId: input.actorUserId,
    previousValues: { status: req.status },
    newValues: {
      status: "ACCEPTED",
      buildingId: result.buildingId,
      copiedUnits: result.copiedUnits,
      copiedPeople: result.copiedPeople,
      sourceProjectId: req.sourceProjectId,
    },
  });

  return result;
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
