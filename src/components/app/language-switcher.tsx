"use client";

import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { useI18n } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

const LOCALE_SHORT: Record<Locale, string> = {
  "sr-Latn": "SRB",
  en: "EN",
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
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]",
        className,
      )}
    >
      {compact ? null : <span>{t("language.label")}</span>}
      <div
        role="group"
        aria-label={t("language.label")}
        className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
      >
        {SUPPORTED_LOCALES.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={active}
              aria-label={code === "sr-Latn" ? t("language.sr") : t("language.en")}
              onClick={() => {
                if (!active) void setLocale(code);
              }}
              className={cn(
                "inline-flex h-8 min-w-9 items-center justify-center rounded px-2 text-xs font-semibold tracking-wide",
                active
                  ? "bg-[var(--color-surface-inset)] text-[var(--color-foreground)]"
                  : "text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]",
              )}
            >
              {LOCALE_SHORT[code]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
