import { requireSuperAdmin } from "@/server/permissions/require";
import { listSaaSPlans } from "@/server/services/platform.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/formatters/money";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

/**
 * Billing-scoped view of SaaS plans. Adds a "billing cycle prices" summary
 * per plan (monthly / quarterly / semi-annual / annual + onboarding).
 */
export default async function BillingPlansPage() {
  await requireSuperAdmin();
  const t = createT(await resolveRequestLocale());
  const plans = await listSaaSPlans();

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">
          {t("admin.billingPlans.title", { count: plans.length })}
        </h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.billingPlans.subtitle")}
        </p>
      </header>
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
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={plan.active ? "success" : "neutral"}>
                    {plan.active ? t("admin.activeInTeam") : t("admin.inactive")}
                  </Badge>
                  {plan.recommended ? <Badge tone="info">{t("admin.recommended")}</Badge> : null}
                  {plan.publiclyAvailable ? <Badge tone="info">{t("admin.public")}</Badge> : null}
                </div>
              </div>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-[var(--color-foreground-muted)]">
                    {t("billing.cycle.MONTHLY")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(Number(plan.monthlyPrice.toString()), plan.currency as "EUR" | "RSD")}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-[var(--color-foreground-muted)]">
                    {t("billing.cycle.QUARTERLY")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {plan.quarterlyPrice
                      ? formatMoney(Number(plan.quarterlyPrice.toString()), plan.currency as "EUR" | "RSD")
                      : t("admin.dash")}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-[var(--color-foreground-muted)]">
                    {t("billing.cycle.SEMI_ANNUAL")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {plan.semiAnnualPrice
                      ? formatMoney(Number(plan.semiAnnualPrice.toString()), plan.currency as "EUR" | "RSD")
                      : t("admin.dash")}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-[var(--color-foreground-muted)]">
                    {t("billing.cycle.ANNUAL")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {plan.annualPrice
                      ? formatMoney(Number(plan.annualPrice.toString()), plan.currency as "EUR" | "RSD")
                      : t("admin.dash")}
                  </span>
                </li>
                <li className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                  <span className="text-[var(--color-foreground-muted)]">
                    {t("admin.billingPlans.onboarding")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {plan.onboardingFee && Number(plan.onboardingFee.toString()) > 0
                      ? formatMoney(Number(plan.onboardingFee.toString()), plan.currency as "EUR" | "RSD")
                      : t("admin.dash")}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-[var(--color-foreground-muted)]">
                    {t("admin.billingPlans.trial")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {plan.defaultTrialDays != null
                      ? t("admin.billingPlans.trialDays", { days: plan.defaultTrialDays })
                      : t("admin.dash")}
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
