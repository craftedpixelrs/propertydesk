"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProjectStatus } from "@prisma/client";

import { useT } from "@/components/app/i18n-provider";
import { projectStatusLabel } from "@/lib/i18n";

const PATH = "/projekti";

const PROJECT_STATUSES: ProjectStatus[] = [
  "DRAFT",
  "PRE_SALES",
  "ACTIVE_SALES",
  "CONSTRUCTION",
  "COMPLETED",
  "ARCHIVED",
];

const fieldClass =
  "h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm";

export interface ProjectsFilterValues {
  q: string;
  status: string;
}

export function ProjectsFilterBar({ values }: { values: ProjectsFilterValues }) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [qLocal, setQLocal] = useState(values.q);

  useEffect(() => {
    setQLocal(values.q);
  }, [values.q]);

  function apply(patch: Partial<ProjectsFilterValues>) {
    const next: ProjectsFilterValues = { ...values, q: qLocal, ...patch };
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.status.trim()) params.set("status", next.status.trim());
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${PATH}?${qs}` : PATH, { scroll: false });
    });
  }

  useEffect(() => {
    if (qLocal.trim() === values.q.trim()) return;
    const handle = window.setTimeout(() => apply({ q: qLocal }), 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce only on qLocal
  }, [qLocal]);

  const hasFilters = Boolean(values.q || values.status);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4" aria-busy={pending}>
      <input
        type="search"
        value={qLocal}
        onChange={(e) => setQLocal(e.target.value)}
        placeholder={t("inventory.projects.searchPlaceholder")}
        className={`${fieldClass} sm:col-span-2`}
        aria-label={t("inventory.projects.searchAria")}
      />
      <select
        value={values.status}
        onChange={(e) => apply({ status: e.target.value })}
        className={fieldClass}
        aria-label={t("inventory.projects.statusAria")}
      >
        <option value="">{t("common.allStatuses")}</option>
        {PROJECT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {projectStatusLabel(value, t)}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-3 text-sm text-[var(--color-foreground-muted)]">
        {pending ? <span>{t("inventory.projects.updating")}</span> : null}
        {hasFilters ? (
          <button
            type="button"
            className="font-medium text-[var(--color-brand-700)] hover:underline"
            onClick={() => {
              setQLocal("");
              apply({ q: "", status: "" });
            }}
          >
            {t("inventory.projects.resetFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
