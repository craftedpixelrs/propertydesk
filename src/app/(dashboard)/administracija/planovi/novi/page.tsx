import Link from "next/link";

import { requireSuperAdmin } from "@/server/permissions/require";
import { PlanForm } from "@/features/platform-admin/plan-form";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export default async function NewPlanPage() {
  await requireSuperAdmin();
  const t = createT(await resolveRequestLocale());
  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link
          href="/administracija/planovi"
          className="text-sm text-[var(--color-foreground-muted)] hover:underline"
        >
          ← {t("admin.plans")}
        </Link>
        <h2 className="mt-2 text-lg font-semibold">{t("admin.plansPage.createTitle")}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.plansPage.createHint")}
        </p>
      </div>
      <PlanForm mode="create" />
    </section>
  );
}
