import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { resolveShareImage } from "@/server/services/sharing/share-links.service";
import { storage } from "@/server/storage";

const paramsSchema = z.object({
  token: z.string().min(1).max(128),
  documentId: z.string().min(1).max(64),
});

/**
 * Token-scoped public image endpoint for the /p/[token] offer page.
 *
 * Access is anchored to the share-link's `(entityType, entityId)`
 * tuple — the token buys you exactly the images attached to that
 * entity, nothing else. Rate limited per IP to prevent scraping of
 * many document IDs for a single leaked token.
 */
export const GET = apiHandler({ paramsSchema }, async ({ req, params }) => {
  enforceRateLimit({
    req,
    scope: "public.share.image",
    callerId: `${params.token}:${params.documentId}`,
    options: { windowMs: 60_000, maxHits: 120 },
  });

  const resolved = await resolveShareImage({
    token: params.token,
    documentId: params.documentId,
  });
  if (!resolved) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = await storage().getSignedUrl(resolved.storageKey, 300);
  if (url.startsWith("local:")) {
    const buffer = await storage().read(resolved.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": resolved.mimeType,
        "content-disposition": `inline; filename="${encodeURIComponent(resolved.fileName)}"`,
        "cache-control": "public, max-age=300",
      },
    });
  }
  return NextResponse.redirect(url, 302);
});
