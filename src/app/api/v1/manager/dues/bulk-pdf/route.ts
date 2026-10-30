import { z } from "zod";
import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { renderBulkDuesUplatnicaPdf } from "@/server/services/manager/dues-pdf.service";

const querySchema = z.object({
  buildingId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  includePaid: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePermission("dues.invoice.send");
  const parsed = querySchema.parse(Object.fromEntries(searchParams.entries()));
  const { buffer, count } = await renderBulkDuesUplatnicaPdf({
    organizationId: ctx.organization.organizationId,
    buildingId: parsed.buildingId,
    year: parsed.year,
    month: parsed.month,
    includePaid: parsed.includePaid,
  });
  const label = `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="uplatnice-${label}.pdf"`,
      "x-generated-count": String(count),
    },
  });
});

/**
 * @swagger
 * /api/v1/manager/dues/bulk-pdf:
 *   get:
 *     tags: [manager]
 *     summary: Download one PDF with every outstanding uplatnica for a building and period
 *     description: |
 *       **Auth:** `requirePermission("dues.invoice.send")`
 */
