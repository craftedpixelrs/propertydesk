import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { applyTemplateToDraft } from "@/server/services/sales/payment-plan-templates.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ templateId: z.string().min(1) });

/**
 * Resolve a template against this specific sale and return the draft
 * rows a PaymentPlanForm can load. Does NOT persist a plan — the
 * client still submits `POST /sales/[id]/payment-plan` with the
 * MANUAL body once the operator is happy with the amounts and dates.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("payment.manage");
    const draft = await applyTemplateToDraft({
      organizationId: ctx.organization.organizationId,
      saleId: params.id,
      templateId: body.templateId,
    });
    return { data: draft };
  },
);
