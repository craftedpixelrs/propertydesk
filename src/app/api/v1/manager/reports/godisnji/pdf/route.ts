import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { renderAnnualActivityPdf } from "@/server/services/manager/annual-pdf.service";
import { pdfResponseHeaders } from "@/server/pdf/render";

export const GET = apiHandler({}, async ({ searchParams }): Promise<Response> => {
  const ctx = await requirePermission("report.read");
  const now = new Date();
  const yearRaw = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const year = Number.isFinite(yearRaw) ? yearRaw : now.getFullYear();

  const buffer = await renderAnnualActivityPdf({
    organizationId: ctx.organization.organizationId,
    year,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: pdfResponseHeaders(`godisnji-izvestaj-${year}`),
  });
});

/**
 * @swagger
 * /api/v1/manager/reports/godisnji/pdf:
 *   get:
 *     tags: [manager]
 *     summary: Annual activity report (PDF)
 *     description: |
 *       **Auth:** `requirePermission("report.read")`
 */
