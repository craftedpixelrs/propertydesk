import "server-only";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { logger } from "@/server/logger";
import { createBuyer, findDuplicates } from "@/server/services/buyers.service";
import { notify } from "@/server/services/notifications.service";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

/**
 * Agency buyer registration + protection service.
 *
 * The privacy contract:
 *   When an agency tries to register a buyer that is already protected for
 *   ANOTHER agency, the response must never disclose the other agency's
 *   identity. We surface a fixed Serbian message and return no candidate
 *   data. Internally we still record a `CONFLICT_REVIEW` row so the investor
 *   can see the conflict in their inbox.
 */

const CONFIDENTIAL_CONFLICT_MESSAGE =
  "Ovaj kupac je već evidentiran i trenutno je zaštićen. Registracija nije moguća.";

// -----------------------------------------------------------------------------
// Register (agency side)
// -----------------------------------------------------------------------------

export interface RegisterAgencyBuyerInput {
  agencyOrganizationId: string;
  actorUserId: string;
  projectId: string;
  buyer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
    secondaryPhone?: string | null;
  };
}

export interface RegisterAgencyBuyerResult {
  registrationId: string;
  status: "PENDING" | "CONFLICT_REVIEW";
  message?: string;
}

export async function registerAgencyBuyer(
  input: RegisterAgencyBuyerInput,
): Promise<RegisterAgencyBuyerResult> {
  // Resolve the ACTIVE connection to the project's investor.
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, archivedAt: null },
    select: { id: true, organizationId: true, name: true },
  });
  if (!project) throw DomainErrors.notFound("Projekat");

  const connection = await prisma.agencyConnection.findFirst({
    where: {
      investorOrganizationId: project.organizationId,
      agencyOrganizationId: input.agencyOrganizationId,
      status: "ACTIVE",
    },
  });
  if (!connection) throw DomainErrors.notFound("Konekcija");

  // Confidential duplicate check: does ANOTHER agency already hold an
  // active protection for a matching buyer on this project?
  const normalizedPhone = normalizePhone(input.buyer.phone);
  const normalizedEmail = normalizeEmail(input.buyer.email);
  const activeStatuses = ["PENDING", "APPROVED"] as const;
  const conflictWhere: Prisma.AgencyBuyerRegistrationWhereInput = {
    projectId: input.projectId,
    investorOrganizationId: project.organizationId,
    status: { in: [...activeStatuses] },
    agencyOrganizationId: { not: input.agencyOrganizationId },
    buyer: {
      is: {
        OR: [
          ...(normalizedPhone ? [{ normalizedPhone }] : []),
          ...(normalizedEmail ? [{ normalizedEmail }] : []),
        ],
      },
    },
  };
  const hasConflict = normalizedPhone || normalizedEmail
    ? (await prisma.agencyBuyerRegistration.findFirst({ where: conflictWhere })) != null
    : false;

  // Create (or reuse) the buyer in the AGENCY's tenancy. Reusing keeps
  // duplicate agency-side records from piling up.
  const agencyBuyerDuplicates = await findDuplicates({
    organizationId: input.agencyOrganizationId,
    phone: input.buyer.phone,
    email: input.buyer.email ?? null,
  });
  const agencyBuyerId =
    agencyBuyerDuplicates[0]?.id ??
    (
      await createBuyer({
        organizationId: input.agencyOrganizationId,
        actorUserId: input.actorUserId,
        firstName: input.buyer.firstName,
        lastName: input.buyer.lastName,
        phone: input.buyer.phone,
        email: input.buyer.email ?? null,
        secondaryPhone: input.buyer.secondaryPhone ?? null,
      })
    ).id;

  if (hasConflict) {
    // Persist a CONFLICT_REVIEW row for the investor's inbox — but surface
    // ONLY the confidential message to the agency. No other-agency data is
    // ever included in the response.
    const registration = await prisma.agencyBuyerRegistration.create({
      data: {
        investorOrganizationId: project.organizationId,
        agencyOrganizationId: input.agencyOrganizationId,
        agencyAgentUserId: input.actorUserId,
        projectId: input.projectId,
        buyerId: agencyBuyerId,
        status: "CONFLICT_REVIEW",
        conflictNotes: "Automatski detektovan konflikt zaštite kupca.",
      },
    });
    await recordAudit({
      action: "agency.buyer_registered",
      entityType: "AgencyBuyerRegistration",
      entityId: registration.id,
      organizationId: input.agencyOrganizationId,
      actorUserId: input.actorUserId,
      newValues: { projectId: input.projectId, buyerId: agencyBuyerId, conflict: true },
    });
    return {
      registrationId: registration.id,
      status: "CONFLICT_REVIEW",
      message: CONFIDENTIAL_CONFLICT_MESSAGE,
    };
  }

  const registration = await prisma.agencyBuyerRegistration.create({
    data: {
      investorOrganizationId: project.organizationId,
      agencyOrganizationId: input.agencyOrganizationId,
      agencyAgentUserId: input.actorUserId,
      projectId: input.projectId,
      buyerId: agencyBuyerId,
      status: "PENDING",
    },
  });
  await recordAudit({
    action: "agency.buyer_registered",
    entityType: "AgencyBuyerRegistration",
    entityId: registration.id,
    organizationId: input.agencyOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { projectId: input.projectId, buyerId: agencyBuyerId },
  });

  // Notify the investor org's owners of the pending registration.
  await notifyInvestorOwners({
    investorOrganizationId: project.organizationId,
    title: "Nova registracija kupca",
    message: `${input.buyer.firstName} ${input.buyer.lastName} · ${project.name}`,
    actionUrl: "/agencije/registracije",
    entityId: registration.id,
  }).catch((err) =>
    logger.error("registration.notify_failed", { error: (err as Error)?.message }),
  );

  return { registrationId: registration.id, status: "PENDING" };
}

