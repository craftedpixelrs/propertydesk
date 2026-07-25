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
  structure: z.string().max(20).optional(),
  roomCount: z.number().min(0).max(20).optional(),
  totalArea: z.number().positive().optional(),
  internalArea: z.number().positive().optional(),
  terraceArea: z.number().min(0).optional(),
  gardenArea: z.number().min(0).optional(),
  orientation: z.string().max(60).optional(),
  basePrice: z.number().nonnegative().optional(),
  finalPrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  vatIncluded: z.boolean().optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  hasTerrace: z.boolean().optional(),
  hasGarden: z.boolean().optional(),
  publicDescription: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
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
