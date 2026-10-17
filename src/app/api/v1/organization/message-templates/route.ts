import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  listMessageTemplates,
  MESSAGE_TEMPLATE_KEYS,
  saveMessageTemplates,
  type MessageTemplateKey,
} from "@/server/services/messaging/buyer-mail.service";

const bodySchema = z.object({
  templates: z
    .array(
      z.object({
        key: z.enum(MESSAGE_TEMPLATE_KEYS),
        body: z.string().max(2000),
      }),
    )
    .max(MESSAGE_TEMPLATE_KEYS.length),
});

export const GET = apiHandler({}, async () => {
  const ctx = await requirePermission("organization.read");
  const templates = await listMessageTemplates(ctx.organization.organizationId);
  return { data: templates };
});

export const PUT = apiHandler({ bodySchema }, async ({ body }) => {
  const ctx = await requirePermission("organization.templates");
  await saveMessageTemplates({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    templates: body.templates.map((row) => ({
      key: row.key as MessageTemplateKey,
      body: row.body,
    })),
  });
  const templates = await listMessageTemplates(ctx.organization.organizationId);
  return { data: templates };
});
