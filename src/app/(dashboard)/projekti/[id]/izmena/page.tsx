import { notFound, redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { getProjectById } from "@/server/services/projects.service";
import { isDomainError } from "@/lib/errors";
import { NewProjectForm } from "@/features/projects/new-project-form";

interface Props {
  params: Promise<{ id: string }>;
}

function toDateInput(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("project.update")) {
    redirect(`/projekti/${id}`);
  }

  let project: Awaited<ReturnType<typeof getProjectById>>;
  try {
    project = await getProjectById(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  const initialValues: Record<string, string> = {
    code: project.code,
    name: project.name,
    city: project.city ?? "",
    address: project.address ?? "",
    municipality: project.municipality ?? "",
    postalCode: project.postalCode ?? "",
    projectStatus: project.projectStatus ?? "",
    salesStartDate: toDateInput(project.salesStartDate),
    constructionStartDate: toDateInput(project.constructionStartDate),
    expectedCompletionDate: toDateInput(project.expectedCompletionDate),
    defaultCurrency: project.defaultCurrency ?? "",
    defaultVatRate: project.defaultVatRate ? String(project.defaultVatRate) : "",
    description: project.description ?? "",
    internalNotes: project.internalNotes ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <div className="text-xs font-mono uppercase text-[var(--color-foreground-muted)]">
          {project.code}
        </div>
        <h1 className="text-2xl font-semibold">Izmeni projekat</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Šifra projekta ne može se menjati posle kreiranja. Sve ostale izmene se audit-uju.
        </p>
      </div>
      <NewProjectForm mode="edit" projectId={project.id} initialValues={initialValues} />
    </div>
  );
}
