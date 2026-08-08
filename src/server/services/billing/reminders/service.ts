import "server-only";
import type { Invoice } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { logger } from "@/server/logger";
import { notify } from "@/server/services/notifications.service";
import { toDecimal } from "@/lib/formatters/money";
import { renderBillingEmail } from "../emails/templates";
import { resolveBillingSettings } from "../settings/resolved.service";

/**
 * Payment reminder service.
 *
 * Iterates all `ISSUED / SENT / PARTIALLY_PAID / OVERDUE` invoices and, based
 * on the resolved reminder schedule for each org, sends the next-eligible
 * reminder stage. Per-invoice/per-stage idempotency is achieved by writing
 * a marker on the `Notification.entityType/entityId` (invoice + stage key)
 * — a duplicate send is a no-op.
 */

export interface RemindersRunSummary {
  invoicesConsidered: number;
  remindersSent: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ invoiceId: string; error: string }>;
}

export async function sendDueReminders(options: {
  now?: Date;
  organizationIds?: string[];
  actorUserId?: string | null;
} = {}): Promise<RemindersRunSummary> {
  const now = options.now ?? new Date();
  const summary: RemindersRunSummary = {
    invoicesConsidered: 0,
    remindersSent: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  const candidates = await prisma.invoice.findMany({
    where: {
      status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"] },
      dueDate: { not: null },
      ...(options.organizationIds
        ? { organizationId: { in: options.organizationIds } }
        : {}),
    },
    include: {
      organization: {
        include: {
          profile: true,
          members: {
            where: { role: { in: ["INVESTOR_OWNER", "AGENCY_OWNER"] } },
            include: { user: { select: { id: true, email: true, name: true } } },
            take: 5,
          },
        },
      },
    },
  });

  summary.invoicesConsidered = candidates.length;

  for (const invoice of candidates) {
    try {
      const settings = await resolveBillingSettings(invoice.organizationId);
      if (!settings.billingEnabled || !settings.automation.reminders) {
        summary.skipped++;
        continue;
      }
      const stage = pickReminderStage(invoice.dueDate!, now, settings.reminderSchedule);
      if (!stage) {
        summary.skipped++;
        continue;
      }
      const marker = `${invoice.id}:${stage.templateKey}`;

      // Idempotency check — has this exact stage already been sent?
      const previous = await prisma.notification.findFirst({
        where: {
          category: "BILLING",
          entityType: "InvoiceReminder",
          entityId: marker,
        },
        select: { id: true },
      });
      if (previous) {
        summary.skipped++;
        continue;
      }

      const recipients = invoice.organization.members
        .map((m) => m.user)
        .filter((u): u is { id: string; email: string; name: string } => Boolean(u?.email));
      if (recipients.length === 0) {
        summary.skipped++;
        continue;
      }

      const email = await renderBillingEmail(stage.templateKey, {
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: toDecimal(invoice.totalAmount.toString()).toString(),
        amountDue: toDecimal(invoice.amountDue.toString()).toString(),
        currency: invoice.currency,
        dueDate: invoice.dueDate!.toISOString().slice(0, 10),
        organizationName: invoice.organization.name,
        daysOverdue: Math.max(
          0,
          Math.floor((now.getTime() - invoice.dueDate!.getTime()) / (24 * 60 * 60 * 1000)),
        ).toString(),
      });

      for (const rcpt of recipients) {
        await notify({
          organizationId: invoice.organizationId,
          userId: rcpt.id,
          category: "BILLING",
          title: email.subject,
          message: email.text.slice(0, 500),
          entityType: "InvoiceReminder",
          entityId: marker,
          actionUrl: `/podesavanja/fakture/${invoice.id}`,
          email:
            stage.channel === "notification"
              ? null
              : {
                  to: rcpt.email,
                  message: {
                    to: rcpt.email,
                    subject: email.subject,
                    text: email.text,
                    html: email.html,
                  },
                },
        });
      }

      await recordAudit({
        action: "billing.reminder_sent",
        entityType: "Invoice",
        entityId: invoice.id,
        organizationId: invoice.organizationId,
        actorUserId: options.actorUserId ?? null,
        metadata: { stage: stage.templateKey, recipients: recipients.map((r) => r.email) },
      });

      summary.remindersSent++;
    } catch (err) {
      summary.errors++;
      summary.errorDetails.push({
        invoiceId: invoice.id,
        error: (err as Error)?.message ?? "unknown",
      });
      logger.error("billing.reminder_failed", {
        invoiceId: invoice.id,
        error: (err as Error)?.message,
      });
    }
  }

  return summary;
}

/**
 * Pick the current reminder stage for a given invoice due date. Returns the
 * stage whose `offsetDays` is closest to (dueDate - now) without overshooting
 * — that is, the most recent stage whose day has arrived.
 */
export function pickReminderStage(
  dueDate: Date,
  now: Date,
  schedule: Array<{ offsetDays: number; templateKey: string; channel: "email" | "notification" | "both" }>,
): { offsetDays: number; templateKey: string; channel: "email" | "notification" | "both" } | null {
  const daysFromDue = Math.floor(
    (now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000),
  );
  // We iterate offsets in ascending order (most negative to most positive)
  // and pick the largest offset whose day has arrived (offsetDays <= daysFromDue).
  const sorted = [...schedule].sort((a, b) => a.offsetDays - b.offsetDays);
  let picked: (typeof sorted)[number] | null = null;
  for (const stage of sorted) {
    if (stage.offsetDays <= daysFromDue) picked = stage;
  }
  return picked;
}

export type { Invoice };
