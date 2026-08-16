import Link from "next/link";

import { requireSuperAdmin } from "@/server/permissions/require";
import { listSaaSPlans } from "@/server/services/platform.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatters/money";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

/**
 * SaaS plans management. Super-admin can create, edit, archive, restore,
 * and (when no history exists) delete plans from this surface.
 */
export default async function PlatformPlansPage() {
  await requireSuperAdmin();
  const plans = await listSaaSPlans();
  const t = createT(await resolveRequestLocale());

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            {t("admin.plansPage.title", { count: plans.length })}
          </h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("admin.plansPage.subtitle")}
          </p>
        </div>
        <Button asChild>
          <Link href="/administracija/planovi/novi">{t("admin.plansPage.newPlan")}</Link>
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-foreground-muted)]">
          {t("admin.plansPage.empty")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{plan.name}</div>
                    <div className="font-mono text-xs text-[var(--color-foreground-subtle)]">
                      {plan.code}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end justify-end gap-1">
                    <Badge tone={plan.active ? "success" : "neutral"}>
                      {plan.active ? t("status.active") : t("admin.archived")}
                    </Badge>
                    {plan.recommended ? (
                      <Badge tone="warning">{t("admin.recommended")}</Badge>
                    ) : null}
                    {!plan.publiclyAvailable ? (
                      <Badge tone="neutral">{t("admin.private")}</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="text-2xl font-bold">
                  {formatMoney(plan.monthlyPrice, plan.currency as "EUR" | "RSD")}
                  <span className="ml-1 text-sm font-normal text-[var(--color-foreground-muted)]">
                    {t("admin.perMonth")}
                  </span>
                </div>
                {plan.description ? (
                  <p className="text-sm text-[var(--color-foreground-muted)]">
                    {plan.description}
                  </p>
                ) : null}
                <ul className="space-y-1 text-sm text-[var(--color-foreground)]">
                  <li>
                    {t("admin.plansPage.maxProjects", {
                      value: plan.maxActiveProjects ?? t("admin.unlimited"),
                    })}
                  </li>
                  <li>
                    {t("admin.plansPage.maxUnits", {
                      value: plan.maxUnits ?? t("admin.unlimited"),
                    })}
                  </li>
                  <li>
                    {t("admin.plansPage.maxUsers", {
                      value: plan.maxMembers ?? t("admin.unlimited"),
                    })}
                  </li>
                  <li>
                    {t("admin.plansPage.maxAgencies", {
                      value: plan.maxAgencyConnections ?? t("admin.unlimited"),
                    })}
                  </li>
                  {plan.defaultTrialDays != null ? (
                    <li>
                      {t("admin.plansPage.trial", { days: plan.defaultTrialDays })}
                    </li>
                  ) : null}
                </ul>
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/administracija/planovi/${plan.id}`}>
                      {t("common.edit")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
