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
