"use client";

import { SUPPORTED_THEMES, type Theme } from "@/lib/theme";
import { useTheme } from "@/components/app/theme-provider";
import { useI18n } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

const THEME_OPTION_KEY: Record<Theme, "theme.light" | "theme.dark"> = {
  light: "theme.light",
  dark: "theme.dark",
};

export function ThemeSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]",
        compact ? "justify-between" : "",
        className,
      )}
    >
      {compact ? null : <span>{t("theme.label")}</span>}
      <select
        aria-label={t("theme.label")}
        value={theme}
        onChange={(event) => {
          void setTheme(event.target.value as Theme);
        }}
        className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-foreground)]"
      >
        {SUPPORTED_THEMES.map((code) => (
          <option key={code} value={code}>
            {t(THEME_OPTION_KEY[code])}
          </option>
        ))}
      </select>
    </label>
  );
}
