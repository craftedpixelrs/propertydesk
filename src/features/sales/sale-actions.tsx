"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Props {
  saleId: string;
  status: string;
  version: number;
  canManage: boolean;
}

/**
 * Action bar on the sale detail screen.
 *
 * Buttons visible depend on the current status:
 *   DRAFT          → Predugovor, Ugovor, Otkaži
 *   PRE_CONTRACT   → Ugovor, Otkaži
 *   CONTRACTED     → Označi plaćenu (rare short-circuit), Otkaži
 *   PAYMENT_...    → (plaćanja rade posao); Otkaži je dostupan
 *   PAID           → Primopredaja
 *   HANDED_OVER    → (kraj)
 *
 * The buttons submit the expected `version` so a concurrent update by another
 * user fails cleanly with an "OPTIMISTIC_LOCK" error.
 */
export function SaleActions({ saleId, status, version, canManage }: Props) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");

  async function transition(target: "PRE_CONTRACT" | "CONTRACTED" | "PAID" | "HANDED_OVER") {
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/sales/${saleId}/status`, { target, expectedVersion: version });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!reason.trim()) {
      setError(t("deals.saleActions.cancelReasonMissing"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/sales/${saleId}/cancel`, {
        reason: reason.trim(),
        expectedVersion: version,
      });
      setShowCancel(false);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) return null;

  const canPreContract = status === "DRAFT";
  const canContract = status === "DRAFT" || status === "PRE_CONTRACT";
  const canPaidQuick = status === "CONTRACTED";
  const canHandOver = status === "PAID";
  const canCancel =
    status !== "CANCELED" && status !== "HANDED_OVER" && status !== "PAID";

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canPreContract ? (
          <Button size="sm" loading={busy} onClick={() => transition("PRE_CONTRACT")}>
            {t("deals.saleActions.preContract")}
          </Button>
        ) : null}
        {canContract ? (
          <Button size="sm" loading={busy} onClick={() => transition("CONTRACTED")}>
            {t("deals.saleActions.contractSigned")}
          </Button>
        ) : null}
        {canPaidQuick ? (
          <Button size="sm" variant="secondary" loading={busy} onClick={() => transition("PAID")}>
            {t("deals.saleActions.paidInFull")}
          </Button>
        ) : null}
        {canHandOver ? (
          <Button size="sm" loading={busy} onClick={() => transition("HANDED_OVER")}>
            {t("deals.handover")}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setShowCancel((v) => !v)}
          >
            {t("deals.saleActions.cancelSale")}
          </Button>
        ) : null}
      </div>

      {showCancel ? (
        <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
          <label className="block text-sm text-[var(--color-foreground-muted)]">
            {t("deals.saleActions.cancelReasonRequired")}
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCancel(false)}>
              {t("deals.saleActions.dismiss")}
            </Button>
            <Button size="sm" variant="destructive" loading={busy} onClick={cancel}>
              {t("deals.saleActions.confirmCancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
