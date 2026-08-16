"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Props {
  paymentId: string;
  reversed: boolean;
}

export function PaymentRowActions({ paymentId, reversed }: Props) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function reverse() {
    if (!reason.trim()) {
      setError(t("deals.payments.reverseReasonRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/payments/${paymentId}/reverse`, { reason: reason.trim() });
      setShowForm(false);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (reversed) {
    return (
      <span className="text-xs text-[var(--color-foreground-muted)]">{t("deals.reversed")}</span>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <div className="text-xs text-red-700">{error}</div> : null}
      {showForm ? (
        <div className="flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("deals.payments.reasonPlaceholder")}
            className="h-8 rounded-md border border-[var(--color-border)] px-2 text-xs"
          />
          <Button size="sm" variant="destructive" loading={busy} onClick={reverse}>
            {t("common.confirm")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
            {t("common.close")}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          {t("deals.payments.reverse")}
        </Button>
      )}
    </div>
  );
}
