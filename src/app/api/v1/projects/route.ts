import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { isStoredCoverImageUrl } from "@/lib/geo/cover-image";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import {
  createProject,
  listProjects,
} from "@/server/services/projects.service";

const createSchema = z
  .object({
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(160),
    slug: z.string().min(1).max(80).optional(),
    description: z.string().max(2000).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(120).optional(),
    municipality: z.string().max(120).optional(),
    postalCode: z.string().max(20).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    coverImageUrl: z
      .string()
      .max(500)
      .refine(isStoredCoverImageUrl)
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
    salesStartDate: z.coerce.date().optional(),
    constructionStartDate: z.coerce.date().optional(),
    expectedCompletionDate: z.coerce.date().optional(),
    defaultCurrency: z.string().length(3).optional(),
    defaultVatRate: z.number().min(0).max(100).optional(),
    internalNotes: z.string().max(2000).optional(),
  })
  .refine(
    (v) => (v.latitude == null) === (v.longitude == null),
    "Geografske koordinate se moraju uneti u paru.",
  );

const projectStatusFilter = z.enum([
  "DRAFT",
  "PRE_SALES",
  "ACTIVE_SALES",
  "CONSTRUCTION",
  "COMPLETED",
  "ARCHIVED",
]);

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("project.read");
  const statusRaw = query.filters.status ?? searchParams.get("status");
  const status = statusRaw ? projectStatusFilter.parse(statusRaw) : undefined;
  const activeOnly =
    (query.filters.activeOnly ?? searchParams.get("activeOnly")) === "true";
  const { items, total } = await listProjects({
    organizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
    search: query.q,
    status,
    activeOnly,
    sort: query.sort,
  });
  const { items: pageItems, pagination } = paginate(
    items,
    query.page,
    query.pageSize,
    total,
  );
  return { data: pageItems, meta: { pagination } };
});

export const POST = apiHandler(
  { bodySchema: createSchema },
  async ({ body }) => {
    const ctx = await requirePermission("project.create");
    const project = await createProject({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      ...body,
    });
    return { data: project, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     tags:
 *       - projects
 *     summary: List / read projects
 *     description: |
 *       **Auth:** `requirePermission("project.read")`
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
 *       **Auth:** `requirePermission("project.create") + requirePermission("project.read")`
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
