import { listSaaSPlans } from "@/server/services/platform.service";
import { NewOrganizationForm } from "@/features/platform-admin/new-organization-form";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export default async function NewOrganizationPage() {
  const t = createT(await resolveRequestLocale());
  const plans = await listSaaSPlans();
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{t("admin.orgsPage.newOrg")}</h2>
      <NewOrganizationForm
        plans={plans
          .filter((p) => p.active)
          .map((p) => ({ code: p.code, name: p.name }))}
      />
    </section>
  );
}
