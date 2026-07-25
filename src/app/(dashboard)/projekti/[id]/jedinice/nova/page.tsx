import { notFound, redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { getProjectById } from "@/server/services/projects.service";
import { isDomainError } from "@/lib/errors";
import { NewUnitForm } from "@/features/units/new-unit-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewUnitPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("inventory.manage")) {
    redirect(`/projekti/${id}`);
  }

  let project;
  try {
    project = await getProjectById(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

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

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <div className="text-xs font-mono uppercase text-[var(--color-foreground-muted)]">
          {project.code} · {project.name}
        </div>
        <h1 className="text-2xl font-semibold">Nova jedinica</h1>
      </div>
      <NewUnitForm projectId={project.id} structure={structure} />
    </div>
  );
}
