import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { NewProjectForm } from "@/features/projects/new-project-form";

export default async function Page() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("project.create")) {
    redirect("/projekti");
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Novi projekat</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Osnovne informacije o projektu. Objekte, ulaze, spratove i jedinice možete dodati kasnije.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
