import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from "@/server/services/sales/payment-plan-templates.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const itemSchema = z.object({
  label: z.string().min(1).max(200),
  percentage: z.union([z.number().positive(), z.string().min(1)]),
  dueDateAnchor: z.enum(["CONTRACT", "HANDOVER", "CUSTOM_OFFSET"]),
  offsetDays: z.number().int(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  isDefault: z.boolean().optional(),
  items: z.array(itemSchema).min(1).optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("payment.manage");
  const tmpl = await getTemplate({
    organizationId: ctx.organization.organizationId,
    templateId: params.id,
  });
  return { data: tmpl };
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: updateSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("payment.manage");
    const updated = await updateTemplate({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      templateId: params.id,
      name: body.name,
      description: body.description,
      projectId: body.projectId,
      isDefault: body.isDefault,
      items: body.items,
    });
    return { data: updated };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("payment.manage");
  await deleteTemplate({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    templateId: params.id,
  });
  return { data: { id: params.id } };
});
