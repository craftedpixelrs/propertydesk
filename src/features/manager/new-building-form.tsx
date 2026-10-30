"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

/**
 * Faza 11 — create-managed-building form.
 *
 * Minimal form — only requires name, address, city. Legal / bank / cadastre
 * details are editable later from the building's "Pregled" tab.
 */
export function NewBuildingForm({ onCancel }: { onCancel?: () => void }) {
  const t = useT();
  const router = useRouter();
  const [values, setValues] = useState({
    name: "",
    address: "",
    city: "",
    municipality: "",
    postalCode: "",
    legalName: "",
    registrationNumber: "",
    taxNumber: "",
    paymentAccountNumber: "",
    paymentBankName: "",
    entranceCount: "1",
    contactEmail: "",
    contactPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof values>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: values.name.trim(),
        address: values.address.trim(),
        city: values.city.trim(),
      };
      if (values.municipality.trim()) payload.municipality = values.municipality.trim();
      if (values.postalCode.trim()) payload.postalCode = values.postalCode.trim();
      if (values.legalName.trim()) payload.legalName = values.legalName.trim();
      if (values.registrationNumber.trim())
        payload.registrationNumber = values.registrationNumber.trim();
      if (values.taxNumber.trim()) payload.taxNumber = values.taxNumber.trim();
      if (values.paymentAccountNumber.trim())
        payload.paymentAccountNumber = values.paymentAccountNumber.trim();
      if (values.paymentBankName.trim()) payload.paymentBankName = values.paymentBankName.trim();
      const entranceCountNum = Number(values.entranceCount);
      if (Number.isFinite(entranceCountNum) && entranceCountNum > 0) {
        payload.entranceCount = Math.min(50, Math.max(1, Math.round(entranceCountNum)));
      }
      if (values.contactEmail.trim()) payload.contactEmail = values.contactEmail.trim();
      if (values.contactPhone.trim()) payload.contactPhone = values.contactPhone.trim();

      const created = await apiClient.post<{ id: string }>("/manager/buildings", payload);
      router.push(`/zgrade/${created.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || t("common.unexpectedError"));
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label={t("manager.building.fields.name") + " *"}
          id="b-name"
          value={values.name}
          required
          onChange={(v) => update("name", v)}
        />
        <Field
          label={t("manager.building.fields.city") + " *"}
          id="b-city"
          value={values.city}
          required
          onChange={(v) => update("city", v)}
        />
        <Field
          label={t("manager.building.fields.address") + " *"}
          id="b-address"
          value={values.address}
          required
          onChange={(v) => update("address", v)}
        />
        <Field
          label={t("manager.building.fields.postalCode")}
          id="b-postal"
          value={values.postalCode}
          onChange={(v) => update("postalCode", v)}
        />
        <Field
          label={t("manager.building.fields.municipality")}
          id="b-mun"
          value={values.municipality}
          onChange={(v) => update("municipality", v)}
        />
        <Field
          label={t("manager.building.fields.entranceCount")}
          id="b-ent"
          type="number"
          value={values.entranceCount}
          onChange={(v) => update("entranceCount", v)}
        />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-foreground)]">
          {t("manager.building.overview.sectionLegal")}
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t("manager.building.fields.legalName")}
            id="b-legal"
            value={values.legalName}
            onChange={(v) => update("legalName", v)}
          />
          <Field
            label={t("manager.building.fields.registrationNumber")}
            id="b-mb"
            value={values.registrationNumber}
            onChange={(v) => update("registrationNumber", v)}
          />
          <Field
            label={t("manager.building.fields.taxNumber")}
            id="b-pib"
            value={values.taxNumber}
            onChange={(v) => update("taxNumber", v)}
          />
          <Field
            label={t("manager.building.fields.paymentAccountNumber")}
            id="b-acct"
            value={values.paymentAccountNumber}
            onChange={(v) => update("paymentAccountNumber", v)}
          />
          <Field
            label={t("manager.building.fields.paymentBankName")}
            id="b-bank"
            value={values.paymentBankName}
            onChange={(v) => update("paymentBankName", v)}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-foreground)]">
          {t("manager.building.overview.sectionContact")}
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t("manager.building.fields.contactEmail")}
            id="b-email"
            type="email"
            value={values.contactEmail}
            onChange={(v) => update("contactEmail", v)}
          />
          <Field
            label={t("manager.building.fields.contactPhone")}
            id="b-phone"
            value={values.contactPhone}
            onChange={(v) => update("contactPhone", v)}
          />
        </div>
      </fieldset>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            {t("common.cancel")}
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  value,
  type = "text",
  required,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  type?: "text" | "number" | "email";
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    </div>
  );
}
