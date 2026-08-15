import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { renderPriceListPdf } from "@/server/pdf/service";
import { pdfResponseHeaders } from "@/server/pdf/render";
import { ApiError } from "@/lib/api/errors";

/**
 * GET /api/v1/pdf/price-list?projectId=&includeSold=1
 *
 * Streams a Serbian A4 price-list PDF for a single project.
 */
export const GET = apiHandler({}, async ({ searchParams }): Promise<Response> => {
  const ctx = await requirePermission("inventory.read");
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    throw new ApiError("BAD_REQUEST", "Nedostaje projectId.");
  }
  const includeSoldUnits = searchParams.get("includeSold") === "1";
  const buffer = await renderPriceListPdf({
    organizationId: ctx.organization.organizationId,
    projectId,
    includeSoldUnits,
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: pdfResponseHeaders(`cenovnik-${projectId.slice(0, 8)}`),
  });
});

/**
 * @swagger
 * /api/v1/pdf/price-list:
 *   get:
 *     tags:
 *       - pdf
 *     summary: List / read pdf
 *     description: |
 *       **Auth:** `requirePermission("inventory.read")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
