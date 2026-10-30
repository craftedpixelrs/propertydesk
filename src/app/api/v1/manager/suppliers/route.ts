import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { createSupplier, listSuppliers } from "@/server/services/manager/maintenance.service";

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

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  buildingId: z.string().min(1).nullable().optional(),
  category: CATEGORY.nullable().optional(),
  contactPerson: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().nullable().optional(),
  taxNumber: z.string().max(40).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePermission("ticket.read");
  const buildingId = searchParams.get("buildingId");
  const includeArchived = searchParams.get("archived") === "true";
  const rows = await listSuppliers({
    organizationId: ctx.organization.organizationId,
    buildingId: buildingId ?? undefined,
    includeArchived,
  });
  return { data: rows };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requirePermission("ticket.manage");
  const row = await createSupplier({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    ...body,
  });
  return { data: row, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/suppliers:
 *   get:
 *     tags: [manager]
 *     summary: List suppliers / contractors
 *     description: |
 *       **Auth:** `requirePermission("ticket.read")`
 *   post:
 *     tags: [manager]
 *     summary: Create a supplier
 *     description: |
 *       **Auth:** `requirePermission("ticket.manage")`
 */
