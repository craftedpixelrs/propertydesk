"use client";

import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { useI18n } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

const LOCALE_OPTION_KEY: Record<Locale, "language.sr" | "language.en"> = {
  "sr-Latn": "language.sr",
  en: "language.en",
};

export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]",
        compact ? "justify-between" : "",
        className,
      )}
    >
      {compact ? null : <span>{t("language.label")}</span>}
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => {
          void setLocale(event.target.value as Locale);
        }}
        className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-foreground)]"
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(LOCALE_OPTION_KEY[code])}
          </option>
        ))}
      </select>
    </label>
  );
}
