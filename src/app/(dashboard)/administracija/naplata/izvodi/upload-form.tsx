"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";

export function UploadStatementForm() {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError(null);
    setOk(null);
    const form = new FormData(ev.currentTarget);
    const res = await fetch("/api/v1/billing/bank-statements", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error?.message ?? res.statusText);
      return;
    }
    const j = await res.json();
    setOk(t("admin.statements.importedOk", { count: j.data?.rowCount ?? 0 }));
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
      <label className="grid gap-1 text-sm">
        <span className="text-xs text-[var(--color-foreground-muted)]">
          {t("admin.statements.formatRequired")}
        </span>
        <select
          name="format"
          required
          defaultValue="CSV"
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        >
          <option value="CSV">CSV</option>
          <option value="XLSX">XLSX</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm md:col-span-2">
        <span className="text-xs text-[var(--color-foreground-muted)]">
          {t("admin.statements.fileRequired")}
        </span>
        <input
          type="file"
          name="file"
          required
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-sm"
        />
      </label>
      <div className="md:col-span-3 flex items-center justify-between gap-2">
        {error ? <span className="text-sm text-[var(--color-danger)]">{error}</span> : null}
        {ok ? <span className="text-sm text-[var(--color-success)]">{ok}</span> : <span />}
        <Button type="submit" disabled={pending}>
          {pending ? t("admin.sending") : t("admin.statements.import")}
        </Button>
      </div>
    </form>
  );
}
