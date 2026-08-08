import "server-only";
import type { Invoice } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import { notify } from "@/server/services/notifications.service";
import { renderBillingEmail } from "../emails/templates";
import { resolveBillingSettings } from "../settings/resolved.service";
import { markInvoiceSent } from "../invoices/service";
import { toDecimal } from "@/lib/formatters/money";

/**
 * Auto-send job.
 *
 * Finds ISSUED invoices whose organization has `autoSendInvoicesEnabled` and
 * sends them via `notify()` — the resolved notification channel(s) end up
 * as an in-app notification and (when configured) as an outbound email.
 *
 * A sent invoice transitions ISSUED → SENT. Re-runs are idempotent because
 * only ISSUED invoices are eligible.
 */

export interface SendRunSummary {
  invoicesConsidered: number;
  sent: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ invoiceId: string; error: string }>;
}

export async function sendIssuedInvoices(options: {
  now?: Date;
  organizationIds?: string[];
  actorUserId?: string | null;
} = {}): Promise<SendRunSummary> {
  const now = options.now ?? new Date();
  const summary: SendRunSummary = {
    invoicesConsidered: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  const invoices = await prisma.invoice.findMany({
    where: {
      status: "ISSUED",
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
  summary.invoicesConsidered = invoices.length;

  for (const invoice of invoices) {
    try {
      const settings = await resolveBillingSettings(invoice.organizationId);
      if (!settings.billingEnabled || !settings.automation.sendInvoices) {
        summary.skipped++;
        continue;
      }

      const recipients = invoice.organization.members
        .map((m) => m.user)
        .filter((u): u is NonNullable<typeof u> => Boolean(u?.email));
      if (recipients.length === 0) {
        summary.skipped++;
        continue;
      }

      const email = await renderBillingEmail("invoice.issued", {
        organizationName: invoice.organization.profile?.legalName ?? invoice.organization.name,
        invoiceNumber: invoice.invoiceNumber ?? "-",
        totalAmount: formatAmount(invoice.totalAmount, invoice.currency),
        amountDue: formatAmount(invoice.amountDue, invoice.currency),
        currency: invoice.currency,
        dueDate: invoice.dueDate ? formatDay(invoice.dueDate) : "-",
      });

      for (const user of recipients) {
        await notify({
          userId: user.id,
          organizationId: invoice.organizationId,
          category: "BILLING",
          title: email.subject,
          message: email.text.slice(0, 500),
          entityType: "Invoice",
          entityId: invoice.id,
          actionUrl: `/podesavanja/fakture/${invoice.id}`,
          email: user.email
            ? {
                to: user.email,
                message: {
                  to: user.email,
                  subject: email.subject,
                  text: email.text,
                  html: email.html,
                },
              }
            : null,
        });
      }

      await markInvoiceSent(invoice.id, options.actorUserId ?? null, now);
      summary.sent++;
    } catch (err) {
      summary.errors++;
      summary.errorDetails.push({
        invoiceId: invoice.id,
        error: (err as Error)?.message ?? "unknown",
      });
      logger.error("billing.invoice_send_failed", {
        invoiceId: invoice.id,
        error: (err as Error)?.message,
      });
    }
  }

  return summary;
}

function formatAmount(amount: unknown, currency: string): string {
  const value = toDecimal(String(amount));
  return `${value.toFixed(2)} ${currency}`;
}

function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10).split("-").reverse().join(".");
}
