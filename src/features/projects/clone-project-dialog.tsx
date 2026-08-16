"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Props {
  projectId: string;
  sourceCode: string;
  sourceName: string;
}

interface CloneResult {
  newProjectId: string;
  newProjectCode: string;
  counts: {
    buildings: number;
    entrances: number;
    floors: number;
    units: number;
  };
}

export function CloneProjectDialog({ projectId, sourceCode, sourceName }: Props) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(`${sourceCode}-2`);
  const [name, setName] = useState(t("inventory.clone.copyName", { name: sourceName }));
  const [copyBuildings, setCopyBuildings] = useState(true);
  const [copyEntrances, setCopyEntrances] = useState(true);
  const [copyFloors, setCopyFloors] = useState(true);
  const [copyUnits, setCopyUnits] = useState(false);
  const [copyCosts, setCopyCosts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const result = await apiClient.post<CloneResult>(
        `/projects/${projectId}/clone`,
        {
          newProjectCode: code,
          newProjectName: name,
          copyBuildings,
          copyEntrances: copyBuildings && copyEntrances,
          copyFloors: copyBuildings && copyEntrances && copyFloors,
          copyUnitsAsAvailable: copyUnits,
          copyCosts,
        },
      );
      router.push(`/projekti/${result.newProjectId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : t("inventory.clone.error"),
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("inventory.clone.action")}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <div>
          <h2 className="text-lg font-semibold">{t("inventory.clone.action")}</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.clone.bodyBefore")} <strong>{sourceCode}</strong>{" "}
            {t("inventory.clone.bodyAfter")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="cloneCode">
              {t("inventory.clone.newCode")}
            </label>
            <input
              id="cloneCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="cloneName">
              {t("inventory.clone.newName")}
            </label>
            <input
              id="cloneName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
            {t("inventory.clone.whatToCopy")}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyBuildings}
              onChange={(e) => setCopyBuildings(e.target.checked)}
            />
            <span>{t("inventory.clone.buildings")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyEntrances}
              onChange={(e) => setCopyEntrances(e.target.checked)}
              disabled={!copyBuildings}
            />
            <span className={copyBuildings ? "" : "opacity-50"}>{t("structure.entrances")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyFloors}
              onChange={(e) => setCopyFloors(e.target.checked)}
              disabled={!copyBuildings || !copyEntrances}
            />
            <span className={copyBuildings && copyEntrances ? "" : "opacity-50"}>
              {t("structure.floors")}
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyUnits}
              onChange={(e) => setCopyUnits(e.target.checked)}
            />
            <span>{t("inventory.clone.units")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyCosts}
              onChange={(e) => setCopyCosts(e.target.checked)}
            />
            <span>{t("inventory.clone.costs")}</span>
          </label>
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t("inventory.discard")}
          </Button>
          <Button onClick={onSubmit} loading={loading}>
            {t("inventory.clone.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
