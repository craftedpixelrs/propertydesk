import "server-only";
import { randomBytes } from "node:crypto";
import type { AgencyConnectionStatus, AgencyProjectAccessStatus, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertQuota } from "@/server/services/quotas.service";

/**
 * C2 — Generate a short, URL-safe referral code for an agency connection.
 *
 * 8 characters from a 32-character no-look-alike alphabet (Crockford
 * base32 minus I/O/1/0 to avoid transcription ambiguity when the code
 * is read aloud). ~2^40 entropy is enough for a URL parameter; the
 * `@unique` constraint on the column protects us against the tiny
 * collision probability at scale.
 */
const REFERRAL_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function generateReferralCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += REFERRAL_ALPHABET[bytes[i] % REFERRAL_ALPHABET.length];
  }
  return out;
}

async function ensureUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();
    const clash = await prisma.agencyConnection.findFirst({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!clash) return code;
  }
  throw DomainErrors.conflict("Ne mogu da generišem jedinstven referral kod.");
}

/**
 * Investor-side agency management service.
 *
 * Owns the `AgencyConnection` lifecycle (invite → accept/reject/suspend/
 * terminate), per-connection `AgencyProjectAccess` grants (with visibility
 * and reservation flags), and per-unit `AgencyUnitAccessOverride` rows.
 *
 * Every mutation is tenant-scoped to the INVESTOR org, quota-checked where
 * relevant, and audited. The agency-side accept/reject flow lives in
 * `connection.service.ts` because the permission model is different there
 * (agency-role members act on invitations addressed to their org).
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface InviteAgencyInput {
  investorOrganizationId: string;
  actorUserId: string;
  agencyOrganizationId: string;
  defaultProtectionDays?: number;
  notes?: string | null;
}

export interface ListConnectionsInput {
  organizationId: string;
  role: "INVESTOR" | "AGENCY";
  page: number;
  pageSize: number;
  status?: AgencyConnectionStatus[];
}

export interface GrantProjectAccessInput {
  investorOrganizationId: string;
  actorUserId: string;
  connectionId: string;
  projectId: string;
  canViewPrices?: boolean;
  canViewFloorPlans?: boolean;
  canRequestReservations?: boolean;
  showOnlyAgencyVisibleUnits?: boolean;
  accessStartsAt?: Date | null;
  accessEndsAt?: Date | null;
}

export interface UpdateProjectAccessInput {
  investorOrganizationId: string;
  actorUserId: string;
  connectionId: string;
  projectAccessId: string;
  patch: Partial<
    Pick<
      GrantProjectAccessInput,
      | "canViewPrices"
      | "canViewFloorPlans"
      | "canRequestReservations"
      | "showOnlyAgencyVisibleUnits"
      | "accessStartsAt"
      | "accessEndsAt"
    >
  > & { status?: AgencyProjectAccessStatus };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function loadConnectionOwnedBy(
  investorOrganizationId: string,
  connectionId: string,
) {
  const conn = await prisma.agencyConnection.findFirst({
    where: { id: connectionId, investorOrganizationId },
  });
  if (!conn) throw DomainErrors.notFound("Konekcija");
  return conn;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function inviteAgency(input: InviteAgencyInput) {
  if (input.investorOrganizationId === input.agencyOrganizationId) {
    throw DomainErrors.badRequest(
      "Organizacija ne može uspostaviti konekciju sa samom sobom.",
    );
  }

  // Both orgs must exist and be of the expected type.
  const [investor, agency] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: input.investorOrganizationId },
      include: { profile: true },
    }),
    prisma.organization.findUnique({
      where: { id: input.agencyOrganizationId },
      include: { profile: true },
    }),
  ]);
  if (!investor || !agency) throw DomainErrors.notFound("Organizacija");
  if (investor.profile?.type !== "INVESTOR") {
    throw DomainErrors.forbidden("Samo investitor može pozivati agencije.");
  }
  if (agency.profile?.type !== "AGENCY") {
    throw DomainErrors.badRequest("Pozvana organizacija nije agencija.");
  }

  const existing = await prisma.agencyConnection.findFirst({
    where: {
      investorOrganizationId: input.investorOrganizationId,
      agencyOrganizationId: input.agencyOrganizationId,
    },
  });
  if (existing && existing.status !== "REJECTED" && existing.status !== "TERMINATED") {
    throw DomainErrors.conflict(
      "Konekcija sa ovom agencijom već postoji ili čeka odgovor.",
    );
  }

  await assertQuota(input.investorOrganizationId, "agencies");

  const referralCode = await ensureUniqueReferralCode();

  const created = await prisma.agencyConnection.upsert({
    where: {
      investorOrganizationId_agencyOrganizationId: {
        investorOrganizationId: input.investorOrganizationId,
        agencyOrganizationId: input.agencyOrganizationId,
      },
    },
    create: {
      investorOrganizationId: input.investorOrganizationId,
      agencyOrganizationId: input.agencyOrganizationId,
      invitedByUserId: input.actorUserId,
      defaultProtectionDays: input.defaultProtectionDays ?? 30,
      notes: input.notes ?? null,
      status: "INVITED",
      referralCode,
    },
    update: {
      status: "INVITED",
      invitedByUserId: input.actorUserId,
      invitedAt: new Date(),
      acceptedAt: null,
      suspendedAt: null,
      suspendedByUserId: null,
      defaultProtectionDays: input.defaultProtectionDays ?? 30,
      notes: input.notes ?? null,
      // Preserve existing referral code across re-invites so previously
      // shared marketing links keep working.
    },
  });

  await recordAudit({
    action: "agency.connection_invited",
    entityType: "AgencyConnection",
    entityId: created.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { agencyOrganizationId: input.agencyOrganizationId },
  });

  return created;
}

export async function listConnections(input: ListConnectionsInput) {
  const where: Prisma.AgencyConnectionWhereInput = {
    ...(input.role === "INVESTOR"
      ? { investorOrganizationId: input.organizationId }
      : { agencyOrganizationId: input.organizationId }),
    ...(input.status?.length ? { status: { in: input.status } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.agencyConnection.count({ where }),
    prisma.agencyConnection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        investor: {
          select: { id: true, name: true, profile: { select: { displayName: true } } },
        },
        agency: {
          select: { id: true, name: true, profile: { select: { displayName: true } } },
        },
        _count: { select: { projectAccess: true, commissionRules: true } },
      },
    }),
  ]);
  return { items: rows, total };
}

export async function getConnectionDetail(
  investorOrganizationId: string,
  connectionId: string,
) {
  const conn = await prisma.agencyConnection.findFirst({
    where: { id: connectionId, investorOrganizationId },
    include: {
      agency: { include: { profile: true } },
      projectAccess: { include: { project: { select: { id: true, name: true, code: true } } } },
      commissionRules: true,
    },
  });
  if (!conn) throw DomainErrors.notFound("Konekcija");
  return conn;
}

export async function suspendConnection(input: {
  investorOrganizationId: string;
  actorUserId: string;
  connectionId: string;
  reason?: string;
}) {
  const existing = await loadConnectionOwnedBy(
    input.investorOrganizationId,
    input.connectionId,
  );
  if (existing.status === "SUSPENDED") return existing;
  if (existing.status !== "ACTIVE" && existing.status !== "INVITED") {
    throw DomainErrors.invalidState("Ova konekcija se ne može suspendovati.");
  }
  const updated = await prisma.agencyConnection.update({
    where: { id: existing.id },
    data: {
      status: "SUSPENDED",
      suspendedAt: new Date(),
      suspendedByUserId: input.actorUserId,
      notes: input.reason ?? existing.notes,
    },
  });
  await recordAudit({
    action: "agency.connection_suspended",
    entityType: "AgencyConnection",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { reason: input.reason },
  });
  return updated;
}

export async function reactivateConnection(input: {
  investorOrganizationId: string;
  actorUserId: string;
  connectionId: string;
}) {
  const existing = await loadConnectionOwnedBy(
    input.investorOrganizationId,
    input.connectionId,
  );
  if (existing.status === "ACTIVE") return existing;
  if (existing.status !== "SUSPENDED") {
    throw DomainErrors.invalidState("Ova konekcija se ne može reaktivirati.");
  }
  const updated = await prisma.agencyConnection.update({
    where: { id: existing.id },
    data: {
      status: "ACTIVE",
      suspendedAt: null,
      suspendedByUserId: null,
    },
  });
  await recordAudit({
    action: "agency.connection_accepted",
    entityType: "AgencyConnection",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { note: "reactivated" },
  });
  return updated;
}

export async function terminateConnection(input: {
  investorOrganizationId: string;
  actorUserId: string;
  connectionId: string;
  reason?: string;
}) {
  const existing = await loadConnectionOwnedBy(
    input.investorOrganizationId,
    input.connectionId,
  );
  if (existing.status === "TERMINATED") return existing;
  const updated = await prisma.agencyConnection.update({
    where: { id: existing.id },
    data: {
      status: "TERMINATED",
      notes: input.reason ?? existing.notes,
    },
  });
  await recordAudit({
    action: "agency.connection_terminated",
    entityType: "AgencyConnection",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { reason: input.reason },
  });
  return updated;
}

export async function setProtectionDays(input: {
  investorOrganizationId: string;
  actorUserId: string;
  connectionId: string;
  days: number;
}) {
  if (input.days < 0 || input.days > 365) {
    throw DomainErrors.badRequest("Broj dana zaštite mora biti između 0 i 365.");
  }
  const existing = await loadConnectionOwnedBy(
    input.investorOrganizationId,
    input.connectionId,
  );
  const updated = await prisma.agencyConnection.update({
    where: { id: existing.id },
    data: { defaultProtectionDays: input.days },
  });
  await recordAudit({
    action: "agency.connection_accepted",
    entityType: "AgencyConnection",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    previousValues: { defaultProtectionDays: existing.defaultProtectionDays },
    newValues: { defaultProtectionDays: input.days },
  });
  return updated;
}

// -----------------------------------------------------------------------------
// C2 — Referral code helpers (agency-facing)
// -----------------------------------------------------------------------------

/**
 * Return all active connections for the given agency org together with
 * their referral code. Used by the agency /ponuda page. If a connection
 * exists but has no referral code (legacy row before C2), we lazily
 * generate one.
 */
