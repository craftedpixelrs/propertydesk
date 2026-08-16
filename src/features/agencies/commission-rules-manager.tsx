"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CommissionCalculationType } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

interface RuleRow {
  id: string;
  projectId: string | null;
  unitId: string | null;
  calculationType: CommissionCalculationType;
  rate: string | null;
  fixedAmount: string | null;
  currency: string;
  validFrom: Date | null;
  validTo: Date | null;
  internalNote: string | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  code: string;
}

export function CommissionRulesManager({
  connectionId,
  rules,
  projects,
}: {
  connectionId: string;
  rules: RuleRow[];
  projects: ProjectSummary[];
}) {
  const t = useT();
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [calculationType, setCalculationType] =
    useState<CommissionCalculationType>("PERCENTAGE");
  const [rate, setRate] = useState("3");
  const [fixedAmount, setFixedAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function add() {
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/commission-rules", {
        agencyConnectionId: connectionId,
        projectId: projectId || null,
        calculationType,
        rate: calculationType === "PERCENTAGE" ? Number(rate) : null,
        fixedAmount: calculationType === "FIXED" ? Number(fixedAmount) : null,
      });
      setProjectId("");
      setRate("3");
      setFixedAmount("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("partners.confirmGeneric"))) return;
    setPendingId(id);
    setError(null);
    try {
      await apiClient.delete(`/commission-rules/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setPendingId(null);
    }
  }

  function tierLabel(rule: RuleRow): string {
    if (rule.unitId) return t("partners.ruleTier.unit");
    if (rule.projectId) return t("partners.ruleTier.project");
    return t("partners.ruleTier.connectionGeneral");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("partners.rules.addTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="rule-project">
                {t("units.columns.project")} ({t("common.optional")})
              </label>
              <select
                id="rule-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              >
                <option value="">{t("partners.rules.allDefault")}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="rule-type">
                {t("common.type")}
              </label>
              <select
                id="rule-type"
                value={calculationType}
                onChange={(e) =>
                  setCalculationType(e.target.value as CommissionCalculationType)
                }
                className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              >
                <option value="PERCENTAGE">{t("partners.percentage")}</option>
                <option value="FIXED">{t("partners.fixedAmount")}</option>
              </select>
            </div>
            {calculationType === "PERCENTAGE" ? (
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="rule-rate">
                  {t("partners.rules.rate")}
                </label>
                <input
                  id="rule-rate"
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="rule-amount">
                  {t("common.amount")}
                </label>
                <input
                  id="rule-amount"
                  type="number"
                  step="0.01"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                />
              </div>
            )}
            <div className="flex items-end">
              <Button onClick={add} loading={loading} className="w-full">
                {t("common.add")}
              </Button>
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("partners.rules.existingTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("partners.rules.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">{t("partners.level")}</th>
                    <th className="px-4 py-3">{t("units.columns.project")}</th>
                    <th className="px-4 py-3">{t("common.type")}</th>
                    <th className="px-4 py-3 text-right">{t("partners.value")}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">{tierLabel(r)}</td>
                      <td className="px-4 py-3">
                        {projects.find((p) => p.id === r.projectId)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.calculationType === "PERCENTAGE"
                          ? t("partners.percentage")
                          : t("partners.fixedAmount")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.calculationType === "PERCENTAGE"
                          ? `${r.rate} %`
                          : `${r.fixedAmount} ${r.currency}`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => remove(r.id)}
                          loading={pendingId === r.id}
                          className="text-red-600"
                        >
                          {t("common.delete")}
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
