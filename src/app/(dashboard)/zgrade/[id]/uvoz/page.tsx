import { notFound, redirect } from "next/navigation";

import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { getManagedBuilding } from "@/server/services/manager/buildings.service";
import { isDomainError } from "@/lib/errors";
import { createT } from "@/lib/i18n";
import { BuildingImportWizard } from "@/features/manager/building-import-wizard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuildingImportPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.import", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  let building: Awaited<ReturnType<typeof getManagedBuilding>>;
  try {
    building = await getManagedBuilding(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <div className="text-xs text-[var(--color-foreground-muted)] uppercase">
          {building.name} · {building.city}
        </div>
        <h1 className="text-2xl font-semibold">{t("manager.import.title")}</h1>
      </div>
      <BuildingImportWizard buildingId={building.id} />
    </div>
  );
}
