import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { DomainError } from "@/lib/errors";
import { loadFloorPlan } from "@/server/services/floor-plan/floor-plan.service";
import { FloorPlanViewer } from "@/features/floor-plan/floor-plan-viewer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SpratPage({ params }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projekti"
          className="text-sm text-[var(--color-foreground-muted)] hover:underline"
        >
          ← Projekti
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Osnova · {view.floorLabel}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Kliknite na jedinicu za detaljne informacije.
        </p>
      </div>
      <FloorPlanViewer view={view} />
    </div>
  );
}
