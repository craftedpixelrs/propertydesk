import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import type { Prisma } from "@prisma/client";

/**
 * Audit trail service.
 *
 * `AuditLog` records are conceptually immutable. This module intentionally
 * exposes only a `record()` function — there is no `update`, `delete`, or
 * `patch`. Application code has no path to mutate audit rows.
 */

export type AuditAction =
  // Authentication / accounts
  | "auth.sign_in"
  | "auth.sign_out"
  | "auth.password_reset_request"
  | "auth.password_reset_complete"
  | "auth.email_verified"
  | "auth.account_deactivated"
  // Organizations & tenancy
  | "organization.created"
  | "organization.updated"
  | "organization.suspended"
  | "organization.reactivated"
  | "organization.closed"
  | "organization.member_invited"
  | "organization.member_joined"
  | "organization.member_role_updated"
  | "organization.member_removed"
  | "organization.member_deactivated"
  | "organization.member_reactivated"
  // Platform administration
  | "platform.impersonation_started"
  | "platform.impersonation_stopped"
  | "platform.user_created"
  | "platform.user_updated"
  | "platform.user_banned"
  | "platform.user_unbanned"
  | "platform.plan_created"
  | "platform.plan_updated"
  | "platform.plan_deleted"
  | "platform.plan_archived"
  | "platform.plan_restored"
  | "platform.subscription_updated"
  | "role_override.set"
  | "role_override.reset"
  // Inventory & projects
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "project.archived"
  | "project.restored"
  | "building.created"
  | "building.updated"
  | "building.deleted"
  | "entrance.created"
  | "entrance.updated"
  | "entrance.deleted"
  | "floor.created"
  | "floor.updated"
  | "floor.deleted"
  | "unit.created"
  | "unit.updated"
  | "unit.price_changed"
  | "unit.status_changed"
  | "unit.archived"
  | "unit.restored"
  | "unit.imported"
  | "unit.exported"
  | "unit.import_batch"
  | "unit.bulk_updated"
  // CRM
  | "buyer.created"
  | "buyer.updated"
  | "buyer.assigned"
  | "buyer.archived"
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "activity.recorded"
  // Reservations & sales
  | "reservation.created"
  | "reservation.approved"
  | "reservation.rejected"
  | "reservation.canceled"
  | "reservation.expired"
  | "reservation.converted"
  | "sale.created"
  | "sale.updated"
  | "sale.status_changed"
  | "sale.canceled"
  | "payment_plan.created"
  | "payment_plan.updated"
  | "payment_plan.canceled"
  | "payment_plan.installment_added"
  | "payment_plan_template.created"
  | "payment_plan_template.updated"
  | "payment_plan_template.deleted"
  | "payment.created"
  | "payment.recorded"
  | "payment.reversed"
  // Agencies & commissions
  | "agency.connection_invited"
  | "agency.connection_accepted"
  | "agency.connection_suspended"
  | "agency.connection_terminated"
  | "agency.project_access_granted"
  | "agency.project_access_revoked"
  | "agency.buyer_registered"
  | "agency.buyer_registration_approved"
  | "agency.buyer_registration_rejected"
  | "commission.calculated"
  | "commission.approved"
  | "commission.invoiced"
  | "commission.paid"
  | "commission.adjusted"
  | "commission.canceled"
  // Documents
  | "document.uploaded"
  | "document.deleted"
  | "document.storage_purged"
  // Comments
  | "comment.created"
  | "comment.deleted"
  // Billing — SaaS invoicing / subscriptions / payments
  | "billing.global_settings_updated"
  | "billing.org_settings_updated"
  | "billing.company_profile_updated"
  | "billing.bank_account_created"
  | "billing.bank_account_updated"
  | "billing.bank_account_deactivated"
  | "billing.plan_created"
  | "billing.plan_updated"
  | "billing.plan_archived"
  | "billing.subscription_created"
  | "billing.subscription_activated"
  | "billing.subscription_plan_changed"
  | "billing.subscription_cycle_changed"
  | "billing.subscription_price_changed"
  | "billing.subscription_trial_extended"
  | "billing.subscription_extended"
  | "billing.subscription_restricted"
  | "billing.subscription_suspended"
  | "billing.subscription_canceled"
  | "billing.subscription_reactivated"
  | "billing.invoice_created"
  | "billing.invoice_updated"
  | "billing.invoice_issued"
  | "billing.invoice_sent"
  | "billing.invoice_canceled"
  | "billing.invoice_voided"
  | "billing.invoice_marked_paid"
  | "billing.invoice_pdf_generated"
  | "billing.payment_recorded"
  | "billing.payment_allocated"
  | "billing.payment_reversed"
  | "billing.bank_statement_imported"
  | "billing.bank_statement_transaction_matched"
  | "billing.bank_statement_transaction_ignored"
  | "billing.reminder_sent"
  | "billing.overdue_transition"
  | "billing.sef_submitted"
  | "billing.sef_retry"
  | "billing.job_run"
  | "billing.email_template_updated"
  | "billing.email_template_test_sent"
  | "billing.exchange_rate_created"
  | "billing.exchange_rate_deleted"
  // Faza 8 — v1 launch closer
  | "sale_contract_template.created"
  | "sale_contract_template.updated"
  | "sale_contract_template.deleted"
  | "sale.contract_generated"
  | "sale.contract_sent"
  | "sale.contract_signed"
  | "sale.contract_canceled"
  | "reservation_request.created"
  | "reservation_request.confirmed"
  | "reservation_request.declined"
  | "reservation_request.expired"
  | "project.costs_updated"
  | "project.cloned"
  | "project.microsite_toggled"
  | "buyer.kyc_updated"
  | "agency.referral_generated"
  | "system.backup_verified"
  | "system.backup_verify_failed"
  // Property Desk internal team + marketing pipeline
  | "property_desk_team.member_added"
  | "property_desk_team.member_updated"
  | "property_desk_team.member_removed"
  | "marketing_lead.created"
  | "marketing_lead.updated"
  | "marketing_lead.stage_changed"
  | "marketing_lead.reopened"
  | "marketing_lead.assigned"
  | "marketing_lead.converted"
  | "marketing_lead.bulk_updated";

