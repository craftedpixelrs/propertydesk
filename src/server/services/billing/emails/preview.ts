import "server-only";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import {
  DEFAULT_TEMPLATES,
  composeBillingEmailHtml,
  safeSubstitute,
  type BillingTemplateKey,
} from "./templates";

/**
 * Preview service for billing email templates.
 *
 * Its job is to answer two questions from the admin UI without ever
 * sending real email:
 *
 *   1. "What will this template look like with realistic data?" —
 *      `previewBillingEmail(key, overrides?)`.
 *   2. "Which variables can I use inside this template?" —
 *      `getTemplateVariables(key)`.
 *
 * Sample data lives here rather than in the template files themselves,
 * because we want to keep the shipped default HTML lean and predictable
 * for the render pipeline. Adding a new template key means adding one
 * entry here and one to `DEFAULT_TEMPLATES` — nothing else.
 */

// -----------------------------------------------------------------------------
// Sample data per template key
// -----------------------------------------------------------------------------

/**
 * A base set of variables shared across templates. Individual keys layer
 * their specifics on top. These values are deliberately realistic (a
 * fictional Serbian company, plausible amounts, current-looking dates)
 * so the preview mirrors what the customer will actually receive.
 */
const BASE_SAMPLE: Record<string, string> = {
  organizationName: "AKME Nekretnine d.o.o.",
  supportEmail: "podrska@propertydesk.app",
  appUrl: "https://app.propertydesk.rs",
  currency: "EUR",
};

export const SAMPLE_VARIABLES: Record<BillingTemplateKey, Record<string, string>> = {
  "subscription.trial_started": {
    ...BASE_SAMPLE,
    trialEndsAt: "15.10.2026",
    daysRemaining: "14",
  },
  "subscription.trial_ending": {
    ...BASE_SAMPLE,
    trialEndsAt: "15.10.2026",
    daysRemaining: "3",
  },
  "subscription.activated": {
    ...BASE_SAMPLE,
    planName: "Business",
    billingCycle: "Mesečno",
    nextBillingDate: "15.09.2026",
  },
  "subscription.plan_changed": {
    ...BASE_SAMPLE,
    planName: "Business",
    previousPlan: "Starter",
    price: "49,00",
    billingCycle: "Mesečno",
  },
  "invoice.issued": {
    ...BASE_SAMPLE,
    invoiceNumber: "PD-2026-000147",
    invoiceId: "clzy7q0j40001mn0k8vhw2p1r",
    totalAmount: "13.796,00",
    currency: "RSD",
    dueDate: "15.09.2026",
  },
  "invoice.sent": {
    ...BASE_SAMPLE,
    invoiceNumber: "PD-2026-000147",
    invoiceId: "clzy7q0j40001mn0k8vhw2p1r",
    totalAmount: "13.796,00",
    currency: "RSD",
    dueDate: "15.09.2026",
  },
  "invoice.paid": {
    ...BASE_SAMPLE,
    invoiceNumber: "PD-2026-000147",
    amountPaid: "13.796,00",
    currency: "RSD",
    nextBillingDate: "15.10.2026",
  },
  "invoice.canceled": {
    ...BASE_SAMPLE,
    invoiceNumber: "PD-2026-000147",
    reason: "Duplo izdato — zamenjeno fakturom PD-2026-000148.",
  },
  "reminder.pre_due": {
    ...BASE_SAMPLE,
    invoiceNumber: "PD-2026-000147",
    invoiceId: "clzy7q0j40001mn0k8vhw2p1r",
    amountDue: "13.796,00",
    currency: "RSD",
    dueDate: "15.09.2026",
  },
  "reminder.due_day": {
    ...BASE_SAMPLE,
    invoiceNumber: "PD-2026-000147",
    invoiceId: "clzy7q0j40001mn0k8vhw2p1r",
    amountDue: "13.796,00",
    currency: "RSD",
  },
  "reminder.post_due": {
    ...BASE_SAMPLE,
    invoiceNumber: "PD-2026-000147",
    invoiceId: "clzy7q0j40001mn0k8vhw2p1r",
    amountDue: "13.796,00",
    currency: "RSD",
    daysOverdue: "3",
  },
  "reminder.final_notice": {
    ...BASE_SAMPLE,
    invoiceNumber: "PD-2026-000147",
    invoiceId: "clzy7q0j40001mn0k8vhw2p1r",
    amountDue: "13.796,00",
    currency: "RSD",
    dueDate: "08.09.2026",
  },
  "subscription.restricted": {
    ...BASE_SAMPLE,
    amountDue: "13.796,00",
    currency: "RSD",
  },
  "subscription.suspended": {
    ...BASE_SAMPLE,
  },
};

