"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface DuplicateCandidate {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  matchedOn: ("phone" | "email")[];
}

const CONTACT_METHODS = [
  { value: "ANY", label: "Bilo koji" },
  { value: "PHONE", label: "Telefon" },
  { value: "EMAIL", label: "Email" },
];

interface BuyerFormProps {
  mode?: "create" | "edit";
  buyerId?: string;
  initialValues?: Record<string, string>;
}

export function NewBuyerForm({
  mode = "create",
  buyerId,
  initialValues,
}: BuyerFormProps = {}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [values, setValues] = useState<Record<string, string>>(
    initialValues && Object.keys(initialValues).length > 0
      ? { preferredContactMethod: "ANY", ...initialValues }
      : { preferredContactMethod: "ANY" },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);

  const setValue = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  async function checkDuplicates() {
    if (isEdit) return; // no dup check on edit
    if (!values.phone && !values.email) {
      setDuplicates([]);
      return;
    }
    try {
      const candidates = await apiClient.post<DuplicateCandidate[]>("/buyers/duplicates", {
        phone: values.phone || undefined,
        email: values.email || undefined,
      });
      setDuplicates(candidates);
    } catch {
      // non-critical
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      if (isEdit && buyerId) {
        const payload: Record<string, unknown> = {};
        payload.firstName = values.firstName;
        payload.lastName = values.lastName;
        payload.phone = values.phone;
        payload.email = values.email || null;
        payload.secondaryPhone = values.secondaryPhone || null;
        payload.preferredContactMethod = values.preferredContactMethod || "ANY";
        payload.source = values.source || null;
        payload.notes = values.notes || null;
        payload.budgetMin = values.budgetMin ? Number(values.budgetMin) : null;
        payload.budgetMax = values.budgetMax ? Number(values.budgetMax) : null;
        await apiClient.patch(`/buyers/${buyerId}`, payload);
        router.push(`/kupci/${buyerId}`);
        router.refresh();
      } else {
        const payload: Record<string, unknown> = {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
        };
        if (values.email) payload.email = values.email;
        if (values.secondaryPhone) payload.secondaryPhone = values.secondaryPhone;
        if (values.preferredContactMethod)
          payload.preferredContactMethod = values.preferredContactMethod;
        if (values.source) payload.source = values.source;
        if (values.notes) payload.notes = values.notes;
        if (values.budgetMin) payload.budgetMin = Number(values.budgetMin);
        if (values.budgetMax) payload.budgetMax = Number(values.budgetMax);

        const buyer = await apiClient.post<{ id: string }>("/buyers", payload);
        router.push(`/kupci/${buyer.id}`);
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
        {duplicates.length > 0 ? (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-800">
              Pronađeni su mogući duplikati:
            </p>
            <ul className="mt-1 space-y-1">
              {duplicates.map((d) => (
                <li key={d.id}>
                  <Link href={`/kupci/${d.id}`} className="text-amber-900 underline">
                    {d.firstName} {d.lastName} · {d.phone}
                  </Link>{" "}
                  <span className="text-xs text-amber-700">
                    ({d.matchedOn.map((m) => (m === "phone" ? "telefon" : "email")).join(", ")})
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-amber-700">
              Možete nastaviti sa kreiranjem ako je ovo drugi kupac.
            </p>
          </div>
        ) : null}

        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Ime" name="firstName" required value={values.firstName} onChange={setValue} errors={fieldErrors.firstName} />
          <Field label="Prezime" name="lastName" required value={values.lastName} onChange={setValue} errors={fieldErrors.lastName} />
          <Field
            label="Telefon"
            name="phone"
            required
            value={values.phone}
            onChange={setValue}
            onBlur={checkDuplicates}
            errors={fieldErrors.phone}
          />
          <Field label="Sekundarni telefon" name="secondaryPhone" value={values.secondaryPhone} onChange={setValue} />
          <Field
            label="Email"
            name="email"
            type="email"
            value={values.email}
            onChange={setValue}
            onBlur={checkDuplicates}
            errors={fieldErrors.email}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="preferredContactMethod">
              Preferirani kontakt
            </label>
            <select
              id="preferredContactMethod"
              value={values.preferredContactMethod ?? "ANY"}
              onChange={(e) => setValue("preferredContactMethod", e.target.value)}
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            >
              {CONTACT_METHODS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Field label="Budžet od (EUR)" name="budgetMin" type="number" value={values.budgetMin} onChange={setValue} />
          <Field label="Budžet do (EUR)" name="budgetMax" type="number" value={values.budgetMax} onChange={setValue} />
          <Field label="Izvor" name="source" value={values.source} onChange={setValue} />
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="notes">
              Napomena
            </label>
            <textarea
              id="notes"
              value={values.notes ?? ""}
              onChange={(e) => setValue("notes", e.target.value)}
              className="min-h-24 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            />
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={loading}>
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

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  type = "text",
  required,
  errors,
}: {
  label: string;
  name: string;
  value: string | undefined;
  onChange: (name: string, value: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
  errors?: string[];
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
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={onBlur}
        className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
      />
      {errors?.map((msg, idx) => (
        <p key={idx} className="text-xs text-red-600">
          {msg}
        </p>
      ))}
    </div>
  );
}
