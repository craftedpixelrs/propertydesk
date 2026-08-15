import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { loadUserContext } from "@/server/auth/context";
import {
  isInvestorOrgSetupComplete,
  loadOrganizationProfile,
} from "@/server/services/organization-admin.service";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { ImpersonationBanner } from "@/components/app/impersonation-banner";
import { UserContextProvider } from "@/components/app/user-context";
import { OrganizationSetupWait } from "@/features/settings/organization-setup-wait";
import { OrganizationProfileForm } from "@/features/settings/organization-profile-form";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");

  const hasPropertyDeskAccess =
    ctx.isSuperAdmin || Boolean(ctx.propertyDeskTeam?.enabled);

  let lockNav = false;
  let gatedChildren: ReactNode = children;

  if (!ctx.isSuperAdmin && ctx.activeOrganization?.type === "INVESTOR") {
    const setupDone = await isInvestorOrgSetupComplete(ctx.activeOrganization.id);
    if (!setupDone) {
      lockNav = true;
      const canFill = ctx.permissions.includes("organization.manage");
      if (!canFill) {
        gatedChildren = <OrganizationSetupWait />;
      } else {
        const { organization, quota } = await loadOrganizationProfile(
          ctx.activeOrganization.id,
        );
        gatedChildren = (
          <div className="space-y-4">
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
              orgType="INVESTOR"
            />
          </div>
        );
      }
    }
  }

  const navProps = {
    organizationType: ctx.activeOrganization?.type ?? null,
    permissions: ctx.permissions,
    isSuperAdmin: ctx.isSuperAdmin,
    hasPropertyDeskAccess,
  };

  return (
    <UserContextProvider
      value={{
        user: ctx.user,
        isSuperAdmin: ctx.isSuperAdmin,
        activeOrganization: ctx.activeOrganization,
        propertyDeskTeam: ctx.propertyDeskTeam,
        permissions: ctx.permissions,
      }}
    >
      <div className="flex min-h-dvh w-full flex-col md:flex-row">
        <SidebarNav {...navProps} lockNav={lockNav} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader lockNav={lockNav} />
          {ctx.session.impersonatedBy ? (
            <ImpersonationBanner
              userName={ctx.user.name}
              organizationName={ctx.activeOrganization?.name ?? null}
            />
          ) : null}
          <main id="main-content" role="main" className="flex-1 pb-24 md:pb-8">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
              {gatedChildren}
            </div>
          </main>
        </div>
        {lockNav ? null : <BottomNav {...navProps} />}
      </div>
    </UserContextProvider>
  );
}
