"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useI18n } from "@/components/app/i18n-provider";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";
import { unitStatusLabel, unitTypeLabel } from "@/lib/i18n";
import {
  EMPTY_CATALOG_FILTERS,
  PUBLIC_CATALOG_PAGE_SIZE,
  catalogHasFilters,
  filterCatalogUnits,
  paginateCatalog,
  type CatalogFilters,
} from "@/lib/public/catalog-filters";

export interface PublicCatalogUnit {
  id: string;
  code: string;
  type: string;
  structure: string | null;
  totalArea: string;
  internalArea: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  orientation: string | null;
  price: string | null;
  currency: string;
  status: string;
  coverDocumentId: string | null;
  shareToken: string | null;
}

const fieldClass =
  "h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm";

export function PublicProjectUnitsCatalog({
  units,
  referralCode,
}: {
  units: PublicCatalogUnit[];
  referralCode: string | null;
}) {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [page, setPage] = useState(1);

  const types = useMemo(
    () => Array.from(new Set(units.map((u) => u.type))).sort(),
    [units],
  );
  const orientations = useMemo(
    () =>
      Array.from(
        new Set(units.map((u) => u.orientation).filter((v): v is string => Boolean(v))),
      ).sort(),
    [units],
  );

  const filtered = useMemo(
    () => filterCatalogUnits(units, filters),
    [units, filters],
  );
  const paged = useMemo(
    () => paginateCatalog(filtered, page, PUBLIC_CATALOG_PAGE_SIZE),
    [filtered, page],
  );

  function patch(next: Partial<CatalogFilters>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-bold">
          {t("marketing.public.availableUnits")}
          <span className="ml-2 text-base font-normal text-neutral-500">
            ({paged.total}
            {catalogHasFilters(filters) ? ` / ${units.length}` : ""})
          </span>
        </h2>
      </div>

      <form
        className="mb-5 grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="text-xs text-neutral-500">
          {t("marketing.public.filterSearch")}
          <input
            className={`${fieldClass} mt-1`}
            value={filters.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder={t("marketing.public.filterSearchHint")}
          />
        </label>
        <label className="text-xs text-neutral-500">
          {t("marketing.public.type")}
          <select
            className={`${fieldClass} mt-1`}
            value={filters.type}
            onChange={(e) => patch({ type: e.target.value })}
          >
            <option value="">{t("common.all")}</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {unitTypeLabel(type, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-500">
          {t("marketing.public.bedrooms")}
          <select
            className={`${fieldClass} mt-1`}
            value={filters.bedrooms}
            onChange={(e) => patch({ bedrooms: e.target.value })}
          >
            <option value="">{t("common.all")}</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4+">4+</option>
          </select>
        </label>
        <label className="text-xs text-neutral-500">
          {t("marketing.public.bathroomsLabel")}
          <select
            className={`${fieldClass} mt-1`}
            value={filters.bathrooms}
            onChange={(e) => patch({ bathrooms: e.target.value })}
          >
            <option value="">{t("common.all")}</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <label className="text-xs text-neutral-500">
          {t("marketing.public.orientation")}
          <select
            className={`${fieldClass} mt-1`}
            value={filters.orientation}
            onChange={(e) => patch({ orientation: e.target.value })}
          >
            <option value="">{t("common.all")}</option>
            {orientations.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-500">
          {t("marketing.public.filterArea")}
          <span className="mt-1 flex gap-2">
            <input
              className={fieldClass}
              inputMode="decimal"
              placeholder={t("marketing.public.filterMin")}
              value={filters.areaMin}
              onChange={(e) => patch({ areaMin: e.target.value })}
            />
            <input
              className={fieldClass}
              inputMode="decimal"
              placeholder={t("marketing.public.filterMax")}
              value={filters.areaMax}
              onChange={(e) => patch({ areaMax: e.target.value })}
            />
          </span>
        </label>
        <label className="text-xs text-neutral-500">
          {t("marketing.public.filterPrice")}
          <span className="mt-1 flex gap-2">
            <input
              className={fieldClass}
              inputMode="decimal"
              placeholder={t("marketing.public.filterMin")}
              value={filters.priceMin}
              onChange={(e) => patch({ priceMin: e.target.value })}
            />
            <input
              className={fieldClass}
              inputMode="decimal"
              placeholder={t("marketing.public.filterMax")}
              value={filters.priceMax}
              onChange={(e) => patch({ priceMax: e.target.value })}
            />
          </span>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="h-10 text-sm text-[var(--color-brand-700)] hover:underline disabled:text-neutral-400"
            disabled={!catalogHasFilters(filters)}
            onClick={() => {
              setFilters(EMPTY_CATALOG_FILTERS);
              setPage(1);
            }}
          >
            {t("marketing.public.filterReset")}
          </button>
        </div>
      </form>

      {paged.total === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center text-neutral-500">
          {units.length === 0
            ? t("marketing.public.noUnits")
            : t("marketing.public.filterEmpty")}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paged.items.map((u) => (
              <Link
                key={u.id}
                href={
                  referralCode
                    ? `/p/${u.shareToken}?ref=${encodeURIComponent(referralCode)}`
                    : `/p/${u.shareToken}`
                }
                className="group overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-[var(--color-brand-500)] hover:shadow-md"
              >
                <div className="relative h-40 w-full bg-neutral-100">
                  {u.coverDocumentId && u.shareToken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/public/share/${u.shareToken}/image/${u.coverDocumentId}`}
                      alt={u.code}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-400">
                      {t("marketing.public.noImage")}
                    </div>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-neutral-700 backdrop-blur">
                    {unitStatusLabel(u.status, locale)}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-semibold">
                      {unitTypeLabel(u.type, locale)} {u.code}
                    </h3>
                    {u.structure ? (
                      <span className="text-sm text-neutral-500">{u.structure}</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                    <span>
                      {t("marketing.public.areaM2", {
                        value: Number(u.totalArea).toFixed(2),
                      })}
                    </span>
                    {u.bedrooms != null ? (
                      <span>{t("marketing.public.rooms", { count: u.bedrooms })}</span>
                    ) : null}
                    {u.bathrooms != null ? (
                      <span>{t("marketing.public.bathrooms", { count: u.bathrooms })}</span>
                    ) : null}
                    {u.orientation ? <span>{u.orientation}</span> : null}
                  </div>
                  <div className="pt-2 text-lg font-semibold text-[var(--color-brand-700)]">
                    {formatMoney(u.price ?? "0", u.currency as SupportedCurrency)}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {paged.totalPages > 1 ? (
            <nav
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
              aria-label={t("marketing.public.pagination")}
            >
              <button
                type="button"
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm disabled:opacity-40"
                disabled={paged.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("common.previous")}
              </button>
              <span className="px-2 text-sm text-neutral-600">
                {t("marketing.public.pageOf", {
                  page: paged.page,
                  total: paged.totalPages,
                })}
              </span>
              <button
                type="button"
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm disabled:opacity-40"
                disabled={paged.page >= paged.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("common.next")}
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
