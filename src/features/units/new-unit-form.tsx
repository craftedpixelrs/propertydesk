"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { unitTypeLabel } from "@/lib/i18n";

interface FloorOpt {
  id: string;
  label: string;
}
interface EntranceOpt {
  id: string;
  code: string;
  name: string;
  floors: FloorOpt[];
}
interface BuildingOpt {
  id: string;
  code: string;
  name: string;
  entrances: EntranceOpt[];
}

const UNIT_TYPE_VALUES = [
  "APARTMENT",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "COMMERCIAL",
  "HOUSE",
  "OTHER",
] as const;

interface UnitFormProps {
  projectId: string;
  structure: BuildingOpt[];
  mode?: "create" | "edit";
  unitId?: string;
  initialValues?: Record<string, string>;
  expectedVersion?: number;
}

export function NewUnitForm({
  projectId,
  structure,
  mode = "create",
  unitId,
  initialValues,
  expectedVersion,
}: UnitFormProps) {
  const t = useT();
  const router = useRouter();
  const isEdit = mode === "edit";
  const [values, setValues] = useState<Record<string, string>>(
    initialValues && Object.keys(initialValues).length > 0
      ? { type: "APARTMENT", currency: "EUR", ...initialValues }
      : { type: "APARTMENT", currency: "EUR" },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [priceChangeReason, setPriceChangeReason] = useState<string>("");

  const selectedBuilding = structure.find((b) => b.id === values.buildingId);
  const selectedEntrance = selectedBuilding?.entrances.find(
    (e) => e.id === values.entranceId,
  );

  const initialBasePrice = initialValues?.basePrice ?? "";
  const basePriceChanged =
    isEdit && (values.basePrice ?? "") !== initialBasePrice;

  function setValue(name: string, value: string) {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "buildingId") {
        next.entranceId = "";
        next.floorId = "";
      }
      if (name === "entranceId") {
        next.floorId = "";
      }
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const numericKeys = [
        "totalArea",
        "internalArea",
        "terraceArea",
        "gardenArea",
        "basePrice",
        "finalPrice",
        "vatRate",
        "bedrooms",
        "bathrooms",
      ];

      if (isEdit && unitId) {
        // PATCH: send only fields we actually manage in the form.
        const payload: Record<string, unknown> = {};
        payload.type = values.type;
        payload.currency = values.currency || "EUR";
        payload.buildingId = values.buildingId || null;
        payload.entranceId = values.entranceId || null;
        payload.floorId = values.floorId || null;
        for (const key of numericKeys) {
          const raw = values[key];
          if (raw === undefined) continue;
          payload[key] =
            raw === "" ? null : Number(raw.replace(",", "."));
        }
        payload.structure = values.structure || null;
        payload.orientation = values.orientation || null;
        payload.publicDescription = values.publicDescription || null;
        payload.internalNotes = values.internalNotes || null;
        if (typeof expectedVersion === "number") {
          payload.expectedVersion = expectedVersion;
        }
        if (basePriceChanged && priceChangeReason.trim().length > 0) {
          payload.priceChangeReason = priceChangeReason.trim();
        }
        await apiClient.patch(`/units/${unitId}`, payload);
        router.push(`/jedinice/${unitId}`);
        router.refresh();
      } else {
        const payload: Record<string, unknown> = {
          projectId,
          code: values.code,
          type: values.type,
          currency: values.currency || "EUR",
        };
        if (values.buildingId) payload.buildingId = values.buildingId;
        if (values.entranceId) payload.entranceId = values.entranceId;
        if (values.floorId) payload.floorId = values.floorId;
        for (const key of numericKeys) {
          if (values[key]) payload[key] = Number(values[key].replace(",", "."));
        }
        if (values.structure) payload.structure = values.structure;
        if (values.orientation) payload.orientation = values.orientation;
        if (values.publicDescription) payload.publicDescription = values.publicDescription;
        if (values.internalNotes) payload.internalNotes = values.internalNotes;

        const unit = await apiClient.post<{ id: string }>("/units", payload);
        router.push(`/jedinice/${unit.id}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError(t("common.unexpectedError"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field
            name="code"
            label={t("units.fields.code")}
            required
            value={values.code ?? ""}
            onChange={(v) => setValue("code", v)}
            errors={fieldErrors.code}
            disabled={isEdit}
            hint={isEdit ? t("inventory.units.codeImmutable") : undefined}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("units.fields.type")}</label>
            <select
              value={values.type ?? "APARTMENT"}
              onChange={(e) => setValue("type", e.target.value)}
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            >
              {UNIT_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {unitTypeLabel(value, t)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">{t("units.columns.building")}</label>
            <select
              value={values.buildingId ?? ""}
              onChange={(e) => setValue("buildingId", e.target.value)}
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            >
              <option value="">{t("inventory.form.unspecified")}</option>
              {structure.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("units.columns.entrance")}</label>
            <select
              value={values.entranceId ?? ""}
              onChange={(e) => setValue("entranceId", e.target.value)}
              disabled={!selectedBuilding}
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm disabled:opacity-50"
            >
              <option value="">{t("inventory.form.unspecified")}</option>
              {selectedBuilding?.entrances.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.code})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("units.columns.floor")}</label>
            <select
              value={values.floorId ?? ""}
              onChange={(e) => setValue("floorId", e.target.value)}
              disabled={!selectedEntrance}
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm disabled:opacity-50"
            >
              <option value="">{t("inventory.form.unspecified")}</option>
              {selectedEntrance?.floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <Field
            name="structure"
            label={t("units.fields.structure")}
            value={values.structure ?? ""}
            onChange={(v) => setValue("structure", v)}
          />

          <Field
            name="totalArea"
            label={t("units.fields.totalArea")}
            type="number"
            required
            value={values.totalArea ?? ""}
            onChange={(v) => setValue("totalArea", v)}
            errors={fieldErrors.totalArea}
          />
          <Field
            name="internalArea"
            label={t("units.fields.internalArea")}
            type="number"
            value={values.internalArea ?? ""}
            onChange={(v) => setValue("internalArea", v)}
          />
          <Field
            name="terraceArea"
            label={t("units.fields.terraceArea")}
            type="number"
            value={values.terraceArea ?? ""}
            onChange={(v) => setValue("terraceArea", v)}
          />
          <Field
            name="gardenArea"
            label={t("units.fields.gardenArea")}
            type="number"
            value={values.gardenArea ?? ""}
            onChange={(v) => setValue("gardenArea", v)}
          />

          <Field
            name="basePrice"
            label={t("units.fields.basePrice")}
            type="number"
            required
            value={values.basePrice ?? ""}
            onChange={(v) => setValue("basePrice", v)}
            errors={fieldErrors.basePrice}
          />
          <Field
            name="finalPrice"
            label={t("units.fields.finalPrice")}
            type="number"
            value={values.finalPrice ?? ""}
            onChange={(v) => setValue("finalPrice", v)}
          />
          <Field
            name="currency"
            label={t("units.fields.currency")}
            value={values.currency ?? "EUR"}
            onChange={(v) => setValue("currency", v)}
          />
          <Field
            name="vatRate"
            label={t("units.fields.vatRate")}
            type="number"
            value={values.vatRate ?? ""}
            onChange={(v) => setValue("vatRate", v)}
          />

          <Field
            name="bedrooms"
            label={t("units.fields.bedrooms")}
            type="number"
            value={values.bedrooms ?? ""}
            onChange={(v) => setValue("bedrooms", v)}
          />
          <Field
            name="bathrooms"
            label={t("units.fields.bathrooms")}
            type="number"
            value={values.bathrooms ?? ""}
            onChange={(v) => setValue("bathrooms", v)}
          />

          <Field
            name="orientation"
            label={t("units.fields.orientation")}
            value={values.orientation ?? ""}
            onChange={(v) => setValue("orientation", v)}
          />

          <div className="sm:col-span-2 space-y-1">
            <label className="text-sm font-medium">{t("units.fields.publicDescription")}</label>
            <textarea
              className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              value={values.publicDescription ?? ""}
              onChange={(e) => setValue("publicDescription", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="text-sm font-medium">{t("units.fields.internalNotes")}</label>
            <textarea
              className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              value={values.internalNotes ?? ""}
              onChange={(e) => setValue("internalNotes", e.target.value)}
            />
          </div>

          {basePriceChanged ? (
            <div className="sm:col-span-2 space-y-1">
              <label className="text-sm font-medium">
                {t("inventory.units.priceChangeReason")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={priceChangeReason}
                onChange={(e) => setPriceChangeReason(e.target.value)}
                required
                className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                placeholder={t("inventory.units.priceChangePlaceholder")}
              />
              <p className="text-xs text-[var(--color-foreground-muted)]">
                {t("inventory.units.priceChangeHint")}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={loading}>
              {t("inventory.discard")}
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={basePriceChanged && priceChangeReason.trim().length === 0}
            >
              {isEdit ? t("common.saveChanges") : t("inventory.units.create")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  name,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  errors,
  disabled = false,
  hint,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  errors?: string[];
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={name}>
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        step={type === "number" ? "any" : undefined}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm disabled:bg-neutral-100 disabled:text-neutral-500"
      />
      {hint ? (
        <p className="text-xs text-[var(--color-foreground-muted)]">{hint}</p>
      ) : null}
      {errors?.map((msg, i) => (
        <p key={i} className="text-xs text-red-600">
          {msg}
        </p>
      ))}
    </div>
  );
}
