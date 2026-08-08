"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface PlanFormProps {
  mode: "create" | "edit";
  planId?: string;
  initialValues?: Record<string, string>;
}

interface FieldSpec {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "checkbox";
  hint?: string;
  required?: boolean;
  step?: string;
  immutable?: boolean; // disabled on edit
}

const FIELDS: FieldSpec[] = [
  {
    name: "code",
    label: "Šifra",
    required: true,
    hint: "Kratka jedinstvena oznaka (mala slova, brojevi, crtica). Ne menja se posle kreiranja.",
    immutable: true,
  },
  { name: "name", label: "Naziv", required: true },
  { name: "description", label: "Opis", type: "textarea" },

  { name: "monthlyPrice", label: "Mesečna cena", type: "number", required: true, step: "0.01" },
  {
    name: "quarterlyPrice",
    label: "Kvartalna cena",
    type: "number",
    step: "0.01",
    hint: "Ako je prazno, sistem koristi 3 × mesečna cena.",
  },
  {
    name: "semiAnnualPrice",
    label: "Polugodišnja cena",
    type: "number",
    step: "0.01",
    hint: "Ako je prazno, sistem koristi 6 × mesečna cena.",
  },
  {
    name: "annualPrice",
    label: "Godišnja cena",
    type: "number",
    step: "0.01",
    hint: "Ako je prazno, sistem koristi 12 × mesečna cena.",
  },
  {
    name: "onboardingFee",
    label: "Jednokratna naknada za aktivaciju",
    type: "number",
    step: "0.01",
    hint: "Dodaje se prvoj fakturi nakon aktivacije pretplate.",
  },
  { name: "currency", label: "Valuta", required: true, hint: "3-slovni ISO kod (EUR, RSD, USD…)." },

  { name: "defaultTrialDays", label: "Trajanje probnog perioda (dani)", type: "number", hint: "Prazno = koristi globalno podešavanje." },

  { name: "maxActiveProjects", label: "Max aktivnih projekata", type: "number", hint: "Prazno = neograničeno." },
  { name: "maxUnits", label: "Max jedinica", type: "number", hint: "Prazno = neograničeno." },
  { name: "maxMembers", label: "Max korisnika", type: "number", hint: "Prazno = neograničeno." },
  { name: "maxAgencyConnections", label: "Max konekcija sa agencijama", type: "number", hint: "Prazno = neograničeno." },

  { name: "sortOrder", label: "Redosled prikaza", type: "number", hint: "Manji broj = ranije u listi." },
  { name: "active", label: "Aktivan", type: "checkbox", hint: "Neaktivan plan ne može se dodeliti novim organizacijama." },
  { name: "publiclyAvailable", label: "Javno dostupan", type: "checkbox", hint: "Prikazuje se na javnoj stranici sa cenama." },
  { name: "recommended", label: "Preporučeno", type: "checkbox", hint: "Dobija „preporučeno\" oznaku u prikazu planova." },
];

const NUMERIC_FIELDS = new Set([
  "monthlyPrice",
  "quarterlyPrice",
  "semiAnnualPrice",
  "annualPrice",
  "onboardingFee",
  "defaultTrialDays",
  "maxActiveProjects",
  "maxUnits",
  "maxMembers",
  "maxAgencyConnections",
  "sortOrder",
]);

const CHECKBOX_FIELDS = new Set(["active", "publiclyAvailable", "recommended"]);

function toDefaults(): Record<string, string> {
  return {
    currency: "EUR",
    active: "true",
    publiclyAvailable: "true",
    recommended: "false",
  };
}

export function PlanForm({ mode, planId, initialValues }: PlanFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [values, setValues] = useState<Record<string, string>>({
    ...toDefaults(),
    ...(initialValues ?? {}),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function setValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const payload: Record<string, unknown> = {};

      for (const f of FIELDS) {
        if (isEdit && f.immutable) continue; // code is frozen
        const raw = values[f.name];
        if (CHECKBOX_FIELDS.has(f.name)) {
          payload[f.name] = raw === "true";
          continue;
        }
        if (NUMERIC_FIELDS.has(f.name)) {
          if (raw === "" || raw === undefined) {
            if (isEdit) payload[f.name] = null;
            continue;
          }
          const n = Number(raw.replace(",", "."));
          if (!Number.isFinite(n)) {
            setFieldErrors((prev) => ({
              ...prev,
              [f.name]: ["Očekivan je broj."],
            }));
            setLoading(false);
            return;
          }
          payload[f.name] = n;
          continue;
        }
        if (raw === "" || raw === undefined) {
          if (isEdit && f.name !== "code" && f.name !== "name" && f.name !== "currency") {
            payload[f.name] = null;
          }
          continue;
        }
        payload[f.name] = raw;
      }

      if (isEdit && planId) {
        await apiClient.patch(`/platform/plans/${planId}`, payload);
      } else {
        await apiClient.post("/platform/plans", payload);
      }
      router.push("/administracija/planovi");
      router.refresh();
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
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          {FIELDS.map((f) => {
            const disabled = isEdit && f.immutable;
            const spanFull = f.type === "textarea";
            return (
              <div
                key={f.name}
                className={`space-y-1 ${spanFull ? "sm:col-span-2" : ""}`}
              >
                <label htmlFor={f.name} className="text-sm font-medium">
                  {f.label}
                  {f.required ? <span className="text-red-500">*</span> : null}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    id={f.name}
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValue(f.name, e.target.value)}
                    disabled={disabled}
                    className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm disabled:bg-neutral-100 disabled:text-neutral-500"
                  />
                ) : f.type === "checkbox" ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(values[f.name] ?? "false") === "true"}
                      onChange={(e) =>
                        setValue(f.name, e.target.checked ? "true" : "false")
                      }
                      className="size-4"
                    />
                    <span className="text-sm">{f.hint ?? ""}</span>
                  </label>
                ) : (
                  <input
                    id={f.name}
                    type={f.type ?? "text"}
                    step={f.step}
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValue(f.name, e.target.value)}
                    disabled={disabled}
                    required={f.required && !isEdit}
                    className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm disabled:bg-neutral-100 disabled:text-neutral-500"
                  />
                )}
                {f.hint && f.type !== "checkbox" ? (
                  <p className="text-xs text-[var(--color-foreground-muted)]">
                    {f.hint}
                  </p>
                ) : null}
                {fieldErrors[f.name]?.map((m, i) => (
                  <p key={i} className="text-xs text-red-600">
                    {m}
                  </p>
                ))}
              </div>
            );
          })}

          {error ? (
            <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.back()}
              disabled={loading}
            >
              Odustani
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? "Sačuvaj izmene" : "Kreiraj plan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
