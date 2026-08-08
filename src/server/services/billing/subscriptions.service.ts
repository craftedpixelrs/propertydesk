import "server-only";
import { Prisma } from "@prisma/client";
import type {
  BillingCycle,
  BillingPaymentMethod,
  OrganizationSubscription,
  Prisma as PrismaTypes,
  SubscriptionStatus,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import { toDecimal } from "@/lib/formatters/money";

/**
 * Subscription lifecycle service.
 *
 * Every mutation that affects tenant access or billing state requires an
 * explicit `reason` string, which is persisted in the audit metadata.
 */

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
  CUSTOM: 1,
};

/** Add the number of months corresponding to a billing cycle to a Date. */
export function addCycle(from: Date, cycle: BillingCycle): Date {
  const months = CYCLE_MONTHS[cycle];
  const next = new Date(from.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/** Compute the cycle price from a plan. Callers may pass an explicit override. */
export function priceForCycle(
  plan: {
    monthlyPrice: PrismaTypes.Decimal | number | string;
    quarterlyPrice: PrismaTypes.Decimal | number | string | null;
    semiAnnualPrice: PrismaTypes.Decimal | number | string | null;
    annualPrice: PrismaTypes.Decimal | number | string | null;
  },
  cycle: BillingCycle,
): PrismaTypes.Decimal {
  const monthly = toDecimal(plan.monthlyPrice);
  switch (cycle) {
    case "MONTHLY":
      return new Prisma.Decimal(monthly.toString());
    case "QUARTERLY":
      return plan.quarterlyPrice != null
        ? new Prisma.Decimal(toDecimal(plan.quarterlyPrice).toString())
        : new Prisma.Decimal(monthly.times(3).toString());
    case "SEMI_ANNUAL":
      return plan.semiAnnualPrice != null
        ? new Prisma.Decimal(toDecimal(plan.semiAnnualPrice).toString())
        : new Prisma.Decimal(monthly.times(6).toString());
    case "ANNUAL":
      return plan.annualPrice != null
        ? new Prisma.Decimal(toDecimal(plan.annualPrice).toString())
        : new Prisma.Decimal(monthly.times(12).toString());
    case "CUSTOM":
      return new Prisma.Decimal(monthly.toString());
  }
}

async function loadSubscription(
  organizationId: string,
): Promise<OrganizationSubscription & { plan: { code: string; currency: string } }> {
  const sub = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
    include: { plan: { select: { code: true, currency: true } } },
  });
  if (!sub) throw DomainErrors.notFound("Pretplata");
  return sub;
}

function assertReason(reason: string | null | undefined, label: string): void {
  if (!reason || reason.trim().length === 0) {
    throw DomainErrors.badRequest(`Molimo unesite razlog za: ${label}.`);
  }
}

// -----------------------------------------------------------------------------
// Lifecycle mutations
// -----------------------------------------------------------------------------

export interface ActivateSubscriptionInput {
  organizationId: string;
  cycle?: BillingCycle;
  paymentMethod?: BillingPaymentMethod;
  customPrice?: number | null;
  customInvoiceNote?: string | null;
  reason: string;
}

export async function activateSubscription(
  input: ActivateSubscriptionInput,
  actorUserId: string | null,
): Promise<OrganizationSubscription> {
  assertReason(input.reason, "aktivacija pretplate");
  const sub = await loadSubscription(input.organizationId);

  const plan = await prisma.saaSPlan.findUniqueOrThrow({ where: { id: sub.planId } });
  const cycle = input.cycle ?? sub.billingCycle ?? "MONTHLY";
  const price =
    input.customPrice != null
      ? new Prisma.Decimal(input.customPrice)
      : priceForCycle(plan, cycle);

  const now = new Date();
  const periodStart = sub.currentPeriodStart ?? now;
  const periodEnd = addCycle(periodStart, cycle);

  const updated = await prisma.organizationSubscription.update({
    where: { organizationId: input.organizationId },
    data: {
      status: "ACTIVE",
      billingCycle: cycle,
      paymentMethod: input.paymentMethod ?? sub.paymentMethod,
      price,
      customPrice: input.customPrice != null,
      customInvoiceNote:
        input.customInvoiceNote === undefined ? undefined : input.customInvoiceNote,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextBillingDate: periodEnd,
      gracePeriodEndsAt: null,
      restrictedAt: null,
      suspendedAt: null,
      canceledAt: null,
      cancelAtPeriodEnd: false,
      autoRenew: true,
    },
  });

  await prisma.organizationProfile.update({
    where: { organizationId: input.organizationId },
    data: { status: "ACTIVE" },
  });

  await recordAudit({
    action: "billing.subscription_activated",
    entityType: "OrganizationSubscription",
    entityId: sub.id,
    organizationId: input.organizationId,
    actorUserId,
    previousValues: sub,
    newValues: updated,
    metadata: { reason: input.reason },
  });

  return updated;
}

