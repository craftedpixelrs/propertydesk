import { redirect } from "next/navigation";
import { requireSessionAndOrg } from "@/server/auth/session";
import { loadOrganizationProfile } from "@/server/services/organization-admin.service";
import { OrganizationProfileForm } from "@/features/settings/organization-profile-form";

export default async function OrganizationProfilePage() {
  try {
    const { org } = await requireSessionAndOrg();
    const { organization, quota } = await loadOrganizationProfile(
      org.organizationId,
    );
    return (
      <OrganizationProfileForm
        organization={{
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        }}
        profile={organization.profile}
        subscription={
          organization.subscription
            ? {
                plan: {
                  code: organization.subscription.plan.code,
                  name: organization.subscription.plan.name,
                },
                status: organization.subscription.status,
                trialEndsAt: organization.subscription.trialEndsAt,
              }
            : null
        }
        quota={quota}
      />
    );
  } catch {
    redirect("/dashboard");
  }
}
