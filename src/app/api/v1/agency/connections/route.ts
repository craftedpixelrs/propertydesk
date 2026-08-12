import type { AgencyConnectionStatus } from "@prisma/client";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { listMyConnections } from "@/server/services/agencies/connection.service";
import { DomainErrors } from "@/lib/errors";

const STATUSES = ["INVITED", "ACTIVE", "SUSPENDED", "REJECTED", "TERMINATED"] as const;

function parseStatuses(raw: string | null): AgencyConnectionStatus[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  const filtered = values.filter((v): v is AgencyConnectionStatus =>
    (STATUSES as readonly string[]).includes(v),
  );
  return filtered.length > 0 ? filtered : undefined;
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("agency.read");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Ovaj portal je namenjen agencijskim organizacijama.");
  }
  const { items, total } = await listMyConnections({
    agencyOrganizationId: ctx.organization.organizationId,
    status: parseStatuses(searchParams.get("status")),
    page: query.page,
    pageSize: query.pageSize,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

/**
 * @swagger
 * /api/v1/agency/connections:
 *   get:
 *     tags:
 *       - agency
 *     summary: List / read agency
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
