import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  archiveManagedBuilding,
  getManagedBuilding,
  restoreManagedBuilding,
  updateManagedBuilding,
} from "@/server/services/manager/buildings.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const updateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  address: z.string().trim().min(2).max(200).optional(),
  city: z.string().trim().min(2).max(120).optional(),
  municipality: z.string().max(120).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().length(2).optional(),
  legalName: z.string().max(200).nullable().optional(),
  registrationNumber: z.string().max(50).nullable().optional(),
  taxNumber: z.string().max(50).nullable().optional(),
  paymentAccountNumber: z.string().max(50).nullable().optional(),
  paymentBankName: z.string().max(120).nullable().optional(),
  cadastralLot: z.string().max(80).nullable().optional(),
  cadastralMunicipality: z.string().max(120).nullable().optional(),
  entranceCount: z.number().int().min(1).max(50).optional(),
  storeyCount: z.number().int().min(1).max(100).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  archived: z.boolean().optional(),
  archiveReason: z.string().max(500).optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("building.read");
  const row = await getManagedBuilding(ctx.organization.organizationId, params.id);
  return { data: row };
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: updateSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("building.manage");
    const { archived, archiveReason, ...patch } = body;
    const row = await updateManagedBuilding({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      buildingId: params.id,
      patch,
    });
    if (archived === true) {
      await archiveManagedBuilding({
        organizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        buildingId: params.id,
        reason: archiveReason ?? null,
      });
    } else if (archived === false) {
      await restoreManagedBuilding({
        organizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        buildingId: params.id,
      });
    }
    return { data: row };
  },
);

/**
 * @swagger
 * /api/v1/manager/buildings/{id}:
 *   get:
 *     tags: [manager]
 *     summary: Read a managed building
 *     description: |
 *       **Auth:** `requirePermission("building.read")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: OK }
 *       "401": { $ref: "#/components/responses/Unauthenticated" }
 *       "403": { $ref: "#/components/responses/Forbidden" }
 *       "404": { description: Not found }
 *   patch:
 *     tags: [manager]
 *     summary: Update a managed building
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: OK }
 */
