import "server-only";
import { Prisma } from "@prisma/client";
import type {
  BillingCycle,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  OrganizationSubscription,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import { DomainErrors } from "@/lib/errors";
import { resolveBillingSettings } from "../settings/resolved.service";
import { addCycle, priceForCycle } from "../subscriptions.service";
import {
  createInvoiceDraft,
  issueInvoice,
  type InvoiceItemInput,
} from "./service";

/**
 * Idempotent automatic invoice generation.
 *
 * Called by:
 *   - the `generate-invoices` cron job (once per day at 09:00 Europe/Belgrade),
 *   - manual "Generate now" buttons in /administracija/naplata/automatizacija.
 *
 * The unique partial index
 *   `invoice_subscription_period_automatic_unique`
 *   ON (subscriptionId, servicePeriodStart) WHERE source = 'AUTOMATIC'
 * makes concurrent invocations safe: any second attempt to insert an
 * AUTOMATIC invoice for the same period fails with a P2002 violation which
 * we treat as "already generated" and skip.
 */

export interface GenerationSummary {
  total: number;
  generated: number;
  skipped: number;
  errors: number;
  invoiceIds: string[];
  errorDetails: Array<{ subscriptionId: string; error: string }>;
}

export interface GenerationOptions {
  now?: Date;
  /** Explicit organization filter. Defaults to "all active tenants". */
  organizationIds?: string[];
  /** Auto-issue the resulting invoices instead of leaving them as DRAFTs. */
  autoIssue?: boolean;
  /** Actor user ID for audit. */
  actorUserId?: string | null;
}

export async function generateDueSubscriptionInvoices(
  options: GenerationOptions = {},
): Promise<GenerationSummary> {
  const now = options.now ?? new Date();
  const summary: GenerationSummary = {
    total: 0,
    generated: 0,
    skipped: 0,
    errors: 0,
    invoiceIds: [],
    errorDetails: [],
  };

  // Find subscriptions whose nextBillingDate is on/before `now` — these need
  // an invoice. Trials without a billing date yet are skipped.
  const candidates = await prisma.organizationSubscription.findMany({
    where: {
      status: { in: ["ACTIVE", "PAYMENT_DUE", "PAST_DUE"] },
      OR: [
        { nextBillingDate: { lte: now } },
        { currentPeriodEnd: { lte: now } },
      ],
      ...(options.organizationIds
        ? { organizationId: { in: options.organizationIds } }
        : {}),
    },
    include: { organization: { include: { profile: true } }, plan: true },
  });

  summary.total = candidates.length;

  for (const sub of candidates) {
    try {
      if (sub.organization.profile?.type === "AGENCY") {
        summary.skipped++;
        continue;
      }
      const settings = await resolveBillingSettings(sub.organizationId);
      if (!settings.billingEnabled || !settings.automation.generateInvoices) {
        summary.skipped++;
        continue;
      }

      // Compute the service period for the new invoice.
      const periodStart = sub.currentPeriodEnd ?? sub.currentPeriodStart ?? now;
      const cycle: BillingCycle = sub.billingCycle;
      const periodEnd = addCycle(periodStart, cycle);
      const price = sub.customPrice
        ? sub.price
        : priceForCycle(sub.plan, cycle);

      const items: InvoiceItemInput[] = [
        {
          type: "SUBSCRIPTION",
          description: buildSubscriptionLineDescription(sub.plan.name, cycle, periodStart, periodEnd),
          quantity: 1,
          unitPrice: Number(price.toString()),
          taxRate: 0,
          metadata: {
            subscriptionId: sub.id,
            planId: sub.planId,
            cycle,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
          },
        },
      ];

      // First automatic invoice adds the onboarding fee if the plan has one
      // and no previous invoices exist for this subscription.
      if (sub.plan.onboardingFee && Number(sub.plan.onboardingFee.toString()) > 0) {
        const previous = await prisma.invoice.count({
          where: { subscriptionId: sub.id, source: "AUTOMATIC" },
        });
        if (previous === 0) {
          items.push({
            type: "ONBOARDING_FEE",
            description: "Jednokratna naknada za aktivaciju",
            quantity: 1,
            unitPrice: Number(sub.plan.onboardingFee.toString()),
            taxRate: 0,
          });
        }
      }

      const draft = await createInvoiceDraft(
        {
          organizationId: sub.organizationId,
          subscriptionId: sub.id,
          planId: sub.planId,
          billingCycle: cycle,
          currency: sub.currency,
          source: "AUTOMATIC",
          servicePeriodStart: periodStart,
          servicePeriodEnd: periodEnd,
          items,
          note: sub.customInvoiceNote ?? null,
        },
        options.actorUserId ?? null,
      ).catch((err) => {
        // Idempotency: if a concurrent run already inserted an AUTOMATIC row
        // for the same (subscriptionId, servicePeriodStart), Postgres rejects
        // with P2002 — we treat that as "already exists" and skip cleanly.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          return null;
        }
        throw err;
      });

      if (!draft) {
        summary.skipped++;
        continue;
      }

      if (options.autoIssue) {
        const issued = await issueInvoice(draft.id, options.actorUserId ?? null);
        summary.invoiceIds.push(issued.id);
      } else {
        summary.invoiceIds.push(draft.id);
      }

      // Move the subscription's nextBillingDate forward so we don't
      // re-invoice for the same period next time. currentPeriodEnd advances
      // only when payment is recorded; nextBillingDate is what drives the
      // job, so shifting it is enough to avoid double-generation.
      await prisma.organizationSubscription.update({
        where: { id: sub.id },
        data: {
          status:
            sub.status === "ACTIVE" ? "PAYMENT_DUE" : sub.status,
          nextBillingDate: periodEnd,
          gracePeriodEndsAt:
            sub.gracePeriodEndsAt ??
            new Date(periodStart.getTime() + settings.gracePeriodDays * 24 * 60 * 60 * 1000),
        },
      });

      summary.generated++;
    } catch (err) {
      summary.errors++;
      summary.errorDetails.push({
        subscriptionId: sub.id,
        error: (err as Error)?.message ?? "unknown",
      });
      logger.error("billing.invoice_generation_failed", {
        subscriptionId: sub.id,
        error: (err as Error)?.message,
      });
    }
  }

  return summary;
}

