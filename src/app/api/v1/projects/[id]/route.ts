import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
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
    description: z.string().max(2000).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(120).optional(),
    municipality: z.string().max(120).optional(),
    postalCode: z.string().max(20).optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    coverImageUrl: z.string().url().max(500).nullable().optional(),
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
    salesStartDate: z.coerce.date().optional(),
    constructionStartDate: z.coerce.date().optional(),
    expectedCompletionDate: z.coerce.date().optional(),
    defaultCurrency: z.string().length(3).optional(),
    defaultVatRate: z.number().min(0).max(100).optional(),
    internalNotes: z.string().max(2000).optional(),
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
