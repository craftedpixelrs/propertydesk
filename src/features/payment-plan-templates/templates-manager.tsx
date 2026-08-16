"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/components/app/i18n-provider";
import { ApiClientError, apiClient } from "@/lib/api-client";
import { EmptyState } from "@/components/app/empty-state";
import type { TranslateFn } from "@/lib/i18n";

type Anchor = "CONTRACT" | "HANDOVER" | "CUSTOM_OFFSET";

interface TemplateItem {
  id?: string;
  sequenceNumber: number;
  label: string;
  percentage: string;
  dueDateAnchor: Anchor;
  offsetDays: number;
}

export interface TemplateView {
  id: string;
  name: string;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  items: TemplateItem[];
}

interface ProjectOption {
  id: string;
  name: string;
}

interface Props {
  templates: TemplateView[];
  projects: ProjectOption[];
}

function anchorLabel(anchor: Anchor, t: TranslateFn): string {
  switch (anchor) {
    case "CONTRACT":
      return t("deals.planTemplates.anchor.CONTRACT");
    case "HANDOVER":
      return t("deals.planTemplates.anchor.HANDOVER");
    case "CUSTOM_OFFSET":
      return t("deals.planTemplates.anchor.CUSTOM_OFFSET");
  }
}

function emptyItem(seq: number): TemplateItem {
  return {
    sequenceNumber: seq,
    label: "",
    percentage: "0",
    dueDateAnchor: "CONTRACT",
    offsetDays: 0,
  };
}

