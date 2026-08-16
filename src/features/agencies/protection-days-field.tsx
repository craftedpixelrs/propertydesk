"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

export function ProtectionDaysField({
  connectionId,
  initialDays,
}: {
  connectionId: string;
  initialDays: number;
}) {
  const t = useT();
  const router = useRouter();
  const [days, setDays] = useState(String(initialDays));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      await apiClient.patch(`/agencies/${connectionId}`, {
        defaultProtectionDays: Number(days),
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="protection-days">
          {t("partners.protection.daysLabel")}
        </label>
        <input
          id="protection-days"
          type="number"
          min={0}
          max={365}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="h-11 w-40 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        />
      </div>
      <Button onClick={save} loading={loading}>
        {t("common.save")}
      </Button>
      {saved ? <span className="text-sm text-emerald-700">{t("toasts.saved")}</span> : null}
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
