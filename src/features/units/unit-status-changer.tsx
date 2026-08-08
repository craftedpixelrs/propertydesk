"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { ALLOWED_UNIT_STATUS_TRANSITIONS } from "@/features/units/status-transitions";

const LABELS: Record<string, string> = {
  AVAILABLE: "Slobodno",
  ON_HOLD: "Na čekanju",
  RESERVED: "Rezervisano",
  DEPOSIT_PAID: "Kapara plaćena",
  CONTRACTED: "Ugovoreno",
  SOLD: "Prodato",
  BLOCKED: "Blokirano",
  NOT_FOR_SALE: "Nije u prodaji",
};

export function UnitStatusChanger({
  unitId,
  currentStatus,
}: {
  unitId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = ALLOWED_UNIT_STATUS_TRANSITIONS[currentStatus] ?? [];

  if (options.length === 0) {
    return (
      <p className="text-sm text-[var(--color-foreground-muted)]">
        Iz trenutnog statusa nije dozvoljena nijedna promena. Sistemski
        događaji (npr. otkaz rezervacije) mogu izmeniti status automatski.
      </p>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(`/units/${unitId}/status`, {
        newStatus: target,
        reason: reason || undefined,
      });
      router.refresh();
      setTarget("");
      setReason("");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Greška prilikom izmene statusa.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_auto]"
      onSubmit={onSubmit}
    >
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
      >
        <option value="">Novi status…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {LABELS[o] ?? o}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Razlog (opciono)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
      />
      <Button type="submit" loading={loading} disabled={!target}>
        Promeni status
      </Button>
      {error ? (
        <div className="sm:col-span-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </form>
  );
}
