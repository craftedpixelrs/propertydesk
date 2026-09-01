"use client";

import { Search } from "lucide-react";

import { useCommandPalette } from "@/components/app/command-palette";
import { useT } from "@/components/app/i18n-provider";

/**
 * Button that opens the global command palette. Kept as a small
 * separate component so it can be dropped into both the desktop
 * sidebar and the mobile header without duplicating the hotkey /
 * dialog wiring.
 */
export function SearchButton({ variant = "sidebar" }: { variant?: "sidebar" | "compact" }) {
  const { toggle } = useCommandPalette();
  const t = useT();
  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={t("ui.search.open")}
        className="inline-flex size-9 items-center justify-center rounded-md text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)]"
      >
        <Search aria-hidden className="size-4" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-left text-sm text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)]"
    >
      <Search aria-hidden className="size-4" />
      <span className="flex-1 truncate">{t("ui.search.title")}…</span>
      <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-1.5 py-0.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
