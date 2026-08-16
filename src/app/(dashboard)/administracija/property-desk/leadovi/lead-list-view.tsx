"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/formatters/date";
import { useT } from "@/components/app/i18n-provider";
import type { TranslateFn, TranslationKey } from "@/lib/i18n";

/**
 * Property Desk lead list — checkbox selection + bulk action bar, plus the
 * "Novi lead" dialog trigger. The heavy filter form and pagination stay on
 * the server component; this widget renders only the selectable table body
 * and its accompanying controls.
 */

const STAGE_TONE: Record<
  string,
  "neutral" | "brand" | "info" | "success" | "warning" | "danger" | "violet"
> = {
  NEW: "brand",
  CONTACTED: "info",
  QUALIFIED: "success",
  DEMO: "violet",
  PROPOSAL: "warning",
  WON: "success",
  LOST: "danger",
  NURTURING: "neutral",
};

const LEVEL_TONE: Record<
  string,
  "neutral" | "brand" | "info" | "success" | "warning" | "danger"
> = {
  SOURCING: "brand",
  CLOSING: "info",
  OPERATIONS: "success",
  ARCHIVED: "neutral",
};

const PRIORITY_TONE: Record<
  string,
  "neutral" | "brand" | "info" | "success" | "warning" | "danger"
> = {
  LOW: "neutral",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const TEMPERATURE_TONE: Record<
  string,
  "neutral" | "brand" | "info" | "success" | "warning" | "danger"
> = {
  COLD: "neutral",
  WARM: "warning",
  HOT: "danger",
};

const STAGES = ["NEW","CONTACTED","QUALIFIED","DEMO","PROPOSAL","WON","LOST","NURTURING"] as const;
const AUDIENCES = ["INVESTOR","AGENCY","OTHER"] as const;
const BUDGETS = ["UNKNOWN","STARTER","GROWTH","ENTERPRISE"] as const;
const TIMELINES = ["UNDECIDED","WITHIN_30D","WITHIN_90D","LATER"] as const;
const PRIORITIES = ["LOW","NORMAL","HIGH","URGENT"] as const;
const TEMPERATURES = ["COLD","WARM","HOT"] as const;

function enumLabel(t: TranslateFn, ns: string, value: string) {
  const key = `admin.pd.${ns}.${value}` as TranslationKey;
  const out = t(key);
  return out === key ? value : out;
}


export interface LeadRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  city: string | null;
  audience: string;
  stage: string;
  level: string;
  priority: string;
  temperature: string;
  leadScore: number;
  companyName: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  source: string | null;
  assignedTo: { id: string; name: string } | null;
}

interface Props {
  items: LeadRow[];
  teamMembers: Array<{ userId: string; name: string }>;
  canCreate: boolean;
  canBulk: boolean;
  canReassign: boolean;
  canUpdateStage: boolean;
  canReopen: boolean;
  currentUserId: string;
}

