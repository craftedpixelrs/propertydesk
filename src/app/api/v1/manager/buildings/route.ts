import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import {
  createManagedBuilding,
  listManagedBuildings,
} from "@/server/services/manager/buildings.service";

/**
 * Faza 11 — upravnici zgrada / stambene zajednice (MANAGED organizacije).
 *
 * **Auth:** `requirePermission("building.read")` (GET) /
 *           `requirePermission("building.manage")` (POST).
 */

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  address: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(120),
  municipality: z.string().max(120).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2).optional(),
  legalName: z.string().max(200).optional(),
  registrationNumber: z.string().max(50).optional(),
  taxNumber: z.string().max(50).optional(),
  paymentAccountNumber: z.string().max(50).optional(),
  paymentBankName: z.string().max(120).optional(),
  cadastralLot: z.string().max(80).optional(),
  cadastralMunicipality: z.string().max(120).optional(),
  entranceCount: z.number().int().min(1).max(50).optional(),
  storeyCount: z.number().int().min(1).max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("building.read");
  const includeArchived = (query.filters.archived ?? searchParams.get("archived")) === "true";
  const city = query.filters.city ?? searchParams.get("city") ?? undefined;
  const { items, total } = await listManagedBuildings({
    organizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
    search: query.q,
    city: city ?? undefined,
    includeArchived,
    sort:
      query.sort &&
      (query.sort.field === "createdAt" ||
        query.sort.field === "name" ||
        query.sort.field === "city")
        ? (query.sort as { field: "createdAt" | "name" | "city"; direction: "asc" | "desc" })
        : undefined,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requirePermission("building.manage");
  const row = await createManagedBuilding({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    ...body,
  });
  return { data: row, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/buildings:
 *   get:
 *     tags:
 *       - manager
 *     summary: List managed buildings
 *     description: |
 *       **Auth:** `requirePermission("building.read")`
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - manager
 *     summary: Create managed building
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "201":
 *         description: Created
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
