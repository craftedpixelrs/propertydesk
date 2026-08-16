"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Props {
  reservationId: string;
  status: string;
  version: number;
  canApprove: boolean;
  canCancel: boolean;
}

export function ReservationActions({
  reservationId,
  status,
  version,
  canApprove,
  canCancel,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const isPending = status === "REQUESTED";
  const isActive = status === "REQUESTED" || status === "APPROVED";

  async function act(path: string, body?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/reservations/${reservationId}/${path}`, {
        expectedVersion: version,
        ...body,
      });
      setRejecting(false);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (!isActive) return null;

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canApprove && isPending ? (
          <Button size="sm" loading={busy} onClick={() => act("approve")}>
            {t("deals.reservationActions.approve")}
          </Button>
        ) : null}
        {canApprove && isPending ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setRejecting((v) => !v)}
          >
            {t("deals.reservationActions.reject")}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            size="sm"
            variant="outline"
            loading={busy}
            onClick={() =>
              act("cancel", { reason: t("deals.reservationActions.cancelReason") })
            }
          >
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>

      {rejecting ? (
        <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("deals.reservationActions.rejectPlaceholder")}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="destructive"
              loading={busy}
              onClick={() => act("reject", { reason: reason || undefined })}
            >
              {t("deals.reservationActions.confirmReject")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
