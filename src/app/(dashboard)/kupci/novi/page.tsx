import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { NewBuyerForm } from "@/features/buyers/new-buyer-form";

export const dynamic = "force-dynamic";

export default async function NoviKupacPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("lead.manage")) redirect("/kupci");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novi kupac</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Dodajte novog kupca u bazu. Sistem će Vas upozoriti na moguće duplikate.
        </p>
      </div>
      <NewBuyerForm />
    </div>
  );
}
