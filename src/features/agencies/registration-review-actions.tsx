"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

export function RegistrationReviewActions({
  registrationId,
}: {
  registrationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setError(null);
    setLoading("APPROVE");
    try {
      await apiClient.post(`/agency-registrations/${registrationId}/approve`, {});
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setLoading(null);
    }
  }

  async function reject() {
    const reason = prompt("Razlog odbijanja (opciono):") ?? undefined;
    setError(null);
    setLoading("REJECT");
    try {
      await apiClient.post(`/agency-registrations/${registrationId}/reject`, {
        reason: reason || undefined,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-2">
      <Button size="sm" onClick={approve} loading={loading === "APPROVE"}>
        Odobri
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={reject}
        loading={loading === "REJECT"}
        className="text-red-600"
      >
        Odbij
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
