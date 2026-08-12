import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { createBuyer, findDuplicates, listBuyers } from "@/server/services/buyers.service";

const UNIT_TYPES = [
  "APARTMENT",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "COMMERCIAL",
  "HOUSE",
  "OTHER",
] as const;

const BUYER_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "VIEWING_SCHEDULED",
  "OFFER_SENT",
  "NEGOTIATION",
  "RESERVATION",
  "WON",
  "LOST",
  "ARCHIVED",
] as const;

const createSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(160).optional().or(z.literal("")),
  phone: z.string().min(3).max(40),
  secondaryPhone: z.string().max(40).optional(),
  preferredContactMethod: z.enum(["PHONE", "EMAIL", "ANY"]).optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  preferredCurrency: z.string().length(3).optional(),
  desiredUnitTypes: z.array(z.enum(UNIT_TYPES)).optional(),
  desiredRoomCounts: z.array(z.string().max(10)).optional(),
  desiredAreaMin: z.number().nonnegative().optional(),
  desiredAreaMax: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
  source: z.string().max(120).optional(),
  status: z.enum(BUYER_STATUSES).optional(),
  assignedUserId: z.string().min(1).optional(),
});

function parseCsvList<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
): T[] | undefined {
  if (!raw) return undefined;
  const values = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const filtered = values.filter((v): v is T => (allowed as readonly string[]).includes(v));
  return filtered.length > 0 ? filtered : undefined;
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("lead.read");
  const { items, total } = await listBuyers({
    organizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
    search: query.q,
    status: parseCsvList(searchParams.get("status") ?? undefined, BUYER_STATUSES),
    assignedUserId: searchParams.get("assignedUserId") ?? undefined,
    activeOnly: searchParams.get("activeOnly") !== "false",
    sort: query.sort,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requirePermission("lead.manage");
  const email = body.email ? body.email : null;

  // Surface (but don't block on) duplicates so the client can warn.
  const duplicates = await findDuplicates({
    organizationId: ctx.organization.organizationId,
    phone: body.phone,
    email,
  });

  const buyer = await createBuyer({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    ...body,
    email,
  });

  return { data: { ...buyer, duplicateWarnings: duplicates }, status: 201 };
});

/**
 * @swagger
 * /api/v1/buyers:
 *   get:
 *     tags:
 *       - buyers
 *     summary: List / read buyers
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - buyers
 *     summary: Create buyers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
