"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Props {
  commissionId: string;
  status: string;
}

export function CommissionRowActions({ commissionId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/commissions/${commissionId}/actions`, payload);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setBusy(false);
    }
  }

  const canApprove = status === "CALCULATED";
  const canInvoice = status === "APPROVED";
  const canPaid = status === "INVOICED" || status === "DUE";
  const canCancel = status !== "PAID" && status !== "CANCELED";

  return (
    <div className="flex flex-wrap justify-end gap-2 text-xs">
      {error ? <span className="text-red-700">{error}</span> : null}
      {canApprove ? (
        <Button size="sm" loading={busy} onClick={() => act({ action: "approve" })}>
          Odobri
        </Button>
      ) : null}
      {canInvoice ? (
        <Button
          size="sm"
          variant="outline"
          loading={busy}
          onClick={() => act({ action: "invoice" })}
        >
          Fakturisano
        </Button>
      ) : null}
      {canPaid ? (
        <Button
          size="sm"
          variant="outline"
          loading={busy}
          onClick={() => act({ action: "paid" })}
        >
          Plaćeno
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          size="sm"
          variant="ghost"
          loading={busy}
          onClick={() => {
            const reason = window.prompt("Razlog otkazivanja:") ?? "";
            if (reason.trim()) act({ action: "cancel", reason });
          }}
        >
          Otkaži
        </Button>
      ) : null}
    </div>
  );
}
