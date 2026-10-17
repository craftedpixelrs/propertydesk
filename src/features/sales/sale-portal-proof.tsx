"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/app/i18n-provider";

export function SalePortalProof(props: { token: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const file = new FormData(formEl).get("file");
    if (!(file instanceof File) || file.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/v1/public/sale-portal/${props.token}/proof`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(payload?.error?.message ?? t("errors.generic"));
      }
      setDone(true);
      formEl.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-sm font-medium">{t("deals.portal.proof")}</p>
      <p className="text-xs text-[var(--color-foreground-muted)]">{t("deals.portal.proofHint")}</p>
      <input
        name="file"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="block w-full text-sm"
        required
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {done ? <p className="text-sm text-emerald-700">{t("deals.portal.proofSent")}</p> : null}
      <Button type="submit" size="sm" loading={busy}>
        {t("deals.portal.proof")}
      </Button>
    </form>
  );
}
