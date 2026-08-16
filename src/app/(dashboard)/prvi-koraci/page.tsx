import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import {
  loadOnboardingState,
  type OnboardingStepKey,
} from "@/server/services/onboarding.service";
import { createT, type TranslationKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const STEP_LABEL: Record<OnboardingStepKey, TranslationKey> = {
  profile: "crm.onboarding.steps.profile.label",
  project: "crm.onboarding.steps.project.label",
  units: "crm.onboarding.steps.units.label",
  team: "crm.onboarding.steps.team.label",
};

const STEP_HINT: Record<OnboardingStepKey, TranslationKey> = {
  profile: "crm.onboarding.steps.profile.hint",
  project: "crm.onboarding.steps.project.hint",
  units: "crm.onboarding.steps.units.hint",
  team: "crm.onboarding.steps.team.hint",
};

export default async function OnboardingPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  const t = createT(ctx.user.locale);

  const state = await loadOnboardingState(ctx.activeOrganization.id);
  const percent = Math.round(
    (state.completedCount / state.totalCount) * 100,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("ui.onboarding.title")}
        description={t("crm.onboarding.pageDescription")}
      />

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm text-[var(--color-foreground-muted)]">
                {t("ui.onboarding.progress")}
              </div>
              <div className="text-2xl font-semibold">
                {t("crm.onboarding.progressCount", {
                  completed: state.completedCount,
                  total: state.totalCount,
                  percent,
                })}
              </div>
            </div>
            {state.allDone ? (
              <span className="rounded-full bg-[var(--color-success-bg)] px-3 py-1 text-xs font-medium text-[var(--color-success)]">
                {t("ui.onboarding.allDone")}
              </span>
            ) : null}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-inset)]">
            <div
              className="h-full bg-[var(--color-brand-600)] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {state.steps.map((step, index) => (
          <Card key={step.key}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 size-5 text-[var(--color-success)]" />
                ) : (
                  <Circle className="mt-0.5 size-5 text-[var(--color-foreground-subtle)]" />
                )}
                <div>
                  <CardTitle className="text-base">
                    {t("crm.onboarding.stepTitle", {
                      n: index + 1,
                      label: t(STEP_LABEL[step.key]),
                    })}
                  </CardTitle>
                  <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                    {t(STEP_HINT[step.key])}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex justify-end pt-0">
              <Button asChild variant={step.done ? "outline" : "primary"} size="sm">
                <Link href={step.href}>
                  {step.done ? t("common.open") : t("crm.onboarding.continue")}
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {state.dismissedAt ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-2 p-4 text-sm">
            <span className="text-[var(--color-foreground-muted)]">
              {t("crm.onboarding.dismissedHint")}
            </span>
            <form action="/api/v1/onboarding/resurface" method="post">
              <Button type="submit" variant="outline" size="sm">
                {t("ui.onboarding.showAgain")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
