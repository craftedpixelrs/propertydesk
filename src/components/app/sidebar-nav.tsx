"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useT } from "@/components/app/i18n-provider";
import { OrgBrandMark, type OrgBranding } from "@/components/app/org-brand-mark";
import { cn } from "@/lib/utils";
import {
  activeNavHref,
  filterNavigation,
  groupNavigation,
  NAV_GROUP_LABEL,
  navigation,
} from "@/components/app/navigation";
import type { PermissionString } from "@/server/permissions/access-control";
import { OrganizationSwitcher } from "@/components/app/organization-switcher";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { SearchButton } from "@/components/app/search-button";

export interface SidebarNavProps {
  organizationType: "INVESTOR" | "AGENCY" | null;
  permissions: PermissionString[];
  isSuperAdmin: boolean;
  hasPropertyDeskAccess: boolean;
  lockNav?: boolean;
  branding?: OrgBranding | null;
}

/**
 * The navigation list (with Lucide icon *components*) cannot cross the
 * Server Component → Client Component serialization boundary. So the
 * parent layout hands us only the plain-string permission snapshot and
 * we build the filtered list here on the client.
 */
function NavSections({
  items,
  pathname,
}: {
  items: ReturnType<typeof filterNavigation>;
  pathname: string;
}) {
  const t = useT();
  const current = activeNavHref(pathname, items);
  return (
    <ul className="space-y-4">
      {groupNavigation(items).map((section) => (
        <li key={section.group}>
          <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-foreground-subtle)]">
            {t(NAV_GROUP_LABEL[section.group])}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = item.href === current;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-[var(--color-brand-50)] font-medium text-[var(--color-brand-800)]"
                        : "text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]",
                    )}
                  >
                    {active ? (
                      <span
                        aria-hidden
                        className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-[var(--color-brand-600)]"
                      />
                    ) : null}
                    <Icon
                      aria-hidden
                      className={cn(
                        "size-4 flex-none",
                        active
                          ? "text-[var(--color-brand-700)]"
                          : "text-[var(--color-foreground-subtle)]",
                      )}
                    />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function SidebarNav({
  organizationType,
  permissions,
  isSuperAdmin,
  hasPropertyDeskAccess,
  lockNav = false,
  branding = null,
}: SidebarNavProps) {
  const pathname = usePathname();
  const t = useT();

  const items = useMemo(() => {
    const permissionSet = new Set(permissions);
    return filterNavigation(navigation, {
      organizationType,
      hasPermission: (p) => permissionSet.has(p),
      isSuperAdmin,
      hasPropertyDeskAccess,
    });
  }, [organizationType, permissions, isSuperAdmin, hasPropertyDeskAccess]);

  return (
    <aside
      className="hidden border-r border-[var(--color-border)] bg-[var(--color-sidebar)] md:flex md:w-[17rem] md:shrink-0 md:flex-col"
      aria-label={t("a11y.primaryNavigation")}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 font-semibold text-[var(--color-foreground)]">
        <OrgBrandMark branding={branding} />
        {/* Sidebar is narrow (~256px). Anchor the popover to the *right side*
         * of the bell so it expands into the main content area instead of
         * off-screen to the left. */}
        {lockNav ? null : <NotificationBell align="start" />}
      </div>
      <div className="border-b border-[var(--color-border)] p-3">
        <OrganizationSwitcher className="w-full" />
      </div>
      {lockNav ? null : (
        <>
          <div className="border-b border-[var(--color-border)] p-3">
            <SearchButton />
          </div>
          <nav className="px-2 py-3">
            <NavSections items={items} pathname={pathname} />
          </nav>
        </>
      )}
    </aside>
  );
}
