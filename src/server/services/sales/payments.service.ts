import "server-only";
import { Prisma, type InstallmentStatus, type PaymentMethod } from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { toDecimal, sumMoney } from "@/lib/formatters/money";

import { propagatePlanStatusFromInstallments } from "./payment-plans.service";
import { propagateSaleStatusFromPayments } from "./sales.service";

/**
 * PaymentService — record and reverse payments with atomic propagation.
 *
 * Invariants:
 *   - A payment mutation NEVER falls out of a `$transaction`. The chain runs:
 *     payment → installment.paidAmount → installment.status → plan.status
 *     → sale.status. If any link fails the whole chain rolls back.
 *   - Payments are NEVER hard-deleted. Reversals set `reversedAt` +
 *     `reversedByUserId` + `reversalReason` and the propagation reruns.
 *   - Overpayment is prevented per-installment (sum of active payments
 *     against that installment cannot exceed its `amount`) and per-sale
 *     (sum of active payments cannot exceed `sale.finalPrice`).
 *   - All numeric math goes through `decimal.js` to avoid float drift.
 */

export interface RecordPaymentInput {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  installmentId?: string | null;
  amount: number | string;
  paymentDate: string | Date;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  note?: string | null;
  proofDocumentId?: string | null;
}

export interface ReversePaymentInput {
  organizationId: string;
  actorUserId: string;
  paymentId: string;
  reason: string;
}

function toDate(value: string | Date): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw DomainErrors.badRequest("Neispravan datum uplate.");
  }
  return d;
}

/**
 * Compute the correct installment status given cumulative active paid amount.
 * Never returns UPCOMING/OVERDUE — those depend on due-date and are set by
 * the mark-installments-overdue cron.
 */
function computeInstallmentStatus(
  currentStatus: InstallmentStatus,
  paid: Decimal,
  target: Decimal,
): InstallmentStatus {
  if (currentStatus === "CANCELED") return "CANCELED";
  if (paid.gte(target) && !target.isZero()) return "PAID";
  if (paid.gt(0)) return "PARTIALLY_PAID";
  // Return to the previous non-paid status: DUE if the current status was
  // DUE/OVERDUE, otherwise UPCOMING. (Reversal path.)
  if (currentStatus === "DUE" || currentStatus === "OVERDUE") return currentStatus;
  return "UPCOMING";
}

async function assertNoOverpayment(
  tx: Prisma.TransactionClient,
  saleId: string,
  installmentId: string | null,
  amount: Decimal,
): Promise<void> {
  const [saleAgg, sale] = await Promise.all([
    tx.payment.aggregate({
      where: { saleId, reversedAt: null },
      _sum: { amount: true },
    }),
    tx.sale.findUnique({
      where: { id: saleId },
      select: { finalPrice: true },
    }),
  ]);
  if (!sale) throw DomainErrors.notFound("Prodaja");
  const salePaid = toDecimal(saleAgg._sum.amount ?? 0);
  const saleTotal = toDecimal(sale.finalPrice);
  if (salePaid.plus(amount).gt(saleTotal)) {
    throw DomainErrors.invalidState(
      `Ova uplata bi prekoračila ukupnu cenu prodaje (${saleTotal.toString()}).`,
    );
  }
  if (installmentId) {
    const [instAgg, installment] = await Promise.all([
      tx.payment.aggregate({
        where: { installmentId, reversedAt: null },
        _sum: { amount: true },
      }),
      tx.paymentInstallment.findUnique({
        where: { id: installmentId },
        select: { amount: true, paymentPlan: { select: { saleId: true } } },
      }),
    ]);
    if (!installment) throw DomainErrors.notFound("Rata");
    if (installment.paymentPlan.saleId !== saleId) {
      throw DomainErrors.badRequest("Rata ne pripada ovoj prodaji.");
    }
    const instPaid = toDecimal(instAgg._sum.amount ?? 0);
    const instTarget = toDecimal(installment.amount);
    if (instPaid.plus(amount).gt(instTarget)) {
      throw DomainErrors.invalidState(
        `Ova uplata bi prekoračila iznos rate (${instTarget.toString()}).`,
      );
    }
  }
}

