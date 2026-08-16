"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

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
  const t = useT();
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
            : t("admin.operationFailed"),
        );
      }
    });
  }

  function callDelete() {
    if (
      !window.confirm(
        t("admin.planDanger.confirm", { name: planName }),
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
            : t("admin.deleteFailed"),
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("admin.planDanger.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--color-border)] p-3">
          <div>
            <div className="font-medium">
              {active ? t("admin.planDanger.archive") : t("admin.planDanger.restore")}
            </div>
            <p className="text-xs text-[var(--color-foreground-muted)]">
              {active
                ? t("admin.planDanger.archiveHint")
                : t("admin.planDanger.restoreHint")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => callArchive(active ? "archive" : "restore")}
            loading={pendingArchive}
          >
            {active ? t("admin.planDanger.archiveBtn") : t("admin.planDanger.restoreBtn")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3">
          <div>
            <div className="font-medium text-red-800">{t("admin.planDanger.deleteTitle")}</div>
            <p className="text-xs text-red-700">
              {canHardDelete
                ? t("admin.planDanger.deleteOk")
                : t("admin.planDanger.deleteBlocked", {
                    subs: subscriptionCount,
                    invoices: invoiceCount,
                  })}
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
                ? t("admin.planDanger.deleteTitleOk")
                : t("admin.planDanger.deleteTitleBlocked")
            }
          >
            {t("admin.planDanger.deleteBtn")}
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
