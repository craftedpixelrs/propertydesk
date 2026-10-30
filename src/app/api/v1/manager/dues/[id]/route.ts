import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/require";

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("dues.read");
  const charge = await prisma.duesCharge.findFirst({
    where: { id: params.id, organizationId: ctx.organization.organizationId },
    include: {
      unit: { select: { id: true, code: true } },
      building: { select: { id: true, name: true } },
      payments: {
        where: { reversed: false },
        orderBy: { paidAt: "desc" },
      },
    },
  });
  if (!charge) throw DomainErrors.notFound("Zaduženje nije pronađeno.");
  return { data: charge };
});

/**
 * @swagger
 * /api/v1/manager/dues/{id}:
 *   get:
 *     tags: [manager]
 *     summary: Read a single dues charge
 *     description: |
 *       **Auth:** `requirePermission("dues.read")`
 */
