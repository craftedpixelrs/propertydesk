import { notFound, redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { getUnitById } from "@/server/services/units.service";
import { getProjectById } from "@/server/services/projects.service";
import { isDomainError } from "@/lib/errors";
import { createT } from "@/lib/i18n";
import { NewUnitForm } from "@/features/units/new-unit-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditUnitPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("inventory.manage")) {
    redirect(`/jedinice/${id}`);
  }
  const t = createT(ctx.user.locale);

  let unit: Awaited<ReturnType<typeof getUnitById>>;
  try {
    unit = await getUnitById(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  // Load project structure to power Objekat/Ulaz/Sprat dropdowns.
  const project = await getProjectById(ctx.activeOrganization.id, unit.projectId);
  const structure = project.buildings.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    entrances: b.entrances.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
      floors: e.floors.map((f) => ({ id: f.id, label: f.label })),
    })),
  }));

  const initialValues: Record<string, string> = {
    code: unit.code,
    type: unit.type,
    buildingId: unit.buildingId ?? "",
    entranceId: unit.entranceId ?? "",
    floorId: unit.floorId ?? "",
    structure: unit.structure ?? "",
    totalArea: unit.totalArea?.toString() ?? "",
    internalArea: unit.internalArea?.toString() ?? "",
    terraceArea: unit.terraceArea?.toString() ?? "",
    gardenArea: unit.gardenArea?.toString() ?? "",
    basePrice: unit.basePrice?.toString() ?? "",
    finalPrice: unit.finalPrice?.toString() ?? "",
    currency: unit.currency ?? "EUR",
    vatRate: unit.vatRate?.toString() ?? "",
    bedrooms: unit.bedrooms?.toString() ?? "",
    bathrooms: unit.bathrooms?.toString() ?? "",
    orientation: unit.orientation ?? "",
    publicDescription: unit.publicDescription ?? "",
    internalNotes: unit.internalNotes ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <div className="text-xs font-mono uppercase text-[var(--color-foreground-muted)]">
          {project.code} · {project.name}
        </div>
        <h1 className="text-2xl font-semibold">
          {t("inventory.units.editWithCode", { code: unit.code })}
        </h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("inventory.units.editSubtitle")}
        </p>
      </div>
      <NewUnitForm
        projectId={project.id}
        structure={structure}
        mode="edit"
        unitId={unit.id}
        initialValues={initialValues}
        expectedVersion={unit.version}
      />
    </div>
  );
}
