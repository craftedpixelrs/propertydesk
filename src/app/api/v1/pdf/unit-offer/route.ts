import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { renderUnitOfferPdf } from "@/server/pdf/service";
import { pdfResponseHeaders } from "@/server/pdf/render";

const schema = z.object({
  unitId: z.string().min(1),
  buyerId: z.string().min(1).nullable().optional(),
  agentUserId: z.string().min(1).nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/**
 * POST /api/v1/pdf/unit-offer
 *
 * Renders a Serbian A4 unit-offer PDF and streams it as an attachment.
 * Requires `inventory.read` (offers are internal sales collateral).
 */
export const POST = apiHandler({ bodySchema: schema }, async ({ body }): Promise<Response> => {
  const ctx = await requirePermission("inventory.read");
  const buffer = await renderUnitOfferPdf({
    organizationId: ctx.organization.organizationId,
    unitId: body.unitId,
    buyerId: body.buyerId ?? null,
    agentUserId: body.agentUserId ?? null,
    validUntil: body.validUntil ? new Date(body.validUntil) : null,
    notes: body.notes ?? null,
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: pdfResponseHeaders(`ponuda-${body.unitId.slice(0, 8)}`),
  });
});

/**
 * @swagger
 * /api/v1/pdf/unit-offer:
 *   post:
 *     tags:
 *       - pdf
 *     summary: Create pdf
 *     description: |
 *       **Auth:** `requirePermission("inventory.read")`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
