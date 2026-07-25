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