export async function listAgencyReferralCards(agencyOrganizationId: string) {
  const rows = await prisma.agencyConnection.findMany({
    where: {
      agencyOrganizationId,
      status: { in: ["ACTIVE", "INVITED"] },
    },
    include: {
      investor: {
        include: { profile: { select: { logoUrl: true, displayName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const backfilled: typeof rows = [];
  for (const conn of rows) {
    if (conn.referralCode) {
      backfilled.push(conn);
      continue;
    }
    const code = await ensureUniqueReferralCode();
    const updated = await prisma.agencyConnection.update({
      where: { id: conn.id },
      data: { referralCode: code },
      include: {
        investor: {
          include: { profile: { select: { logoUrl: true, displayName: true } } },
        },
      },
    });
    backfilled.push(updated);
  }
  return backfilled;
}

/**
 * Rotate an agency's referral code for a given investor connection.
 * The old code is invalidated immediately — any in-flight `?ref=` URLs
 * pointing at the previous code will no longer resolve to this agency.
 */
export async function rotateReferralCode(input: {
  agencyOrganizationId: string;
  actorUserId: string;
  connectionId: string;
}): Promise<{ referralCode: string }> {
  const conn = await prisma.agencyConnection.findFirst({
    where: {
      id: input.connectionId,
      agencyOrganizationId: input.agencyOrganizationId,
    },
    select: { id: true, referralCode: true, investorOrganizationId: true },
  });
  if (!conn) throw DomainErrors.notFound("Konekcija");
  const newCode = await ensureUniqueReferralCode();
  await prisma.agencyConnection.update({
    where: { id: conn.id },
    data: { referralCode: newCode },
  });
  await recordAudit({
    action: "agency.referral_rotated",
    entityType: "AgencyConnection",
    entityId: conn.id,
    organizationId: input.agencyOrganizationId,
    actorUserId: input.actorUserId,
    previousValues: { referralCode: conn.referralCode },
    newValues: { referralCode: newCode },
  });
  return { referralCode: newCode };
}

// -----------------------------------------------------------------------------
// Project access grants
// -----------------------------------------------------------------------------

export async function grantProjectAccess(input: GrantProjectAccessInput) {
  const conn = await loadConnectionOwnedBy(
    input.investorOrganizationId,
    input.connectionId,
  );
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: input.investorOrganizationId },
    select: { id: true },
  });
  if (!project) throw DomainErrors.notFound("Projekat");

  const existing = await prisma.agencyProjectAccess.findUnique({
    where: {
      agencyConnectionId_projectId: {
        agencyConnectionId: conn.id,
        projectId: input.projectId,
      },
    },
  });
  if (existing && existing.status === "ACTIVE") {
    throw DomainErrors.conflict("Agencija već ima pristup ovom projektu.");
  }

  const grant = await prisma.agencyProjectAccess.upsert({
    where: {
      agencyConnectionId_projectId: {
        agencyConnectionId: conn.id,
        projectId: input.projectId,
      },
    },
    create: {
      agencyConnectionId: conn.id,
      projectId: input.projectId,
      status: "ACTIVE",
      canViewPrices: input.canViewPrices ?? true,
      canViewFloorPlans: input.canViewFloorPlans ?? true,
      canRequestReservations: input.canRequestReservations ?? true,
      showOnlyAgencyVisibleUnits: input.showOnlyAgencyVisibleUnits ?? true,
      accessStartsAt: input.accessStartsAt ?? null,
      accessEndsAt: input.accessEndsAt ?? null,
    },
    update: {
      status: "ACTIVE",
      canViewPrices: input.canViewPrices ?? true,
      canViewFloorPlans: input.canViewFloorPlans ?? true,
      canRequestReservations: input.canRequestReservations ?? true,
      showOnlyAgencyVisibleUnits: input.showOnlyAgencyVisibleUnits ?? true,
      accessStartsAt: input.accessStartsAt ?? null,
      accessEndsAt: input.accessEndsAt ?? null,
    },
  });

  await recordAudit({
    action: "agency.project_access_granted",
    entityType: "AgencyProjectAccess",
    entityId: grant.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: {
      connectionId: conn.id,
      projectId: input.projectId,
      flags: {
        canViewPrices: grant.canViewPrices,
        canRequestReservations: grant.canRequestReservations,
        showOnlyAgencyVisibleUnits: grant.showOnlyAgencyVisibleUnits,
      },
    },
  });

  return grant;
}

export async function updateProjectAccess(input: UpdateProjectAccessInput) {
  const conn = await loadConnectionOwnedBy(
    input.investorOrganizationId,
    input.connectionId,
  );
  const existing = await prisma.agencyProjectAccess.findFirst({
    where: { id: input.projectAccessId, agencyConnectionId: conn.id },
  });
  if (!existing) throw DomainErrors.notFound("Pristup projektu");
  const updated = await prisma.agencyProjectAccess.update({
    where: { id: existing.id },
    data: {
      status: input.patch.status ?? undefined,
      canViewPrices: input.patch.canViewPrices ?? undefined,
      canViewFloorPlans: input.patch.canViewFloorPlans ?? undefined,
      canRequestReservations: input.patch.canRequestReservations ?? undefined,
      showOnlyAgencyVisibleUnits: input.patch.showOnlyAgencyVisibleUnits ?? undefined,
      accessStartsAt:
        input.patch.accessStartsAt !== undefined ? input.patch.accessStartsAt : undefined,
      accessEndsAt:
        input.patch.accessEndsAt !== undefined ? input.patch.accessEndsAt : undefined,
    },
  });
  await recordAudit({
    action: "agency.project_access_granted",
    entityType: "AgencyProjectAccess",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    previousValues: {
      status: existing.status,
      canViewPrices: existing.canViewPrices,
    },
    newValues: {
      status: updated.status,
      canViewPrices: updated.canViewPrices,
    },
  });
  return updated;
}

export async function revokeProjectAccess(input: {
  investorOrganizationId: string;
  actorUserId: string;
  connectionId: string;
  projectAccessId: string;
}) {
  const conn = await loadConnectionOwnedBy(
    input.investorOrganizationId,
    input.connectionId,
  );
  const existing = await prisma.agencyProjectAccess.findFirst({
    where: { id: input.projectAccessId, agencyConnectionId: conn.id },
  });
  if (!existing) throw DomainErrors.notFound("Pristup projektu");
  const updated = await prisma.agencyProjectAccess.update({
    where: { id: existing.id },
    data: { status: "ENDED", accessEndsAt: new Date() },
  });
  await recordAudit({
    action: "agency.project_access_revoked",
    entityType: "AgencyProjectAccess",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
  });
  return updated;
}

// -----------------------------------------------------------------------------
// Unit-level access overrides
// -----------------------------------------------------------------------------

export async function setUnitOverride(input: {
  investorOrganizationId: string;
  actorUserId: string;
  connectionId: string;
  unitId: string;
  visible: boolean;
}) {
  const conn = await loadConnectionOwnedBy(
    input.investorOrganizationId,
    input.connectionId,
  );
  const unit = await prisma.unit.findFirst({
    where: { id: input.unitId, organizationId: input.investorOrganizationId },
    select: { id: true },
  });
  if (!unit) throw DomainErrors.notFound("Jedinica");

  const override = await prisma.agencyUnitAccessOverride.upsert({
    where: {
      agencyConnectionId_unitId: {
        agencyConnectionId: conn.id,
        unitId: input.unitId,
      },
    },
    create: {
      agencyConnectionId: conn.id,
      unitId: input.unitId,
      visible: input.visible,
    },
    update: { visible: input.visible },
  });

  await recordAudit({
    action: "agency.project_access_granted",
    entityType: "AgencyUnitAccessOverride",
    entityId: override.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { unitId: input.unitId, visible: input.visible },
  });

  return override;
}

export async function removeUnitOverride(input: {
  investorOrganizationId: string;
  actorUserId: string;
  connectionId: string;
  overrideId: string;
}) {
  const conn = await loadConnectionOwnedBy(
    input.investorOrganizationId,
    input.connectionId,
  );
  const existing = await prisma.agencyUnitAccessOverride.findFirst({
    where: { id: input.overrideId, agencyConnectionId: conn.id },
  });
  if (!existing) throw DomainErrors.notFound("Override");
  await prisma.agencyUnitAccessOverride.delete({ where: { id: existing.id } });
  await recordAudit({
    action: "agency.project_access_revoked",
    entityType: "AgencyUnitAccessOverride",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
  });
}
