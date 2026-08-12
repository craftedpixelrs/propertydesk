import { z } from "zod";
import type { UnitStatus, UnitType } from "@prisma/client";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { listOfferUnits } from "@/server/services/agencies/offer.service";
import { DomainErrors } from "@/lib/errors";

const paramsSchema = z.object({ id: z.string().min(1) });

const UNIT_STATUSES: UnitStatus[] = [
  "AVAILABLE",
  "ON_HOLD",
  "RESERVED",
  "DEPOSIT_PAID",
  "CONTRACTED",
  "SOLD",
  "BLOCKED",
  "NOT_FOR_SALE",
];
const UNIT_TYPES: UnitType[] = [
  "APARTMENT",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "COMMERCIAL",
  "HOUSE",
  "OTHER",
];

function parseCsv<T extends string>(raw: string | null, allowed: readonly T[]): T[] | undefined {
  if (!raw) return undefined;
  const filtered = raw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter((v): v is T => (allowed as readonly string[]).includes(v));
  return filtered.length > 0 ? filtered : undefined;
}

function parseNumber(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export const GET = apiHandler({ paramsSchema }, async ({ params, query, searchParams }) => {
  const ctx = await requirePermission("agency.read");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Ovaj portal je namenjen agencijskim organizacijama.");
  }
  const { items, total } = await listOfferUnits({
    agencyOrganizationId: ctx.organization.organizationId,
    projectId: params.id,
    page: query.page,
    pageSize: query.pageSize,
    status: parseCsv(searchParams.get("status"), UNIT_STATUSES),
    type: parseCsv(searchParams.get("type"), UNIT_TYPES),
    priceMin: parseNumber(searchParams.get("priceMin")),
    priceMax: parseNumber(searchParams.get("priceMax")),
    areaMin: parseNumber(searchParams.get("areaMin")),
    areaMax: parseNumber(searchParams.get("areaMax")),
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

/**
 * @swagger
 * /api/v1/agency/offer/projects/{id}/units:
 *   get:
 *     tags:
 *       - agency
 *     summary: List / read agency
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
