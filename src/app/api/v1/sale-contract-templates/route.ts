import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  createContractTemplate,
  listContractTemplates,
} from "@/server/services/sales/contracts.service";

const kindSchema = z.enum(["PRE_CONTRACT", "CONTRACT"]);

const createSchema = z.object({
  kind: kindSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  contentHtml: z.string().min(1),
  variables: z.array(z.string().min(1)).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePermission("sale.manage");
  const kindParam = searchParams.get("kind");
  const kind = kindParam ? kindSchema.parse(kindParam) : undefined;
  const items = await listContractTemplates({
    organizationId: ctx.organization.organizationId,
    kind,
  });
  return { data: items };
});

export const POST = apiHandler(
  { bodySchema: createSchema },
  async ({ body }) => {
    const ctx = await requirePermission("sale.manage");
    const created = await createContractTemplate({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      kind: body.kind,
      name: body.name,
      description: body.description ?? null,
      contentHtml: body.contentHtml,
      variables: body.variables ?? null,
      isActive: body.isActive,
    });
    return { data: created, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/sale-contract-templates:
 *   get:
 *     tags:
 *       - sale-contract-templates
 *     summary: List / read sale-contract-templates
 *     description: |
 *       **Auth:** `requirePermission("sale.manage")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - sale-contract-templates
 *     summary: Create sale-contract-templates
 *     description: |
 *       **Auth:** `requirePermission("sale.manage")`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
