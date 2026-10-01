"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  MOBILE_BOTTOM_NAV_KEYS,
  NAV_GROUP_LABEL,
  filterNavigation,
  groupNavigation,
  navigation,
} from "@/components/app/navigation";
import type { PermissionString } from "@/server/permissions/access-control";
import { useT } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * The "Više" (More) landing page for mobile users. Shows every navigation
 * destination that does NOT appear in the bottom bar. Each entry is a large
 * touch target (≥ 56 px) so it works well on phones.
 */
export interface MoreGridProps {
  organizationType: "INVESTOR" | "AGENCY" | null;
  permissions: PermissionString[];
  isSuperAdmin: boolean;
  hasPropertyDeskAccess: boolean;
}

const HIDDEN_KEYS = new Set<string>([...MOBILE_BOTTOM_NAV_KEYS]);

export function MoreGrid({
  organizationType,
  permissions,
  isSuperAdmin,
  hasPropertyDeskAccess,
}: MoreGridProps) {
  const t = useT();
  const items = useMemo(() => {
    const permissionSet = new Set(permissions);
    const filtered = filterNavigation(navigation, {
      organizationType,
      hasPermission: (p) => permissionSet.has(p),
      isSuperAdmin,
      hasPropertyDeskAccess,
    });
    return filtered.filter((item) => !HIDDEN_KEYS.has(item.key));
  }, [organizationType, permissions, isSuperAdmin, hasPropertyDeskAccess]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-foreground-muted)]">
        {t("empty.noResults")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupNavigation(items).map((section) => (
        <section key={section.group} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">
            {t(NAV_GROUP_LABEL[section.group])}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex min-h-24 flex-col items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm shadow-[0_1px_2px_var(--color-shadow)] transition-colors",
                    "hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand-500)]",
                  )}
                >
                  <span
                    aria-hidden
                    className="flex size-9 items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="font-medium text-[var(--color-foreground)]">
                    {t(item.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
