import { notFound, redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { getProjectById } from "@/server/services/projects.service";
import { isDomainError } from "@/lib/errors";
import { ImportWizard } from "@/features/units/import-wizard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ImportPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("inventory.import")) {
    redirect(`/projekti/${id}`);
  }
  let project;
  try {
    project = await getProjectById(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <div className="text-xs font-mono uppercase text-[var(--color-foreground-muted)]">
          {project.code} · {project.name}
        </div>
        <h1 className="text-2xl font-semibold">Uvoz jedinica</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Podržani formati: CSV, XLSX. Kolone: <code>code</code>, <code>type</code>,{" "}
          <code>totalArea</code>, <code>basePrice</code> su obavezne. Opcione:{" "}
          <code>buildingCode</code>, <code>entranceCode</code>, <code>floorLabel</code>,{" "}
          <code>status</code>, <code>finalPrice</code>, <code>currency</code>,{" "}
          <code>vatRate</code>, <code>bedrooms</code>, <code>bathrooms</code>,{" "}
          <code>orientation</code>, <code>publicDescription</code>,{" "}
          <code>internalNotes</code>, <code>externalReference</code>.
        </p>
      </div>
      <ImportWizard projectId={project.id} />
    </div>
  );
}
