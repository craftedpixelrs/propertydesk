import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  removeMember,
  setMemberActivation,
  updateMemberRole,
} from "@/server/services/organization-admin.service";
import { ALL_ORG_ROLE_NAMES } from "@/server/permissions/roles";
import type { OrganizationRole } from "@/server/permissions/roles";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchSchema = z.object({
  role: z.enum(ALL_ORG_ROLE_NAMES as [string, ...string[]]).optional(),
  active: z.boolean().optional(),
});

export const PATCH = apiHandler(
  { bodySchema: patchSchema, paramsSchema },
  async ({ body, params }) => {
    const ctx = await requirePermission("organization.members:manage");

    if (body.role) {
      await updateMemberRole(
        ctx.organization.organizationId,
        params.id,
        body.role as OrganizationRole,
        ctx.session.user.id,
      );
    }
    if (body.active !== undefined) {
      await setMemberActivation(
        ctx.organization.organizationId,
        params.id,
        body.active,
        ctx.session.user.id,
      );
    }
    return { data: { ok: true } };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("organization.members:manage");
  await removeMember(
    ctx.organization.organizationId,
    params.id,
    ctx.session.user.id,
  );
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/organization/members/{id}:
 *   patch:
 *     tags:
 *       - organization
 *     summary: Update organization
 *     description: |
 *       **Auth:** `requirePermission("organization.members:manage")`
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
 *   delete:
 *     tags:
 *       - organization
 *     summary: Delete organization
 *     description: |
 *       **Auth:** `requirePermission("organization.members:manage")`
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
 */
