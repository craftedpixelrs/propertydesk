import { z } from "zod";
import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { localeFromRequest, parseLocale } from "@/lib/i18n";
import { requirePermission } from "@/server/permissions/require";
import {
  buildImportTemplateCsv,
  buildImportTemplateXlsx,
  commitRows,
  parseFile,
  validateRows,
  type HeaderMap,
  type UnitImportField,
} from "@/server/services/units-import.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const IMPORT_FIELDS = [
  "code",
  "type",
  "status",
  "buildingCode",
  "entranceCode",
  "floorLabel",
  "totalArea",
  "internalArea",
  "terraceArea",
  "gardenArea",
  "basePrice",
  "finalPrice",
  "currency",
  "vatRate",
  "bedrooms",
  "bathrooms",
  "orientation",
  "publicDescription",
  "internalNotes",
  "externalReference",
] as const;

const rowSchema = z.record(z.string(), z.string());

const commitSchema = z.object({
  action: z.literal("commit"),
  headerMap: z.record(z.string(), z.enum(IMPORT_FIELDS).nullable()),
  rows: z.array(rowSchema),
});

const validateSchema = z.object({
  action: z.literal("validate"),
  headerMap: z.record(z.string(), z.enum(IMPORT_FIELDS).nullable()),
  rows: z.array(rowSchema),
});

const uploadSchema = z.object({
  action: z.literal("parse"),
  fileName: z.string().min(1),
  contentBase64: z.string().min(1),
});

const importBodySchema = z.discriminatedUnion("action", [
  uploadSchema,
  validateSchema,
  commitSchema,
]);

export const GET = apiHandler({ paramsSchema }, async ({ req }) => {
  await requirePermission("inventory.import");
  const locale =
    parseLocale(req.nextUrl.searchParams.get("locale")) ?? localeFromRequest(req);
  const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const filename =
    locale === "en"
      ? `propertydesk-units-template.${format}`
      : `propertydesk-jedinice-sablon.${format}`;
  if (format === "xlsx") {
    const buffer = await buildImportTemplateXlsx(locale);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  }
  const csv = buildImportTemplateCsv(locale);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
});

export const POST = apiHandler(
  { paramsSchema, bodySchema: importBodySchema },
  async ({ body, params }) => {
    const ctx = await requirePermission("inventory.import");
    if (body.action === "parse") {
      const buffer = Buffer.from(body.contentBase64, "base64");
      const parsed = await parseFile(body.fileName, buffer);
      return { data: parsed };
    }
    if (body.action === "validate") {
      const validated = validateRows(
        body.headerMap as HeaderMap,
        body.rows as Record<string, string>[],
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
    // commit
    const validated = validateRows(
      body.headerMap as Record<string, UnitImportField | null>,
      body.rows as Record<string, string>[],
    );
    const result = await commitRows({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      projectId: params.id,
      rows: validated,
    });
    return { data: result, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/projects/{id}/units/import:
 *   get:
 *     tags:
 *       - projects
 *     summary: Preuzmi šablon za uvoz jedinica
 *     description: |
 *       **Auth:** `requirePermission("inventory.import")`
 *       Vraća CSV ili XLSX sa kanonskim kolonama i primer redovima.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, xlsx]
 *     responses:
 *       "200":
 *         description: Fajl šablona
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - projects
 *     summary: Create projects
 *     description: |
 *       **Auth:** `requirePermission("inventory.import")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
