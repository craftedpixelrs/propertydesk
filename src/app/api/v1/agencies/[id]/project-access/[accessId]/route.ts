import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  revokeProjectAccess,
  updateProjectAccess,
} from "@/server/services/agencies/agencies.service";

const paramsSchema = z.object({
  id: z.string().min(1),
  accessId: z.string().min(1),
});

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "ENDED"]).optional(),
  canViewPrices: z.boolean().optional(),
  canViewFloorPlans: z.boolean().optional(),
  canRequestReservations: z.boolean().optional(),
  showOnlyAgencyVisibleUnits: z.boolean().optional(),
  accessStartsAt: z.string().datetime().nullable().optional(),
  accessEndsAt: z.string().datetime().nullable().optional(),
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("agency.manage");
    const updated = await updateProjectAccess({
      investorOrganizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      connectionId: params.id,
      projectAccessId: params.accessId,
      patch: {
        status: body.status,
        canViewPrices: body.canViewPrices,
        canViewFloorPlans: body.canViewFloorPlans,
        canRequestReservations: body.canRequestReservations,
        showOnlyAgencyVisibleUnits: body.showOnlyAgencyVisibleUnits,
        accessStartsAt:
          body.accessStartsAt === null
            ? null
            : body.accessStartsAt
              ? new Date(body.accessStartsAt)
              : undefined,
        accessEndsAt:
          body.accessEndsAt === null
            ? null
            : body.accessEndsAt
              ? new Date(body.accessEndsAt)
              : undefined,
      },
    });
    return { data: updated };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("agency.manage");
  await revokeProjectAccess({
    investorOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    connectionId: params.id,
    projectAccessId: params.accessId,
  });
  return { data: { ok: true } };
});
