import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  inviteMember,
  listMembers,
  listPendingInvitations,
} from "@/server/services/organization-admin.service";
import { ALL_ORG_ROLE_NAMES } from "@/server/permissions/roles";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ALL_ORG_ROLE_NAMES as [string, ...string[]]),
});

export const GET = apiHandler({}, async () => {
  const ctx = await requirePermission("organization.read");
  const [members, invitations] = await Promise.all([
    listMembers(ctx.organization.organizationId),
    listPendingInvitations(ctx.organization.organizationId),
  ]);
  return { data: { members, invitations } };
});

export const POST = apiHandler(
  { bodySchema: inviteSchema },
  async ({ body }) => {
    const ctx = await requirePermission("organization.members:manage");
    await inviteMember({
      organizationId: ctx.organization.organizationId,
      email: body.email,
      role: body.role as (typeof ALL_ORG_ROLE_NAMES)[number],
      actorUserId: ctx.session.user.id,
    });
    return { data: { ok: true }, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/organization/members:
 *   get:
 *     tags:
 *       - organization
 *     summary: List / read organization
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - organization
 *     summary: Create organization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
