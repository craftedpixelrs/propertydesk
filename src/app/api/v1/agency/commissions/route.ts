import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { listAgencyCommissions } from "@/server/services/commissions/commissions.service";
import { DomainErrors } from "@/lib/errors";

export const GET = apiHandler({}, async ({ query }) => {
  const ctx = await requirePermission("commission.read");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Ovaj portal je namenjen agencijskim organizacijama.");
  }
  const { items, total } = await listAgencyCommissions({
    agencyOrganizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

/**
 * @swagger
 * /api/v1/agency/commissions:
 *   get:
 *     tags:
 *       - agency
 *     summary: List / read agency
 *     description: |
 *       **Auth:** `requirePermission("commission.read")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
