import { createId } from "@paralleldrive/cuid2";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  createBankStatementImport,
  autoMatchPendingBankTransactions,
} from "@/server/services/billing/bank-statement/service";
import { parseCsv, parseXlsx } from "@/server/services/billing/bank-statement/parsers";
import { logger } from "@/server/logger";

/**
 * Upload a bank statement (CSV or XLSX). Multipart body:
 *   - file: File (required)
 *   - format: "CSV" | "XLSX" (required)
 *   - organizationId?: string (optional — omit for platform-scope import)
 */
export const POST = apiHandler({}, async ({ req }) => {
  const ctx = await requireSuperAdmin();
  const form = await req.formData();
  const file = form.get("file");
  const format = (form.get("format") as string) ?? "CSV";
  const organizationId = (form.get("organizationId") as string | null) || null;

  if (!(file instanceof File)) {
    throw new ApiError("BAD_REQUEST", "Fajl je obavezan.");
  }
  if (!["CSV", "XLSX"].includes(format)) {
    throw new ApiError("BAD_REQUEST", "Format mora biti CSV ili XLSX.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows =
    format === "CSV" ? parseCsv(buffer.toString("utf8")) : await parseXlsx(buffer);
  if (rows.length === 0) {
    throw new ApiError("BAD_REQUEST", "Fajl ne sadrži transakcije.");
  }

  const imp = await createBankStatementImport({
    organizationId,
    format: format as "CSV" | "XLSX",
    fileName: file.name,
    storageKey: `bank-statements/${createId()}/${file.name}`,
    rows,
    uploadedByUserId: ctx.session.user.id,
  });

  void autoMatchPendingBankTransactions({ organizationId }).catch((err) => {
    logger.error("billing.auto_match_after_upload_failed", {
      importId: imp.id,
      error: (err as Error)?.message,
    });
  });

  return {
    data: {
      importId: imp.id,
      rowCount: rows.length,
      organizationId,
    },
  };
});

/**
 * @swagger
 * /api/v1/billing/bank-statements:
 *   post:
 *     tags:
 *       - billing
 *     summary: Create billing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
