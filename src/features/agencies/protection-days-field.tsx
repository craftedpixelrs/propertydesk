"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

export function ProtectionDaysField({
  connectionId,
  initialDays,
}: {
  connectionId: string;
  initialDays: number;
}) {
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
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="protection-days">
          Dana zaštite
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
        Sačuvaj
      </Button>
      {saved ? <span className="text-sm text-emerald-700">Sačuvano.</span> : null}
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
