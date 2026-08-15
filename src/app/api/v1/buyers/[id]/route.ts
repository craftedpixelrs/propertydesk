import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { getBuyerById, updateBuyer } from "@/server/services/buyers.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const UNIT_TYPES = [
  "APARTMENT",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "COMMERCIAL",
  "HOUSE",
  "OTHER",
] as const;

const BUYER_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "VIEWING_SCHEDULED",
  "OFFER_SENT",
  "NEGOTIATION",
  "RESERVATION",
  "WON",
  "LOST",
  "ARCHIVED",
] as const;

const patchSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  email: z.string().email().max(160).nullable().optional().or(z.literal("")),
  phone: z.string().min(3).max(40).optional(),
  secondaryPhone: z.string().max(40).nullable().optional(),
  preferredContactMethod: z.enum(["PHONE", "EMAIL", "ANY"]).optional(),
  budgetMin: z.number().nonnegative().nullable().optional(),
  budgetMax: z.number().nonnegative().nullable().optional(),
  preferredCurrency: z.string().length(3).optional(),
  desiredUnitTypes: z.array(z.enum(UNIT_TYPES)).optional(),
  desiredRoomCounts: z.array(z.string().max(10)).optional(),
  desiredAreaMin: z.number().nonnegative().nullable().optional(),
  desiredAreaMax: z.number().nonnegative().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  source: z.string().max(120).nullable().optional(),
  status: z.enum(BUYER_STATUSES).optional(),
  assignedUserId: z.string().min(1).nullable().optional(),
  entityType: z.enum(["NATURAL", "LEGAL"]).optional(),
  legalName: z.string().max(200).nullable().optional(),
  jmbg: z.string().max(13).nullable().optional(),
  identityNumber: z.string().max(30).nullable().optional(),
  taxId: z.string().max(20).nullable().optional(),
  addressLine1: z.string().max(200).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("lead.read");
  const buyer = await getBuyerById(ctx.organization.organizationId, params.id);
  return { data: buyer };
});

export const PATCH = apiHandler({ paramsSchema, bodySchema: patchSchema }, async ({ params, body }) => {
  const ctx = await requirePermission("lead.manage");
  const { updated } = await updateBuyer({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    buyerId: params.id,
    patch: {
      ...body,
      email: body.email === "" ? null : body.email,
    },
  });
  return { data: updated };
});

/**
 * @swagger
 * /api/v1/buyers/{id}:
 *   get:
 *     tags:
 *       - buyers
 *     summary: List / read buyers
 *     description: |
 *       **Auth:** `requirePermission("lead.read")`
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
 *       - buyers
 *     summary: Update buyers
 *     description: |
 *       **Auth:** `requirePermission("lead.manage") + requirePermission("lead.read")`
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
