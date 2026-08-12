import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { listOfferProjects } from "@/server/services/agencies/offer.service";
import { DomainErrors } from "@/lib/errors";

export const GET = apiHandler({}, async () => {
  const ctx = await requirePermission("agency.read");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Ovaj portal je namenjen agencijskim organizacijama.");
  }
  const items = await listOfferProjects({
    agencyOrganizationId: ctx.organization.organizationId,
  });
  return { data: items };
});

/**
 * @swagger
 * /api/v1/agency/offer/projects:
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
