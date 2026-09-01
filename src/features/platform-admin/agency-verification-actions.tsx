"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

export function AgencyVerificationActions({
  organizationId,
  status,
}: {
  organizationId: string;
  status: string;
}) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: "VERIFIED" | "REJECTED" | "PENDING") {
    setError(null);
    setLoading(next);
    try {
      await apiClient.post(`/platform/organizations/${organizationId}/verification`, {
        status: next,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "VERIFIED" ? (
        <Button size="sm" onClick={() => setStatus("VERIFIED")} loading={loading === "VERIFIED"}>
          {t("admin.verification.verify")}
        </Button>
      ) : null}
      {status !== "REJECTED" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStatus("REJECTED")}
          loading={loading === "REJECTED"}
        >
          {t("admin.verification.reject")}
        </Button>
      ) : null}
      {status !== "PENDING" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStatus("PENDING")}
          loading={loading === "PENDING"}
        >
          {t("admin.verification.reset")}
        </Button>
      ) : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
