"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { useT } from "@/components/app/i18n-provider";

const fieldClass =
  "h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm";

/**
 * Live status filter: changing the select updates the URL immediately.
 * Used on list pages that only filter by status (reservations, sales).
 */
export function StatusFilterBar({
  path,
  status,
  options,
}: {
  path: string;
  status: string;
  options: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();

  function apply(nextStatus: string) {
    const params = new URLSearchParams();
    if (nextStatus.trim()) params.set("status", nextStatus.trim());
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3" aria-busy={pending}>
      <select
        value={status}
        onChange={(e) => apply(e.target.value)}
        className={fieldClass}
        aria-label={t("common.statusFilterAria")}
      >
        <option value="">{t("common.allStatuses")}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending ? (
        <span className="text-sm text-[var(--color-foreground-muted)]">
          {t("common.updating")}
        </span>
      ) : null}
      {status ? (
        <button
          type="button"
          className="text-sm font-medium text-[var(--color-brand-700)] hover:underline"
          onClick={() => apply("")}
        >
          {t("common.resetFilters")}
        </button>
      ) : null}
    </div>
  );
}
