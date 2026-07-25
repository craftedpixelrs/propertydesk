import "server-only";
import { Prisma, type CommissionStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { toDecimal } from "@/lib/formatters/money";

/**
 * Commission lifecycle service — CALCULATED → APPROVED → INVOICED → PAID.
 *
 * Rules:
 *   - Every transition is investor-side (owned by `investorOrganizationId`).
 *   - Adjustments write to `adjustedAmount` and add an audit trail with a
 *     required reason.
 *   - CANCELED terminates the row; DISPUTED can go back to CALCULATED once
 *     resolved via an explicit `resetToCalculated` call.
 *   - No status can silently overwrite the snapshotted numeric fields
 *     (`baseAmount`, `calculatedAmount`, `rate`, `fixedAmount`).
 */

const ALLOWED_COMMISSION_TRANSITIONS: Record<CommissionStatus, CommissionStatus[]> = {
  CALCULATED: ["APPROVED", "DISPUTED", "CANCELED"],
  APPROVED: ["INVOICED", "DISPUTED", "CANCELED"],
  INVOICED: ["PAID", "DUE", "DISPUTED", "CANCELED"],
  DUE: ["PAID", "INVOICED", "DISPUTED", "CANCELED"],
  PAID: [],
  DISPUTED: ["CALCULATED", "CANCELED"],
  CANCELED: [],
};

async function loadCommission(
  investorOrganizationId: string,
  commissionId: string,
) {
  const row = await prisma.commission.findFirst({
    where: { id: commissionId, investorOrganizationId },
  });
  if (!row) throw DomainErrors.notFound("Provizija");
  return row;
}

async function transitionCommission(input: {
  investorOrganizationId: string;
  actorUserId: string;
  commissionId: string;
  target: CommissionStatus;
  data?: Prisma.CommissionUpdateInput;
  reason?: string | null;
}) {
  const existing = await loadCommission(input.investorOrganizationId, input.commissionId);
  if (existing.status === input.target) return existing;

  const allowed = ALLOWED_COMMISSION_TRANSITIONS[existing.status];
  if (!allowed.includes(input.target)) {
    throw DomainErrors.invalidState(
      `Prelaz provizije iz "${existing.status}" u "${input.target}" nije dozvoljen.`,
    );
  }

  const updated = await prisma.commission.update({
    where: { id: existing.id },
    data: {
      status: input.target,
      ...(input.data ?? {}),
    },
  });

  await recordAudit({
    action:
      input.target === "APPROVED"
        ? "commission.approved"
        : input.target === "INVOICED"
          ? "commission.invoiced"
          : input.target === "PAID"
            ? "commission.paid"
            : input.target === "CANCELED"
              ? "commission.canceled"
              : "commission.adjusted",
    entityType: "Commission",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    previousValues: { status: existing.status },
    newValues: { status: input.target, reason: input.reason ?? null },
  });

  return updated;
}

export async function approveCommission(input: {
  investorOrganizationId: string;
  actorUserId: string;
  commissionId: string;
}) {
  return transitionCommission({
    ...input,
    target: "APPROVED",
    data: { approvedAt: new Date() },
    reason: "Provizija odobrena",
  });
}

export async function markInvoiced(input: {
  investorOrganizationId: string;
  actorUserId: string;
  commissionId: string;
  invoiceNumber?: string | null;
  dueDate?: Date | null;
}) {
  return transitionCommission({
    ...input,
    target: "INVOICED",
    data: {
      invoicedAt: new Date(),
      invoiceNumber: input.invoiceNumber ?? undefined,
      dueDate: input.dueDate ?? undefined,
    },
    reason: "Provizija fakturisana",
  });
}

export async function markPaid(input: {
  investorOrganizationId: string;
  actorUserId: string;
  commissionId: string;
}) {
  return transitionCommission({
    ...input,
    target: "PAID",
    data: { paidAt: new Date() },
    reason: "Provizija plaćena",
  });
}

export async function cancelCommission(input: {
  investorOrganizationId: string;
  actorUserId: string;
  commissionId: string;
  reason: string;
}) {
  if (!input.reason?.trim()) {
    throw DomainErrors.badRequest("Razlog otkazivanja je obavezan.");
  }
  return transitionCommission({
    ...input,
    target: "CANCELED",
  });
}

export async function disputeCommission(input: {
  investorOrganizationId: string;
  actorUserId: string;
  commissionId: string;
  reason: string;
}) {
  if (!input.reason?.trim()) {
    throw DomainErrors.badRequest("Razlog spora je obavezan.");
  }
  return transitionCommission({
    ...input,
    target: "DISPUTED",
  });
}

/**
 * Adjust the effective commission amount (never touches the snapshotted
 * `calculatedAmount`). Sets `adjustedAmount` and audits the delta with the
 * caller-supplied reason.
 */
export async function adjustCommission(input: {
  investorOrganizationId: string;
  actorUserId: string;
  commissionId: string;
  newAmount: number | string;
  reason: string;
}) {
  if (!input.reason?.trim()) {
    throw DomainErrors.badRequest("Razlog izmene je obavezan.");
  }
  const existing = await loadCommission(input.investorOrganizationId, input.commissionId);
  const newAmount = toDecimal(input.newAmount).toDecimalPlaces(2);
  if (newAmount.lt(0)) {
    throw DomainErrors.badRequest("Iznos ne može biti negativan.");
  }
  const previous = existing.adjustedAmount ?? existing.calculatedAmount;
  const updated = await prisma.commission.update({
    where: { id: existing.id },
    data: {
      adjustedAmount: newAmount.toString(),
      notes: input.reason,
    },
  });
  await recordAudit({
    action: "commission.adjusted",
    entityType: "Commission",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    previousValues: { amount: previous.toString() },
    newValues: { amount: newAmount.toString(), reason: input.reason },
  });
  return updated;
}

// -----------------------------------------------------------------------------
// Investor-scoped read
// -----------------------------------------------------------------------------

export interface ListInvestorCommissionsInput {
  investorOrganizationId: string;
  page: number;
  pageSize: number;
  status?: CommissionStatus[];
  agencyOrganizationId?: string;
}

export async function listInvestorCommissions(input: ListInvestorCommissionsInput) {
  const where: Prisma.CommissionWhereInput = {
    investorOrganizationId: input.investorOrganizationId,
    ...(input.status?.length ? { status: { in: input.status } } : {}),
    ...(input.agencyOrganizationId
      ? { agencyOrganizationId: input.agencyOrganizationId }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.commission.count({ where }),
    prisma.commission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        agency: { select: { id: true, name: true } },
        sale: {
          select: {
            id: true,
            unit: { select: { id: true, code: true } },
          },
        },
      },
    }),
  ]);
  return { items: rows, total };
}

export { ALLOWED_COMMISSION_TRANSITIONS };
