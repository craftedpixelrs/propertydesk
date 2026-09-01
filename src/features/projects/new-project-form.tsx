"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { FormActions } from "@/components/forms/form-actions";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ApiClientError } from "@/lib/api-client";
import { projectStatusLabel, type TranslateFn } from "@/lib/i18n";
import { ProjectMap } from "@/features/projects/project-map-loader";
import { CoverImageField } from "@/features/projects/cover-image-field";
import { LocationFields } from "@/features/projects/location-fields";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "@/lib/constants/app";

const LOCATION_FIELD_NAMES = new Set([
  "city",
  "address",
  "municipality",
  "postalCode",
  "latitude",
  "longitude",
]);

interface Field {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "select" | "checkbox";
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  /** When true, the field is disabled in edit mode. */
  immutable?: boolean;
}

const PROJECT_STATUS_VALUES = [
  "DRAFT",
  "PRE_SALES",
  "ACTIVE_SALES",
  "CONSTRUCTION",
  "COMPLETED",
] as const;

function buildFields(t: TranslateFn): Field[] {
  return [
    {
      name: "code",
      label: t("inventory.form.projectCode"),
      required: true,
      hint: t("inventory.form.projectCodeHint"),
      immutable: true,
    },
    { name: "name", label: t("inventory.form.projectName"), required: true },
    { name: "city", label: t("projects.fields.city") },
    { name: "address", label: t("projects.fields.address") },
    { name: "municipality", label: t("projects.fields.municipality") },
    { name: "postalCode", label: t("projects.fields.postalCode") },
    {
      name: "latitude",
      label: t("inventory.form.latitude"),
      type: "number",
      hint: t("inventory.form.latitudeHint"),
    },
    {
      name: "longitude",
      label: t("inventory.form.longitude"),
      type: "number",
      hint: t("inventory.form.longitudeHint"),
    },
    {
      name: "coverImageUrl",
      label: t("inventory.form.coverImageUrl"),
      hint: t("inventory.form.coverImageUrlHint"),
    },
    {
      name: "projectStatus",
      label: t("common.statusLabel"),
      type: "select",
      options: PROJECT_STATUS_VALUES.map((value) => ({
        value,
        label: projectStatusLabel(value, t),
      })),
    },
    { name: "salesStartDate", label: t("inventory.form.salesStartDate"), type: "date" },
    { name: "constructionStartDate", label: t("projects.fields.constructionStartDate"), type: "date" },
    { name: "expectedCompletionDate", label: t("inventory.projects.expectedCompletion"), type: "date" },
    {
      name: "defaultCurrency",
      label: t("projects.fields.defaultCurrency"),
      type: "select",
      options: SUPPORTED_CURRENCIES.map((value) => ({ value, label: value })),
    },
    { name: "defaultVatRate", label: t("projects.fields.defaultVatRate"), type: "number" },
    { name: "description", label: t("projects.fields.description"), type: "textarea" },
    { name: "internalNotes", label: t("projects.fields.internalNotes"), type: "textarea" },
    {
      name: "landCost",
      label: t("inventory.form.landCost"),
      type: "number",
      hint: t("inventory.form.landCostHint"),
    },
    {
      name: "constructionCost",
      label: t("inventory.form.constructionCost"),
      type: "number",
      hint: t("inventory.form.constructionCostHint"),
    },
    {
      name: "marketingCost",
      label: t("inventory.form.marketingCost"),
      type: "number",
    },
    {
      name: "otherCost",
      label: t("inventory.form.otherCost"),
      type: "number",
    },
    {
      name: "budgetNote",
      label: t("inventory.form.budgetNote"),
      type: "textarea",
      hint: t("inventory.form.budgetNoteHint"),
    },
    {
      name: "publicMicrositeEnabled",
      label: t("inventory.form.microsite"),
      type: "checkbox",
      hint: t("inventory.form.micrositeHint"),
    },
    {
      name: "networkCatalogEnabled",
      label: t("inventory.form.networkCatalog"),
      type: "checkbox",
      hint: t("inventory.form.networkCatalogHint"),
    },
    {
      name: "publicMicrositeSlug",
      label: t("inventory.form.micrositeSlug"),
      hint: t("inventory.form.micrositeSlugHint"),
    },
  ];
}

interface ProjectFormProps {
  mode?: "create" | "edit";
  projectId?: string;
  initialValues?: Record<string, string>;
  /** Skip the page Card chrome when the form sits inside a drawer. */
  variant?: "page" | "embedded";
  onCancel?: () => void;
}

function normalizeInitial(values?: Record<string, string>): Record<string, string> {
  if (!values) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v == null) continue;
    out[k] = String(v);
  }
  return out;
}

