"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Building {
  id: string;
  label: string;
}

interface Props {
  requestId: string;
  projectName: string;
  projectCity: string;
  projectAddress: string;
  buildings: Building[];
}

export function HandoverAcceptForm({
  requestId,
  projectName,
  projectCity,
  projectAddress,
  buildings,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing">(buildings.length > 0 ? "existing" : "new");
  const [targetBuildingId, setTargetBuildingId] = useState<string>(buildings[0]?.id ?? "");
  const [newName, setNewName] = useState(projectName);
  const [newAddress, setNewAddress] = useState(projectAddress);
  const [newCity, setNewCity] = useState(projectCity);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setError(null);
    setLoading("accept");
    try {
      await apiClient.post(`/manager/handovers/${requestId}/accept`, {
        targetBuildingId: mode === "existing" ? targetBuildingId : null,
        newBuildingName: mode === "new" ? newName.trim() : null,
        newBuildingAddress: mode === "new" ? newAddress.trim() : null,
        newBuildingCity: mode === "new" ? newCity.trim() : null,
      });
      router.push(`/zgrade`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("common.unexpectedError"));
    } finally {
      setLoading(null);
    }
  }

  async function reject() {
    setError(null);
    setLoading("reject");
    try {
      await apiClient.post(`/manager/handovers/${requestId}/reject`, {
        reason: rejectReason.trim() || null,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("common.unexpectedError"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("manager.handover.accept")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              className="mt-1"
              checked={mode === "new"}
              onChange={() => setMode("new")}
            />
            <span>
              <strong>{t("manager.handover.newBuilding")}</strong>
            </span>
          </label>
          {mode === "new" ? (
            <div className="ml-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("manager.handover.newBuildingName")}
                className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              />
              <input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder={t("manager.handover.newBuildingAddress")}
                className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              />
              <input
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder={t("manager.handover.newBuildingCity")}
                className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              />
            </div>
          ) : null}

          {buildings.length > 0 ? (
            <>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  className="mt-1"
                  checked={mode === "existing"}
                  onChange={() => setMode("existing")}
                />
                <span>
                  <strong>{t("manager.handover.acceptInto")}</strong>
                </span>
              </label>
              {mode === "existing" ? (
                <select
                  value={targetBuildingId}
                  onChange={(e) => setTargetBuildingId(e.target.value)}
                  className="ml-6 h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
          <div className="flex items-center gap-2">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Razlog odbijanja (opciono)"
              className="h-10 w-72 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            />
            <Button variant="outline" onClick={reject} loading={loading === "reject"}>
              {t("manager.handover.reject")}
            </Button>
          </div>
          <Button
            onClick={accept}
            loading={loading === "accept"}
            disabled={
              mode === "existing"
                ? !targetBuildingId
                : !newName.trim() || !newAddress.trim() || !newCity.trim()
            }
          >
            {t("manager.handover.accept")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
