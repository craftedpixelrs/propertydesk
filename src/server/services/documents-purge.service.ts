import "server-only";

import { prisma } from "@/server/db/prisma";
import { storage } from "@/server/storage";
import { recordAudit } from "@/server/audit/audit";
import { logger } from "@/server/logger";

/**
 * Soft-deleted documents stay in the bucket so an accidental delete can
 * still be recovered from storage. After this many days the cron
 * `purge-deleted-documents` removes the object and stamps
 * `storagePurgedAt`.
 */
export const DOCUMENT_STORAGE_RETENTION_DAYS = 45;

const BATCH_SIZE = 200;

export async function purgeExpiredDeletedDocuments(): Promise<{
  processed: number;
  errors: number;
}> {
  const cutoff = new Date(
    Date.now() - DOCUMENT_STORAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  const candidates = await prisma.document.findMany({
    where: {
      deletedAt: { lte: cutoff },
      storagePurgedAt: null,
    },
    select: {
      id: true,
      storageKey: true,
      organizationId: true,
    },
    take: BATCH_SIZE,
  });

  let processed = 0;
  let errors = 0;

  for (const doc of candidates) {
    try {
      if (doc.storageKey) {
        await storage().delete(doc.storageKey);
      }
      await prisma.document.update({
        where: { id: doc.id },
        data: { storagePurgedAt: new Date() },
      });
      await recordAudit({
        action: "document.storage_purged",
        entityType: "Document",
        entityId: doc.id,
        organizationId: doc.organizationId,
        newValues: { storageKey: doc.storageKey },
      });
      processed++;
    } catch (err) {
      errors++;
      logger.error("document.storage_purge_failed", {
        documentId: doc.id,
        error: (err as Error)?.message,
      });
    }
  }

  return { processed, errors };
}
