"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

type Template = "MANUAL" | "PERCENTAGE" | "EQUAL" | "TEMPLATE";

interface ManualRow {
  name: string;
  amount: string;
  dueDate: string;
}
interface PctRow {
  name: string;
  percentage: string;
  dueDate: string;
}

interface TemplateOption {
  id: string;
  name: string;
  projectId: string | null;
  projectName: string | null;
  isDefault: boolean;
}

interface ApplyTemplateResponse {
  template: { id: string; name: string };
  currency: string;
  finalPrice: string;
  rows: {
    sequenceNumber: number;
    label: string;
    percentage: string;
    amount: string;
    dueDate: string | null;
  }[];
}

interface Props {
  saleId: string;
  currency: string;
  finalPrice: string;
  /** Used to pre-filter templates. Server also enforces org scoping. */
  projectId?: string | null;
}

/**
 * Interactive builder for MANUAL / PERCENTAGE / EQUAL plans plus a
 * "TEMPLATE" mode that resolves a saved PaymentPlanTemplate into
 * MANUAL rows the operator can still fine-tune. Client-side feedback
 * (running totals, tolerance warnings) helps the user hit the
 * server-side Decimal validation on the first submit.
 */
export function PaymentPlanForm({ saleId, currency, finalPrice, projectId }: Props) {
  const t = useT();
  const router = useRouter();
  const [template, setTemplate] = useState<Template>("EQUAL");
  const [planName, setPlanName] = useState(() => t("deals.plan.defaultName"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { name: t("deals.plan.firstInstallment"), amount: "", dueDate: new Date().toISOString().slice(0, 10) },
  ]);
  const [pctRows, setPctRows] = useState<PctRow[]>([
    { name: t("deals.plan.firstInstallment"), percentage: "100", dueDate: new Date().toISOString().slice(0, 10) },
  ]);
  const [equalCount, setEqualCount] = useState(12);
  const [equalFirstDue, setEqualFirstDue] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  // Template mode state.
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateApplied, setTemplateApplied] = useState<string | null>(null);
  const [templateInfo, setTemplateInfo] = useState<string | null>(null);

  useEffect(() => {
    if (template !== "TEMPLATE") return;
    if (templateOptions.length > 0) return;
    const url = projectId
      ? `/payment-plan-templates?projectId=${encodeURIComponent(projectId)}`
      : "/payment-plan-templates";
    apiClient
      .get<{ data: unknown }>(url)
      .then((res) => {
        const raw = (res as { data: unknown }).data;
        if (!Array.isArray(raw)) return;
        const items: TemplateOption[] = raw
          .filter((t): t is Record<string, unknown> => Boolean(t))
          .map((t) => ({
            id: String(t.id),
            name: String(t.name),
            projectId: (t.projectId as string | null) ?? null,
            projectName:
              (t.project as { name?: string } | null | undefined)?.name ?? null,
            isDefault: Boolean(t.isDefault),
          }));
        // Sort default first, then project-scoped, then org-scoped.
        items.sort((a, b) => {
          if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
          if ((a.projectId != null) !== (b.projectId != null)) {
            return a.projectId != null ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        setTemplateOptions(items);
        if (items.length && !selectedTemplateId) {
          setSelectedTemplateId(items[0]!.id);
        }
      })
      .catch(() => {
        // Ignore — user gets a helpful empty select.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, projectId]);

  async function applyTemplate() {
    if (!selectedTemplateId) return;
    setBusy(true);
    setError(null);
    setTemplateInfo(null);
    try {
      const res = await apiClient.post<ApplyTemplateResponse>(
        `/sales/${saleId}/payment-plan/apply-template`,
        { templateId: selectedTemplateId },
      );
      const draft = (res as unknown as { data: ApplyTemplateResponse }).data;
      const chosen = templateOptions.find((t) => t.id === selectedTemplateId);
      setPlanName(chosen?.name ?? t("deals.plan.fromTemplate"));
      setManualRows(
        draft.rows.map((r) => ({
          name: r.label,
          amount: r.amount,
          dueDate: r.dueDate
            ? new Date(r.dueDate).toISOString().slice(0, 10)
            : "",
        })),
      );
      setTemplateApplied(chosen?.name ?? draft.template.name);
      const missing = draft.rows.filter((r) => !r.dueDate).length;
      if (missing > 0) {
        setTemplateInfo(
          t("deals.plan.templateMissingDates", { count: missing }),
        );
      } else {
        setTemplateInfo(t("deals.plan.templateApplied"));
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : t("deals.plan.applyFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  const manualTotal = manualRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const pctTotal = pctRows.reduce((s, r) => s + Number(r.percentage || 0), 0);
  const finalNum = Number(finalPrice);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      // TEMPLATE mode fills manualRows via `apply-template`; from the
      // server's perspective it is a plain MANUAL create.
      const effectiveTemplate = template === "TEMPLATE" ? "MANUAL" : template;
      const body: Record<string, unknown> = {
        planName,
        template: effectiveTemplate,
      };
      if (effectiveTemplate === "MANUAL") {
        body.manual = manualRows.map((r) => ({
          name: r.name,
          amount: r.amount,
          dueDate: r.dueDate,
        }));
      } else if (effectiveTemplate === "PERCENTAGE") {
        body.percentage = pctRows.map((r) => ({
          name: r.name,
          percentage: r.percentage,
          dueDate: r.dueDate,
        }));
      } else {
        body.equal = {
          installments: Number(equalCount),
          firstDueDate: equalFirstDue,
          monthlyGap: 1,
        };
      }
      await apiClient.post(`/sales/${saleId}/payment-plan`, body);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            {t("deals.plan.planName")}
          </label>
          <input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">{t("deals.plan.template")}</label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as Template)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          >
            <option value="EQUAL">{t("deals.plan.equal")}</option>
            <option value="PERCENTAGE">{t("deals.plan.percentage")}</option>
            <option value="MANUAL">{t("deals.plan.manual")}</option>
            <option value="TEMPLATE">{t("deals.plan.fromSaved")}</option>
          </select>
        </div>
      </div>

      {template === "TEMPLATE" ? (
        <div className="space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs text-[var(--color-foreground-muted)]">
                {t("deals.plan.template")}
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
              >
                <option value="">{t("deals.plan.pickTemplate")}</option>
                {templateOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                    {opt.isDefault ? " ★" : ""}
                    {opt.projectName ? ` · ${opt.projectName}` : ` · ${t("deals.plan.orgScope")}`}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={applyTemplate}
              loading={busy}
              disabled={!selectedTemplateId}
            >
              {t("deals.plan.applyTemplate")}
            </Button>
          </div>
          {templateOptions.length === 0 ? (
            <p className="text-xs text-[var(--color-foreground-muted)]">
              {t("deals.plan.noTemplatesLead")}{" "}
              <a
                href="/podesavanja/planovi-placanja"
                className="text-[var(--color-brand-700)] underline"
              >
                {t("deals.plan.settingsLink")}
              </a>
              .
            </p>
          ) : null}
          {templateApplied ? (
            <p className="text-xs text-emerald-700">
              {t("deals.plan.templateActive", { name: templateApplied })}
            </p>
          ) : null}
          {templateInfo ? (
            <p className="text-xs text-[var(--color-foreground-muted)]">
              {templateInfo}
            </p>
          ) : null}
          {templateApplied ? (
            <div className="space-y-2">
              {manualRows.map((row, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-4">
                  <input
                    value={row.name}
                    onChange={(e) =>
                      setManualRows((rs) =>
                        rs.map((r, i) =>
                          i === idx ? { ...r, name: e.target.value } : r,
                        ),
                      )
                    }
                    className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                    placeholder={t("common.name")}
                  />
                  <input
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) =>
                      setManualRows((rs) =>
                        rs.map((r, i) =>
                          i === idx ? { ...r, amount: e.target.value } : r,
                        ),
                      )
                    }
                    className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                    placeholder={t("deals.plan.amountPlaceholder", { currency })}
                  />
                  <DateInput
                    value={row.dueDate}
                    onChange={(dueDate) =>
                      setManualRows((rs) =>
                        rs.map((r, i) => (i === idx ? { ...r, dueDate } : r)),
                      )
                    }
                    className={
                      "h-10 " +
                      (row.dueDate ? "" : "border-amber-300 bg-amber-50")
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setManualRows((rs) => rs.filter((_, i) => i !== idx))
                    }
                  >
                    {t("common.remove")}
                  </Button>
                </div>
              ))}
              <p className="text-xs text-[var(--color-foreground-muted)]">
                {t("deals.plan.installmentSum", {
                  sum: manualTotal.toFixed(2),
                  currency,
                  needed: finalNum.toFixed(2),
                })}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {template === "EQUAL" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-[var(--color-foreground-muted)]">
              {t("deals.plan.installmentCount")}
            </label>
            <input
              type="number"
              min={1}
              value={equalCount}
              onChange={(e) => setEqualCount(Number(e.target.value))}
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-foreground-muted)]">
              {t("deals.plan.firstDue")}
            </label>
            <DateInput
              value={equalFirstDue}
              onChange={setEqualFirstDue}
              className="h-10"
            />
          </div>
          <p className="sm:col-span-2 text-xs text-[var(--color-foreground-muted)]">
            {t("deals.plan.equalHint", { amount: finalNum.toFixed(2), currency })}
          </p>
        </div>
      ) : null}

      {template === "PERCENTAGE" ? (
        <div className="space-y-2">
          {pctRows.map((row, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-4">
              <input
                value={row.name}
                onChange={(e) =>
                  setPctRows((rs) => rs.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                }
                className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                placeholder={t("common.name")}
              />
              <input
                inputMode="decimal"
                value={row.percentage}
                onChange={(e) =>
                  setPctRows((rs) =>
                    rs.map((r, i) => (i === idx ? { ...r, percentage: e.target.value } : r)),
                  )
                }
                className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                placeholder="%"
              />
              <DateInput
                value={row.dueDate}
                onChange={(dueDate) =>
                  setPctRows((rs) =>
                    rs.map((r, i) => (i === idx ? { ...r, dueDate } : r)),
                  )
                }
                className="h-10"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPctRows((rs) => rs.filter((_, i) => i !== idx))}
              >
                {t("common.remove")}
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setPctRows((rs) => [
                ...rs,
                {
                  name: t("deals.plan.installmentN", { n: rs.length + 1 }),
                  percentage: "0",
                  dueDate: new Date().toISOString().slice(0, 10),
                },
              ])
            }
          >
            {t("deals.plan.addInstallment")}
          </Button>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("deals.plan.pctSum", { sum: pctTotal.toFixed(3) })}
          </p>
        </div>
      ) : null}

      {template === "MANUAL" ? (
        <div className="space-y-2">
          {manualRows.map((row, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-4">
              <input
                value={row.name}
                onChange={(e) =>
                  setManualRows((rs) =>
                    rs.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                  )
                }
                className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                placeholder={t("common.name")}
              />
              <input
                inputMode="decimal"
                value={row.amount}
                onChange={(e) =>
                  setManualRows((rs) =>
                    rs.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)),
                  )
                }
                className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                placeholder={t("deals.plan.amountPlaceholder", { currency })}
              />
              <DateInput
                value={row.dueDate}
                onChange={(dueDate) =>
                  setManualRows((rs) =>
                    rs.map((r, i) => (i === idx ? { ...r, dueDate } : r)),
                  )
                }
                className="h-10"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setManualRows((rs) => rs.filter((_, i) => i !== idx))}
              >
                {t("common.remove")}
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setManualRows((rs) => [
                ...rs,
                {
                  name: t("deals.plan.installmentN", { n: rs.length + 1 }),
                  amount: "",
                  dueDate: new Date().toISOString().slice(0, 10),
                },
              ])
            }
          >
            {t("deals.plan.addInstallment")}
          </Button>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("deals.plan.installmentSum", {
              sum: manualTotal.toFixed(2),
              currency,
              needed: finalNum.toFixed(2),
            })}
          </p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button loading={busy} onClick={submit}>
          {t("deals.plan.savePlan")}
        </Button>
      </div>
    </div>
  );
}