// -----------------------------------------------------------------------------
// API
// -----------------------------------------------------------------------------

export interface BillingEmailPreview {
  subject: string;
  text: string;
  html: string;
  templateKey: string;
  variables: Record<string, string>;
}

export interface BillingEmailPreviewOptions {
  /**
   * Optional override for `{{variable}}` values. Merged on top of the
   * sample data for the template.
   */
  variables?: Record<string, string>;
  /**
   * Optional draft content — when supplied, these values take precedence
   * over the DB row (or the shipped default). This is what powers the
   * live preview inside the admin editor: as the admin types, the client
   * posts the current `bodyHtml` / `subject` / `bodyText` here so the
   * iframe reflects unsaved changes.
   */
  draft?: { subject?: string; bodyText?: string; bodyHtml?: string };
}

/**
 * Build a full render of the template with sample data (plus optional
 * overrides). Never writes to the DB — used by the admin preview and the
 * "send test email" flow.
 */
export async function previewBillingEmail(
  key: string,
  options: BillingEmailPreviewOptions = {},
): Promise<BillingEmailPreview> {
  const sample = SAMPLE_VARIABLES[key as BillingTemplateKey];
  if (!sample) {
    throw DomainErrors.notFound(`Šablon "${key}"`);
  }
  const merged: Record<string, string> = { ...sample, ...(options.variables ?? {}) };

  const draft = options.draft ?? {};

  // Prefer draft → DB row → default. That way an admin previewing a
  // brand-new change sees exactly what they'd get after saving.
  const row = await prisma.billingEmailTemplate.findUnique({ where: { key } });
  const stored =
    row && row.active
      ? { subject: row.subject, bodyText: row.bodyText, bodyHtml: row.bodyHtml }
      : (() => {
          const fallback = DEFAULT_TEMPLATES.find((t) => t.key === key);
          if (!fallback) throw DomainErrors.notFound(`Šablon "${key}"`);
          return {
            subject: fallback.subject,
            bodyText: fallback.bodyText,
            bodyHtml: fallback.bodyHtml,
          };
        })();

  const source = {
    subject: draft.subject ?? stored.subject,
    bodyText: draft.bodyText ?? stored.bodyText,
    bodyHtml: draft.bodyHtml ?? stored.bodyHtml,
  };

  return {
    subject: safeSubstitute(source.subject, merged),
    text: safeSubstitute(source.bodyText, merged),
    html: composeBillingEmailHtml(key, source.bodyHtml, merged),
    templateKey: key,
    variables: merged,
  };
}

/**
 * Return the list of variables recognised by the given template. Prefers
 * the DB row's `variables` array (which the admin can extend) and falls
 * back to `DEFAULT_TEMPLATES[i].variables`.
 */
export async function getTemplateVariables(key: string): Promise<string[]> {
  const row = await prisma.billingEmailTemplate.findUnique({ where: { key } });
  if (row && Array.isArray(row.variables)) {
    return (row.variables as unknown[]).filter(
      (v): v is string => typeof v === "string",
    );
  }
  const fallback = DEFAULT_TEMPLATES.find((t) => t.key === key);
  return fallback ? [...fallback.variables] : [];
}

/**
 * Return the sample data used by `previewBillingEmail`. Useful when the
 * client wants to render an editable field per variable.
 */
export function getSampleVariables(key: string): Record<string, string> {
  const sample = SAMPLE_VARIABLES[key as BillingTemplateKey];
  return sample ? { ...sample } : { ...BASE_SAMPLE };
}
