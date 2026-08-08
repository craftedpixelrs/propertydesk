import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  exportUnitsCsv,
  exportUnitsXlsx,
} from "@/server/services/units-import.service";

export const GET = apiHandler({}, async ({ searchParams, requestId }) => {
  const ctx = await requirePermission("inventory.export");
  const format = (searchParams.get("format") ?? "csv").toLowerCase();
  const projectId = searchParams.get("projectId") ?? undefined;
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    const buf = await exportUnitsXlsx(
      ctx.organization.organizationId,
      projectId,
    );
    return new Response(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="jedinice-${stamp}.xlsx"`,
        "x-request-id": requestId,
      },
    });
  }

  const csv = await exportUnitsCsv(ctx.organization.organizationId, projectId);
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="jedinice-${stamp}.csv"`,
      "x-request-id": requestId,
    },
  });
});
