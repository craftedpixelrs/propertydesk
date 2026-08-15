import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  createCommissionRule,
  listCommissionRules,
} from "@/server/services/commissions/rules.service";

const bodySchema = z.object({
  agencyConnectionId: z.string().min(1).nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
  unitId: z.string().min(1).nullable().optional(),
  calculationType: z.enum(["PERCENTAGE", "FIXED"]),
  rate: z.number().min(0).max(100).nullable().optional(),
  fixedAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  internalNote: z.string().max(2000).nullable().optional(),
  agencyVisibleNote: z.string().max(2000).nullable().optional(),
});

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePermission("commission.read");
  const items = await listCommissionRules({
    investorOrganizationId: ctx.organization.organizationId,
    agencyConnectionId: searchParams.get("agencyConnectionId") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
  });
  return { data: items };
});

export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  const ctx = await requirePermission("commission.manage");
  const created = await createCommissionRule({
    investorOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    agencyConnectionId: body.agencyConnectionId ?? null,
    projectId: body.projectId ?? null,
    unitId: body.unitId ?? null,
    calculationType: body.calculationType,
    rate: body.rate ?? null,
    fixedAmount: body.fixedAmount ?? null,
    currency: body.currency,
    validFrom: body.validFrom ? new Date(body.validFrom) : null,
    validTo: body.validTo ? new Date(body.validTo) : null,
    internalNote: body.internalNote ?? null,
    agencyVisibleNote: body.agencyVisibleNote ?? null,
  });
  return { data: created, status: 201 };
});

/**
 * @swagger
 * /api/v1/commission-rules:
 *   get:
 *     tags:
 *       - commission-rules
 *     summary: List / read commission-rules
 *     description: |
 *       **Auth:** `requirePermission("commission.read")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - commission-rules
 *     summary: Create commission-rules
 *     description: |
 *       **Auth:** `requirePermission("commission.manage") + requirePermission("commission.read")`
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
