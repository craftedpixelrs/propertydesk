import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { t, type TranslationKey } from "@/lib/i18n";

export interface PlaceholderPageProps {
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
}

/**
 * Renders a localized "Uskoro" (Coming soon) shell for feature modules
 * whose full implementation is not yet in scope. Nav gating, breadcrumbs,
 * and permission checks still exercise the real code paths.
 */
export function PlaceholderPage({ titleKey, descriptionKey }: PlaceholderPageProps) {
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
