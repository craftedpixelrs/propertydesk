import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  createTemplate,
  listTemplates,
} from "@/server/services/sales/payment-plan-templates.service";

const itemSchema = z.object({
  label: z.string().min(1).max(200),
  percentage: z.union([z.number().positive(), z.string().min(1)]),
  dueDateAnchor: z.enum(["CONTRACT", "HANDOVER", "CUSTOM_OFFSET"]),
  offsetDays: z.number().int(),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  isDefault: z.boolean().optional(),
  items: z.array(itemSchema).min(1),
});

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePermission("payment.manage");
  const projectId = searchParams.get("projectId");
  const items = await listTemplates({
    organizationId: ctx.organization.organizationId,
    projectId: projectId ?? null,
  });
  return { data: items };
});

export const POST = apiHandler(
  { bodySchema: createSchema },
  async ({ body }) => {
    const ctx = await requirePermission("payment.manage");
    const created = await createTemplate({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      name: body.name,
      description: body.description ?? null,
      projectId: body.projectId ?? null,
      isDefault: body.isDefault,
      items: body.items.map((it) => ({
        label: it.label,
        percentage: it.percentage,
        dueDateAnchor: it.dueDateAnchor,
        offsetDays: it.offsetDays,
      })),
    });
    return { data: created, status: 201 };
  },
);
