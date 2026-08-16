"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ArrowRight, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OnboardingState, OnboardingStepKey } from "@/server/services/onboarding.service";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

export interface OnboardingChecklistProps {
  state: Pick<OnboardingState, "steps" | "completedCount" | "totalCount" | "allDone">;
}

const STEP_LABEL: Record<OnboardingStepKey, TranslationKey> = {
  profile: "crm.onboarding.steps.profile.label",
  project: "crm.onboarding.steps.project.label",
  units: "crm.onboarding.steps.units.label",
  team: "crm.onboarding.steps.team.label",
};

/**
 * Compact checklist card rendered on the investor dashboard while the
 * operator is still bootstrapping their organization.
 */
export function OnboardingChecklist({ state }: OnboardingChecklistProps) {
  const t = useT();
  const router = useRouter();
  const [dismissing, setDismissing] = React.useState(false);

  const percent = Math.round((state.completedCount / state.totalCount) * 100);

  async function handleDismiss() {
    setDismissing(true);
    try {
      await fetch("/api/v1/onboarding/dismiss", { method: "POST" });
      router.refresh();
    } finally {
      setDismissing(false);
    }
  }

  return (
    <Card className="border-[var(--color-brand-200)] bg-[var(--color-brand-50)]/60">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              {t("ui.onboarding.title")} ({state.completedCount}/{state.totalCount})
            </h2>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("crm.onboarding.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            className="rounded p-1.5 text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)]"
            aria-label={t("common.hide")}
            title={t("ui.onboarding.hide")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-brand-100)]">
          <div
            className="h-full bg-[var(--color-brand-600)] transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="space-y-2">
          {state.steps.map((step) => (
            <li
              key={step.key}
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-white px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {step.done ? (
                  <CheckCircle2 className="size-4 text-[var(--color-success)]" />
                ) : (
                  <Circle className="size-4 text-[var(--color-foreground-subtle)]" />
                )}
                <div>
                  <div
                    className={
                      step.done
                        ? "text-sm font-medium text-[var(--color-foreground-muted)] line-through"
                        : "text-sm font-medium"
                    }
                  >
                    {t(STEP_LABEL[step.key])}
                  </div>
                </div>
              </div>
              <Link
                href={step.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand-700)] hover:underline"
              >
                {step.done ? t("common.open") : t("crm.onboarding.continue")}
                <ArrowRight className="size-3.5" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href="/prvi-koraci">{t("ui.onboarding.openGuide")}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
