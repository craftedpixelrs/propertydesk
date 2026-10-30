import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  createBuildingPerson,
  listBuildingPersons,
} from "@/server/services/manager/buildings.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const createSchema = z
  .object({
    firstName: z.string().max(80).optional(),
    lastName: z.string().max(80).optional(),
    legalName: z.string().max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(40).optional(),
    address: z.string().max(200).optional(),
    primaryRole: z.enum(["OWNER", "TENANT", "USER"]).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (v) => v.legalName || v.firstName || v.lastName,
    "Unesite ime i prezime ili naziv pravnog lica.",
  );

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("building.read");
  const rows = await listBuildingPersons(ctx.organization.organizationId, params.id);
  return { data: rows };
});

export const POST = apiHandler(
  { paramsSchema, bodySchema: createSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("building.manage");
    const row = await createBuildingPerson({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      buildingId: params.id,
      ...body,
    });
    return { data: row, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/manager/buildings/{id}/persons:
 *   get:
 *     tags: [manager]
 *     summary: List building persons (owners, tenants)
 *     description: |
 *       **Auth:** `requirePermission("building.read")`
 *   post:
 *     tags: [manager]
 *     summary: Create a building person
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 */
