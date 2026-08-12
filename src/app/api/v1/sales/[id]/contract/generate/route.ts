import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { renderSaleContractPdf } from "@/server/pdf/service";
import { markContractGenerated } from "@/server/services/sales/contracts.service";
import { uploadDocument } from "@/server/services/documents.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  templateId: z.string().min(1),
  attachToSale: z.boolean().optional().default(true),
});

/**
 * Faza 8.1 (A1). Generate a PDF contract from a template + Sale.
 * Streams the PDF directly and — unless `attachToSale=false` — also
 * files it as a `Document(entityType=Sale, category=SALE)` so the
 * "Dokumenti prodaje" section on the sale detail page shows it.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("sale.manage");

    const rendered = await renderSaleContractPdf({
      organizationId: ctx.organization.organizationId,
      saleId: params.id,
      templateId: body.templateId,
    });

    if (body.attachToSale !== false) {
      await uploadDocument({
        organizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        category: "SALE",
        entityType: "Sale",
        entityId: params.id,
        visibility: "INTERNAL",
        fileName: `${rendered.filename}.pdf`,
        mimeType: "application/pdf",
        buffer: rendered.buffer,
      });
    }

    await markContractGenerated({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      saleId: params.id,
      templateId: rendered.templateId,
    });

    return new NextResponse(new Uint8Array(rendered.buffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${rendered.filename}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  },
);

/**
 * @swagger
 * /api/v1/sales/{id}/contract/generate:
 *   post:
 *     tags:
 *       - sales
 *     summary: Create sales
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
