import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { prisma } from "@/server/db/prisma";
import { requirePermission } from "@/server/permissions/require";
import { inviteResident } from "@/server/services/manager/residents.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("resident.manage");
  const existing = await prisma.residentAccess.findFirst({
    where: { id: params.id, organizationId: ctx.organization.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Pristup nije pronađen.");

  // Re-use `inviteResident` which regenerates the token and re-sends email.
  const access = await inviteResident({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    unitId: existing.unitId,
    personId: existing.personId,
    email: existing.email,
  });
  return { data: access };
});

/**
 * @swagger
 * /api/v1/manager/residents/{id}/resend:
 *   post:
 *     tags: [manager]
 *     summary: Re-send a resident portal invite email (regenerates token)
 *     description: |
 *       **Auth:** `requirePermission("resident.manage")`
 */
