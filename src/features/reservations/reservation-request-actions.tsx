"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

/**
 * Faza 8.1 (A2) — accept / decline buttons on the pending list.
 *
 * Confirming triggers `Reservation` materialisation via the
 * server-side service; declining simply closes the request and
 * frees the unit's soft hold when no other pending requests
 * remain.
 */
export function ReservationRequestActions(props: {
  requestId: string;
  canApprove: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<"confirm" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!props.canApprove) {
    return (
      <span className="text-xs text-[var(--color-foreground-muted)]">
        {t("deals.requests.noPermission")}
      </span>
    );
  }

  async function confirm() {
    setBusy("confirm");
    setError(null);
    try {
      await apiClient.post(
        `/reservation-requests/${props.requestId}/confirm`,
        {},
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    const reason = window.prompt(t("deals.requests.declinePrompt"), "");
    if (reason === null) return;
    setBusy("decline");
    setError(null);
    try {
      await apiClient.post(
        `/reservation-requests/${props.requestId}/decline`,
        { reason: reason || null },
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          loading={busy === "decline"}
          disabled={busy != null}
          onClick={decline}
        >
          {t("deals.reservationActions.reject")}
        </Button>
        <Button size="sm" loading={busy === "confirm"} disabled={busy != null} onClick={confirm}>
          {t("deals.requests.confirmDeposit")}
        </Button>
      </div>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
