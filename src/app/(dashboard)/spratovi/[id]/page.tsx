import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { DomainError } from "@/lib/errors";
import { loadFloorPlan } from "@/server/services/floor-plan/floor-plan.service";
import { FloorPlanViewer } from "@/features/floor-plan/floor-plan-viewer";
import { FloorPlanUpload } from "@/features/floor-plan/floor-plan-upload";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SpratPage({ params }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  const t = createT(ctx.user.locale);

  const { id } = await params;
  let view;
  try {
    view = await loadFloorPlan({
      organizationId: ctx.activeOrganization.id,
      floorId: id,
    });
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const canManage = ctx.permissions.includes("inventory.manage");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/projekti"
            className="text-sm text-[var(--color-foreground-muted)] hover:underline"
          >
            {t("inventory.floorPlan.backToProjects")}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {t("inventory.floorPlan.title", { label: view.floorLabel })}
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.floorPlan.hint")}
          </p>
        </div>
        {canManage && view.floorPlanUrl ? (
          <FloorPlanUpload floorId={view.floorId} variant="compact" />
        ) : null}
      </div>
      <FloorPlanViewer view={view} canManage={canManage} />
    </div>
  );
}
