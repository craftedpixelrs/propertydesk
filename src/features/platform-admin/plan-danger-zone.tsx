"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Props {
  planId: string;
  planName: string;
  active: boolean;
  subscriptionCount: number;
  invoiceCount: number;
}

export function PlanDangerZone({
  planId,
  planName,
  active,
  subscriptionCount,
  invoiceCount,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingArchive, startArchive] = useTransition();
  const [pendingDelete, startDelete] = useTransition();

  const canHardDelete = subscriptionCount === 0 && invoiceCount === 0;

  function callArchive(action: "archive" | "restore") {
    setError(null);
    startArchive(async () => {
      try {
        await apiClient.post(`/platform/plans/${planId}/archive`, { action });
        router.refresh();
      } catch (err) {
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Operacija nije uspela.",
        );
      }
    });
  }

  function callDelete() {
    if (
      !window.confirm(
        `Obrisati plan „${planName}" trajno? Ova akcija je nepovratna. Ako plan ima istoriju, koristite arhiviranje umesto brisanja.`,
      )
    ) {
      return;
    }
    setError(null);
    startDelete(async () => {
      try {
        await apiClient.delete(`/platform/plans/${planId}`);
        router.push("/administracija/planovi");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Brisanje nije uspelo.",
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Opasna zona</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--color-border)] p-3">
          <div>
            <div className="font-medium">
              {active ? "Arhiviraj plan" : "Vrati plan u upotrebu"}
            </div>
            <p className="text-xs text-[var(--color-foreground-muted)]">
              {active
                ? "Arhiviran plan se ne prikazuje u listi za nove pretplate, ali sve postojeće pretplate i istorijske fakture ostaju netaknute."
                : "Ponovo omogući da se ovaj plan dodeljuje novim pretplatama."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => callArchive(active ? "archive" : "restore")}
            loading={pendingArchive}
          >
            {active ? "Arhiviraj" : "Vrati u upotrebu"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3">
          <div>
            <div className="font-medium text-red-800">Trajno obriši</div>
            <p className="text-xs text-red-700">
              {canHardDelete
                ? "Ovaj plan nema pretplata ni faktura — može se obrisati trajno. Nema povratka."
                : `Ne može se obrisati: ${subscriptionCount} pretplata i ${invoiceCount} istorijskih faktura koriste ovaj plan. Umesto brisanja, arhivirajte.`}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={callDelete}
            loading={pendingDelete}
            disabled={!canHardDelete}
            title={
              canHardDelete
                ? "Trajno obriši plan"
                : "Plan ima referencirane pretplate ili fakture."
            }
          >
            Trajno obriši
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
