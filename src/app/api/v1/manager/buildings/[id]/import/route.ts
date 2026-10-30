import { z } from "zod";
import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  buildManagerUnitTemplateXlsx,
  commitManagerUnitRows,
  MANAGER_UNIT_IMPORT_COLUMNS,
  parseManagerUnitsFile,
  validateManagerUnitRows,
  type ManagerUnitImportField,
} from "@/server/services/manager/units-import.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const rowSchema = z.record(z.string(), z.string());

const uploadSchema = z.object({
  action: z.literal("parse"),
  fileName: z.string().min(1),
  contentBase64: z.string().min(1),
});

const validateSchema = z.object({
  action: z.literal("validate"),
  headerMap: z.record(z.string(), z.enum(MANAGER_UNIT_IMPORT_COLUMNS).nullable()),
  rows: z.array(rowSchema),
});

const commitSchema = z.object({
  action: z.literal("commit"),
  headerMap: z.record(z.string(), z.enum(MANAGER_UNIT_IMPORT_COLUMNS).nullable()),
  rows: z.array(rowSchema),
});

const importBodySchema = z.discriminatedUnion("action", [
  uploadSchema,
  validateSchema,
  commitSchema,
]);

export const GET = apiHandler({ paramsSchema }, async () => {
  await requirePermission("building.import");
  const buffer = await buildManagerUnitTemplateXlsx();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="propertydesk-posebni-delovi.xlsx"`,
    },
  });
});

export const POST = apiHandler(
  { paramsSchema, bodySchema: importBodySchema },
  async ({ body, params }) => {
    const ctx = await requirePermission("building.import");
    if (body.action === "parse") {
      const buffer = Buffer.from(body.contentBase64, "base64");
      const parsed = await parseManagerUnitsFile(body.fileName, buffer);
      return { data: parsed };
    }
    if (body.action === "validate") {
      const validated = validateManagerUnitRows(
        body.rows as Record<string, string>[],
        body.headerMap as Record<string, ManagerUnitImportField | null>,
      );
      const okCount = validated.filter((r) => r.ok).length;
      return {
        data: {
          rows: validated,
          summary: {
            total: validated.length,
            ok: okCount,
            errors: validated.length - okCount,
          },
        },
      };
    }
    const validated = validateManagerUnitRows(
      body.rows as Record<string, string>[],
      body.headerMap as Record<string, ManagerUnitImportField | null>,
    );
    const result = await commitManagerUnitRows({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      buildingId: params.id,
      rows: validated,
    });
    return { data: result, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/manager/buildings/{id}/import:
 *   get:
 *     tags: [manager]
 *     summary: Preuzmi XLSX šablon za uvoz posebnih delova i vlasnika
 *     description: |
 *       **Auth:** `requirePermission("building.import")`
 *   post:
 *     tags: [manager]
 *     summary: Uvezi posebne delove i vlasnike (parse/validate/commit)
 *     description: |
 *       **Auth:** `requirePermission("building.import")`
 */
