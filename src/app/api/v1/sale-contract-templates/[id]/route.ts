import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  deleteContractTemplate,
  getContractTemplate,
  updateContractTemplate,
} from "@/server/services/sales/contracts.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const updateSchema = z.object({
  kind: z.enum(["PRE_CONTRACT", "CONTRACT"]).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  contentHtml: z.string().min(1).optional(),
  variables: z.array(z.string().min(1)).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("sale.manage");
  const row = await getContractTemplate({
    organizationId: ctx.organization.organizationId,
    templateId: params.id,
  });
  return { data: row };
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: updateSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("sale.manage");
    const updated = await updateContractTemplate({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      templateId: params.id,
      kind: body.kind,
      name: body.name,
      description: body.description,
      contentHtml: body.contentHtml,
      variables: body.variables,
      isActive: body.isActive,
    });
    return { data: updated };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("sale.manage");
  await deleteContractTemplate({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    templateId: params.id,
  });
  return { data: { id: params.id } };
});
