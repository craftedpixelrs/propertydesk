"use client";

import { SUPPORTED_THEMES, type Theme } from "@/lib/theme";
import { useTheme } from "@/components/app/theme-provider";
import { useI18n } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

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
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]",
        className,
      )}
    >
      {compact ? null : <span>{t("theme.label")}</span>}
      <div
        role="group"
        aria-label={t("theme.label")}
        className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
      >
        {SUPPORTED_THEMES.map((code) => {
          const active = theme === code;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={active}
              aria-label={code === "light" ? t("theme.light") : t("theme.dark")}
              onClick={() => {
                if (!active) void setTheme(code);
              }}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded",
                active
                  ? "bg-[var(--color-surface-inset)]"
                  : "hover:bg-[var(--color-surface-inset)]/60",
              )}
            >
              <ThemeSwatch theme={code} active={active} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThemeSwatch({ theme, active }: { theme: Theme; active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-4 rounded-full border",
        theme === "light"
          ? "bg-[#f4f5f7] border-[var(--color-border-strong)]"
          : "bg-[#161b22] border-[var(--color-border-strong)]",
        active && "ring-2 ring-[var(--color-brand-600)] ring-offset-1 ring-offset-[var(--color-surface)]",
      )}
    />
  );
}
