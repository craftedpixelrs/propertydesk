import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { exportOrganizationData } from "@/server/services/organization-export.service";

export const GET = apiHandler({}, async () => {
  const ctx = await requirePermission("organization.export");
  const payload = await exportOrganizationData({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
  });
  const slug = payload.organization.slug || payload.organization.id;
  const body = JSON.stringify(payload, null, 2);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="propertydesk-${slug}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