export function LeadListView({
  items,
  teamMembers,
  canCreate,
  canBulk,
  canReassign,
  canUpdateStage,
  canReopen,
  currentUserId,
}: Props) {
  const router = useRouter();
  const t = useT();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const allSelected = useMemo(
    () => items.length > 0 && items.every((it) => selected.has(it.id)),
    [items, selected],
  );

  function toggleAll(next: boolean) {
    if (next) setSelected(new Set(items.map((it) => it.id)));
    else setSelected(new Set());
  }

  function toggleOne(id: string, next: boolean) {
    setSelected((prev) => {
      const clone = new Set(prev);
      if (next) clone.add(id);
      else clone.delete(id);
      return clone;
    });
  }

  async function bulk(payload: Record<string, unknown>) {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const result = await apiClient.post<{
        updated: number;
        skipped: number;
      }>("/platform/property-desk/leads/bulk", {
        ids: Array.from(selected),
        action: payload,
      });
      setOk(
        t("admin.pdList.bulkUpdated", { updated: result.updated }) +
          (result.skipped
            ? t("admin.pdList.bulkSkipped", { skipped: result.skipped })
            : ""),
      );
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function claimLead(id: string) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await apiClient.patch(`/platform/property-desk/leads/${id}`, {
        assignedToUserId: currentUserId,
      });
      setOk(t("admin.pdList.claimed"));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div
          className="rounded-md border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {ok ? (
        <div
          className="rounded-md border border-[var(--color-success)] bg-[var(--color-success-bg)] p-3 text-sm text-[var(--color-success)]"
          role="status"
        >
          {ok}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {canCreate ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setShowNew(true)}
            disabled={busy}
          >
            {t("admin.pdList.newLead")}
          </Button>
        ) : null}
        {selected.size > 0 && canBulk ? (
          <BulkBar
            count={selected.size}
            teamMembers={teamMembers}
            canReassign={canReassign}
            canUpdateStage={canUpdateStage}
            canReopen={canReopen}
            busy={busy}
            onAssign={(userId) =>
              bulk({ kind: "assign", assignedToUserId: userId })
            }
            onStage={(stage) => bulk({ kind: "stage", stage })}
            onLost={(reason) => bulk({ kind: "lost", reason })}
            onClear={() => setSelected(new Set())}
          />
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-inset)] text-xs uppercase">
                <tr>
                  <th className="w-10 px-3 py-2 text-center">
                    {canBulk ? (
                      <input
                        type="checkbox"
                        aria-label={t("admin.pdList.selectAll")}
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    ) : null}
                  </th>
                  <th className="px-4 py-2 text-left">{t("admin.pdList.colLead")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.pdList.colLevel")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.pdList.colStage")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.pdList.colPriority")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.pdList.colTemp")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.pdList.colScore")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.pdList.colAudience")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.pdList.colAssigned")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.pdList.colFollowUp")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.created")}</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-6 text-center text-[var(--color-foreground-muted)]"
                    >
                      {t("admin.pdList.empty")}
                    </td>
                  </tr>
                ) : (
                  items.map((lead) => {
                    const fullName = [lead.firstName, lead.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim();
                    const isSelected = selected.has(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        className={`border-b border-[var(--color-border)] align-top hover:bg-[var(--color-surface-inset)] ${
                          isSelected ? "bg-[var(--color-brand-50)]" : ""
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          {canBulk ? (
                            <input
                              type="checkbox"
                              aria-label={t("admin.pdList.selectOne", { email: lead.email })}
                              checked={isSelected}
                              onChange={(e) =>
                                toggleOne(lead.id, e.target.checked)
                              }
                            />
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/administracija/property-desk/leadovi/${lead.id}`}
                            className="font-medium text-[var(--color-brand-700)] hover:underline"
                          >
                            {fullName || lead.email}
                          </Link>
                          <div className="text-xs text-[var(--color-foreground-muted)]">
                            {lead.email}
                            {lead.phone ? ` · ${lead.phone}` : ""}
                            {lead.city ? ` · ${lead.city}` : ""}
                          </div>
                          {lead.companyName ? (
                            <div className="text-xs text-[var(--color-foreground-muted)]">
                              {lead.companyName}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={LEVEL_TONE[lead.level] ?? "neutral"}>
                            {enumLabel(t, "levelShort", lead.level)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={STAGE_TONE[lead.stage] ?? "neutral"}>
                            {enumLabel(t, "stage", lead.stage)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={PRIORITY_TONE[lead.priority] ?? "neutral"}>
                            {enumLabel(t, "priorityShort", lead.priority)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={TEMPERATURE_TONE[lead.temperature] ?? "neutral"}>
                            {enumLabel(t, "temperature", lead.temperature)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-[var(--color-surface-inset)]">
                              <div
                                className="h-full bg-[var(--color-brand-600)]"
                                style={{
                                  width: `${Math.min(100, lead.leadScore)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {lead.leadScore}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone="neutral">
                            {enumLabel(t, "audience", lead.audience)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                          {lead.assignedTo ? (
                            lead.assignedTo.name
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void claimLead(lead.id);
                              }}
                              disabled={busy}
                            >
                              {t("admin.pdList.claim")}
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                          {lead.nextFollowUpAt
                            ? formatDateTime(new Date(lead.nextFollowUpAt))
                            : t("admin.dash")}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                          {formatDateTime(new Date(lead.createdAt))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showNew ? (
        <NewLeadDialog
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            startTransition(() => router.refresh());
          }}
          teamMembers={teamMembers}
          canReassign={canReassign}
        />
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Bulk action bar
// -----------------------------------------------------------------------------

interface BulkBarProps {
  count: number;
  teamMembers: Array<{ userId: string; name: string }>;
  canReassign: boolean;
  canUpdateStage: boolean;
  canReopen: boolean;
  busy: boolean;
  onAssign(userId: string | null): void;
  onStage(stage: string): void;
  onLost(reason: string | null): void;
  onClear(): void;
}

function BulkBar({
  count,
  teamMembers,
  canReassign,
  canUpdateStage,
  canReopen,
  busy,
  onAssign,
  onStage,
  onLost,
  onClear,
}: BulkBarProps) {
  const t = useT();
  const [assignee, setAssignee] = useState<string>("");
  const [stage, setStage] = useState<string>("");
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-2 text-sm">
      <strong className="mr-2">{t("admin.selectedCount", { count })}</strong>
      {canReassign ? (
        <>
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="h-8 rounded-md border border-[var(--color-border)] bg-white px-2 text-xs"
            disabled={busy}
          >
            <option value="">{t("admin.pdList.assignMember")}</option>
            <option value="__unassign__">{t("admin.pdList.unassign")}</option>
            {teamMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !assignee}
            onClick={() =>
              onAssign(assignee === "__unassign__" ? null : assignee || null)
            }
          >
            {t("admin.pdList.assign")}
          </Button>
        </>
      ) : null}
      {canUpdateStage ? (
        <>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="h-8 rounded-md border border-[var(--color-border)] bg-white px-2 text-xs"
            disabled={busy}
          >
            <option value="">{t("admin.pdList.changeStage")}</option>
            {STAGES.filter((v) => v !== "LOST").map((v) => (
                <option key={v} value={v}>
                  {enumLabel(t, "stage", v)}
                </option>
              ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !stage}
            onClick={() => onStage(stage)}
            title={
              canReopen
                ? t("admin.pdList.bulkForwardTitle")
                : t("admin.pdList.bulkForwardOnly")
            }
          >
            {t("admin.pdList.setStage")}
          </Button>
          {!canReopen ? (
            <span className="text-xs italic text-[var(--color-foreground-muted)]">
              {t("admin.pdList.forwardOnlyHint")}
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => setLostOpen(true)}
          >
            {t("admin.pdList.markLost")}
          </Button>
        </>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={onClear}
      >
        {t("admin.pdList.clearSelection")}
      </Button>

      {lostOpen ? (
        <div className="ml-auto flex w-full items-center gap-2 border-t border-[var(--color-brand-200)] pt-2">
          <input
            type="text"
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            placeholder={t("admin.pdList.lostReasonPlaceholder")}
            className="h-8 flex-1 rounded-md border border-[var(--color-border)] bg-white px-2 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => {
              onLost(lostReason.trim() || null);
              setLostReason("");
              setLostOpen(false);
            }}
          >
            {t("common.confirm")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setLostOpen(false)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// New lead dialog
// -----------------------------------------------------------------------------

interface NewLeadDialogProps {
  onClose(): void;
  onCreated(): void;
  teamMembers: Array<{ userId: string; name: string }>;
  canReassign: boolean;
}

function NewLeadDialog({
  onClose,
  onCreated,
  teamMembers,
  canReassign,
}: NewLeadDialogProps) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [audience, setAudience] = useState<"INVESTOR" | "AGENCY" | "OTHER">(
    "OTHER",
  );
  const [source, setSource] = useState("manual");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");
  const [note, setNote] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [budgetTier, setBudgetTier] = useState<
    "STARTER" | "GROWTH" | "ENTERPRISE" | "UNKNOWN"
  >("UNKNOWN");
  const [timelineHorizon, setTimelineHorizon] = useState<
    "WITHIN_30D" | "WITHIN_90D" | "LATER" | "UNDECIDED"
  >("UNDECIDED");
  const [priority, setPriority] = useState<
    "LOW" | "NORMAL" | "HIGH" | "URGENT"
  >("NORMAL");
  const [temperature, setTemperature] = useState<"COLD" | "WARM" | "HOT">(
    "COLD",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    setDuplicateId(null);
    try {
      await apiClient.post("/platform/property-desk/leads", {
        email: email.trim(),
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        audience,
        source: source.trim() || "manual",
        note: note.trim() || null,
        assignedToUserId: canReassign
          ? assigneeUserId || undefined
          : undefined,
        companyName: companyName.trim() || null,
        companyWebsite: companyWebsite.trim() || null,
        budgetTier,
        timelineHorizon,
        priority,
        temperature,
      });
      onCreated();
    } catch (e) {
      if (e instanceof ApiClientError) {
        setErr(e.message);
        const existingId = extractExistingLeadId(e);
        if (existingId) setDuplicateId(existingId);
      } else {
        setErr(t("admin.createFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h3 className="text-base font-semibold">{t("admin.pdList.newTitle")}</h3>
          <button
            type="button"
            className="text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4 text-sm">
          {err ? (
            <div
              className="rounded-md border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-2 text-xs text-[var(--color-danger)]"
              role="alert"
            >
              {err}
              {duplicateId ? (
                <>
                  {" "}
                  <Link
                    href={`/administracija/property-desk/leadovi/${duplicateId}`}
                    className="underline"
                  >
                    {t("admin.pdList.openExisting")}
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs font-medium">{t("admin.pdList.emailRequired")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
              disabled={busy}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("common.name")}</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("admin.pdList.lastName")}</span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("common.phone")}</span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.city")}</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("admin.pdList.audience")}</span>
              <select
                value={audience}
                onChange={(e) =>
                  setAudience(e.target.value as typeof audience)
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                {AUDIENCES.map((v) => (
                  <option key={v} value={v}>{enumLabel(t, "audience", v)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("admin.pdList.source")}</span>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={t("admin.pdList.sourcePlaceholder")}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
            </label>
          </div>
          {canReassign ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                {t("admin.pdList.assignTo")}
              </span>
              <select
                value={assigneeUserId}
                onChange={(e) => setAssigneeUserId(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                <option value="">{t("admin.pdList.assignToMe")}</option>
                {teamMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                {t("admin.pdList.companyName")}
              </span>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("admin.pdList.website")}</span>
              <input
                type="text"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                placeholder="https://…"
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("admin.pdList.budget")}</span>
              <select
                value={budgetTier}
                onChange={(e) =>
                  setBudgetTier(e.target.value as typeof budgetTier)
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                {BUDGETS.map((v) => (
                  <option key={v} value={v}>{enumLabel(t, "budget", v)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("admin.pdList.timeline")}</span>
              <select
                value={timelineHorizon}
                onChange={(e) =>
                  setTimelineHorizon(e.target.value as typeof timelineHorizon)
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                {TIMELINES.map((v) => (
                  <option key={v} value={v}>{enumLabel(t, "timeline", v)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("admin.pdList.priority")}</span>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as typeof priority)
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                {PRIORITIES.map((v) => (
                  <option key={v} value={v}>{enumLabel(t, "priority", v)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                {t("admin.pdList.temperature")}
              </span>
              <select
                value={temperature}
                onChange={(e) =>
                  setTemperature(e.target.value as typeof temperature)
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                {TEMPERATURES.map((v) => (
                  <option key={v} value={v}>{enumLabel(t, "temperature", v)}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium">{t("admin.pdList.note")}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm"
              disabled={busy}
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={busy || !email.trim()}
            loading={busy}
          >
            {t("common.create")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function extractExistingLeadId(err: ApiClientError): string | null {
  // The server encodes the existing lead id in the CONFLICT message as
  // "... (id=abc123)" so the UI can offer a deep-link without another API
  // roundtrip. Format is stable — see marketing-leads.service.ts.
  const match = /\(id=([a-zA-Z0-9]+)\)/.exec(err.message);
  return match?.[1] ?? null;
}

function errorMessage(err: unknown, t: TranslateFn): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return t("admin.genericError");
}
