"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UnitStatus, UnitType } from "@prisma/client";

import { useT } from "@/components/app/i18n-provider";
import { unitStatusLabel, unitTypeLabel } from "@/lib/i18n";

const PATH = "/jedinice";

const UNIT_STATUSES: UnitStatus[] = [
  "AVAILABLE",
  "ON_HOLD",
  "RESERVED",
  "DEPOSIT_PAID",
  "CONTRACTED",
  "SOLD",
  "BLOCKED",
  "NOT_FOR_SALE",
];

const UNIT_TYPES: UnitType[] = [
  "APARTMENT",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "COMMERCIAL",
  "HOUSE",
  "OTHER",
];

const fieldClass =
  "h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm";

export interface UnitsFilterValues {
  q: string;
  projectId: string;
  status: string;
  type: string;
}

export function UnitsFilterBar({
  values,
  projects,
}: {
  values: UnitsFilterValues;
  projects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [qLocal, setQLocal] = useState(values.q);

  useEffect(() => {
    setQLocal(values.q);
  }, [values.q]);

  function apply(patch: Partial<UnitsFilterValues>) {
    const next: UnitsFilterValues = { ...values, q: qLocal, ...patch };
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.projectId.trim()) params.set("projectId", next.projectId.trim());
    if (next.status.trim()) params.set("status", next.status.trim());
    if (next.type.trim()) params.set("type", next.type.trim());
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

  const hasFilters = Boolean(values.q || values.projectId || values.status || values.type);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4" aria-busy={pending}>
      <input
        type="search"
        value={qLocal}
        onChange={(e) => setQLocal(e.target.value)}
        placeholder={t("inventory.units.searchPlaceholder")}
        className={`${fieldClass} sm:col-span-2`}
        aria-label={t("inventory.units.searchAria")}
      />
      <select
        value={values.projectId}
        onChange={(e) => apply({ projectId: e.target.value })}
        className={fieldClass}
        aria-label={t("inventory.units.projectAria")}
      >
        <option value="">{t("common.allProjects")}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        value={values.status}
        onChange={(e) => apply({ status: e.target.value })}
        className={fieldClass}
        aria-label={t("inventory.units.statusAria")}
      >
        <option value="">{t("common.allStatuses")}</option>
        {UNIT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {unitStatusLabel(value, t)}
          </option>
        ))}
      </select>
      <select
        value={values.type}
        onChange={(e) => apply({ type: e.target.value })}
        className={fieldClass}
        aria-label={t("inventory.units.typeAria")}
      >
        <option value="">{t("inventory.units.allTypes")}</option>
        {UNIT_TYPES.map((value) => (
          <option key={value} value={value}>
            {unitTypeLabel(value, t)}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-3 text-sm text-[var(--color-foreground-muted)] sm:col-span-3">
        {pending ? <span>{t("inventory.units.updating")}</span> : null}
        {hasFilters ? (
          <button
            type="button"
            className="font-medium text-[var(--color-brand-700)] hover:underline"
            onClick={() => {
              setQLocal("");
              apply({ q: "", projectId: "", status: "", type: "" });
            }}
          >
            {t("inventory.units.resetFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
