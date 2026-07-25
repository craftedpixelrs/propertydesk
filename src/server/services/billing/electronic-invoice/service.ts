import "server-only";
import type { ElectronicInvoiceRecord } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import { recordAudit } from "@/server/audit/audit";
import { getProvider, type ElectronicInvoiceContext } from "./providers";

/**
 * Cross-cutting operations for electronic invoice records.
 *
 * Individual providers (Manual passthrough, Serbian SEF stub) implement the
 * `ElectronicInvoiceProvider` interface. This module is the entry point used
 * by the automation layer:
 *   - `submitInvoiceElectronically(invoiceId, actor)` — first send
 *   - `retrySefSubmissions()` — cron reconciliation
 */

export interface SefRetrySummary {
  considered: number;
  retried: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ recordId: string; error: string }>;
}

export async function retrySefSubmissions(): Promise<SefRetrySummary> {
  const summary: SefRetrySummary = {
    considered: 0,
    retried: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  const rows = await prisma.electronicInvoiceRecord.findMany({
    where: { status: "FAILED", attempts: { lt: 5 } },
    include: {
      invoice: { include: { organization: { include: { profile: true } } } },
    },
    take: 100,
    orderBy: { updatedAt: "asc" },
  });
  summary.considered = rows.length;

  for (const rec of rows) {
    try {
      const providerType = rec.provider;
      const provider = getProvider(providerType);
      const context: ElectronicInvoiceContext = {
        invoice: rec.invoice,
        organizationId: rec.invoice.organizationId,
        record: rec,
      };
      const result = await provider.submit(context);

      await prisma.electronicInvoiceRecord.update({
        where: { id: rec.id },
        data: {
          status: result.status,
          providerReference: result.providerReference ?? rec.providerReference,
          sentAt: result.status === "SENT" ? new Date() : rec.sentAt,
          responsePayload: (result.responsePayload as object | null) ?? undefined,
          errorMessage: result.errorMessage ?? null,
          attempts: { increment: 1 },
          lastSyncAt: new Date(),
        },
      });

      await recordAudit({
        action: "billing.sef_retry",
        entityType: "ElectronicInvoiceRecord",
        entityId: rec.id,
        organizationId: rec.invoice.organizationId,
        metadata: {
          providerType,
          status: result.status,
          providerReference: result.providerReference ?? null,
        },
      });

      if (result.status === "SENT") summary.retried++;
      else summary.skipped++;
    } catch (err) {
      summary.errors++;
      summary.errorDetails.push({
        recordId: rec.id,
        error: (err as Error)?.message ?? "unknown",
      });
      logger.error("billing.sef_retry_failed", {
        recordId: rec.id,
        error: (err as Error)?.message,
      });
    }
  }

  return summary;
}

export type { ElectronicInvoiceRecord };