export async function changeSubscriptionPlan(
  organizationId: string,
  newPlanId: string,
  reason: string,
  actorUserId: string | null,
): Promise<OrganizationSubscription> {
  assertReason(reason, "promena plana");
  const sub = await loadSubscription(organizationId);
  if (sub.planId === newPlanId) return sub;

  const nextPlan = await prisma.saaSPlan.findUnique({ where: { id: newPlanId } });
  if (!nextPlan) throw DomainErrors.notFound("Plan");

  const nextPrice = sub.customPrice
    ? sub.price
    : priceForCycle(nextPlan, sub.billingCycle);

  const updated = await prisma.organizationSubscription.update({
    where: { organizationId },
    data: {
      planId: newPlanId,
      price: nextPrice,
      currency: nextPlan.currency,
    },
  });

  await recordAudit({
    action: "billing.subscription_plan_changed",
    entityType: "OrganizationSubscription",
    entityId: sub.id,
    organizationId,
    actorUserId,
    previousValues: { planId: sub.planId, price: sub.price },
    newValues: { planId: updated.planId, price: updated.price },
    metadata: { reason },
  });

  return updated;
}

export async function changeSubscriptionCycle(
  organizationId: string,
  newCycle: BillingCycle,
  reason: string,
  actorUserId: string | null,
): Promise<OrganizationSubscription> {
  assertReason(reason, "promena ciklusa naplate");
  const sub = await loadSubscription(organizationId);
  if (sub.billingCycle === newCycle) return sub;

  const plan = await prisma.saaSPlan.findUniqueOrThrow({ where: { id: sub.planId } });
  const nextPrice = sub.customPrice ? sub.price : priceForCycle(plan, newCycle);

  // Recompute the current period end from the current start under the new cycle.
  const periodStart = sub.currentPeriodStart ?? new Date();
  const periodEnd = addCycle(periodStart, newCycle);

  const updated = await prisma.organizationSubscription.update({
    where: { organizationId },
    data: {
      billingCycle: newCycle,
      price: nextPrice,
      currentPeriodEnd: periodEnd,
      nextBillingDate: periodEnd,
    },
  });

  await recordAudit({
    action: "billing.subscription_cycle_changed",
    entityType: "OrganizationSubscription",
    entityId: sub.id,
    organizationId,
    actorUserId,
    previousValues: { billingCycle: sub.billingCycle, currentPeriodEnd: sub.currentPeriodEnd },
    newValues: { billingCycle: newCycle, currentPeriodEnd: periodEnd },
    metadata: { reason },
  });

  return updated;
}

export async function changeSubscriptionPrice(
  organizationId: string,
  newPrice: number | null,
  reason: string,
  actorUserId: string | null,
): Promise<OrganizationSubscription> {
  assertReason(reason, "promena cene pretplate");
  const sub = await loadSubscription(organizationId);
  const isCustom = newPrice != null;
  const plan = await prisma.saaSPlan.findUniqueOrThrow({ where: { id: sub.planId } });
  const price = isCustom
    ? new Prisma.Decimal(newPrice)
    : priceForCycle(plan, sub.billingCycle);

  const updated = await prisma.organizationSubscription.update({
    where: { organizationId },
    data: { price, customPrice: isCustom },
  });

  await recordAudit({
    action: "billing.subscription_price_changed",
    entityType: "OrganizationSubscription",
    entityId: sub.id,
    organizationId,
    actorUserId,
    previousValues: { price: sub.price, customPrice: sub.customPrice },
    newValues: { price: updated.price, customPrice: updated.customPrice },
    metadata: { reason },
  });

  return updated;
}

export async function extendTrial(
  organizationId: string,
  additionalDays: number,
  reason: string,
  actorUserId: string | null,
): Promise<OrganizationSubscription> {
  assertReason(reason, "produženje probnog perioda");
  if (!Number.isInteger(additionalDays) || additionalDays <= 0) {
    throw DomainErrors.badRequest("Broj dana mora biti pozitivan ceo broj.");
  }
  const sub = await loadSubscription(organizationId);
  const base = sub.trialEndsAt ?? new Date();
  const nextEnd = new Date(base.getTime() + additionalDays * 24 * 60 * 60 * 1000);

  const updated = await prisma.organizationSubscription.update({
    where: { organizationId },
    data: {
      trialEndsAt: nextEnd,
      status: sub.status === "TRIAL" ? "TRIAL" : sub.status,
    },
  });

  await recordAudit({
    action: "billing.subscription_trial_extended",
    entityType: "OrganizationSubscription",
    entityId: sub.id,
    organizationId,
    actorUserId,
    previousValues: { trialEndsAt: sub.trialEndsAt },
    newValues: { trialEndsAt: updated.trialEndsAt },
    metadata: { reason, additionalDays },
  });

  return updated;
}

/**
 * Manually mark a subscription as RESTRICTED. Used by SUPER_ADMIN when the
 * automated overdue job hasn't picked it up yet. Sets the org profile
 * status to `RESTRICTED` too so the enforcement gate kicks in.
 */
