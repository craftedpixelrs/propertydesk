import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { getUnitById, updateUnit } from "@/server/services/units.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchSchema = z.object({
  buildingId: z.string().min(1).nullable().optional(),
  entranceId: z.string().min(1).nullable().optional(),
  floorId: z.string().min(1).nullable().optional(),
  type: z
    .enum([
      "APARTMENT",
      "GARAGE",
      "PARKING_SPACE",
      "STORAGE",
      "COMMERCIAL",
      "HOUSE",
      "OTHER",
    ])
    .optional(),
  structure: z.string().max(20).nullable().optional(),
  roomCount: z.number().min(0).max(20).nullable().optional(),
  totalArea: z.number().positive().optional(),
  internalArea: z.number().positive().nullable().optional(),
  terraceArea: z.number().min(0).nullable().optional(),
  gardenArea: z.number().min(0).nullable().optional(),
  orientation: z.string().max(60).nullable().optional(),
  basePrice: z.number().nonnegative().optional(),
  finalPrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  vatIncluded: z.boolean().optional(),
  bedrooms: z.number().int().min(0).max(20).nullable().optional(),
  bathrooms: z.number().int().min(0).max(20).nullable().optional(),
  hasTerrace: z.boolean().optional(),
  hasGarden: z.boolean().optional(),
  publicDescription: z.string().max(2000).nullable().optional(),
  internalNotes: z.string().max(2000).nullable().optional(),
  isVisibleToAgencies: z.boolean().optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
  priceChangeReason: z.string().max(500).optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("inventory.read");
  const unit = await getUnitById(ctx.organization.organizationId, params.id);
  return { data: unit };
});

export const PATCH = apiHandler(
  { bodySchema: patchSchema, paramsSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("inventory.manage");
    const { expectedVersion, priceChangeReason, ...patch } = body;
    const updated = await updateUnit({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      unitId: params.id,
      expectedVersion,
      priceChangeReason,
      patch: patch as Parameters<typeof updateUnit>[0]["patch"],
    });
    return { data: updated };
  },
);

/**
 * @swagger
 * /api/v1/units/{id}:
 *   get:
 *     tags:
 *       - units
 *     summary: List / read units
 *     description: |
 *       **Auth:** `requirePermission("inventory.read")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   patch:
 *     tags:
 *       - units
 *     summary: Update units
 *     description: |
 *       **Auth:** `requirePermission("inventory.manage") + requirePermission("inventory.read")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
