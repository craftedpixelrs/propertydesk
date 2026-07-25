import "server-only";
import { createId } from "@paralleldrive/cuid2";
import { Prisma } from "@prisma/client";
import type {
  BillingSettingsMode,
  ElectronicInvoiceProviderType,
  OrganizationBillingSettings,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";

/**
 * Per-organization billing overrides.
 *
 * The `mode` field decides how the row is interpreted:
 *   - `USE_GLOBAL_SETTINGS` — all overrides are ignored (default).
 *   - `CUSTOM_SETTINGS`     — any non-null field overrides the global value.
 *   - `BILLING_DISABLED`    — invoicing / automation completely off for this org.
 */

export interface OrganizationBillingSettingsInput {
  mode?: BillingSettingsMode;
  billingEnabled?: boolean | null;
  autoGenerateInvoicesEnabled?: boolean | null;
  autoSendInvoicesEnabled?: boolean | null;
  autoRemindersEnabled?: boolean | null;
  autoOverdueEnabled?: boolean | null;
  autoExtendSubscriptions?: boolean | null;
  autoRestrictAccessEnabled?: boolean | null;
  autoSuspendEnabled?: boolean | null;
  gracePeriodDays?: number | null;
  dueInDays?: number | null;
  restrictedAfterDays?: number | null;
  suspendedAfterDays?: number | null;
  reminderSchedule?: unknown | null;
  invoiceFooterNote?: string | null;
  ipsQrEnabled?: boolean | null;
  electronicInvoiceEnabled?: boolean | null;
  electronicInvoiceProvider?: ElectronicInvoiceProviderType | null;
  invoiceInRsd?: boolean | null;
}

async function ensureOrgExists(organizationId: string): Promise<void> {
  const exists = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!exists) throw DomainErrors.notFound("Organizacija");
}

export async function getOrganizationBillingSettings(
  organizationId: string,
): Promise<OrganizationBillingSettings | null> {
  return prisma.organizationBillingSettings.findUnique({
    where: { organizationId },
  });
}

export async function getOrCreateOrganizationBillingSettings(
  organizationId: string,
): Promise<OrganizationBillingSettings> {
  await ensureOrgExists(organizationId);
  const existing = await getOrganizationBillingSettings(organizationId);
  if (existing) return existing;
  return prisma.organizationBillingSettings.create({
    data: {
      id: createId(),
      organizationId,
      mode: "USE_GLOBAL_SETTINGS",
    },
  });
}

export async function updateOrganizationBillingSettings(
  organizationId: string,
  input: OrganizationBillingSettingsInput,
  actorUserId: string | null,
): Promise<OrganizationBillingSettings> {
  const previous = await getOrCreateOrganizationBillingSettings(organizationId);

  const data: Prisma.OrganizationBillingSettingsUpdateInput = {};
  if (input.mode !== undefined) data.mode = input.mode;

  const patchNullableBool = (
    key: keyof Pick<
      OrganizationBillingSettingsInput,
      | "billingEnabled"
      | "autoGenerateInvoicesEnabled"
      | "autoSendInvoicesEnabled"
      | "autoRemindersEnabled"
      | "autoOverdueEnabled"
      | "autoExtendSubscriptions"
      | "autoRestrictAccessEnabled"
      | "autoSuspendEnabled"
      | "ipsQrEnabled"
      | "electronicInvoiceEnabled"
      | "invoiceInRsd"
    >,
  ) => {
    if (input[key] === undefined) return;
    (data as Record<string, unknown>)[key] = input[key];
  };

  patchNullableBool("billingEnabled");
  patchNullableBool("autoGenerateInvoicesEnabled");
  patchNullableBool("autoSendInvoicesEnabled");
  patchNullableBool("autoRemindersEnabled");
  patchNullableBool("autoOverdueEnabled");
  patchNullableBool("autoExtendSubscriptions");
  patchNullableBool("autoRestrictAccessEnabled");
  patchNullableBool("autoSuspendEnabled");
  patchNullableBool("ipsQrEnabled");
  patchNullableBool("electronicInvoiceEnabled");
  patchNullableBool("invoiceInRsd");

  if (input.gracePeriodDays !== undefined) data.gracePeriodDays = input.gracePeriodDays;
  if (input.dueInDays !== undefined) data.dueInDays = input.dueInDays;
  if (input.restrictedAfterDays !== undefined) data.restrictedAfterDays = input.restrictedAfterDays;
  if (input.suspendedAfterDays !== undefined) data.suspendedAfterDays = input.suspendedAfterDays;
  if (input.invoiceFooterNote !== undefined) data.invoiceFooterNote = input.invoiceFooterNote;
  if (input.electronicInvoiceProvider !== undefined)
    data.electronicInvoiceProvider = input.electronicInvoiceProvider;

  if (input.reminderSchedule !== undefined) {
    data.reminderSchedule =
      input.reminderSchedule === null
        ? Prisma.DbNull
        : (input.reminderSchedule as Prisma.InputJsonValue);
  }

  const updated = await prisma.organizationBillingSettings.update({
    where: { id: previous.id },
    data,
  });

  await recordAudit({
    action: "billing.org_settings_updated",
    entityType: "OrganizationBillingSettings",
    entityId: updated.id,
    organizationId,
    actorUserId,
    previousValues: previous,
    newValues: updated,
  });

  return updated;
}
