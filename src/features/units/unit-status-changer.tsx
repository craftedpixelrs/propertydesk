"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { unitStatusLabel } from "@/lib/i18n";
import { ALLOWED_UNIT_STATUS_TRANSITIONS } from "@/features/units/status-transitions";

export function UnitStatusChanger({
  unitId,
  currentStatus,
}: {
  unitId: string;
  currentStatus: string;
}) {
  const t = useT();
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = ALLOWED_UNIT_STATUS_TRANSITIONS[currentStatus] ?? [];

  if (options.length === 0) {
    return (
      <p className="text-sm text-[var(--color-foreground-muted)]">
        {t("inventory.units.noStatusTransitions")}
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
          : t("inventory.units.statusChangeError"),
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
        <option value="">{t("inventory.units.newStatusPlaceholder")}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {unitStatusLabel(o, t)}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder={t("units.price.reason")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
      />
      <Button type="submit" loading={loading} disabled={!target}>
        {t("units.actions.changeStatus")}
      </Button>
      {error ? (
        <div className="sm:col-span-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </form>
  );
}
