"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

import { SuggestInput, type SuggestOption } from "@/components/ui/suggest-input";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";

export type GeoSuggestion = {
  label: string;
  city: string;
  municipality: string | null;
  address: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

interface Props {
  values: Record<string, string>;
  setValue: (name: string, value: string) => void;
  fieldErrors: Record<string, string[]>;
  coordsLockRef: MutableRefObject<boolean>;
}

function toOptions(items: GeoSuggestion[], prefix: string): SuggestOption[] {
  return items.map((item, index) => ({
    id: `${prefix}-${item.label}-${index}`,
    label: item.address ?? item.label,
    hint: [item.municipality, item.postalCode].filter(Boolean).join(" · ") || undefined,
  }));
}

export function LocationFields({
  values,
  setValue,
  fieldErrors,
  coordsLockRef,
}: Props) {
  const t = useT();
  const [cityOptions, setCityOptions] = useState<SuggestOption[]>([]);
  const [munOptions, setMunOptions] = useState<SuggestOption[]>([]);
  const [addressOptions, setAddressOptions] = useState<SuggestOption[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [munLoading, setMunLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const cityCache = useRef<GeoSuggestion[]>([]);
  const munCache = useRef<GeoSuggestion[]>([]);
  const addressCache = useRef<GeoSuggestion[]>([]);
  const postalManual = useRef(false);
  const cityTimer = useRef<number | null>(null);
  const munTimer = useRef<number | null>(null);
  const addressTimer = useRef<number | null>(null);

  function applySuggestion(item: GeoSuggestion, as: "city" | "municipality" | "address") {
    if (as === "city") {
      setValue("city", item.city || item.label);
      if (item.municipality) setValue("municipality", item.municipality);
      if (item.postalCode && !postalManual.current) {
        setValue("postalCode", item.postalCode);
      }
      coordsLockRef.current = false;
      return;
    }
    if (as === "municipality") {
      setValue("municipality", item.municipality || item.label);
      if (item.postalCode && !postalManual.current) {
        setValue("postalCode", item.postalCode);
      }
      return;
    }
    if (item.address) setValue("address", item.address);
    if (item.municipality && !values.municipality) {
      setValue("municipality", item.municipality);
    }
    if (item.postalCode && !postalManual.current) {
      setValue("postalCode", item.postalCode);
    }
    if (item.latitude != null && item.longitude != null) {
      setValue("latitude", item.latitude.toFixed(6));
      setValue("longitude", item.longitude.toFixed(6));
      coordsLockRef.current = false;
    }
  }

  function fetchKind(
    kind: "city" | "municipality" | "address",
    q: string,
    setter: (options: SuggestOption[]) => void,
    cache: MutableRefObject<GeoSuggestion[]>,
    setLoading: (busy: boolean) => void,
  ) {
    setLoading(true);
    apiClient
      .get<{ items: GeoSuggestion[] }>("/geo/suggest", {
        query: { kind, q, city: values.city || undefined },
      })
      .then((data) => {
        cache.current = data.items;
        setter(toOptions(data.items, kind));
      })
      .catch(() => {
        cache.current = [];
        setter([]);
      })
      .finally(() => setLoading(false));
  }

  function debounce(
    timer: MutableRefObject<number | null>,
    fn: () => void,
    ms = 220,
  ) {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ms);
  }

  async function geocodeIfPossible() {
    const city = values.city?.trim();
    const address = values.address?.trim();
    if (!city || !address || coordsLockRef.current) return;
    try {
      const data = await apiClient.get<{ item: GeoSuggestion | null }>("/geo/geocode", {
        query: { city, address },
      });
      if (!data.item?.latitude || !data.item.longitude) return;
      setValue("latitude", data.item.latitude.toFixed(6));
      setValue("longitude", data.item.longitude.toFixed(6));
      if (data.item.municipality && !values.municipality) {
        setValue("municipality", data.item.municipality);
      }
      if (data.item.postalCode && !postalManual.current) {
        setValue("postalCode", data.item.postalCode);
      }
    } catch {
      // Manual / map remain available.
    }
  }

  useEffect(() => {
    return () => {
      if (cityTimer.current) window.clearTimeout(cityTimer.current);
      if (munTimer.current) window.clearTimeout(munTimer.current);
      if (addressTimer.current) window.clearTimeout(addressTimer.current);
    };
  }, []);

  function fieldError(name: string) {
    return fieldErrors[name]?.map((msg, idx) => (
      <p key={idx} className="text-xs text-red-600">
        {msg}
      </p>
    ));
  }

  return (
    <>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="city">
          {t("projects.fields.city")}
        </label>
        <SuggestInput
          id="city"
          name="city"
          value={values.city ?? ""}
          options={cityOptions}
          loading={cityLoading}
          emptyLabel={t("inventory.form.noSuggestions")}
          onChange={(value) => {
            setValue("city", value);
            coordsLockRef.current = false;
          }}
          onOpen={() =>
            fetchKind("city", values.city ?? "", setCityOptions, cityCache, setCityLoading)
          }
          onQueryChange={(q) =>
            debounce(cityTimer, () =>
              fetchKind("city", q, setCityOptions, cityCache, setCityLoading),
            )
          }
          onSelect={(option) => {
            const item = cityCache.current.find((row) => row.label === option.label);
            if (item) applySuggestion(item, "city");
          }}
        />
        {fieldError("city")}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="address">
          {t("projects.fields.address")}
        </label>
        <SuggestInput
          id="address"
          name="address"
          value={values.address ?? ""}
          options={addressOptions}
          loading={addressLoading}
          disabled={!(values.city ?? "").trim()}
          placeholder={
            (values.city ?? "").trim()
              ? undefined
              : t("inventory.form.addressNeedsCity")
          }
          emptyLabel={t("inventory.form.noSuggestions")}
          onChange={(value) => setValue("address", value)}
          onOpen={() => {
            if ((values.city ?? "").trim()) {
              fetchKind(
                "address",
                values.address ?? "",
                setAddressOptions,
                addressCache,
                setAddressLoading,
              );
            }
          }}
          onBlur={() => {
            void geocodeIfPossible();
          }}
          onQueryChange={(q) =>
            debounce(addressTimer, () =>
              fetchKind("address", q, setAddressOptions, addressCache, setAddressLoading),
            280,
            )
          }
          onSelect={(option) => {
            const item = addressCache.current.find(
              (row) => (row.address ?? row.label) === option.label,
            );
            if (item) applySuggestion(item, "address");
          }}
        />
        <p className="text-xs text-[var(--color-foreground-muted)]">
          {t("inventory.form.addressHint")}
        </p>
        {fieldError("address")}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="municipality">
          {t("projects.fields.municipality")}
        </label>
        <SuggestInput
          id="municipality"
          name="municipality"
          value={values.municipality ?? ""}
          options={munOptions}
          loading={munLoading}
          emptyLabel={t("inventory.form.noSuggestions")}
          onChange={(value) => setValue("municipality", value)}
          onOpen={() =>
            fetchKind(
              "municipality",
              values.municipality ?? "",
              setMunOptions,
              munCache,
              setMunLoading,
            )
          }
          onQueryChange={(q) =>
            debounce(munTimer, () =>
              fetchKind("municipality", q, setMunOptions, munCache, setMunLoading),
            )
          }
          onSelect={(option) => {
            const item = munCache.current.find((row) => row.label === option.label);
            if (item) applySuggestion(item, "municipality");
          }}
        />
        {fieldError("municipality")}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="postalCode">
          {t("projects.fields.postalCode")}
        </label>
        <input
          id="postalCode"
          name="postalCode"
          value={values.postalCode ?? ""}
          onChange={(event) => {
            postalManual.current = true;
            setValue("postalCode", event.target.value);
          }}
          className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        />
        <p className="text-xs text-[var(--color-foreground-muted)]">
          {t("inventory.form.postalHint")}
        </p>
        {fieldError("postalCode")}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="latitude">
          {t("inventory.form.latitude")}
        </label>
        <input
          id="latitude"
          name="latitude"
          type="number"
          step="any"
          value={values.latitude ?? ""}
          onChange={(event) => {
            coordsLockRef.current = true;
            setValue("latitude", event.target.value);
          }}
          className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        />
        <p className="text-xs text-[var(--color-foreground-muted)]">
          {t("inventory.form.latitudeHint")}
        </p>
        {fieldError("latitude")}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="longitude">
          {t("inventory.form.longitude")}
        </label>
        <input
          id="longitude"
          name="longitude"
          type="number"
          step="any"
          value={values.longitude ?? ""}
          onChange={(event) => {
            coordsLockRef.current = true;
            setValue("longitude", event.target.value);
          }}
          className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        />
        <p className="text-xs text-[var(--color-foreground-muted)]">
          {t("inventory.form.longitudeHint")}
        </p>
        {fieldError("longitude")}
      </div>
    </>
  );
}