export function NewProjectForm({
  mode = "create",
  projectId,
  initialValues,
  variant = "page",
  onCancel,
}: ProjectFormProps = {}) {
  const t = useT();
  const fields = useMemo(() => buildFields(t), [t]);
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({
    defaultCurrency: DEFAULT_CURRENCY,
    ...normalizeInitial(initialValues),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const coordsLockRef = useRef(false);

  const isEdit = mode === "edit";

  const setValue = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const missing: Record<string, string[]> = {};
    for (const field of fields) {
      if (!field.required) continue;
      if (field.type === "checkbox") continue;
      if (!values[field.name]?.trim()) {
        missing[field.name] = [t("validation.required")];
      }
    }
    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      setError(t("errors.validation"));
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (isEdit && fields.find((f) => f.name === k)?.immutable) continue;
        const fieldDef = fields.find((f) => f.name === k);
        if (fieldDef?.type === "checkbox") {
          payload[k] = v === "true";
          continue;
        }
        if (v === "" || v === undefined) {
          // On edit, an empty string means "clear the value" for optional
          // text fields — send it through so the server can null it out.
          if (isEdit && k !== "code" && k !== "name") {
            payload[k] = null;
          }
          continue;
        }
        if (
          k === "defaultVatRate" ||
          k === "latitude" ||
          k === "longitude" ||
          k === "landCost" ||
          k === "constructionCost" ||
          k === "marketingCost" ||
          k === "otherCost"
        ) {
          payload[k] = Number(v);
        } else {
          payload[k] = v;
        }
      }

      if (isEdit && projectId) {
        await apiClient.patch<{ id: string }>(`/projects/${projectId}`, payload);
        router.push(`/projekti/${projectId}`);
        router.refresh();
      } else {
        const project = await apiClient.post<{ id: string }>("/projects", payload);
        router.push(`/projekti/${project.id}`);
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

  const form = (
        <form className="grid grid-cols-1 gap-4" onSubmit={onSubmit}>
          {fields.map((f) => {
            if (LOCATION_FIELD_NAMES.has(f.name)) {
              if (f.name !== "city") return null;
              return (
                <LocationFields
                  key="location"
                  values={values}
                  setValue={setValue}
                  fieldErrors={fieldErrors}
                  coordsLockRef={coordsLockRef}
                />
              );
            }
            if (f.name === "coverImageUrl") {
              return (
                <CoverImageField
                  key="cover"
                  value={values.coverImageUrl ?? ""}
                  projectId={projectId}
                  onChange={(url) => setValue("coverImageUrl", url)}
                  error={fieldErrors.coverImageUrl}
                />
              );
            }
            const disabled = isEdit && f.immutable;
            if (f.type === "checkbox") {
              const checked = values[f.name] === "true";
              return (
                <div key={f.name} className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      id={f.name}
                      name={f.name}
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setValue(f.name, e.target.checked ? "true" : "false")}
                      disabled={disabled}
                    />
                    <span>{f.label}</span>
                  </label>
                  {f.hint ? (
                    <p className="text-xs text-[var(--color-foreground-muted)]">{f.hint}</p>
                  ) : null}
                  {fieldErrors[f.name]?.map((msg, idx) => (
                    <p key={idx} className="text-xs text-red-600">
                      {msg}
                    </p>
                  ))}
                </div>
              );
            }
            return (
              <div key={f.name} className="space-y-1">
                <label className="text-sm font-medium" htmlFor={f.name}>
                  {f.label}
                  {f.required ? <span className="text-red-500">*</span> : null}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    id={f.name}
                    name={f.name}
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValue(f.name, e.target.value)}
                    disabled={disabled}
                    className="min-h-24 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm disabled:bg-neutral-100 disabled:text-neutral-500"
                  />
                ) : f.type === "select" ? (
                  <select
                    id={f.name}
                    name={f.name}
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValue(f.name, e.target.value)}
                    disabled={disabled}
                    className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm disabled:bg-neutral-100 disabled:text-neutral-500"
                  >
                    <option value="">{t("inventory.form.selectPlaceholder")}</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "date" ? (
                  <DateInput
                    id={f.name}
                    name={f.name}
                    value={values[f.name] ?? ""}
                    onChange={(iso) => setValue(f.name, iso)}
                    disabled={disabled}
                    className="h-11"
                  />
                ) : (
                  <input
                    id={f.name}
                    name={f.name}
                    type={f.type ?? "text"}
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValue(f.name, e.target.value)}
                    disabled={disabled}
                    className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm disabled:bg-neutral-100 disabled:text-neutral-500"
                  />
                )}
                {f.hint ? (
                  <p className="text-xs text-[var(--color-foreground-muted)]">{f.hint}</p>
                ) : null}
                {fieldErrors[f.name]?.map((msg, idx) => (
                  <p key={idx} className="text-xs text-red-600">
                    {msg}
                  </p>
                ))}
              </div>
            );
          })}
          <div className="space-y-1">
            <div className="text-sm font-medium">{t("inventory.form.map")}</div>
            <p className="text-xs text-[var(--color-foreground-muted)]">
              {t("inventory.form.mapHint")}
            </p>
            <ProjectMap
              latitude={
                values.latitude && !Number.isNaN(Number(values.latitude))
                  ? Number(values.latitude)
                  : null
              }
              longitude={
                values.longitude && !Number.isNaN(Number(values.longitude))
                  ? Number(values.longitude)
                  : null
              }
              onPick={({ latitude, longitude }) => {
                coordsLockRef.current = true;
                setValue("latitude", latitude.toFixed(6));
                setValue("longitude", longitude.toFixed(6));
              }}
            />
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <FormActions sticky={variant === "embedded"}>
            <Button
              variant="outline"
              type="button"
              onClick={() => (onCancel ? onCancel() : router.back())}
              disabled={loading}
            >
              {t("inventory.discard")}
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? t("common.saveChanges") : t("common.save")}
            </Button>
          </FormActions>
        </form>
  );

  if (variant === "embedded") return form;

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">{form}</CardContent>
    </Card>
  );
}
