import "server-only";
import { Prisma, type PaymentPlanStatus } from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { toDecimal, sumMoney } from "@/lib/formatters/money";

/**
 * PaymentPlanService — build and manage installment plans attached to a sale.
 *
 * Supported plan templates:
 *   - MANUAL: caller supplies every installment with explicit amounts.
 *   - PERCENTAGE: caller supplies percentages that must sum to 100 within
 *     tolerance; amounts are derived from `sale.finalPrice`.
 *   - EQUAL: caller supplies a count `n`; the plan splits `sale.finalPrice`
 *     into `n` equal installments with a final-remainder adjustment on the
 *     last installment so the sum is exact to two decimals.
 *
 * All templates enforce: `sum(installments.amount) == sale.finalPrice`
 * (using Decimal tolerance = 0.01 currency units).
 *
 * A sale can only have ONE PaymentPlan (`saleId` is unique) — recreating
 * requires the previous plan to be canceled first via `cancelPlan`.
 */

const AMOUNT_TOLERANCE = new Decimal("0.01");

export type PaymentPlanTemplate = "MANUAL" | "PERCENTAGE" | "EQUAL";

export interface ManualInstallmentInput {
  name: string;
  amount: number | string;
  dueDate: string | Date;
  notes?: string | null;
}

export interface PercentageInstallmentInput {
  name: string;
  percentage: number | string;
  dueDate: string | Date;
  notes?: string | null;
}

export interface EqualPlanInput {
  installments: number;
  firstDueDate: string | Date;
  monthlyGap?: number;
  namePrefix?: string;
}

export interface CreatePaymentPlanInput {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  planName: string;
  template: PaymentPlanTemplate;
  manual?: ManualInstallmentInput[];
  percentage?: PercentageInstallmentInput[];
  equal?: EqualPlanInput;
}

// -----------------------------------------------------------------------------
// Building blocks
// -----------------------------------------------------------------------------

function toDate(value: string | Date): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw DomainErrors.badRequest("Neispravan datum dospeća.");
  }
  return d;
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  // Guard for month rollover on 31st -> Feb etc.
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0);
  }
  return d;
}

function buildManual(
  input: ManualInstallmentInput[],
  finalPrice: Decimal,
): { amount: Decimal; percentage: Decimal | null; name: string; dueDate: Date; notes: string | null }[] {
  if (!input?.length) {
    throw DomainErrors.badRequest("Plan mora imati bar jednu ratu.");
  }
  const rows = input.map((it) => {
    const amt = toDecimal(it.amount).toDecimalPlaces(2);
    if (amt.lte(0)) throw DomainErrors.badRequest("Iznos rate mora biti pozitivan.");
    return {
      name: it.name.trim(),
      amount: amt,
      percentage: finalPrice.gt(0)
        ? amt.dividedBy(finalPrice).times(100).toDecimalPlaces(3)
        : null,
      dueDate: toDate(it.dueDate),
      notes: it.notes ?? null,
    };
  });
  const total = sumMoney(rows.map((r) => r.amount));
  if (total.minus(finalPrice).abs().gt(AMOUNT_TOLERANCE)) {
    throw DomainErrors.badRequest(
      `Zbir rata (${total.toString()}) ne odgovara ceni prodaje (${finalPrice.toString()}).`,
    );
  }
  return rows;
}

function buildPercentage(
  input: PercentageInstallmentInput[],
  finalPrice: Decimal,
): { amount: Decimal; percentage: Decimal | null; name: string; dueDate: Date; notes: string | null }[] {
  if (!input?.length) {
    throw DomainErrors.badRequest("Plan mora imati bar jednu ratu.");
  }
  const totalPct = input.reduce<Decimal>(
    (acc, it) => acc.plus(toDecimal(it.percentage)),
    new Decimal(0),
  );
  if (totalPct.minus(100).abs().gt(new Decimal("0.001"))) {
    throw DomainErrors.badRequest(
      `Zbir procenata mora biti 100% (dobili smo ${totalPct.toString()}%).`,
    );
  }
  const rows = input.map((it) => {
    const pct = toDecimal(it.percentage).toDecimalPlaces(3);
    return {
      name: it.name.trim(),
      amount: finalPrice.times(pct).dividedBy(100).toDecimalPlaces(2),
      percentage: pct,
      dueDate: toDate(it.dueDate),
      notes: it.notes ?? null,
    };
  });
  // Absorb rounding delta into the last row to keep the sum exact.
  const derived = sumMoney(rows.map((r) => r.amount));
  const delta = finalPrice.minus(derived);
  if (!delta.isZero() && rows.length > 0) {
    const last = rows[rows.length - 1]!;
    last.amount = last.amount.plus(delta).toDecimalPlaces(2);
  }
  return rows;
}

