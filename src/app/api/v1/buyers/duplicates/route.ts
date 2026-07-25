import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { findDuplicates } from "@/server/services/buyers.service";

const bodySchema = z.object({
  phone: z.string().max(40).optional(),
  email: z.string().max(160).optional(),
  excludeBuyerId: z.string().min(1).optional(),
});

export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  const ctx = await requirePermission("lead.read");
  const candidates = await findDuplicates({
    organizationId: ctx.organization.organizationId,
    phone: body.phone ?? null,
    email: body.email ?? null,
    excludeBuyerId: body.excludeBuyerId,
  });
  return { data: candidates };
});
