import { apiHandler } from "@/lib/api/handler";
import { loadUserContext } from "@/server/auth/context";
import { DomainErrors } from "@/lib/errors";
import { resurfaceOnboarding } from "@/server/services/onboarding.service";

/**
 * Reset the dismiss flag so the checklist reappears on the dashboard.
 * Used from `/prvi-koraci` when the operator explicitly opts back in.
 */
export const POST = apiHandler({}, async () => {
  const ctx = await loadUserContext();
  if (!ctx?.activeOrganization) {
    throw DomainErrors.forbidden("Aktivna organizacija je obavezna.");
  }
  await resurfaceOnboarding(ctx.activeOrganization.id, ctx.user.id);
  return { data: { ok: true } };
});
