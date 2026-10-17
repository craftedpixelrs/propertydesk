"use client";

import { OrganizationSwitcher } from "@/components/app/organization-switcher";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { SearchButton } from "@/components/app/search-button";
import { OrgBrandMark, type OrgBranding } from "@/components/app/org-brand-mark";

/**
 * Slim top bar shown on mobile only. Desktop uses the sidebar header for
 * branding, so this is hidden from `md` breakpoint upward.
 */
export function MobileHeader({
  lockNav = false,
  branding = null,
}: {
  lockNav?: boolean;
  branding?: OrgBranding | null;
}) {
  return (
    <header className="safe-top sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] px-4 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.4)] backdrop-blur-md md:hidden">
      <div className="min-w-0 text-sm font-semibold text-[var(--color-foreground)]">
        <OrgBrandMark branding={branding} compact />
      </div>
      <div className="flex min-w-0 items-center gap-1">
        <div className="max-w-[45vw] min-w-0">
          <OrganizationSwitcher />
        </div>
        {lockNav ? null : (
          <>
            <SearchButton variant="compact" />
            <NotificationBell />
          </>
        )}
      </div>
    </header>
  );
}
