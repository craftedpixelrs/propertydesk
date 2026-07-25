"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgencyConnectionStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

export function ConnectionStatusActions({
  connectionId,
  status,
}: {
  connectionId: string;
  status: AgencyConnectionStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "SUSPEND" | "REACTIVATE" | "TERMINATE") {
    if (action === "TERMINATE" && !confirm("Da li ste sigurni da želite da prekinete konekciju?")) {
      return;
    }
    setError(null);
    setLoading(action);
    try {
      await apiClient.post(`/agencies/${connectionId}/status`, { action });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "ACTIVE" || status === "INVITED" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => run("SUSPEND")}
          loading={loading === "SUSPEND"}
        >
          Suspenduj
        </Button>
      ) : null}
      {status === "SUSPENDED" ? (
        <Button
          size="sm"
          onClick={() => run("REACTIVATE")}
          loading={loading === "REACTIVATE"}
        >
          Reaktiviraj
        </Button>
      ) : null}
      {status !== "TERMINATED" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => run("TERMINATE")}
          loading={loading === "TERMINATE"}
          className="text-red-600 hover:bg-red-50"
        >
          Prekini
        </Button>
      ) : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
