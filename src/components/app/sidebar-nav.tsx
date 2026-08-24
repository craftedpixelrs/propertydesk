"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, LogOut } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/components/app/i18n-provider";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { OrgBrandMark, type OrgBranding } from "@/components/app/org-brand-mark";
import { cn } from "@/lib/utils";
import { filterNavigation, navigation } from "@/components/app/navigation";
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
export function SidebarNav({
  organizationType,
  permissions,
  isSuperAdmin,
  hasPropertyDeskAccess,
  lockNav = false,
  branding = null,
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
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

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <aside
      className="hidden md:flex md:w-64 md:shrink-0 md:flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]"
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
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--color-foreground)]",
                        active
                          ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                          : "hover:bg-[var(--color-surface-inset)]",
                      )}
                    >
                      <Icon aria-hidden className="size-4 flex-none" />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
      {lockNav ? <div className="flex-1" /> : null}
      <div className="border-t border-[var(--color-border)] p-2 space-y-1">
        <LanguageSwitcher className="px-3 py-1" compact />
        <Link
          href="/podesavanja/profil"
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm",
            pathname === "/podesavanja/profil" ||
              pathname.startsWith("/podesavanja/profil/")
              ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
              : "text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)]",
          )}
        >
          <CircleUser aria-hidden className="size-4" />
          {t("nav.account")}
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)]"
        >
          <LogOut aria-hidden className="size-4" />
          {t("nav.signOut")}
        </button>
      </div>
    </aside>
  );
}