function buildEqual(
  input: EqualPlanInput,
  finalPrice: Decimal,
): { amount: Decimal; percentage: Decimal | null; name: string; dueDate: Date; notes: string | null }[] {
  if (!input || input.installments < 1) {
    throw DomainErrors.badRequest("Broj rata mora biti najmanje 1.");
  }
  const n = Math.floor(input.installments);
  const firstDue = toDate(input.firstDueDate);
  const gap = input.monthlyGap ?? 1;
  const base = finalPrice.dividedBy(n).toDecimalPlaces(2);
  const rows = Array.from({ length: n }).map((_, idx) => ({
    name: `${input.namePrefix ?? "Rata"} ${idx + 1}`,
    amount: base,
    percentage: finalPrice.gt(0)
      ? base.dividedBy(finalPrice).times(100).toDecimalPlaces(3)
      : null,
    dueDate: addMonths(firstDue, gap * idx),
    notes: null as string | null,
  }));
  const derived = sumMoney(rows.map((r) => r.amount));
  const delta = finalPrice.minus(derived);
  if (!delta.isZero() && rows.length > 0) {
    const last = rows[rows.length - 1]!;
    last.amount = last.amount.plus(delta).toDecimalPlaces(2);
  }
  return rows;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function createPaymentPlan(input: CreatePaymentPlanInput) {
  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, organizationId: input.organizationId },
    select: {
      id: true,
      status: true,
      finalPrice: true,
      currency: true,
      paymentPlan: { select: { id: true, status: true } },
    },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  if (sale.paymentPlan && sale.paymentPlan.status !== "CANCELED") {
    throw DomainErrors.conflict("Ova prodaja već ima aktivan plan plaćanja.");
  }
  if (sale.status === "CANCELED") {
    throw DomainErrors.invalidState("Ne možete kreirati plan za otkazanu prodaju.");
  }

  const finalPrice = toDecimal(sale.finalPrice);
  let rows: ReturnType<typeof buildManual>;
  if (input.template === "MANUAL") {
    rows = buildManual(input.manual ?? [], finalPrice);
  } else if (input.template === "PERCENTAGE") {
    rows = buildPercentage(input.percentage ?? [], finalPrice);
  } else {
    rows = buildEqual(input.equal!, finalPrice);
  }

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.paymentPlan.create({
      data: {
        organizationId: input.organizationId,
        saleId: input.saleId,
        name: input.planName,
        totalAmount: finalPrice.toString(),
        currency: sale.currency,
        status: "ACTIVE",
      },
    });
    await tx.paymentInstallment.createMany({
      data: rows.map((row, idx) => ({
        paymentPlanId: created.id,
        sequenceNumber: idx + 1,
        name: row.name,
        amount: row.amount.toString(),
        percentage: row.percentage ? row.percentage.toString() : null,
        dueDate: row.dueDate,
        status: "UPCOMING" as const,
        notes: row.notes,
      })),
    });
    return created;
  });

  await recordAudit({
    action: "payment_plan.created",
    entityType: "PaymentPlan",
    entityId: plan.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      template: input.template,
      total: finalPrice.toString(),
      installments: rows.length,
    },
  });

  return plan;
}

export async function getPaymentPlan(input: {
  organizationId: string;
  planId: string;
}) {
  const plan = await prisma.paymentPlan.findFirst({
    where: { id: input.planId, organizationId: input.organizationId },
    include: {
      installments: { orderBy: { sequenceNumber: "asc" } },
      sale: {
        select: {
          id: true,
          finalPrice: true,
          currency: true,
          status: true,
          unit: { select: { code: true } },
        },
      },
    },
  });
  if (!plan) throw DomainErrors.notFound("Plan plaćanja");
  return plan;
}

export async function cancelPaymentPlan(input: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  reason: string;
}) {
  if (!input.reason?.trim()) {
    throw DomainErrors.badRequest("Razlog otkazivanja je obavezan.");
  }
  const existing = await prisma.paymentPlan.findFirst({
    where: { id: input.planId, organizationId: input.organizationId },
    include: { installments: { where: { paidAmount: { gt: 0 } }, select: { id: true } } },
  });
  if (!existing) throw DomainErrors.notFound("Plan plaćanja");
  if (existing.status === "CANCELED") return existing;
  if (existing.installments.length > 0) {
    throw DomainErrors.invalidState(
      "Ne možete otkazati plan kada postoje evidentirane uplate.",
    );
  }
  const canceled = await prisma.$transaction(async (tx) => {
    await tx.paymentInstallment.updateMany({
      where: { paymentPlanId: existing.id, status: { not: "PAID" } },
      data: { status: "CANCELED" },
    });
    return tx.paymentPlan.update({
      where: { id: existing.id },
      data: { status: "CANCELED" },
    });
  });
  await recordAudit({
    action: "payment_plan.canceled",
    entityType: "PaymentPlan",
    entityId: existing.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { reason: input.reason },
  });
  return canceled;
}

/**
 * Recompute the plan status from installments. Runs inside a tx supplied by
 * the payment service so it can atomically ripple after each mutation.
 */
export async function propagatePlanStatusFromInstallments(input: {
  tx: Prisma.TransactionClient;
  paymentPlanId: string;
}): Promise<PaymentPlanStatus | null> {
  const { tx } = input;
  const plan = await tx.paymentPlan.findUnique({
    where: { id: input.paymentPlanId },
    select: { id: true, status: true },
  });
  if (!plan) return null;
  const installments = await tx.paymentInstallment.findMany({
    where: { paymentPlanId: plan.id },
    select: { status: true },
  });
  if (installments.length === 0) return plan.status;
  const allPaid = installments.every((i) => i.status === "PAID" || i.status === "CANCELED");
  const anyActivity = installments.some(
    (i) =>
      i.status === "PARTIALLY_PAID" ||
      i.status === "PAID" ||
      i.status === "OVERDUE" ||
      i.status === "DUE",
  );
  let desired: PaymentPlanStatus = plan.status;
  if (plan.status === "CANCELED") return plan.status;
  if (allPaid) desired = "COMPLETED";
  else if (anyActivity) desired = "ACTIVE";
  if (desired !== plan.status) {
    await tx.paymentPlan.update({
      where: { id: plan.id },
      data: { status: desired },
    });
  }
  return desired;
}
