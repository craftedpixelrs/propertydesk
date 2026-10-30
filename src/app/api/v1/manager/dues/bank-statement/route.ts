import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/require";
import { importDuesBankStatement } from "@/server/services/manager/dues.service";
import { parseCsv, parseXlsx } from "@/server/services/billing/bank-statement/parsers";

const schema = z.object({
  buildingId: z.string().min(1).nullable().optional(),
  rows: z
    .array(
      z.object({
        transactionDate: z.coerce.date(),
        amount: z.coerce.number().positive(),
        currency: z.string().length(3).optional(),
        reference: z.string().nullable().optional(),
        counterpartyName: z.string().nullable().optional(),
        counterpartyRef: z.string().nullable().optional(),
        externalId: z.string().nullable().optional(),
        narrative: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

/**
 * Multipart (CSV / XLSX upload) OR JSON (pre-parsed rows) import of a
 * bank statement into dues payments. Matching is by model-97 reference.
 */
export const POST = apiHandler({}, async ({ req }) => {
  const ctx = await requirePermission("dues.bankstatement.import");

  const contentType = req.headers.get("content-type") ?? "";
  let buildingId: string | null = null;
  let rows: Array<{
    transactionDate: Date;
    amount: string | number;
    currency?: string;
    reference?: string | null;
    counterpartyName?: string | null;
    counterpartyRef?: string | null;
    externalId?: string | null;
    narrative?: string | null;
  }> = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) throw DomainErrors.badRequest("Neispravna forma.");
    const file = form.get("file");
    if (!(file instanceof File)) throw DomainErrors.badRequest("Datoteka je obavezna.");
    const bId = form.get("buildingId");
    if (typeof bId === "string" && bId.trim()) buildingId = bId.trim();

    const bytes = await file.arrayBuffer();
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".xlsx")) {
      rows = await parseXlsx(Buffer.from(bytes));
    } else {
      const text = Buffer.from(bytes).toString("utf-8");
      rows = parseCsv(text);
    }
  } else {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw DomainErrors.badRequest("Neispravan ulaz.");
    }
    buildingId = parsed.data.buildingId ?? null;
    rows = parsed.data.rows ?? [];
  }

  if (!rows.length) {
    throw DomainErrors.badRequest("Fajl ne sadrži nijednu transakciju.");
  }

  const result = await importDuesBankStatement({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    buildingId,
    rows,
  });
  return { data: result, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/dues/bank-statement:
 *   post:
 *     tags: [manager]
 *     summary: Import a bank statement (CSV / XLSX or pre-parsed JSON) and reconcile dues
 *     description: |
 *       **Auth:** `requirePermission("dues.bankstatement.import")`
 */
