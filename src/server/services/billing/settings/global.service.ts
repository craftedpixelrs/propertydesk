import "server-only";
import { createId } from "@paralleldrive/cuid2";
import type {
  BillingCycle,
  BillingSequenceScope,
  ElectronicInvoiceProviderType,
  GlobalBillingSettings,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";

/**
 * CRUD for the singleton `GlobalBillingSettings` row.
 *
 * There is at all times exactly one row with `active = true`. Updates are
 * persisted in-place; the concept of "history" is captured through the audit
 * log rather than versioned rows.
 */

export interface GlobalBillingSettingsInput {
  billingEnabled?: boolean;
  autoGenerateInvoicesEnabled?: boolean;
  autoSendInvoicesEnabled?: boolean;
  autoRemindersEnabled?: boolean;
  autoOverdueEnabled?: boolean;
  autoExtendSubscriptions?: boolean;
  autoRestrictAccessEnabled?: boolean;
  autoSuspendEnabled?: boolean;
  requireManualConfirmation?: boolean;
  defaultCurrency?: string;
  defaultInvoiceInRsd?: boolean;
  defaultBillingCycle?: BillingCycle;
  defaultTrialDays?: number;
  defaultGracePeriodDays?: number;
  defaultDueInDays?: number;
  restrictedAfterDays?: number;
  suspendedAfterDays?: number;
  invoiceNumberFormat?: string;
  invoiceNumberScope?: BillingSequenceScope;
  invoiceLocaleTag?: string;
  invoiceFooterNote?: string | null;
  ipsQrEnabled?: boolean;
  electronicInvoiceEnabled?: boolean;
  electronicInvoiceProvider?: ElectronicInvoiceProviderType;
  reminderSchedule?: unknown;
  restrictedModeAllowedPermissions?: unknown;
}

export async function getGlobalBillingSettings(): Promise<GlobalBillingSettings | null> {
  return prisma.globalBillingSettings.findFirst({ where: { active: true } });
}

/**
 * Return the current active settings, creating a default row if none exists.
 * Concurrency-safe: relies on the `active = true` unique partial index.
 */
export async function getOrCreateGlobalBillingSettings(): Promise<GlobalBillingSettings> {
  const existing = await getGlobalBillingSettings();
  if (existing) return existing;
  try {
    return await prisma.globalBillingSettings.create({
      data: {
        id: createId(),
        active: true,
      },
    });
  } catch (err) {
    // Someone else raced us — fall back to whatever is now on disk.
    const race = await getGlobalBillingSettings();
    if (race) return race;
    throw err;
  }
}

export async function updateGlobalBillingSettings(
  input: GlobalBillingSettingsInput,
  actorUserId: string | null,
): Promise<GlobalBillingSettings> {
  const previous = await getOrCreateGlobalBillingSettings();

  const data: Prisma.GlobalBillingSettingsUpdateInput = {};
  const patch = (key: keyof GlobalBillingSettingsInput) => {
    const value = input[key];
    if (value === undefined) return;
    (data as Record<string, unknown>)[key] = value;
  };

  (
    [
      "billingEnabled",
      "autoGenerateInvoicesEnabled",
      "autoSendInvoicesEnabled",
      "autoRemindersEnabled",
      "autoOverdueEnabled",
      "autoExtendSubscriptions",
      "autoRestrictAccessEnabled",
      "autoSuspendEnabled",
      "requireManualConfirmation",
      "defaultCurrency",
      "defaultInvoiceInRsd",
      "defaultBillingCycle",
      "defaultTrialDays",
      "defaultGracePeriodDays",
      "defaultDueInDays",
      "restrictedAfterDays",
      "suspendedAfterDays",
      "invoiceNumberFormat",
      "invoiceNumberScope",
      "invoiceLocaleTag",
      "ipsQrEnabled",
      "electronicInvoiceEnabled",
      "electronicInvoiceProvider",
    ] as const
  ).forEach(patch);

  if (input.invoiceFooterNote !== undefined) {
    data.invoiceFooterNote = input.invoiceFooterNote ?? null;
  }
  if (input.reminderSchedule !== undefined) {
    data.reminderSchedule = (input.reminderSchedule ?? []) as Prisma.InputJsonValue;
  }
  if (input.restrictedModeAllowedPermissions !== undefined) {
    data.restrictedModeAllowedPermissions =
      (input.restrictedModeAllowedPermissions ?? []) as Prisma.InputJsonValue;
  }

  const updated = await prisma.globalBillingSettings.update({
    where: { id: previous.id },
    data,
  });

  await recordAudit({
    action: "billing.global_settings_updated",
    entityType: "GlobalBillingSettings",
    entityId: updated.id,
    actorUserId,
    previousValues: previous,
    newValues: updated,
  });

  return updated;
}

/**
 * Validate a proposed invoice number format template. Accepts the following
 * tokens: `{YYYY}`, `{YY}`, `{MM}`, `{ORG}`, `{SEQ}`, `{SEQ:N}` where N is
 * the desired padding width (1..10).
 */
export function assertValidInvoiceNumberFormat(format: string): void {
  if (typeof format !== "string" || format.length === 0 || format.length > 64) {
    throw DomainErrors.badRequest("Format broja fakture nije validan.");
  }
  if (!/\{SEQ(?::\d+)?\}/.test(format)) {
    throw DomainErrors.badRequest(
      "Format broja fakture mora sadržati {SEQ} ili {SEQ:N} placeholder.",
    );
  }
  const tokens = format.match(/\{[^}]+\}/g) ?? [];
  const allowed = /^\{(YYYY|YY|MM|ORG|SEQ|SEQ:\d{1,2})\}$/;
  for (const t of tokens) {
    if (!allowed.test(t)) {
      throw DomainErrors.badRequest(`Nepoznat placeholder u formatu: ${t}`);
    }
  }
}