async function notifyInvestorOwners(input: {
  investorOrganizationId: string;
  title: string;
  message: string;
  actionUrl: string;
  entityId: string;
}): Promise<void> {
  const owners = await prisma.member.findMany({
    where: {
      organizationId: input.investorOrganizationId,
      role: { in: ["INVESTOR_OWNER", "INVESTOR_ADMIN"] },
    },
    select: { userId: true },
  });
  await Promise.all(
    owners.map((o) =>
      notify({
        organizationId: input.investorOrganizationId,
        userId: o.userId,
        category: "AGENCY",
        title: input.title,
        message: input.message,
        entityType: "AgencyBuyerRegistration",
        entityId: input.entityId,
        actionUrl: input.actionUrl,
      }),
    ),
  );
}

// -----------------------------------------------------------------------------
// Investor review
// -----------------------------------------------------------------------------

export interface ListRegistrationsInput {
  investorOrganizationId: string;
  status?: Array<Prisma.AgencyBuyerRegistrationWhereInput["status"]>;
  page: number;
  pageSize: number;
}

export async function listRegistrationsForInvestor(input: ListRegistrationsInput) {
  const where: Prisma.AgencyBuyerRegistrationWhereInput = {
    investorOrganizationId: input.investorOrganizationId,
    ...(input.status?.length
      ? { status: { in: input.status as Prisma.EnumAgencyBuyerRegistrationStatusFilter["in"] } }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.agencyBuyerRegistration.count({ where }),
    prisma.agencyBuyerRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        agency: { select: { id: true, name: true } },
        buyer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        project: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { items: rows, total };
}

async function loadRegistrationForInvestor(
  investorOrganizationId: string,
  registrationId: string,
) {
  const row = await prisma.agencyBuyerRegistration.findFirst({
    where: { id: registrationId, investorOrganizationId },
  });
  if (!row) throw DomainErrors.notFound("Registracija");
  return row;
}

export async function approveRegistration(input: {
  investorOrganizationId: string;
  actorUserId: string;
  registrationId: string;
  protectionDays?: number;
}) {
  const existing = await loadRegistrationForInvestor(
    input.investorOrganizationId,
    input.registrationId,
  );
  if (existing.status === "APPROVED") return existing;
  if (existing.status !== "PENDING" && existing.status !== "CONFLICT_REVIEW") {
    throw DomainErrors.invalidState("Ova registracija se ne može odobriti.");
  }

  // Resolve default protection days from the connection.
  const connection = await prisma.agencyConnection.findFirst({
    where: {
      investorOrganizationId: existing.investorOrganizationId,
      agencyOrganizationId: existing.agencyOrganizationId,
    },
    select: { defaultProtectionDays: true },
  });
  const days = input.protectionDays ?? connection?.defaultProtectionDays ?? 30;
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const updated = await prisma.agencyBuyerRegistration.update({
    where: { id: existing.id },
    data: {
      status: "APPROVED",
      reviewedByUserId: input.actorUserId,
      reviewedAt: new Date(),
      protectionStartsAt: start,
      protectionEndsAt: end,
    },
  });
  await recordAudit({
    action: "agency.buyer_registration_approved",
    entityType: "AgencyBuyerRegistration",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { protectionDays: days },
  });
  return updated;
}

export async function rejectRegistration(input: {
  investorOrganizationId: string;
  actorUserId: string;
  registrationId: string;
  reason?: string;
}) {
  const existing = await loadRegistrationForInvestor(
    input.investorOrganizationId,
    input.registrationId,
  );
  if (existing.status === "REJECTED") return existing;
  if (existing.status !== "PENDING" && existing.status !== "CONFLICT_REVIEW") {
    throw DomainErrors.invalidState("Ova registracija se ne može odbiti.");
  }
  const updated = await prisma.agencyBuyerRegistration.update({
    where: { id: existing.id },
    data: {
      status: "REJECTED",
      reviewedByUserId: input.actorUserId,
      reviewedAt: new Date(),
      rejectionReason: input.reason ?? null,
    },
  });
  await recordAudit({
    action: "agency.buyer_registration_rejected",
    entityType: "AgencyBuyerRegistration",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { reason: input.reason },
  });
  return updated;
}

// -----------------------------------------------------------------------------
// Batch: expire protections whose window has elapsed. Idempotent.
// -----------------------------------------------------------------------------

export async function expireDueProtections(now: Date = new Date()): Promise<{
  processed: number;
  errors: number;
}> {
  const due = await prisma.agencyBuyerRegistration.findMany({
    where: {
      status: "APPROVED",
      protectionEndsAt: { not: null, lt: now },
    },
    select: { id: true },
    take: 500,
  });

  let processed = 0;
  let errors = 0;
  for (const row of due) {
    try {
      const res = await prisma.agencyBuyerRegistration.updateMany({
        where: { id: row.id, status: "APPROVED" },
        data: { status: "EXPIRED" },
      });
      if (res.count > 0) processed += 1;
    } catch (err) {
      errors += 1;
      logger.error("registration.expire_failed", {
        registrationId: row.id,
        error: (err as Error)?.message,
      });
    }
  }
  return { processed, errors };
}

// Public constant so tests / UI can assert on it.
export const CONFIDENTIAL_REGISTRATION_MESSAGE = CONFIDENTIAL_CONFLICT_MESSAGE;