export async function restrictSubscription(
  organizationId: string,
  reason: string,
  actorUserId: string | null,
): Promise<OrganizationSubscription> {
  assertReason(reason, "ograničavanje pristupa");
  const sub = await loadSubscription(organizationId);
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.organizationSubscription.update({
      where: { organizationId },
      data: { status: "RESTRICTED", restrictedAt: now },
    });
    await tx.organizationProfile.update({
      where: { organizationId },
      data: { status: "RESTRICTED" },
    });
    return s;
  });

  await recordAudit({
    action: "billing.subscription_restricted",
    entityType: "OrganizationSubscription",
    entityId: sub.id,
    organizationId,
    actorUserId,
    previousValues: { status: sub.status },
    newValues: { status: "RESTRICTED" },
    metadata: { reason },
  });

  return updated;
}

export async function suspendSubscription(
  organizationId: string,
  reason: string,
  actorUserId: string | null,
): Promise<OrganizationSubscription> {
  assertReason(reason, "suspenzija pretplate");
  const sub = await loadSubscription(organizationId);
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.organizationSubscription.update({
      where: { organizationId },
      data: { status: "SUSPENDED", suspendedAt: now, autoRenew: false },
    });
    await tx.organizationProfile.update({
      where: { organizationId },
      data: { status: "SUSPENDED" },
    });
    return s;
  });

  await recordAudit({
    action: "billing.subscription_suspended",
    entityType: "OrganizationSubscription",
    entityId: sub.id,
    organizationId,
    actorUserId,
    previousValues: { status: sub.status },
    newValues: { status: "SUSPENDED" },
    metadata: { reason },
  });

  return updated;
}

export async function cancelSubscription(
  organizationId: string,
  reason: string,
  actorUserId: string | null,
  options: { immediate?: boolean } = {},
): Promise<OrganizationSubscription> {
  assertReason(reason, "otkazivanje pretplate");
  const sub = await loadSubscription(organizationId);
  const now = new Date();

  const updated = options.immediate
    ? await prisma.$transaction(async (tx) => {
        const s = await tx.organizationSubscription.update({
          where: { organizationId },
          data: {
            status: "CANCELED",
            canceledAt: now,
            endsAt: now,
            autoRenew: false,
            cancelAtPeriodEnd: false,
          },
        });
        await tx.organizationProfile.update({
          where: { organizationId },
          data: { status: "CLOSED" },
        });
        return s;
      })
    : await prisma.organizationSubscription.update({
        where: { organizationId },
        data: { cancelAtPeriodEnd: true, autoRenew: false },
      });

  await recordAudit({
    action: "billing.subscription_canceled",
    entityType: "OrganizationSubscription",
    entityId: sub.id,
    organizationId,
    actorUserId,
    previousValues: { status: sub.status, cancelAtPeriodEnd: sub.cancelAtPeriodEnd },
    newValues: {
      status: updated.status,
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      canceledAt: updated.canceledAt,
    },
    metadata: { reason, immediate: options.immediate ?? false },
  });

  return updated;
}

export async function reactivateSubscription(
  organizationId: string,
  reason: string,
  actorUserId: string | null,
): Promise<OrganizationSubscription> {
  assertReason(reason, "ponovna aktivacija");
  const sub = await loadSubscription(organizationId);

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.organizationSubscription.update({
      where: { organizationId },
      data: {
        status: "ACTIVE",
        restrictedAt: null,
        suspendedAt: null,
        canceledAt: null,
        cancelAtPeriodEnd: false,
        autoRenew: true,
      },
    });
    await tx.organizationProfile.update({
      where: { organizationId },
      data: { status: "ACTIVE" },
    });
    return s;
  });

  await recordAudit({
    action: "billing.subscription_reactivated",
    entityType: "OrganizationSubscription",
    entityId: sub.id,
    organizationId,
    actorUserId,
    previousValues: { status: sub.status },
    newValues: { status: "ACTIVE" },
    metadata: { reason },
  });

  return updated;
}

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------

export interface SubscriptionSummary {
  id: string;
  organizationId: string;
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  price: PrismaTypes.Decimal;
  currency: string;
  paymentMethod: BillingPaymentMethod;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  nextBillingDate: Date | null;
  trialEndsAt: Date | null;
  gracePeriodEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
  customPrice: boolean;
  customInvoiceNote: string | null;
}

export async function getSubscriptionSummary(
  organizationId: string,
): Promise<SubscriptionSummary | null> {
  const sub = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
    include: { plan: { select: { code: true, name: true } } },
  });
  if (!sub) return null;
  return {
    id: sub.id,
    organizationId: sub.organizationId,
    planCode: sub.plan.code,
    planName: sub.plan.name,
    status: sub.status,
    billingCycle: sub.billingCycle,
    price: sub.price,
    currency: sub.currency,
    paymentMethod: sub.paymentMethod,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    nextBillingDate: sub.nextBillingDate,
    trialEndsAt: sub.trialEndsAt,
    gracePeriodEndsAt: sub.gracePeriodEndsAt,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    autoRenew: sub.autoRenew,
    customPrice: sub.customPrice,
    customInvoiceNote: sub.customInvoiceNote,
  };
}