export interface RecordAuditInput {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  organizationId?: string | null;
  actorUserId?: string | null;
  impersonatedByUserId?: string | null;
  previousValues?: unknown;
  newValues?: unknown;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Fields that must never be persisted in the audit trail even if callers
 * accidentally pass them via `previousValues` / `newValues`.
 */
const REDACTED_FIELDS = new Set([
  "password",
  "passwordHash",
  "hashedPassword",
  "resetToken",
  "verificationToken",
  "accessToken",
  "refreshToken",
  "idToken",
  "sessionToken",
  "smtpPassword",
  "apiKey",
  "secret",
]);

export function redactSensitive<T>(value: T): T {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item)) as unknown as T;
  }
  if (typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACTED_FIELDS.has(k)) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object") {
      out[k] = redactSensitive(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    // Best-effort IP + UA capture from the request headers when the caller
    // didn't supply them explicitly.
    let ipAddress = input.ipAddress ?? null;
    let userAgent = input.userAgent ?? null;
    if (ipAddress == null || userAgent == null) {
      try {
        const hdrs = await headers();
        ipAddress ??=
          hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          hdrs.get("x-real-ip") ??
          null;
        userAgent ??= hdrs.get("user-agent") ?? null;
      } catch {
        // headers() is only available inside a request scope; ignore otherwise.
      }
    }

    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        organizationId: input.organizationId ?? null,
        actorUserId: input.actorUserId ?? null,
        impersonatedByUserId: input.impersonatedByUserId ?? null,
        previousValues:
          (redactSensitive(input.previousValues) as Prisma.InputJsonValue) ??
          undefined,
        newValues:
          (redactSensitive(input.newValues) as Prisma.InputJsonValue) ??
          undefined,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    // Audit failures must never break the calling operation but must be
    // loudly logged so operators can investigate.
    logger.error("audit.record_failed", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      error: (err as Error)?.message,
    });
  }
}
