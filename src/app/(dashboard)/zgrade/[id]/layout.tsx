import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import {
  assertBuildingBelongsToOrg,
  getManagedBuilding,
} from "@/server/services/manager/buildings.service";
import { isDomainError } from "@/lib/errors";
import { createT } from "@/lib/i18n";

interface Props {
  params: Promise<{ id: string }>;
  children: ReactNode;
}

const TABS = [
  { href: "", key: "overview" as const },
  { href: "/delovi", key: "units" as const },
  { href: "/vlasnici", key: "owners" as const },
  { href: "/finansije", key: "finance" as const },
  { href: "/kvarovi", key: "tickets" as const },
  { href: "/skupstine", key: "assemblies" as const },
  { href: "/obavestenja", key: "notices" as const },
  { href: "/dokumenti", key: "documents" as const },
];

/**
 * Shared chrome for `/zgrade/[id]/*` — header with building meta + tab bar.
 * Individual tab routes render into `{children}`.
 */
export default async function BuildingDetailLayout({ params, children }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });

  const t = createT(ctx.user.locale);

  // Narrow + fetch
  await assertBuildingBelongsToOrg(ctx.activeOrganization.id, id);
  let building: Awaited<ReturnType<typeof getManagedBuilding>>;
  try {
    building = await getManagedBuilding(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-[var(--color-foreground-muted)] uppercase">
            {t("manager.buildings.title")}
          </div>
          <h1 className="text-2xl font-semibold">{building.name}</h1>
          <div className="text-sm text-[var(--color-foreground-muted)]">
            {building.city} · {building.address}
            {building.legalName ? ` · ${building.legalName}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGuard permission="building.import">
            <Button asChild variant="outline">
              <Link href={`/zgrade/${building.id}/uvoz`}>
                {t("manager.buildings.importButton")}
              </Link>
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <nav
        aria-label={t("manager.buildings.title")}
        className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] text-sm"
      >
        {TABS.map((tab) => {
          const href = `/zgrade/${building.id}${tab.href}`;
          return (
            <Link
              key={tab.key}
              href={href}
              className="rounded-t-md px-3 py-2 text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-foreground)]"
            >
              {t(`manager.building.tabs.${tab.key}`)}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
