import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { resolveOrganizationLogo } from "@/server/services/organization-logo.service";

const paramsSchema = z.object({
  organizationId: z.string().min(1).max(64),
});

export const GET = apiHandler({ paramsSchema }, async ({ req, params }) => {
  enforceRateLimit({
    req,
    scope: "public.organization.logo",
    options: { windowMs: 60_000, maxHits: 180 },
  });

  const resolved = await resolveOrganizationLogo(params.organizationId);
  if (!resolved) {
    return new NextResponse("Not Found", { status: 404 });
  }
  if ("redirectUrl" in resolved) {
    return NextResponse.redirect(resolved.redirectUrl, 302);
  }

  return new NextResponse(new Uint8Array(resolved.buffer), {
    status: 200,
    headers: {
      "content-type": resolved.mimeType,
      "content-disposition": `inline; filename="${encodeURIComponent(resolved.fileName)}"`,
      "cache-control": "public, max-age=300",
    },
  });
});

/**
 * @swagger
 * /api/v1/public/organization-logo/{organizationId}:
 *   get:
 *     tags:
 *       - public
 *     summary: Public organization logo
 *     responses:
 *       "200":
 *         description: Image bytes
 *       "404":
 *         description: No logo
 */
