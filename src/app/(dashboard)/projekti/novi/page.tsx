import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { NewProjectForm } from "@/features/projects/new-project-form";
import { createT } from "@/lib/i18n";

export default async function Page() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("project.create")) {
    redirect("/projekti");
  }
  const t = createT(ctx.user.locale);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("projects.newProject")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("inventory.projects.newSubtitle")}
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
