import "server-only";
import { Prisma } from "@prisma/client";
import type { Invoice, PrismaClient } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

import { toDecimal } from "@/lib/formatters/money";
import { DomainErrors } from "@/lib/errors";

/**
 * Payment allocation utilities.
 *
 * A single `SubscriptionPayment` can be split across multiple `Invoice`s
 * via `PaymentAllocation` rows. This module owns all the arithmetic that
 * keeps `invoice.amountPaid`, `invoice.amountDue`, and `invoice.status`
 * consistent with the sum of allocated payments.
 */

export type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface AllocationInput {
  invoiceId: string;
  amount: number | string | Prisma.Decimal;
}

/**
 * Given a payment amount and an ordered list of open invoices, split the
 * payment across them (partial + FIFO), returning the allocation plan.
 */
export function computeFifoAllocations(
  amount: Prisma.Decimal,
  invoices: Array<{ id: string; amountDue: Prisma.Decimal | number | string; currency: string }>,
  paymentCurrency: string,
): { allocations: { invoiceId: string; amount: Prisma.Decimal }[]; unapplied: Prisma.Decimal } {
  let remaining = new Prisma.Decimal(amount.toString());
  const out: { invoiceId: string; amount: Prisma.Decimal }[] = [];
  for (const inv of invoices) {
    if (inv.currency !== paymentCurrency) continue;
    if (remaining.lte(0)) break;
    const due = new Prisma.Decimal(toDecimal(inv.amountDue).toString());
    if (due.lte(0)) continue;
    const take = Prisma.Decimal.min(due, remaining);
    if (take.lte(0)) continue;
    out.push({ invoiceId: inv.id, amount: take });
    remaining = remaining.minus(take);
  }
  return { allocations: out, unapplied: remaining };
}

/**
 * Apply a set of allocations against a payment inside an existing transaction.
 * Enforces:
 *   - each allocation amount is positive
 *   - allocations don't exceed the invoice's remaining amountDue
 *   - sum of allocations equals `paymentAmount` (any leftover must be handled
 *     explicitly by the caller as "unapplied credit").
 */
export async function applyAllocations(
  tx: TxClient,
  input: {
    paymentId: string;
    paymentAmount: Prisma.Decimal;
    paymentCurrency: string;
    allocations: AllocationInput[];
    allowOverpay?: boolean;
  },
): Promise<{ updatedInvoices: Invoice[]; totalAllocated: Prisma.Decimal }> {
  const invoiceIds = Array.from(new Set(input.allocations.map((a) => a.invoiceId)));
  if (invoiceIds.length === 0) {
    throw DomainErrors.badRequest("Uplata mora biti dodeljena bar jednoj fakturi.");
  }

  const invoices = await tx.invoice.findMany({ where: { id: { in: invoiceIds } } });
  if (invoices.length !== invoiceIds.length) {
    throw DomainErrors.notFound("Faktura");
  }

  const invById = new Map(invoices.map((i) => [i.id, i]));
  let totalAllocated = new Prisma.Decimal(0);
  const updated: Invoice[] = [];

  for (const alloc of input.allocations) {
    const invoice = invById.get(alloc.invoiceId);
    if (!invoice) throw DomainErrors.notFound("Faktura");
    if (invoice.currency !== input.paymentCurrency) {
      throw DomainErrors.badRequest(
        `Valuta uplate (${input.paymentCurrency}) ne odgovara valuti fakture ${invoice.invoiceNumber} (${invoice.currency}).`,
      );
    }
    if (invoice.status === "CANCELED" || invoice.status === "VOID") {
      throw DomainErrors.invalidState(
        `Fakturi ${invoice.invoiceNumber} u stanju ${invoice.status} nije moguće dodeliti uplatu.`,
      );
    }

    const amount = new Prisma.Decimal(toDecimal(alloc.amount).toString());
    if (amount.lte(0)) {
      throw DomainErrors.badRequest("Iznos alokacije mora biti pozitivan.");
    }

    const due = new Prisma.Decimal(invoice.amountDue.toString());
    if (amount.gt(due) && !input.allowOverpay) {
      throw DomainErrors.badRequest(
        `Iznos ${amount.toString()} premašuje preostalo za fakturu ${invoice.invoiceNumber} (${due.toString()}).`,
      );
    }

    await tx.paymentAllocation.create({
      data: {
        id: createId(),
        subscriptionPaymentId: input.paymentId,
        invoiceId: invoice.id,
        amount,
        currency: input.paymentCurrency,
      },
    });

    const nextPaid = new Prisma.Decimal(invoice.amountPaid.toString()).plus(amount);
    const nextDue = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      new Prisma.Decimal(invoice.totalAmount.toString()).minus(nextPaid),
    );
    const nextStatus = nextDue.eq(0)
      ? "PAID"
      : nextPaid.gt(0)
        ? "PARTIALLY_PAID"
        : invoice.status;

    const written = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: nextPaid,
        amountDue: nextDue,
        status: nextStatus,
        paidAt: nextStatus === "PAID" ? new Date() : invoice.paidAt,
      },
    });
    updated.push(written);
    totalAllocated = totalAllocated.plus(amount);
  }

  if (!input.allowOverpay && totalAllocated.gt(input.paymentAmount)) {
    throw DomainErrors.badRequest(
      "Zbir alokacija je veći od iznosa uplate.",
    );
  }

  return { updatedInvoices: updated, totalAllocated };
}
