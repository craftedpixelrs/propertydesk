import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { isStoredCoverImageUrl } from "@/lib/geo/cover-image";
import { requirePermission } from "@/server/permissions/require";
import {
  archiveProject,
  getProjectById,
  restoreProject,
  updateProject,
} from "@/server/services/projects.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    slug: z.string().max(80).optional(),
    description: z.string().max(2000).nullable().optional(),
    address: z.string().max(200).nullable().optional(),
    city: z.string().max(120).nullable().optional(),
    municipality: z.string().max(120).nullable().optional(),
    postalCode: z.string().max(20).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    coverImageUrl: z
      .string()
      .max(500)
      .refine((value) => value === "" || isStoredCoverImageUrl(value))
      .nullable()
      .optional(),
    projectStatus: z
      .enum([
        "DRAFT",
        "PRE_SALES",
        "ACTIVE_SALES",
        "CONSTRUCTION",
        "COMPLETED",
        "ARCHIVED",
      ])
      .optional(),
    salesStartDate: z.coerce.date().nullable().optional(),
    constructionStartDate: z.coerce.date().nullable().optional(),
    expectedCompletionDate: z.coerce.date().nullable().optional(),
    defaultCurrency: z.string().length(3).optional(),
    defaultVatRate: z.number().min(0).max(100).nullable().optional(),
    internalNotes: z.string().max(2000).nullable().optional(),
    landCost: z.number().min(0).max(1e12).nullable().optional(),
    constructionCost: z.number().min(0).max(1e12).nullable().optional(),
    marketingCost: z.number().min(0).max(1e12).nullable().optional(),
    otherCost: z.number().min(0).max(1e12).nullable().optional(),
    budgetNote: z.string().max(2000).nullable().optional(),
    publicMicrositeEnabled: z.boolean().optional(),
    networkCatalogEnabled: z.boolean().optional(),
    publicMicrositeSlug: z
      .string()
      .max(80)
      .regex(/^[a-z0-9-]*$/, "Slug može sadržati samo mala slova, brojeve i crtice.")
      .nullable()
      .optional(),
  })
  .refine(
    (v) => {
      // Both must be present together or both null/absent. `undefined`
      // means "leave as-is" and doesn't participate in the check.
      if (v.latitude === undefined && v.longitude === undefined) return true;
      const lat = v.latitude ?? null;
      const lng = v.longitude ?? null;
      return (lat === null) === (lng === null);
    },
    "Geografske koordinate se moraju menjati u paru.",
  );

const actionSchema = z.object({
  action: z.enum(["archive", "restore"]),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("project.read");
  const project = await getProjectById(ctx.organization.organizationId, params.id);
  return { data: project };
});

export const PATCH = apiHandler(
  { bodySchema: patchSchema, paramsSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("project.update");
    const updated = await updateProject({
      organizationId: ctx.organization.organizationId,
      projectId: params.id,
      actorUserId: ctx.session.user.id,
      patch: body,
    });
    return { data: updated };
  },
);

export const POST = apiHandler(
  { bodySchema: actionSchema, paramsSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("project.archive");
    if (body.action === "archive") {
      await archiveProject(
        ctx.organization.organizationId,
        params.id,
        ctx.session.user.id,
      );
    } else {
      await restoreProject(
        ctx.organization.organizationId,
        params.id,
        ctx.session.user.id,
      );
    }
    return { data: { ok: true } };
  },
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   get:
 *     tags:
 *       - projects
 *     summary: List / read projects
 *     description: |
 *       **Auth:** `requirePermission("project.read")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *       - projects
 *     summary: Create projects
 *     description: |
 *       **Auth:** `requirePermission("project.archive") + requirePermission("project.read") + requirePermission("project.update")`
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
 *   patch:
 *     tags:
 *       - projects
 *     summary: Update projects
 *     description: |
 *       **Auth:** `requirePermission("project.update")`
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
