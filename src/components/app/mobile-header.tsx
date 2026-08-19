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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 safe-top md:hidden">
      <div className="min-w-0 text-sm font-semibold text-[var(--color-foreground)]">
        <OrgBrandMark branding={branding} compact />
      </div>
      <div className="flex min-w-0 items-center gap-1">
        <div className="min-w-0 max-w-[45vw]">
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
