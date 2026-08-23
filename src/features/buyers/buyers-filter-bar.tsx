"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BuyerStatus } from "@prisma/client";

import { useT } from "@/components/app/i18n-provider";
import { enumLabel, type TranslateFn, type TranslationKey } from "@/lib/i18n";

const PATH = "/kupci";

const BUYER_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "VIEWING_SCHEDULED",
  "OFFER_SENT",
  "NEGOTIATION",
  "RESERVATION",
  "WON",
  "LOST",
  "ARCHIVED",
] as const satisfies readonly BuyerStatus[];

const fieldClass =
  "h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm";

function buyerStatusLabel(status: BuyerStatus, t: TranslateFn): string {
  const fromEnum = enumLabel("buyer", status, t);
  if (fromEnum !== status) return fromEnum;
  return t(`crm.buyerStatus.${status}` as TranslationKey);
}

export interface BuyersFilterValues {
  q: string;
  status: string;
}

export function BuyersFilterBar({ values }: { values: BuyersFilterValues }) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [qLocal, setQLocal] = useState(values.q);

  useEffect(() => {
    setQLocal(values.q);
  }, [values.q]);

  function apply(patch: Partial<BuyersFilterValues>) {
    const next: BuyersFilterValues = { ...values, q: qLocal, ...patch };
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
        placeholder={t("crm.buyers.searchPlaceholder")}
        className={`${fieldClass} sm:col-span-2`}
        aria-label={t("crm.buyers.searchAria")}
      />
      <select
        value={values.status}
        onChange={(e) => apply({ status: e.target.value })}
        className={fieldClass}
        aria-label={t("crm.buyers.statusAria")}
      >
        <option value="">{t("common.allStatuses")}</option>
        {BUYER_STATUSES.map((value) => (
          <option key={value} value={value}>
            {buyerStatusLabel(value, t)}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-3 text-sm text-[var(--color-foreground-muted)]">
        {pending ? <span>{t("crm.buyers.updating")}</span> : null}
        {hasFilters ? (
          <button
            type="button"
            className="font-medium text-[var(--color-brand-700)] hover:underline"
            onClick={() => {
              setQLocal("");
              apply({ q: "", status: "" });
            }}
          >
            {t("crm.buyers.resetFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
