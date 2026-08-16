"use client";

import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

export interface PlaceholderPageProps {
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
}

/**
 * Localized "Coming soon" shell for feature modules whose full
 * implementation is not yet in scope.
 */
export function PlaceholderPage({ titleKey, descriptionKey }: PlaceholderPageProps) {
  const t = useT();
  return (
    <div className="space-y-6">
      <PageHeader title={t(titleKey)} />
      <EmptyState
        icon={<Sparkles className="size-6" />}
        title={t("common.comingSoon")}
        description={descriptionKey ? t(descriptionKey) : undefined}
      />
    </div>
  );
}
