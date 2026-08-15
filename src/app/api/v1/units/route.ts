import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { createUnit, listUnits } from "@/server/services/units.service";

const UNIT_TYPES = [
  "APARTMENT",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "COMMERCIAL",
  "HOUSE",
  "OTHER",
] as const;

const UNIT_STATUSES = [
  "AVAILABLE",
  "ON_HOLD",
  "RESERVED",
  "DEPOSIT_PAID",
  "CONTRACTED",
  "SOLD",
  "BLOCKED",
  "NOT_FOR_SALE",
] as const;

const createSchema = z.object({
  projectId: z.string().min(1),
  buildingId: z.string().min(1).optional(),
  entranceId: z.string().min(1).optional(),
  floorId: z.string().min(1).optional(),
  code: z.string().min(1).max(40),
  type: z.enum(UNIT_TYPES),
  status: z.enum(UNIT_STATUSES).optional(),
  structure: z.string().max(20).optional(),
  roomCount: z.number().min(0).max(20).optional(),
  totalArea: z.number().positive(),
  internalArea: z.number().positive().optional(),
  terraceArea: z.number().min(0).optional(),
  gardenArea: z.number().min(0).optional(),
  orientation: z.string().max(60).optional(),
  basePrice: z.number().nonnegative(),
  finalPrice: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  vatIncluded: z.boolean().optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  hasTerrace: z.boolean().optional(),
  hasGarden: z.boolean().optional(),
  publicDescription: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  isVisibleToAgencies: z.boolean().optional(),
});

function parseCsvList<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
): T[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const filtered = values.filter((v): v is T => (allowed as readonly string[]).includes(v));
  return filtered.length > 0 ? filtered : undefined;
}

