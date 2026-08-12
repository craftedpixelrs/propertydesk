import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { renderSaleSummaryPdf } from "@/server/pdf/service";
import { pdfResponseHeaders } from "@/server/pdf/render";

const paramsSchema = z.object({ id: z.string().min(1) });

/**
 * GET /api/v1/pdf/sale-summary/[id]
 *
 * Streams a Serbian A4 sale-summary PDF: sale, buyer, agency, payment plan
 * with running paid/outstanding totals, and payment history.
 */
export const GET = apiHandler(
  { paramsSchema },
  async ({ params }): Promise<Response> => {
    const ctx = await requirePermission("sale.read");
    const buffer = await renderSaleSummaryPdf({
      organizationId: ctx.organization.organizationId,
      saleId: params.id,
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: pdfResponseHeaders(`prodaja-${params.id.slice(0, 8)}`),
    });
  },
);

/**
 * @swagger
 * /api/v1/pdf/sale-summary/{id}:
 *   get:
 *     tags:
 *       - pdf
 *     summary: List / read pdf
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
