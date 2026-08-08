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