function parseNum(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("inventory.read");
  const { items, total } = await listUnits({
    organizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
    search: query.q,
    projectId: searchParams.get("projectId") ?? undefined,
    buildingId: searchParams.get("buildingId") ?? undefined,
    entranceId: searchParams.get("entranceId") ?? undefined,
    floorId: searchParams.get("floorId") ?? undefined,
    status: parseCsvList(searchParams.get("status") ?? undefined, UNIT_STATUSES),
    type: parseCsvList(searchParams.get("type") ?? undefined, UNIT_TYPES),
    priceMin: parseNum(searchParams.get("priceMin")),
    priceMax: parseNum(searchParams.get("priceMax")),
    areaMin: parseNum(searchParams.get("areaMin")),
    areaMax: parseNum(searchParams.get("areaMax")),
    bedroomsMin: parseNum(searchParams.get("bedroomsMin")),
    bedroomsMax: parseNum(searchParams.get("bedroomsMax")),
    activeOnly: searchParams.get("activeOnly") === "true",
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
    const ctx = await requirePermission("inventory.manage");
    const unit = await createUnit({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      ...body,
    });
    return { data: unit, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/units:
 *   get:
 *     tags:
 *       - units
 *     summary: Lista jedinica
 *     description: |
 *       **Auth:** `requirePermission("inventory.read")`
 *       Paginirana lista svih jedinica u aktivnoj organizaciji, sa filterima.
 *     parameters:
 *       - $ref: "#/components/parameters/pageParam"
 *       - $ref: "#/components/parameters/pageSizeParam"
 *       - $ref: "#/components/parameters/qParam"
 *       - $ref: "#/components/parameters/sortParam"
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: buildingId
 *         schema: { type: string }
 *       - in: query
 *         name: entranceId
 *         schema: { type: string }
 *       - in: query
 *         name: floorId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: |
 *           CSV lista statusa. Dozvoljene vrednosti:
 *           `AVAILABLE,ON_HOLD,RESERVED,DEPOSIT_PAID,CONTRACTED,SOLD,BLOCKED,NOT_FOR_SALE`.
 *         example: AVAILABLE,RESERVED
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: CSV lista tipova (`APARTMENT,GARAGE,PARKING_SPACE,STORAGE,COMMERCIAL,HOUSE,OTHER`).
 *       - in: query
 *         name: priceMin
 *         schema: { type: number }
 *       - in: query
 *         name: priceMax
 *         schema: { type: number }
 *       - in: query
 *         name: areaMin
 *         schema: { type: number }
 *       - in: query
 *         name: areaMax
 *         schema: { type: number }
 *       - in: query
 *         name: bedroomsMin
 *         schema: { type: integer }
 *       - in: query
 *         name: bedroomsMax
 *         schema: { type: integer }
 *       - in: query
 *         name: activeOnly
 *         schema: { type: boolean }
 *         description: Ako je `true`, vraća samo ne-arhivirane jedinice.
 *     responses:
 *       "200":
 *         description: Paginirana lista jedinica.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       code: { type: string, example: "A-3.5" }
 *                       type: { type: string, enum: [APARTMENT, GARAGE, PARKING_SPACE, STORAGE, COMMERCIAL, HOUSE, OTHER] }
 *                       status: { type: string, enum: [AVAILABLE, ON_HOLD, RESERVED, DEPOSIT_PAID, CONTRACTED, SOLD, BLOCKED, NOT_FOR_SALE] }
 *                       basePrice: { type: string, description: "Decimal kao string", example: "145000.00" }
 *                       totalArea: { type: string, example: "68.40" }
 *                       projectId: { type: string }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     requestId: { type: string }
 *                     pagination: { $ref: "#/components/schemas/PaginationMeta" }
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - units
 *     summary: Kreiraj jedinicu
 *     description: |
 *       **Auth:** `requirePermission("inventory.manage") + requirePermission("inventory.read")`
 *       Kreira novu jedinicu u projektu. Dozvola: `inventory.manage`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, code, type, totalArea, basePrice]
 *             properties:
 *               projectId: { type: string, minLength: 1 }
 *               buildingId: { type: string, minLength: 1 }
 *               entranceId: { type: string, minLength: 1 }
 *               floorId: { type: string, minLength: 1 }
 *               code: { type: string, minLength: 1, maxLength: 40, example: "A-3.5" }
 *               type: { type: string, enum: [APARTMENT, GARAGE, PARKING_SPACE, STORAGE, COMMERCIAL, HOUSE, OTHER] }
 *               status: { type: string, enum: [AVAILABLE, ON_HOLD, RESERVED, DEPOSIT_PAID, CONTRACTED, SOLD, BLOCKED, NOT_FOR_SALE] }
 *               structure: { type: string, maxLength: 20, example: "2.5" }
 *               roomCount: { type: number, minimum: 0, maximum: 20 }
 *               totalArea: { type: number, exclusiveMinimum: 0, example: 68.4 }
 *               internalArea: { type: number, exclusiveMinimum: 0 }
 *               terraceArea: { type: number, minimum: 0 }
 *               gardenArea: { type: number, minimum: 0 }
 *               orientation: { type: string, maxLength: 60, example: "jugoistok" }
 *               basePrice: { type: number, minimum: 0, example: 145000 }
 *               finalPrice: { type: number, minimum: 0 }
 *               currency: { type: string, minLength: 3, maxLength: 3, example: EUR }
 *               vatRate: { type: number, minimum: 0, maximum: 100, example: 20 }
 *               vatIncluded: { type: boolean }
 *               bedrooms: { type: integer, minimum: 0, maximum: 20 }
 *               bathrooms: { type: integer, minimum: 0, maximum: 20 }
 *               hasTerrace: { type: boolean }
 *               hasGarden: { type: boolean }
 *               publicDescription: { type: string, maxLength: 2000, description: "Vidljivo na javnom share linku." }
 *               internalNotes: { type: string, maxLength: 2000, description: "Nikad ne ide na javni share link." }
 *               isVisibleToAgencies: { type: boolean, default: true }
 *     responses:
 *       "201":
 *         description: Kreirana jedinica.
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "422":
 *         $ref: "#/components/responses/ValidationFailed"
 */
