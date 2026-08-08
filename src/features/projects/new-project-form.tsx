"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { ApiClientError } from "@/lib/api-client";
import { ProjectMap } from "@/features/projects/project-map-loader";

interface Field {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "select";
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  /** When true, the field is disabled in edit mode. */
  immutable?: boolean;
}

const FIELDS: Field[] = [
  {
    name: "code",
    label: "Šifra projekta",
    required: true,
    hint: "Kratka šifra (npr. P-001). Jedinstvena po organizaciji. Ne menja se posle kreiranja.",
    immutable: true,
  },
  { name: "name", label: "Naziv projekta", required: true },
  { name: "city", label: "Grad" },
  { name: "address", label: "Adresa" },
  { name: "municipality", label: "Opština" },
  { name: "postalCode", label: "Poštanski broj" },
  {
    name: "latitude",
    label: "Geo. širina",
    type: "number",
    hint: "Decimalne stepene (npr. 44.7866). Kliknite na mapu ispod da automatski popunite.",
  },
  {
    name: "longitude",
    label: "Geo. dužina",
    type: "number",
    hint: "Decimalne stepene (npr. 20.4489).",
  },
  {
    name: "coverImageUrl",
    label: "URL naslovne fotografije",
    hint: "Puni URL slike koja se prikazuje u javnoj ponudi.",
  },
  {
    name: "projectStatus",
    label: "Status",
    type: "select",
    options: [
      { value: "DRAFT", label: "Radna verzija" },
      { value: "PRE_SALES", label: "Priprema prodaje" },
      { value: "ACTIVE_SALES", label: "Aktivna prodaja" },
      { value: "CONSTRUCTION", label: "Izgradnja" },
      { value: "COMPLETED", label: "Završen" },
    ],
  },
  { name: "salesStartDate", label: "Datum početka prodaje", type: "date" },
  { name: "constructionStartDate", label: "Početak izgradnje", type: "date" },
  { name: "expectedCompletionDate", label: "Očekivani završetak", type: "date" },
  { name: "defaultCurrency", label: "Podrazumevana valuta", hint: "EUR ili RSD" },
  { name: "defaultVatRate", label: "PDV stopa (%)", type: "number" },
  { name: "description", label: "Opis", type: "textarea" },
  { name: "internalNotes", label: "Interne napomene", type: "textarea" },
];

interface ProjectFormProps {
  mode?: "create" | "edit";
  projectId?: string;
  initialValues?: Record<string, string>;
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
}: ProjectFormProps = {}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    normalizeInitial(initialValues),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const isEdit = mode === "edit";

  const setValue = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (isEdit && FIELDS.find((f) => f.name === k)?.immutable) continue;
        if (v === "" || v === undefined) {
          // On edit, an empty string means "clear the value" for optional
          // text fields — send it through so the server can null it out.
          if (isEdit && k !== "code" && k !== "name") {
            payload[k] = null;
          }
          continue;
        }
        if (k === "defaultVatRate" || k === "latitude" || k === "longitude") {
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
        setError("Došlo je do neočekivane greške.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <form className="grid grid-cols-1 gap-4" onSubmit={onSubmit}>
          {FIELDS.map((f) => {
            const disabled = isEdit && f.immutable;
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
                    <option value="">— izaberite —</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
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
            <div className="text-sm font-medium">Mapa</div>
            <p className="text-xs text-[var(--color-foreground-muted)]">
              Kliknite bilo gde na mapi — postavićemo tačno tu poziciju u polja
              „Geo. širina" i „Geo. dužina".
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
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.back()}
              disabled={loading}
            >
              Odustani
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? "Sačuvaj izmene" : "Sačuvaj"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
