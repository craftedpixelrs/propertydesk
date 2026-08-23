"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgencyProjectAccessStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

interface ProjectAccessRow {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  status: AgencyProjectAccessStatus;
  canViewPrices: boolean;
  canViewFloorPlans: boolean;
  canRequestReservations: boolean;
  showOnlyAgencyVisibleUnits: boolean;
}

interface ProjectSummary {
  id: string;
  name: string;
  code: string;
}

const ACCESS_STATUS_KEYS: Record<AgencyProjectAccessStatus, TranslationKey> = {
  ACTIVE: "partners.accessStatus.ACTIVE",
  SUSPENDED: "partners.accessStatus.SUSPENDED",
  ENDED: "partners.accessStatus.ENDED",
};

export function ProjectAccessManager({
  connectionId,
  existing,
  availableProjects,
}: {
  connectionId: string;
  existing: ProjectAccessRow[];
  availableProjects: ProjectSummary[];
}) {
  const t = useT();
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [canViewPrices, setCanViewPrices] = useState(true);
  const [canRequestReservations, setCanRequestReservations] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAccessId, setPendingAccessId] = useState<string | null>(null);

  const existingProjectIds = new Set(existing.map((e) => e.projectId));
  const candidates = availableProjects.filter((p) => !existingProjectIds.has(p.id));

  async function grant() {
    if (!selectedProjectId) return;
    setError(null);
    setLoading(true);
    try {
      await apiClient.post(`/agencies/${connectionId}/project-access`, {
        projectId: selectedProjectId,
        canViewPrices,
        canRequestReservations,
      });
      setSelectedProjectId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  async function revoke(accessId: string) {
    if (!confirm(t("partners.access.revokeConfirm"))) return;
    setPendingAccessId(accessId);
    setError(null);
    try {
      await apiClient.delete(`/agencies/${connectionId}/project-access/${accessId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setPendingAccessId(null);
    }
  }

  async function patchAccess(
    accessId: string,
    patch: { canViewPrices?: boolean; canRequestReservations?: boolean },
  ) {
    setPendingAccessId(accessId);
    setError(null);
    try {
      await apiClient.patch(`/agencies/${connectionId}/project-access/${accessId}`, patch);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setPendingAccessId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("partners.access.grantTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("partners.access.allGranted")}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="project">
                  {t("units.columns.project")}
                </label>
                <select
                  id="project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                >
                  <option value="">{t("partners.access.selectProject")}</option>
                  {candidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 pt-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={canViewPrices}
                    onChange={(e) => setCanViewPrices(e.target.checked)}
                  />
                  {t("partners.access.canViewPrices")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={canRequestReservations}
                    onChange={(e) => setCanRequestReservations(e.target.checked)}
                  />
                  {t("partners.access.canRequestReservations")}
                </label>
              </div>
            </div>
          )}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {candidates.length > 0 ? (
            <div className="flex justify-end">
              <Button
                onClick={grant}
                disabled={!selectedProjectId}
                loading={loading}
              >
                {t("partners.access.grant")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("partners.access.assignedTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {existing.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("partners.access.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">{t("units.columns.project")}</th>
                    <th className="px-4 py-3">{t("common.statusLabel")}</th>
                    <th className="px-4 py-3">{t("partners.access.prices")}</th>
                    <th className="px-4 py-3">{t("partners.access.reservations")}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {existing.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3">
                        {a.projectName}{" "}
                        <span className="text-xs text-[var(--color-foreground-muted)]">
                          ({a.projectCode})
                        </span>
                      </td>
                      <td className="px-4 py-3">{t(ACCESS_STATUS_KEYS[a.status])}</td>
                      <td className="px-4 py-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={a.canViewPrices}
                            disabled={pendingAccessId === a.id}
                            onChange={(e) =>
                              patchAccess(a.id, { canViewPrices: e.target.checked })
                            }
                          />
                          {t("partners.access.showPrices")}
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={a.canRequestReservations}
                            disabled={pendingAccessId === a.id}
                            onChange={(e) =>
                              patchAccess(a.id, {
                                canRequestReservations: e.target.checked,
                              })
                            }
                          />
                          {t("partners.access.allowReservations")}
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revoke(a.id)}
                          loading={pendingAccessId === a.id}
                          className="text-red-600"
                        >
                          {t("partners.access.revoke")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
