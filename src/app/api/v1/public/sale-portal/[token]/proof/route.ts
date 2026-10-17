import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { uploadSalePortalProof } from "@/server/services/sharing/sale-portal.service";

const paramsSchema = z.object({ token: z.string().min(8).max(80) });

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);

export const POST = apiHandler({ paramsSchema }, async ({ req, params }) => {
  enforceRateLimit({
    req,
    scope: "public.sale.proof",
    callerId: params.token,
    options: { windowMs: 60_000, max: 8 },
  });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw DomainErrors.badRequest("Datoteka je obavezna.");
  if (!ALLOWED.has(file.type)) {
    throw DomainErrors.badRequest("Dozvoljeni su PDF, JPG i PNG.");
  }

  const doc = await uploadSalePortalProof({
    token: params.token,
    fileName: file.name,
    mimeType: file.type,
    buffer: Buffer.from(await file.arrayBuffer()),
  });
  return { data: { id: doc.id }, status: 201 };
});
