"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const CATEGORY_OPTIONS = [
  { value: "OTHER", label: "Ostalo" },
  { value: "PROJECT", label: "Projekat" },
  { value: "UNIT", label: "Jedinica" },
  { value: "BUYER", label: "Kupac" },
  { value: "SALE", label: "Prodaja" },
  { value: "PAYMENT", label: "Uplata" },
  { value: "AGENCY", label: "Agencija" },
  { value: "COMMISSION", label: "Provizija" },
] as const;

const VISIBILITY_OPTIONS = [
  { value: "INTERNAL", label: "Interno" },
  { value: "INVESTOR_TEAM", label: "Investitor" },
  { value: "AGENCY_SHARED", label: "Deljeno sa agencijom" },
  { value: "BUYER_SHARED", label: "Deljeno sa kupcem" },
] as const;

/**
 * Standalone uploader for the /dokumenti page. For entity-scoped uploads
 * (attached to a sale/buyer/unit), the same POST endpoint is called with
 * `entityType` + `entityId` fields.
 */
export function DocumentUploader({
  defaultEntityType = "General",
  defaultEntityId = "general",
}: {
  defaultEntityType?: string;
  defaultEntityId?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [category, setCategory] = useState("OTHER");
  const [visibility, setVisibility] = useState("INTERNAL");
  const [entityType, setEntityType] = useState(defaultEntityType);
  const [entityId, setEntityId] = useState(defaultEntityId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Izaberite datoteku.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      form.append("visibility", visibility);
      form.append("entityType", entityType || "General");
      form.append("entityId", entityId || "general");
      const res = await fetch("/api/v1/documents", { method: "POST", body: form });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          (payload?.error?.message as string | undefined) ?? "Otpremanje nije uspelo.",
        );
      }
      setSuccess(`Dokument "${file.name}" je otpremljen.`);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Došlo je do greške.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            Kategorija
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            Vidljivost
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            Tip entiteta
          </label>
          <input
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            ID entiteta
          </label>
          <input
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </div>
      </div>
      <input
        type="file"
        ref={inputRef}
        className="block w-full text-sm text-[var(--color-foreground)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-brand-600)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
      />
      <div className="flex justify-end">
        <Button loading={busy} onClick={submit}>
          Otpremi
        </Button>
      </div>
    </div>
  );
}
