import "server-only";
import type {
  BillingCycle,
  BillingSequenceScope,
  ElectronicInvoiceProviderType,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";

/**
 * Resolved billing settings.
 *
 * Combines the singleton `GlobalBillingSettings` row with the per-org
 * `OrganizationBillingSettings` overrides. This is the ONLY place that
 * knows how to merge those two sources — every job, service, and UI page
 * that needs to know "is X enabled for this tenant" MUST call
 * `resolveBillingSettings(organizationId)`.
 */

export interface BillingReminderStage {
  /** Days relative to the invoice due date. Negative = before, 0 = on day of, positive = after. */
  offsetDays: number;
  templateKey: string;
  channel: "email" | "notification" | "both";
  label?: string;
}

export interface ResolvedBillingSettings {
  organizationId: string | null;
  billingEnabled: boolean;
  automation: {
    generateInvoices: boolean;
    sendInvoices: boolean;
    reminders: boolean;
    overdue: boolean;
    extendSubscriptions: boolean;
    restrictAccess: boolean;
    suspend: boolean;
    requireManualConfirmation: boolean;
  };
  numbering: {
    format: string;
    scope: BillingSequenceScope;
    locale: string;
  };
  currency: string;
  defaultBillingCycle: BillingCycle;
  defaultTrialDays: number;
  defaultDueInDays: number;
  gracePeriodDays: number;
  restrictedAfterDays: number;
  suspendedAfterDays: number;
  ipsQrEnabled: boolean;
  electronicInvoiceEnabled: boolean;
  electronicInvoiceProvider: ElectronicInvoiceProviderType;
  invoiceFooterNote: string | null;
  reminderSchedule: BillingReminderStage[];
  restrictedModeAllowedPermissions: string[];
  /**
   * When `true`, `issueInvoice` converts an EUR draft into a RSD invoice
   * using the exchange rate on the issue date. Applies to SaaS invoices
   * for domestic (Serbian) clients who require dinarska protivvrednost.
   */
  invoiceInRsd: boolean;
}

const DEFAULT_REMINDER_SCHEDULE: BillingReminderStage[] = [
  { offsetDays: -3, templateKey: "reminder.pre_due", channel: "both", label: "3 dana pre isteka" },
  { offsetDays: 0, templateKey: "reminder.due_day", channel: "both", label: "Dan dospeća" },
  { offsetDays: 3, templateKey: "reminder.post_due", channel: "both", label: "3 dana posle" },
  { offsetDays: 7, templateKey: "reminder.final_notice", channel: "both", label: "7 dana posle (poslednja opomena)" },
];

const DEFAULT_RESTRICTED_PERMISSIONS = [
  "organization.read",
  "billing.read",
  "billing.subscription.read",
  "billing.invoice.read",
  "billing.payment.read",
  "document.read",
];

const DEFAULT_RESOLVED: ResolvedBillingSettings = {
  organizationId: null,
  billingEnabled: true,
  automation: {
    generateInvoices: true,
    sendInvoices: true,
    reminders: true,
    overdue: true,
    extendSubscriptions: true,
    restrictAccess: true,
    suspend: false,
    requireManualConfirmation: false,
  },
  numbering: {
    format: "PD-{YYYY}-{SEQ:6}",
    scope: "GLOBAL_YEARLY",
    locale: "sr-Latn-RS",
  },
  currency: "EUR",
  defaultBillingCycle: "MONTHLY",
  defaultTrialDays: 14,
  defaultDueInDays: 15,
  gracePeriodDays: 7,
  restrictedAfterDays: 15,
  suspendedAfterDays: 45,
  ipsQrEnabled: true,
  electronicInvoiceEnabled: false,
  electronicInvoiceProvider: "MANUAL",
  invoiceFooterNote: null,
  reminderSchedule: DEFAULT_REMINDER_SCHEDULE,
  restrictedModeAllowedPermissions: DEFAULT_RESTRICTED_PERMISSIONS,
  invoiceInRsd: false,
};

function parseReminderSchedule(raw: unknown): BillingReminderStage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: BillingReminderStage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const offsetDays = Number(e.offsetDays);
    const templateKey = typeof e.templateKey === "string" ? e.templateKey : null;
    if (!Number.isFinite(offsetDays) || !templateKey) continue;
    const channelRaw = typeof e.channel === "string" ? e.channel : "both";
    const channel: BillingReminderStage["channel"] =
      channelRaw === "email" || channelRaw === "notification" || channelRaw === "both"
        ? channelRaw
        : "both";
    const label = typeof e.label === "string" ? e.label : undefined;
    out.push({ offsetDays, templateKey, channel, label });
  }
  return out.length > 0 ? out : null;
}

function parseStringArray(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw.filter((v): v is string => typeof v === "string" && v.length > 0);
  return out.length > 0 ? out : null;
}

/**
 * Resolve billing settings for a given organization. Pass `null` to get the
 * pure global defaults (useful for jobs iterating across all orgs).
 */
