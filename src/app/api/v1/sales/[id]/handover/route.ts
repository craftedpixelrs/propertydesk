import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { getSaleHandover, saveSaleHandover } from "@/server/services/sales/handover.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  keysHanded: z.boolean(),
  meterElectricity: z.string().max(80).nullable().optional(),
  meterWater: z.string().max(80).nullable().optional(),
  meterHeating: z.string().max(80).nullable().optional(),
  defects: z.string().max(4000).nullable().optional(),
  attendees: z.string().max(1000).nullable().optional(),
  complete: z.boolean(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("sale.read");
  const handover = await getSaleHandover(ctx.organization.organizationId, params.id);
  return { data: handover };
});

export const PUT = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("sale.handover");
  const handover = await saveSaleHandover({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    saleId: params.id,
    keysHanded: body.keysHanded,
    meterElectricity: body.meterElectricity,
    meterWater: body.meterWater,
    meterHeating: body.meterHeating,
    defects: body.defects,
    attendees: body.attendees,
    complete: body.complete,
  });
  return { data: handover };
});
