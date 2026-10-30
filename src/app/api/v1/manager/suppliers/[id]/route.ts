import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { updateSupplier } from "@/server/services/manager/maintenance.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const CATEGORY = z.enum([
  "PLUMBING",
  "ELECTRICAL",
  "HEATING",
  "ELEVATOR",
  "COMMON_AREAS",
  "ROOF",
  "FACADE",
  "SECURITY",
  "CLEANING",
  "OTHER",
]);

const patchSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  category: CATEGORY.nullable().optional(),
  contactPerson: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().nullable().optional(),
  taxNumber: z.string().max(40).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  archived: z.boolean().optional(),
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("ticket.manage");
    const row = await updateSupplier({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      supplierId: params.id,
      patch: body,
    });
    return { data: row };
  },
);

/**
 * @swagger
 * /api/v1/manager/suppliers/{id}:
 *   patch:
 *     tags: [manager]
 *     summary: Update or archive a supplier
 *     description: |
 *       **Auth:** `requirePermission("ticket.manage")`
 */