export async function resolveBillingSettings(
  organizationId: string | null,
): Promise<ResolvedBillingSettings> {
  const [global, override] = await Promise.all([
    prisma.globalBillingSettings.findFirst({ where: { active: true } }),
    organizationId
      ? prisma.organizationBillingSettings.findUnique({
          where: { organizationId },
        })
      : Promise.resolve(null),
  ]);

  const base: ResolvedBillingSettings = { ...DEFAULT_RESOLVED, organizationId };

  if (global) {
    base.billingEnabled = global.billingEnabled;
    base.automation = {
      generateInvoices: global.autoGenerateInvoicesEnabled,
      sendInvoices: global.autoSendInvoicesEnabled,
      reminders: global.autoRemindersEnabled,
      overdue: global.autoOverdueEnabled,
      extendSubscriptions: global.autoExtendSubscriptions,
      restrictAccess: global.autoRestrictAccessEnabled,
      suspend: global.autoSuspendEnabled,
      requireManualConfirmation: global.requireManualConfirmation,
    };
    base.numbering = {
      format: global.invoiceNumberFormat,
      scope: global.invoiceNumberScope,
      locale: global.invoiceLocaleTag,
    };
    base.currency = global.defaultCurrency;
    base.defaultBillingCycle = global.defaultBillingCycle;
    base.defaultTrialDays = global.defaultTrialDays;
    base.defaultDueInDays = global.defaultDueInDays;
    base.gracePeriodDays = global.defaultGracePeriodDays;
    base.restrictedAfterDays = global.restrictedAfterDays;
    base.suspendedAfterDays = global.suspendedAfterDays;
    base.ipsQrEnabled = global.ipsQrEnabled;
    base.electronicInvoiceEnabled = global.electronicInvoiceEnabled;
    base.electronicInvoiceProvider = global.electronicInvoiceProvider;
    base.invoiceFooterNote = global.invoiceFooterNote ?? null;
    base.invoiceInRsd = global.defaultInvoiceInRsd;
    const rs = parseReminderSchedule(global.reminderSchedule);
    if (rs) base.reminderSchedule = rs;
    const ra = parseStringArray(global.restrictedModeAllowedPermissions);
    if (ra) base.restrictedModeAllowedPermissions = ra;
  }

  if (!override) return base;

  switch (override.mode) {
    case "BILLING_DISABLED":
      return { ...base, billingEnabled: false };
    case "USE_GLOBAL_SETTINGS":
      return base;
    case "CUSTOM_SETTINGS": {
      // Apply per-field overrides. Non-null wins.
      const merged: ResolvedBillingSettings = {
        ...base,
        automation: { ...base.automation },
      };
      if (override.billingEnabled != null) merged.billingEnabled = override.billingEnabled;
      if (override.autoGenerateInvoicesEnabled != null)
        merged.automation.generateInvoices = override.autoGenerateInvoicesEnabled;
      if (override.autoSendInvoicesEnabled != null)
        merged.automation.sendInvoices = override.autoSendInvoicesEnabled;
      if (override.autoRemindersEnabled != null)
        merged.automation.reminders = override.autoRemindersEnabled;
      if (override.autoOverdueEnabled != null)
        merged.automation.overdue = override.autoOverdueEnabled;
      if (override.autoExtendSubscriptions != null)
        merged.automation.extendSubscriptions = override.autoExtendSubscriptions;
      if (override.autoRestrictAccessEnabled != null)
        merged.automation.restrictAccess = override.autoRestrictAccessEnabled;
      if (override.autoSuspendEnabled != null)
        merged.automation.suspend = override.autoSuspendEnabled;
      if (override.gracePeriodDays != null) merged.gracePeriodDays = override.gracePeriodDays;
      if (override.dueInDays != null) merged.defaultDueInDays = override.dueInDays;
      if (override.restrictedAfterDays != null)
        merged.restrictedAfterDays = override.restrictedAfterDays;
      if (override.suspendedAfterDays != null)
        merged.suspendedAfterDays = override.suspendedAfterDays;
      if (override.ipsQrEnabled != null) merged.ipsQrEnabled = override.ipsQrEnabled;
      if (override.electronicInvoiceEnabled != null)
        merged.electronicInvoiceEnabled = override.electronicInvoiceEnabled;
      if (override.electronicInvoiceProvider != null)
        merged.electronicInvoiceProvider = override.electronicInvoiceProvider;
      if (override.invoiceFooterNote != null)
        merged.invoiceFooterNote = override.invoiceFooterNote;
      if (override.invoiceInRsd != null) merged.invoiceInRsd = override.invoiceInRsd;
      const rs = parseReminderSchedule(override.reminderSchedule);
      if (rs) merged.reminderSchedule = rs;
      return merged;
    }
  }
}

/**
 * Version of `resolveBillingSettings` that always returns just the pure
 * defaults (never touches the DB). Used only for unit tests / bootstrap.
 */
export function resolveDefaultBillingSettings(): ResolvedBillingSettings {
  return { ...DEFAULT_RESOLVED };
}

export { DEFAULT_REMINDER_SCHEDULE, DEFAULT_RESTRICTED_PERMISSIONS };
