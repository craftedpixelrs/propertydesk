import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";

export default async function SettingsIndexPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja/profil");
  redirect("/podesavanja/organizacija");
}