async function refreshInstallmentTotals(
  tx: Prisma.TransactionClient,
  installmentId: string,
): Promise<void> {
  const installment = await tx.paymentInstallment.findUnique({
    where: { id: installmentId },
    select: {
      id: true,
      amount: true,
      status: true,
      paymentPlanId: true,
    },
  });
  if (!installment) return;
  const agg = await tx.payment.aggregate({
    where: { installmentId, reversedAt: null },
    _sum: { amount: true },
  });
  const paid = toDecimal(agg._sum.amount ?? 0);
  const target = toDecimal(installment.amount);
  const newStatus = computeInstallmentStatus(installment.status, paid, target);
  const paidAt = newStatus === "PAID" ? new Date() : null;
  await tx.paymentInstallment.update({
    where: { id: installment.id },
    data: {
      paidAmount: paid.toString(),
      status: newStatus,
      paidAt,
    },
  });
  await propagatePlanStatusFromInstallments({
    tx,
    paymentPlanId: installment.paymentPlanId,
  });
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function recordPayment(input: RecordPaymentInput) {
  const amount = toDecimal(input.amount).toDecimalPlaces(2);
  if (amount.lte(0)) {
    throw DomainErrors.badRequest("Iznos uplate mora biti veći od nule.");
  }
  const date = toDate(input.paymentDate);

  const payment = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: input.saleId, organizationId: input.organizationId },
      select: { id: true, currency: true, status: true },
    });
    if (!sale) throw DomainErrors.notFound("Prodaja");
    if (sale.status === "CANCELED") {
      throw DomainErrors.invalidState("Ne možete evidentirati uplatu za otkazanu prodaju.");
    }

    await assertNoOverpayment(
      tx,
      input.saleId,
      input.installmentId ?? null,
      amount,
    );

    const created = await tx.payment.create({
      data: {
        organizationId: input.organizationId,
        saleId: input.saleId,
        installmentId: input.installmentId ?? null,
        amount: amount.toString(),
        currency: sale.currency,
        paymentDate: date,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber ?? null,
        note: input.note ?? null,
        proofDocumentId: input.proofDocumentId ?? null,
        createdByUserId: input.actorUserId,
      },
    });

    if (input.installmentId) {
      await refreshInstallmentTotals(tx, input.installmentId);
    }
    await propagateSaleStatusFromPayments({
      tx,
      organizationId: input.organizationId,
      saleId: input.saleId,
      actorUserId: input.actorUserId,
    });

    return created;
  });

  await recordAudit({
    action: "payment.created",
    entityType: "Payment",
    entityId: payment.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      saleId: payment.saleId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      method: payment.paymentMethod,
    },
  });

  return payment;
}

export async function reversePayment(input: ReversePaymentInput) {
  if (!input.reason?.trim()) {
    throw DomainErrors.badRequest("Razlog storniranja je obavezan.");
  }
  const reversed = await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findFirst({
      where: { id: input.paymentId, organizationId: input.organizationId },
    });
    if (!existing) throw DomainErrors.notFound("Uplata");
    if (existing.reversedAt) {
      throw DomainErrors.invalidState("Uplata je već stornirana.");
    }
    const updated = await tx.payment.update({
      where: { id: existing.id },
      data: {
        reversedAt: new Date(),
        reversedByUserId: input.actorUserId,
        reversalReason: input.reason.trim(),
      },
    });
    if (existing.installmentId) {
      await refreshInstallmentTotals(tx, existing.installmentId);
    }
    await propagateSaleStatusFromPayments({
      tx,
      organizationId: input.organizationId,
      saleId: existing.saleId,
      actorUserId: input.actorUserId,
    });
    return updated;
  });
  await recordAudit({
    action: "payment.reversed",
    entityType: "Payment",
    entityId: reversed.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: { reversedAt: null },
    newValues: {
      reason: input.reason,
      amount: reversed.amount.toString(),
    },
  });
  return reversed;
}

// -----------------------------------------------------------------------------
// Read
// -----------------------------------------------------------------------------

export interface ListPaymentsInput {
  organizationId: string;
  page: number;
  pageSize: number;
  saleId?: string;
  from?: Date;
  to?: Date;
}

export async function listPayments(input: ListPaymentsInput) {
  const where: Prisma.PaymentWhereInput = {
    organizationId: input.organizationId,
    ...(input.saleId ? { saleId: input.saleId } : {}),
    ...(input.from || input.to
      ? {
          paymentDate: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        sale: {
          select: {
            id: true,
            unit: { select: { code: true } },
            buyer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);
  return { items: rows, total };
}

/** Sum of ACTIVE payments (excluding reversed) for a sale. */
export async function getSalePaidTotal(saleId: string): Promise<Decimal> {
  const agg = await prisma.payment.aggregate({
    where: { saleId, reversedAt: null },
    _sum: { amount: true },
  });
  return toDecimal(agg._sum.amount ?? 0);
}

/** Utility for internal reporting — returns aggregate breakdown by method. */
export async function paymentSummaryForSale(saleId: string) {
  const payments = await prisma.payment.findMany({
    where: { saleId, reversedAt: null },
    select: { amount: true, paymentMethod: true },
  });
  const byMethod: Record<string, string> = {};
  for (const p of payments) {
    const key = String(p.paymentMethod);
    const existing = toDecimal(byMethod[key] ?? 0);
    byMethod[key] = existing.plus(toDecimal(p.amount)).toString();
  }
  const total = sumMoney(payments.map((p) => p.amount));
  return { total: total.toString(), byMethod };
}
