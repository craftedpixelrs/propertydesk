import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/require";
import { listNetworkCatalog } from "@/server/services/agencies/network-catalog.service";

export const GET = apiHandler({}, async () => {
  const ctx = await requirePermission("agency.read");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Katalog je namenjen agencijama.");
  }
  const items = await listNetworkCatalog({
    agencyOrganizationId: ctx.organization.organizationId,
  });
  return { data: items };
});

/**
 * @swagger
 * /api/v1/agency/network-catalog:
 *   get:
 *     tags:
 *       - agency
 *     summary: Teaser katalog mreže investitora
 *     description: |
 *       **Auth:** `requirePermission("agency.read")` + AGENCY org
 *       Vraća samo projekte sa `networkCatalogEnabled`. Nema lista stanova.
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
