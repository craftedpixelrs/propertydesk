"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

export function ConnectionInvitationActions({
  connectionId,
}: {
  connectionId: string;
}) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState<"ACCEPT" | "REJECT" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "ACCEPT" | "REJECT") {
    setError(null);
    setLoading(action);
    try {
      await apiClient.post(`/agency/connections/${connectionId}/respond`, {
        action,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-2">
      <Button size="sm" onClick={() => respond("ACCEPT")} loading={loading === "ACCEPT"}>
        {t("partners.accept")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => respond("REJECT")}
        loading={loading === "REJECT"}
        className="text-red-600"
      >
        {t("partners.reject")}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
