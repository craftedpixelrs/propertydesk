import { z } from "zod";
import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { prisma } from "@/server/db/prisma";
import { storage } from "@/server/storage";

const paramsSchema = z.object({
  token: z.string().min(8).max(80),
  documentId: z.string().min(1),
});

export const GET = apiHandler({ paramsSchema }, async ({ req, params }) => {
  enforceRateLimit({
    req,
    scope: "public.sale.document",
    callerId: params.token,
    options: { windowMs: 60_000, max: 60 },
  });

  const link = await prisma.shareLink.findUnique({ where: { token: params.token } });
  if (!link || link.revokedAt || link.entityType !== "Sale") {
    return new NextResponse("Not Found", { status: 404 });
  }
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return new NextResponse("Gone", { status: 410 });
  }

  const doc = await prisma.document.findFirst({
    where: {
      id: params.documentId,
      organizationId: link.organizationId,
      entityType: "Sale",
      entityId: link.entityId,
      visibility: "BUYER_SHARED",
      deletedAt: null,
    },
  });
  if (!doc) return new NextResponse("Not Found", { status: 404 });

  const buffer = await storage().read(doc.storageKey);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": doc.mimeType,
      "content-disposition": `inline; filename="${encodeURIComponent(doc.originalFileName)}"`,
      "cache-control": "private, max-age=60",
    },
  });
});
