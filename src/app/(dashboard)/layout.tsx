import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { loadUserContext } from "@/server/auth/context";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { ImpersonationBanner } from "@/components/app/impersonation-banner";
import { UserContextProvider } from "@/components/app/user-context";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");

  // Nav filtering happens client-side inside the child components so we
  // don't have to serialize Lucide icon components across the SC→CC
  // boundary. Only plain strings + booleans are passed here.
  const navProps = {
    organizationType: ctx.activeOrganization?.type ?? null,
    permissions: ctx.permissions,
    isSuperAdmin: ctx.isSuperAdmin,
  };

  return (
    <UserContextProvider
      value={{
        user: ctx.user,
        isSuperAdmin: ctx.isSuperAdmin,
        activeOrganization: ctx.activeOrganization,
        permissions: ctx.permissions,
      }}
    >
      <div className="flex min-h-dvh w-full flex-col md:flex-row">
        <SidebarNav {...navProps} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          {ctx.session.impersonatedBy ? (
            <ImpersonationBanner
              userName={ctx.user.name}
              organizationName={ctx.activeOrganization?.name ?? null}
            />
          ) : null}
          <main id="main-content" role="main" className="flex-1 pb-24 md:pb-8">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
        <BottomNav {...navProps} />
      </div>
    </UserContextProvider>
  );
}
