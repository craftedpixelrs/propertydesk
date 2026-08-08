import { apiHandler } from "@/lib/api/handler";
import { loadUserContext } from "@/server/auth/context";
import { DomainErrors } from "@/lib/errors";
import { dismissOnboarding } from "@/server/services/onboarding.service";

/**
 * Hide the "Prvi koraci" onboarding checklist for the caller's active
 * organization. Any authenticated member can dismiss it — nothing
 * about it is destructive.
 */
export const POST = apiHandler({}, async () => {
  const ctx = await loadUserContext();
  if (!ctx?.activeOrganization) {
    throw DomainErrors.forbidden("Aktivna organizacija je obavezna.");
  }
  await dismissOnboarding(ctx.activeOrganization.id, ctx.user.id);
  return { data: { ok: true } };
});
