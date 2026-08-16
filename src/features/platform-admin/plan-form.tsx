"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

interface PlanFormProps {
  mode: "create" | "edit";
  planId?: string;
  initialValues?: Record<string, string>;
}

interface FieldSpec {
  name: string;
  labelKey: TranslationKey;
  type?: "text" | "number" | "textarea" | "checkbox";
  hintKey?: TranslationKey;
  required?: boolean;
  step?: string;
  immutable?: boolean; // disabled on edit
}

const FIELDS: FieldSpec[] = [
  {
    name: "code",
    labelKey: "admin.planForm.code",
    required: true,
    hintKey: "admin.planForm.codeHint",
    immutable: true,
  },
  { name: "name", labelKey: "admin.planForm.name", required: true },
  { name: "description", labelKey: "admin.planForm.description", type: "textarea" },

  { name: "monthlyPrice", labelKey: "admin.planForm.monthlyPrice", type: "number", required: true, step: "0.01" },
  {
    name: "quarterlyPrice",
    labelKey: "admin.planForm.quarterlyPrice",
    type: "number",
    step: "0.01",
    hintKey: "admin.planForm.quarterlyHint",
  },
  {
    name: "semiAnnualPrice",
    labelKey: "admin.planForm.semiAnnualPrice",
    type: "number",
    step: "0.01",
    hintKey: "admin.planForm.semiAnnualHint",
  },
  {
    name: "annualPrice",
    labelKey: "admin.planForm.annualPrice",
    type: "number",
    step: "0.01",
    hintKey: "admin.planForm.annualHint",
  },
  {
    name: "onboardingFee",
    labelKey: "admin.planForm.onboardingFee",
    type: "number",
    step: "0.01",
    hintKey: "admin.planForm.onboardingHint",
  },
  { name: "currency", labelKey: "admin.planForm.currency", required: true, hintKey: "admin.planForm.currencyHint" },

  { name: "defaultTrialDays", labelKey: "admin.planForm.trialDays", type: "number", hintKey: "admin.planForm.trialHint" },

  { name: "maxActiveProjects", labelKey: "admin.planForm.maxProjects", type: "number", hintKey: "admin.planForm.unlimitedHint" },
  { name: "maxUnits", labelKey: "admin.planForm.maxUnits", type: "number", hintKey: "admin.planForm.unlimitedHint" },
  { name: "maxMembers", labelKey: "admin.planForm.maxMembers", type: "number", hintKey: "admin.planForm.unlimitedHint" },
  { name: "maxAgencyConnections", labelKey: "admin.planForm.maxAgencies", type: "number", hintKey: "admin.planForm.unlimitedHint" },

  { name: "sortOrder", labelKey: "admin.planForm.sortOrder", type: "number", hintKey: "admin.planForm.sortHint" },
  { name: "active", labelKey: "admin.planForm.active", type: "checkbox", hintKey: "admin.planForm.activeHint" },
  { name: "publiclyAvailable", labelKey: "admin.planForm.public", type: "checkbox", hintKey: "admin.planForm.publicHint" },
  { name: "recommended", labelKey: "admin.planForm.recommended", type: "checkbox", hintKey: "admin.planForm.recommendedHint" },
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
  const t = useT();
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
              [f.name]: [t("admin.expectedNumber")],
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
        setError(t("errors.unexpected"));
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
                  {t(f.labelKey)}
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
                    <span className="text-sm">{f.hintKey ? t(f.hintKey) : ""}</span>
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
                {f.hintKey && f.type !== "checkbox" ? (
                  <p className="text-xs text-[var(--color-foreground-muted)]">
                    {t(f.hintKey)}
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
              {t("admin.planForm.abandon")}
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? t("common.saveChanges") : t("admin.planForm.create")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