const UNPAID_ISSUED: InvoiceStatus[] = [
  "ISSUED",
  "SENT",
  "OVERDUE",
  "PARTIALLY_PAID",
];

export async function getInvoiceIssueState(organizationId: string): Promise<{
  canIssue: boolean;
  draftId: string | null;
  unpaidInvoiceId: string | null;
}> {
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      status: { in: [...UNPAID_ISSUED, "DRAFT"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  const draft = invoices.find((i) => i.status === "DRAFT") ?? null;
  const unpaid = invoices.find((i) => UNPAID_ISSUED.includes(i.status)) ?? null;
  return {
    canIssue: Boolean(draft) || !unpaid,
    draftId: draft?.id ?? null,
    unpaidInvoiceId: unpaid?.id ?? null,
  };
}

/**
 * Super-admin "issue invoice now": issue an existing draft, or create the
 * next subscription invoice and issue it immediately.
 */
export async function issueSubscriptionInvoiceNow(
  organizationId: string,
  actorUserId: string | null,
): Promise<Invoice> {
  const state = await getInvoiceIssueState(organizationId);
  if (!state.canIssue) {
    throw DomainErrors.invalidState("Faktura za tekući period je već izdata.");
  }
  if (state.draftId) {
    return issueInvoice(state.draftId, actorUserId);
  }

  const sub = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });
  if (!sub) throw DomainErrors.notFound("Pretplata");

  const settings = await resolveBillingSettings(organizationId);
  if (!settings.billingEnabled) {
    throw DomainErrors.forbidden("Fakturisanje je isključeno za ovu organizaciju.");
  }

  const now = new Date();
  const cycle: BillingCycle = sub.billingCycle;
  const periodStart = sub.currentPeriodEnd ?? sub.currentPeriodStart ?? now;
  const periodEnd = addCycle(periodStart, cycle);
  const price = sub.customPrice ? sub.price : priceForCycle(sub.plan, cycle);

  const items: InvoiceItemInput[] = [
    {
      type: "SUBSCRIPTION",
      description: buildSubscriptionLineDescription(sub.plan.name, cycle, periodStart, periodEnd),
      quantity: 1,
      unitPrice: Number(price.toString()),
      taxRate: 0,
      metadata: {
        subscriptionId: sub.id,
        planId: sub.planId,
        cycle,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
    },
  ];

  if (sub.plan.onboardingFee && Number(sub.plan.onboardingFee.toString()) > 0) {
    const previous = await prisma.invoice.count({
      where: { subscriptionId: sub.id, source: "AUTOMATIC" },
    });
    if (previous === 0) {
      items.push({
        type: "ONBOARDING_FEE",
        description: "Jednokratna naknada za aktivaciju",
        quantity: 1,
        unitPrice: Number(sub.plan.onboardingFee.toString()),
        taxRate: 0,
      });
    }
  }

  const draft = await createInvoiceDraft(
    {
      organizationId,
      subscriptionId: sub.id,
      planId: sub.planId,
      billingCycle: cycle,
      currency: sub.currency,
      source: "AUTOMATIC",
      servicePeriodStart: periodStart,
      servicePeriodEnd: periodEnd,
      items,
      note: sub.customInvoiceNote ?? null,
    },
    actorUserId,
  ).catch((err) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return null;
    }
    throw err;
  });

  const invoiceId =
    draft?.id ??
    (
      await prisma.invoice.findFirst({
        where: {
          subscriptionId: sub.id,
          source: "AUTOMATIC",
          servicePeriodStart: periodStart,
        },
        select: { id: true, status: true },
      })
    )?.id;

  if (!invoiceId) {
    throw DomainErrors.invalidState("Faktura nije mogla da se kreira.");
  }

  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true },
  });
  const issued =
    existing?.status === "DRAFT"
      ? await issueInvoice(invoiceId, actorUserId)
      : await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

  await prisma.organizationSubscription.update({
    where: { id: sub.id },
    data: {
      status:
        sub.status === "ACTIVE" || sub.status === "TRIAL" || sub.status === "EXPIRED"
          ? "PAYMENT_DUE"
          : sub.status,
      nextBillingDate: periodEnd,
      currentPeriodStart: sub.currentPeriodStart ?? periodStart,
      currentPeriodEnd: sub.currentPeriodEnd ?? periodEnd,
    },
  });

  return issued;
}

function buildSubscriptionLineDescription(
  planName: string,
  cycle: BillingCycle,
  start: Date,
  end: Date,
): string {
  const period = `${formatDay(start)}–${formatDay(new Date(end.getTime() - 24 * 60 * 60 * 1000))}`;
  const cycleLabel = cycleLabelSr(cycle);
  return `Pretplata: ${planName} (${cycleLabel}) — period ${period}`;
}

function formatDay(d: Date): string {
  return d
    .toISOString()
    .slice(0, 10)
    .split("-")
    .reverse()
    .join(".");
}

function cycleLabelSr(cycle: BillingCycle): string {
  switch (cycle) {
    case "MONTHLY":
      return "mesečno";
    case "QUARTERLY":
      return "kvartalno";
    case "SEMI_ANNUAL":
      return "polugodišnje";
    case "ANNUAL":
      return "godišnje";
    case "CUSTOM":
      return "prilagođeno";
  }
}

// re-exports so consumers can import from a single module
export type { Invoice, InvoiceItem, OrganizationSubscription };
