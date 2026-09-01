"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

export function CancelConnectionRequest({ requestId }: { requestId: string }) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setError(null);
    setLoading(true);
    try {
      await apiClient.post(`/agency/connection-requests/${requestId}/cancel`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={cancel} loading={loading}>
        {t("common.cancel")}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
