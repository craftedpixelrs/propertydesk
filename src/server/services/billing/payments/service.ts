import "server-only";
import { Prisma } from "@prisma/client";
import type {
  Invoice,
  SubscriptionPayment,
  SubscriptionPaymentProvider,
} from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import { toDecimal } from "@/lib/formatters/money";
import {
  addCycle,
  CYCLE_MONTHS,
} from "../subscriptions.service";
import { resolveBillingSettings } from "../settings/resolved.service";
import {
  applyAllocations,
  computeFifoAllocations,
  type AllocationInput,
} from "./allocation.service";

/**
 * Payment recording & reversal.
 *
 * `recordPayment` runs in one transaction:
 *   1. Insert a `SubscriptionPayment` row (source of truth).
 *   2. Insert allocations, updating invoice amounts + statuses.
 *   3. If any invoice reached PAID and the source subscription is set to
 *      auto-extend, extend it once per (subscription, invoice) via the
 *      idempotent `SubscriptionExtension` record.
 *   4. Move the subscription back to ACTIVE if it was PAYMENT_DUE / PAST_DUE
 *      / RESTRICTED and there are no other open invoices.
 *   5. Audit.
 */

export interface RecordPaymentInput {
  organizationId: string;
  subscriptionId?: string | null;
  amount: number | string;
  currency: string;
  paidAt?: Date;
  provider?: SubscriptionPaymentProvider;
  providerTransactionId?: string | null;
  bankStatementTransactionId?: string | null;
  reference?: string | null;
  note?: string | null;
  /**
   * Optional explicit allocation. When omitted, we auto-allocate FIFO across
   * the org's currently-open invoices (ordered by due date).
   */
  allocations?: AllocationInput[];
  allowOverpay?: boolean;
}

export interface RecordPaymentResult {
  payment: SubscriptionPayment;
  invoicesUpdated: Invoice[];
  unappliedAmount: string;
}

export async function recordPayment(
  input: RecordPaymentInput,
  actorUserId: string | null,
): Promise<RecordPaymentResult> {
  const amount = new Prisma.Decimal(toDecimal(input.amount).toString());
  if (amount.lte(0)) {
    throw DomainErrors.badRequest("Iznos uplate mora biti pozitivan.");
  }

  const settings = await resolveBillingSettings(input.organizationId);

  const result = await prisma.$transaction(async (tx) => {
    // 1) Insert the payment row.
    const payment = await tx.subscriptionPayment.create({
      data: {
        id: createId(),
        organizationId: input.organizationId,
        subscriptionId: input.subscriptionId ?? null,
        provider: input.provider ?? "MANUAL",
        status: "COMPLETED",
        amount,
        currency: input.currency,
        paidAt: input.paidAt ?? new Date(),
        providerTransactionId: input.providerTransactionId ?? null,
        bankStatementTransactionId: input.bankStatementTransactionId ?? null,
        reference: input.reference ?? null,
        note: input.note ?? null,
        createdByUserId: actorUserId ?? null,
      },
    });

    // 2) Decide allocations.
    let allocations = input.allocations;
    if (!allocations || allocations.length === 0) {
      const open = await tx.invoice.findMany({
        where: {
          organizationId: input.organizationId,
          currency: input.currency,
          status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"] },
          amountDue: { gt: 0 },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      });
      const auto = computeFifoAllocations(amount, open, input.currency);
      allocations = auto.allocations.map((a) => ({ invoiceId: a.invoiceId, amount: a.amount }));
    }

    if (!allocations || allocations.length === 0) {
      // Nothing to allocate against — leave the payment as unapplied credit.
      return { payment, updatedInvoices: [] as Invoice[], totalAllocated: new Prisma.Decimal(0) };
    }

    const { updatedInvoices, totalAllocated } = await applyAllocations(tx, {
      paymentId: payment.id,
      paymentAmount: amount,
      paymentCurrency: input.currency,
      allocations,
      allowOverpay: input.allowOverpay,
    });

    // 3) Auto-extend subscriptions per fully-paid invoice.
    for (const inv of updatedInvoices) {
      if (inv.status !== "PAID") continue;
      if (!inv.subscriptionId) continue;
      if (!settings.automation.extendSubscriptions) continue;

      const sub = await tx.organizationSubscription.findUnique({
        where: { id: inv.subscriptionId },
      });
      if (!sub || !sub.autoRenew) continue;

      // Idempotency: unique (subscriptionId, invoiceId).
      const existingExt = await tx.subscriptionExtension.findFirst({
        where: { subscriptionId: sub.id, invoiceId: inv.id },
      });
      if (existingExt) continue;

      const cycle = inv.billingCycle ?? sub.billingCycle;
      const from = inv.servicePeriodStart ?? sub.currentPeriodStart ?? new Date();
      const to = inv.servicePeriodEnd ?? addCycle(from, cycle);

      await tx.subscriptionExtension.create({
        data: {
          id: createId(),
          organizationId: sub.organizationId,
          subscriptionId: sub.id,
          invoiceId: inv.id,
          extendedFrom: from,
          extendedTo: to,
          cycle,
        },
      });

      await tx.organizationSubscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodStart: from,
          currentPeriodEnd: to,
          nextBillingDate: to,
          gracePeriodEndsAt: null,
          restrictedAt: null,
          suspendedAt: null,
          status: "ACTIVE",
        },
      });

      // Reactivate the org if it was RESTRICTED / SUSPENDED because of this
      // outstanding invoice.
      await tx.organizationProfile.updateMany({
        where: {
          organizationId: sub.organizationId,
          status: { in: ["RESTRICTED", "SUSPENDED"] },
        },
        data: { status: "ACTIVE" },
      });
    }

    return { payment, updatedInvoices, totalAllocated };
  });

  const unapplied = amount.minus(result.totalAllocated);

  await recordAudit({
    action: "billing.payment_recorded",
    entityType: "SubscriptionPayment",
    entityId: result.payment.id,
    organizationId: input.organizationId,
    actorUserId,
    newValues: {
      amount: amount.toString(),
      currency: input.currency,
      allocated: result.totalAllocated.toString(),
      unapplied: unapplied.toString(),
      invoicesTouched: result.updatedInvoices.map((i) => i.id),
    },
    metadata: {
      provider: input.provider ?? "MANUAL",
      reference: input.reference ?? null,
    },
  });

  return {
    payment: result.payment,
    invoicesUpdated: result.updatedInvoices,
    unappliedAmount: unapplied.toString(),
  };
}

