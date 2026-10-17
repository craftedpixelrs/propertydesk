"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useT } from "@/components/app/i18n-provider";

const PATH = "/rezervacije";

const fieldClass =
  "h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)]";

export function ReservationsFilterBar({
  q,
  status,
  view,
  statusOptions,
}: {
  q: string;
  status: string;
  view: "list" | "board";
  statusOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [qLocal, setQLocal] = useState(q);

  useEffect(() => {
    setQLocal(q);
  }, [q]);

  function apply(next: { q: string; status: string }) {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (view === "list" && next.status.trim()) params.set("status", next.status.trim());
    if (view === "board") params.set("view", "board");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${PATH}?${qs}` : PATH, { scroll: false });
    });
  }

  useEffect(() => {
    if (qLocal.trim() === q.trim()) return;
    const handle = window.setTimeout(() => apply({ q: qLocal, status }), 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce only on the typed query
  }, [qLocal]);

  const hasFilters = Boolean(q || (view === "list" && status));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4" aria-busy={pending}>
      <input
        type="search"
        value={qLocal}
        onChange={(e) => setQLocal(e.target.value)}
        placeholder={t("deals.reservations.searchPlaceholder")}
        className={`${fieldClass} sm:col-span-2`}
        aria-label={t("deals.reservations.searchAria")}
        autoComplete="off"
      />
      {view === "list" ? (
        <select
          value={status}
          onChange={(e) => apply({ q: qLocal, status: e.target.value })}
          className={fieldClass}
          aria-label={t("common.statusFilterAria")}
        >
          <option value="">{t("common.allStatuses")}</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-3 text-sm text-[var(--color-foreground-muted)]">
        {pending ? <span>{t("common.updating")}</span> : null}
        {hasFilters ? (
          <button
            type="button"
            className="font-medium text-[var(--color-brand-700)] hover:underline"
            onClick={() => {
              setQLocal("");
              apply({ q: "", status: "" });
            }}
          >
            {t("common.resetFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
