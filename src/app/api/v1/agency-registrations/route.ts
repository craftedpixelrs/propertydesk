import type { AgencyBuyerRegistrationStatus } from "@prisma/client";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { listRegistrationsForInvestor } from "@/server/services/agencies/registrations.service";

const STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
  "CANCELED",
  "CONFLICT_REVIEW",
] as const;

function parseStatuses(raw: string | null): AgencyBuyerRegistrationStatus[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  const filtered = values.filter((v): v is AgencyBuyerRegistrationStatus =>
    (STATUSES as readonly string[]).includes(v),
  );
  return filtered.length > 0 ? filtered : undefined;
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("agency.manage");
  const { items, total } = await listRegistrationsForInvestor({
    investorOrganizationId: ctx.organization.organizationId,
    status: parseStatuses(searchParams.get("status")),
    page: query.page,
    pageSize: query.pageSize,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

/**
 * @swagger
 * /api/v1/agency-registrations:
 *   get:
 *     tags:
 *       - agency-registrations
 *     summary: List / read agency-registrations
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
