import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { NewBuyerForm } from "@/features/buyers/new-buyer-form";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function NoviKupacPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("lead.manage")) redirect("/kupci");
  const t = createT(ctx.user.locale);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("crm.buyers.newBuyer")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("crm.buyers.newSubtitle")}
        </p>
      </div>
      <NewBuyerForm />
    </div>
  );
}
