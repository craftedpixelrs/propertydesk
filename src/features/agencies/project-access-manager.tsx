"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgencyProjectAccessStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

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

const STATUS_LABELS: Record<AgencyProjectAccessStatus, string> = {
  ACTIVE: "Aktivan",
  SUSPENDED: "Suspendovan",
  ENDED: "Završen",
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
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(accessId: string) {
    if (!confirm("Da li ste sigurni da želite da opozovete pristup?")) return;
    setPendingAccessId(accessId);
    setError(null);
    try {
      await apiClient.delete(`/agencies/${connectionId}/project-access/${accessId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setPendingAccessId(null);
    }
  }

  async function togglePricing(accessId: string, next: boolean) {
    setPendingAccessId(accessId);
    setError(null);
    try {
      await apiClient.patch(`/agencies/${connectionId}/project-access/${accessId}`, {
        canViewPrices: next,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setPendingAccessId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Odobri pristup novom projektu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Svi projekti su već pristupačni ovoj agenciji.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="project">
                  Projekat
                </label>
                <select
                  id="project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                >
                  <option value="">Izaberite projekat</option>
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
                  Sme videti cene
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={canRequestReservations}
                    onChange={(e) => setCanRequestReservations(e.target.checked)}
                  />
                  Sme kreirati rezervacije
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
                Dodeli pristup
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dodeljeni pristupi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {existing.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              Ova agencija još nema pristup nijednom projektu.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">Projekat</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Cene</th>
                    <th className="px-4 py-3">Rezervacije</th>
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
                      <td className="px-4 py-3">{STATUS_LABELS[a.status]}</td>
                      <td className="px-4 py-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={a.canViewPrices}
                            disabled={pendingAccessId === a.id}
                            onChange={(e) => togglePricing(a.id, e.target.checked)}
                          />
                          Prikazuj
                        </label>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {a.canRequestReservations ? "Da" : "Ne"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revoke(a.id)}
                          loading={pendingAccessId === a.id}
                          className="text-red-600"
                        >
                          Opozovi
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
