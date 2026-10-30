import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { sendDuesReminders } from "@/server/services/manager/dues.service";

const bodySchema = z.object({
  buildingId: z.string().min(1).nullable().optional(),
  minOutstanding: z.coerce.number().nonnegative().optional(),
  cooldownDays: z.coerce.number().int().min(0).max(365).optional(),
});

export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  const ctx = await requirePermission("dues.reminder.send");
  const result = await sendDuesReminders({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    buildingId: body?.buildingId ?? null,
    minOutstanding: body?.minOutstanding,
    cooldownDays: body?.cooldownDays,
  });
  return { data: result, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/dues/reminders:
 *   post:
 *     tags: [manager]
 *     summary: Send dues reminder emails to every debtor
 *     description: |
 *       **Auth:** `requirePermission("dues.reminder.send")`
 */
