import { z } from "zod";
import type { CommissionStatus } from "@prisma/client";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { listInvestorCommissions } from "@/server/services/commissions/lifecycle.service";

const STATUSES = [
  "CALCULATED",
  "APPROVED",
  "INVOICED",
  "DUE",
  "PAID",
  "DISPUTED",
  "CANCELED",
] as const;

function parseStatuses(raw: string | null): CommissionStatus[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((v): v is CommissionStatus => (STATUSES as readonly string[]).includes(v));
  return values.length > 0 ? values : undefined;
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("commission.read");
  const { items, total } = await listInvestorCommissions({
    investorOrganizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
    status: parseStatuses(searchParams.get("status")),
    agencyOrganizationId: searchParams.get("agencyOrganizationId") ?? undefined,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

/**
 * @swagger
 * /api/v1/commissions:
 *   get:
 *     tags:
 *       - commissions
 *     summary: List / read commissions
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
