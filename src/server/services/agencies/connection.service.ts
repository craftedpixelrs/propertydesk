import "server-only";
import type { AgencyConnectionStatus, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";

/**
 * Agency-side view of `AgencyConnection`. Members of an AGENCY organization
 * see invitations addressed to their org, can accept or reject them, and can
 * list their active connections (used to power `/ponuda`).
 *
 * Tenant scoping is enforced by always filtering on `agencyOrganizationId`.
 */

export async function listMyConnections(input: {
  agencyOrganizationId: string;
  status?: AgencyConnectionStatus[];
  page: number;
  pageSize: number;
}) {
  const where: Prisma.AgencyConnectionWhereInput = {
    agencyOrganizationId: input.agencyOrganizationId,
    ...(input.status?.length ? { status: { in: input.status } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.agencyConnection.count({ where }),
    prisma.agencyConnection.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        investor: {
          select: { id: true, name: true, profile: { select: { displayName: true } } },
        },
      },
    }),
  ]);
  return { items: rows, total };
}

async function loadInvitationForAgency(
  agencyOrganizationId: string,
  connectionId: string,
) {
  const conn = await prisma.agencyConnection.findFirst({
    where: { id: connectionId, agencyOrganizationId },
  });
  if (!conn) throw DomainErrors.notFound("Poziv za konekciju");
  return conn;
}

export async function activatePendingAgencyConnections(
  agencyOrganizationId: string,
) {
  await prisma.agencyConnection.updateMany({
    where: { agencyOrganizationId, status: "INVITED" },
    data: { status: "ACTIVE", acceptedAt: new Date() },
  });
}

export async function acceptInvitation(input: {
  agencyOrganizationId: string;
  actorUserId: string;
  connectionId: string;
}) {
  const existing = await loadInvitationForAgency(
    input.agencyOrganizationId,
    input.connectionId,
  );
  if (existing.status === "ACTIVE") return existing;
  if (existing.status !== "INVITED") {
    throw DomainErrors.invalidState("Ovaj poziv se ne može prihvatiti.");
  }
  const updated = await prisma.agencyConnection.update({
    where: { id: existing.id },
    data: { status: "ACTIVE", acceptedAt: new Date() },
  });
  await recordAudit({
    action: "agency.connection_accepted",
    entityType: "AgencyConnection",
    entityId: existing.id,
    organizationId: input.agencyOrganizationId,
    actorUserId: input.actorUserId,
  });
  return updated;
}

export async function rejectInvitation(input: {
  agencyOrganizationId: string;
  actorUserId: string;
  connectionId: string;
  reason?: string;
}) {
  const existing = await loadInvitationForAgency(
    input.agencyOrganizationId,
    input.connectionId,
  );
  if (existing.status === "REJECTED") return existing;
  if (existing.status !== "INVITED") {
    throw DomainErrors.invalidState("Ovaj poziv se ne može odbiti.");
  }
  const updated = await prisma.agencyConnection.update({
    where: { id: existing.id },
    data: { status: "REJECTED", notes: input.reason ?? existing.notes },
  });
  await recordAudit({
    action: "agency.connection_terminated",
    entityType: "AgencyConnection",
    entityId: existing.id,
    organizationId: input.agencyOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { reason: input.reason },
  });
  return updated;
}

/**
 * Load the active connection for a given (investor, agency) pair. Used by
 * the agency portal to gate every read/write. Returns `null` when no active
 * link exists — callers must treat that as "no access" (404/empty).
 */
export async function findActiveConnectionForAgency(input: {
  agencyOrganizationId: string;
  investorOrganizationId?: string;
}) {
  return prisma.agencyConnection.findFirst({
    where: {
      agencyOrganizationId: input.agencyOrganizationId,
      ...(input.investorOrganizationId
        ? { investorOrganizationId: input.investorOrganizationId }
        : {}),
      status: "ACTIVE",
    },
  });
}