/**
 * Reverse a previously recorded payment. Undoes the allocations, updates
 * invoice statuses, and marks the payment as REVERSED. Does NOT revert
 * subscription extensions that were already granted — that's a policy
 * choice: the tenant already had the benefit of extended access.
 */
export async function reversePayment(
  paymentId: string,
  reason: string,
  actorUserId: string | null,
): Promise<SubscriptionPayment> {
  if (!reason || reason.trim().length === 0) {
    throw DomainErrors.badRequest("Molimo unesite razlog stornoa.");
  }

  const previous = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { allocations: true },
  });
  if (!previous) throw DomainErrors.notFound("Uplata");
  if (previous.status === "REVERSED") return previous;

  const updated = await prisma.$transaction(async (tx) => {
    for (const alloc of previous.allocations) {
      const inv = await tx.invoice.findUniqueOrThrow({ where: { id: alloc.invoiceId } });
      const nextPaid = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        new Prisma.Decimal(inv.amountPaid.toString()).minus(alloc.amount.toString()),
      );
      const nextDue = new Prisma.Decimal(inv.totalAmount.toString()).minus(nextPaid);
      const nextStatus = nextDue.eq(0)
        ? "PAID"
        : nextPaid.gt(0)
          ? "PARTIALLY_PAID"
          : "ISSUED";
      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          amountPaid: nextPaid,
          amountDue: nextDue,
          status: nextStatus,
          paidAt: nextStatus === "PAID" ? inv.paidAt : null,
        },
      });
    }

    await tx.paymentAllocation.deleteMany({ where: { subscriptionPaymentId: paymentId } });

    return tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: "REVERSED",
        reversedAt: new Date(),
        reversalReason: reason,
        reversedByUserId: actorUserId ?? null,
      },
    });
  });

  await recordAudit({
    action: "billing.payment_reversed",
    entityType: "SubscriptionPayment",
    entityId: paymentId,
    organizationId: previous.organizationId,
    actorUserId,
    previousValues: { status: previous.status, amount: previous.amount.toString() },
    newValues: { status: updated.status },
    metadata: { reason },
  });

  return updated;
}

// Re-export helpers so callers don't have to reach into internal modules
export { CYCLE_MONTHS };
