import { z } from "zod";
import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { renderDuesUplatnicaPdf } from "@/server/services/manager/dues-pdf.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("dues.invoice.send");
  const buffer = await renderDuesUplatnicaPdf({
    organizationId: ctx.organization.organizationId,
    chargeId: params.id,
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="uplatnica-${params.id}.pdf"`,
    },
  });
});

/**
 * @swagger
 * /api/v1/manager/dues/{id}/pdf:
 *   get:
 *     tags: [manager]
 *     summary: Download the uplatnica (payment slip) PDF for a dues charge
 *     description: |
 *       **Auth:** `requirePermission("dues.invoice.send")`
 */