export function PaymentPlanTemplatesManager({ templates, projects }: Props) {
  const t = useT();
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TemplateView | null>(null);
  const [filterProjectId, setFilterProjectId] = React.useState<string>("");

  const filtered = React.useMemo(() => {
    if (!filterProjectId) return templates;
    if (filterProjectId === "__org__") {
      return templates.filter((t) => t.projectId === null);
    }
    return templates.filter(
      (t) => t.projectId === filterProjectId || t.projectId === null,
    );
  }, [templates, filterProjectId]);

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(t: TemplateView) {
    setEditing(t);
    setEditorOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("deals.planTemplates.title")}</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("deals.planTemplates.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="h-9 rounded-md border border-[var(--color-border)] px-3 text-sm"
            aria-label={t("deals.planTemplates.filterProject")}
          >
            <option value="">{t("common.all")}</option>
            <option value="__org__">{t("deals.planTemplates.orgOnly")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 size-4" /> {t("deals.planTemplates.newTemplate")}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t("deals.planTemplates.emptyTitle")}
          description={t("deals.planTemplates.emptyHint")}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} onEdit={() => openEdit(t)} />
          ))}
        </div>
      )}

      {editorOpen ? (
        <TemplateEditor
          initial={editing}
          projects={projects}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
}: {
  template: TemplateView;
  onEdit: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const sum = template.items.reduce(
    (acc, it) => acc + Number(it.percentage || 0),
    0,
  );

  async function handleDelete() {
    if (!confirm(t("deals.planTemplates.deleteConfirm", { name: template.name }))) return;
    setBusy(true);
    try {
      await apiClient.delete(`/payment-plan-templates/${template.id}`);
      router.refresh();
    } catch (err) {
      alert(
        err instanceof ApiClientError ? err.message : t("errors.generic"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSetDefault() {
    setBusy(true);
    try {
      await apiClient.patch(`/payment-plan-templates/${template.id}`, {
        isDefault: true,
      });
      router.refresh();
    } catch (err) {
      alert(
        err instanceof ApiClientError ? err.message : t("errors.generic"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-sm">
            {template.name}
            {template.isDefault ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <Star className="mr-1 size-3" /> {t("deals.planTemplates.defaultBadge")}
              </span>
            ) : null}
          </CardTitle>
          <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
            {template.projectName
              ? t("deals.planTemplates.projectNamed", { name: template.projectName })
              : t("deals.planTemplates.orgAllProjects")}
            {template.description ? ` · ${template.description}` : ""}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1.5 text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)]"
            aria-label={t("common.edit")}
            title={t("common.edit")}
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded p-1.5 text-red-600 hover:bg-red-50"
            aria-label={t("common.delete")}
            title={t("common.delete")}
            disabled={busy}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <table className="w-full text-xs">
          <thead className="text-left text-[var(--color-foreground-muted)]">
            <tr>
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">{t("deals.planTemplates.colName")}</th>
              <th className="py-1 pr-2 text-right">%</th>
              <th className="py-1 pr-2">{t("deals.planTemplates.colAnchor")}</th>
              <th className="py-1 pr-2 text-right">{t("deals.planTemplates.colOffset")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {template.items.map((it) => (
              <tr key={it.sequenceNumber}>
                <td className="py-1 pr-2 text-[var(--color-foreground-muted)]">
                  {it.sequenceNumber}
                </td>
                <td className="py-1 pr-2 font-medium">{it.label}</td>
                <td className="py-1 pr-2 text-right tabular-nums">
                  {Number(it.percentage).toFixed(2)}
                </td>
                <td className="py-1 pr-2">{anchorLabel(it.dueDateAnchor, t)}</td>
                <td className="py-1 pr-2 text-right tabular-nums">
                  {it.offsetDays >= 0 ? `+${it.offsetDays}` : it.offsetDays}
                </td>
              </tr>
            ))}
            <tr className="text-[var(--color-foreground-muted)]">
              <td colSpan={2} className="py-1 pr-2 text-right">
                {t("deals.planTemplates.sum")}
              </td>
              <td className="py-1 pr-2 text-right font-medium tabular-nums">
                {sum.toFixed(2)}%
              </td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
        {!template.isDefault ? (
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={handleSetDefault}>
              <Star className="mr-1 size-3" /> {t("deals.planTemplates.setDefault")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TemplateEditor({
  initial,
  projects,
  onClose,
}: {
  initial: TemplateView | null;
  projects: ProjectOption[];
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(
    initial?.description ?? "",
  );
  const [projectId, setProjectId] = React.useState(initial?.projectId ?? "");
  const [isDefault, setIsDefault] = React.useState(initial?.isDefault ?? false);
  const [items, setItems] = React.useState<TemplateItem[]>(
    initial?.items?.length
      ? initial.items.map((it) => ({ ...it }))
      : [
          {
            sequenceNumber: 1,
            label: t("deals.planTemplates.defaultDeposit"),
            percentage: "10",
            dueDateAnchor: "CONTRACT",
            offsetDays: 0,
          },
          {
            sequenceNumber: 2,
            label: t("deals.planTemplates.defaultRemainder"),
            percentage: "90",
            dueDateAnchor: "HANDOVER",
            offsetDays: 0,
          },
        ],
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const totalPct = items.reduce((s, r) => s + Number(r.percentage || 0), 0);
  const totalOk = Math.abs(totalPct - 100) < 0.001;

  function setItem(idx: number, patch: Partial<TemplateItem>) {
    setItems((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setItems((rs) => [...rs, emptyItem(rs.length + 1)]);
  }

  function removeRow(idx: number) {
    setItems((rs) =>
      rs
        .filter((_, i) => i !== idx)
        .map((r, i) => ({ ...r, sequenceNumber: i + 1 })),
    );
  }

  async function submit() {
    if (!name.trim()) {
      setError(t("deals.planTemplates.nameRequired"));
      return;
    }
    if (!totalOk) {
      setError(t("deals.planTemplates.pctMustBe100", { sum: totalPct.toFixed(3) }));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        projectId: projectId || null,
        isDefault,
        items: items.map((it) => ({
          label: it.label.trim(),
          percentage: it.percentage,
          dueDateAnchor: it.dueDateAnchor,
          offsetDays: Number(it.offsetDays) || 0,
        })),
      };
      if (initial) {
        await apiClient.patch(`/payment-plan-templates/${initial.id}`, body);
      } else {
        await apiClient.post("/payment-plan-templates", body);
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : t("deals.planTemplates.saveFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-lg bg-[var(--color-surface)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h3 className="text-base font-semibold">
            {initial
              ? t("deals.planTemplates.editTitle", { name: initial.name })
              : t("deals.planTemplates.newTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)]"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-[var(--color-foreground-muted)]">
                {t("common.name")}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                placeholder={t("deals.planTemplates.namePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-foreground-muted)]">
                {t("units.columns.project")}
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
              >
                <option value="">{t("deals.planTemplates.allProjectsDefault")}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-[var(--color-foreground-muted)]">
                {t("deals.planTemplates.descriptionOptional")}
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              {t("deals.planTemplates.setDefaultScope")}
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t("deals.planTemplates.items")}</h4>
              <Button size="sm" variant="outline" onClick={addRow}>
                <Plus className="mr-1 size-3" /> {t("deals.planTemplates.addItem")}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="py-1 pr-2">#</th>
                    <th className="py-1 pr-2">{t("deals.planTemplates.colName")}</th>
                    <th className="py-1 pr-2 text-right">%</th>
                    <th className="py-1 pr-2">{t("deals.planTemplates.colAnchor")}</th>
                    <th className="py-1 pr-2 text-right">{t("deals.planTemplates.colOffset")}</th>
                    <th className="py-1 pr-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-1 pr-2 text-[var(--color-foreground-muted)]">
                        {idx + 1}
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          value={it.label}
                          onChange={(e) =>
                            setItem(idx, { label: e.target.value })
                          }
                          className="h-9 w-full rounded-md border border-[var(--color-border)] px-2 text-sm"
                          placeholder={t("deals.planTemplates.labelPlaceholder")}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          inputMode="decimal"
                          value={it.percentage}
                          onChange={(e) =>
                            setItem(idx, { percentage: e.target.value })
                          }
                          className="h-9 w-20 rounded-md border border-[var(--color-border)] px-2 text-right text-sm"
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <select
                          value={it.dueDateAnchor}
                          onChange={(e) =>
                            setItem(idx, {
                              dueDateAnchor: e.target.value as Anchor,
                            })
                          }
                          className="h-9 rounded-md border border-[var(--color-border)] px-2 text-sm"
                        >
                          <option value="CONTRACT">{t("deals.planTemplates.anchor.CONTRACT")}</option>
                          <option value="HANDOVER">{t("deals.planTemplates.anchor.HANDOVER")}</option>
                          <option value="CUSTOM_OFFSET">{t("deals.planTemplates.anchor.CUSTOM_OFFSET")}</option>
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          value={it.offsetDays}
                          onChange={(e) =>
                            setItem(idx, {
                              offsetDays: Number(e.target.value),
                            })
                          }
                          className="h-9 w-20 rounded-md border border-[var(--color-border)] px-2 text-right text-sm"
                        />
                      </td>
                      <td className="py-1 pr-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          title={t("common.remove")}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p
              className={
                "text-xs " +
                (totalOk
                  ? "text-emerald-600"
                  : "text-red-600")
              }
            >
              {totalOk
                ? t("deals.planTemplates.pctSumOk", { sum: totalPct.toFixed(3) })
                : t("deals.planTemplates.pctSumBad", { sum: totalPct.toFixed(3) })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={submit} loading={busy}>
            {initial ? t("common.saveChanges") : t("deals.planTemplates.createTemplate")}
          </Button>
        </div>
      </div>
    </div>
  );
}
