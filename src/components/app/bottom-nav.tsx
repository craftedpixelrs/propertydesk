"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  filterNavigation,
  MOBILE_BOTTOM_NAV_KEYS,
  MoreIcon,
  navigation,
  type NavItem,
} from "@/components/app/navigation";
import type { PermissionString } from "@/server/permissions/access-control";
import { useT } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

export interface BottomNavProps {
  organizationType: "INVESTOR" | "AGENCY" | null;
  permissions: PermissionString[];
  isSuperAdmin: boolean;
  hasPropertyDeskAccess: boolean;
}

/**
 * Mobile bottom navigation: four primary entries plus a "Više" (More)
 * destination routing to `/more` for the remaining modules.
 *
 * We can't accept fully-resolved `NavItem`s (which carry Lucide icon
 * components) because those don't cross the SC→CC boundary. Instead the
 * server layout hands us the plain permission snapshot and we filter here.
 */
export function BottomNav({
  organizationType,
  permissions,
  isSuperAdmin,
  hasPropertyDeskAccess,
}: BottomNavProps) {
  const pathname = usePathname();
  const t = useT();

  const primaryItems = useMemo<NavItem[]>(() => {
    const permissionSet = new Set(permissions);
    const items = filterNavigation(navigation, {
      organizationType,
      hasPermission: (p) => permissionSet.has(p),
      isSuperAdmin,
      hasPropertyDeskAccess,
    });
    return MOBILE_BOTTOM_NAV_KEYS.map((key) => items.find((i) => i.key === key)).filter(
      (i): i is NavItem => Boolean(i),
    );
  }, [organizationType, permissions, isSuperAdmin, hasPropertyDeskAccess]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] safe-bottom md:hidden"
      aria-label={t("a11y.bottomNavigation")}
    >
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 min-h-14 text-xs",
              active
                ? "text-[var(--color-brand-700)]"
                : "text-[var(--color-foreground-muted)]",
            )}
          >
            <Icon aria-hidden className="size-5 shrink-0" />
            <span className="w-full text-center leading-tight">{t(item.labelKey)}</span>
          </Link>
        );
      })}
      <Link
        href="/more"
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 min-h-14 text-xs",
          pathname === "/more" || pathname.startsWith("/more/")
            ? "text-[var(--color-brand-700)]"
            : "text-[var(--color-foreground-muted)]",
        )}
      >
        <MoreIcon aria-hidden className="size-5 shrink-0" />
        <span className="w-full text-center leading-tight">{t("nav.more")}</span>
      </Link>
    </nav>
  );
}
