import { redirect } from "next/navigation";
import { requireSessionAndOrg } from "@/server/auth/session";
import { loadOrganizationProfile } from "@/server/services/organization-admin.service";
import { OrganizationProfileForm } from "@/features/settings/organization-profile-form";
import { MessageTemplatesCard } from "@/features/settings/message-templates-card";
import { listMessageTemplates } from "@/server/services/messaging/buyer-mail.service";
import { loadUserContext } from "@/server/auth/context";

export default async function OrganizationProfilePage() {
  try {
    const { org } = await requireSessionAndOrg();
    const { organization, quota } = await loadOrganizationProfile(org.organizationId);
    const ctx = await loadUserContext();
    const canManage = ctx?.permissions.includes("organization.templates") ?? false;
    const templates = canManage ? await listMessageTemplates(org.organizationId) : [];
    return (
      <div className="space-y-6">
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
          orgType={org.organizationType}
        />
        {canManage ? <MessageTemplatesCard initial={templates} /> : null}
      </div>
    );
  } catch {
    redirect("/dashboard");
  }
}
