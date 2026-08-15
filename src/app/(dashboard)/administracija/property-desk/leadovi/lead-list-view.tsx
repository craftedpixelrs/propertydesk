"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/formatters/date";

/**
 * Property Desk lead list — checkbox selection + bulk action bar, plus the
 * "Novi lead" dialog trigger. The heavy filter form and pagination stay on
 * the server component; this widget renders only the selectable table body
 * and its accompanying controls.
 */

const STAGE_LABEL: Record<string, string> = {
  NEW: "Novi",
  CONTACTED: "Kontaktirano",
  QUALIFIED: "Kvalifikovano",
  DEMO: "Demo",
  PROPOSAL: "Ponuda",
  WON: "Konvertovano",
  LOST: "Izgubljeno",
  NURTURING: "Nurturing",
};

const AUDIENCE_LABEL: Record<string, string> = {
  INVESTOR: "Investitor",
  AGENCY: "Agencija",
  OTHER: "Ostalo",
};

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

const LEVEL_LABEL: Record<string, string> = {
  SOURCING: "L1",
  CLOSING: "L2",
  OPERATIONS: "L3",
  ARCHIVED: "ARC",
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

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Niska",
  NORMAL: "Normalna",
  HIGH: "Visoka",
  URGENT: "Hitno",
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

const TEMPERATURE_LABEL: Record<string, string> = {
  COLD: "Cold",
  WARM: "Warm",
  HOT: "Hot",
};

const TEMPERATURE_TONE: Record<
  string,
  "neutral" | "brand" | "info" | "success" | "warning" | "danger"
> = {
  COLD: "neutral",
  WARM: "warning",
  HOT: "danger",
};

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
        `Ažurirano: ${result.updated}${
          result.skipped ? ` · Preskočeno (van scope-a): ${result.skipped}` : ""
        }`,
      );
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (err) {
      setError(errorMessage(err));
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
      setOk("Lead je tvoj.");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(errorMessage(err));
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
            + Novi lead
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
                        aria-label="Selektuj sve"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    ) : null}
                  </th>
                  <th className="px-4 py-2 text-left">Lead</th>
                  <th className="px-4 py-2 text-left">Level</th>
                  <th className="px-4 py-2 text-left">Faza</th>
                  <th className="px-4 py-2 text-left">Prioritet</th>
                  <th className="px-4 py-2 text-left">Temperatura</th>
                  <th className="px-4 py-2 text-left">Score</th>
                  <th className="px-4 py-2 text-left">Publika</th>
                  <th className="px-4 py-2 text-left">Dodeljeno</th>
                  <th className="px-4 py-2 text-left">Follow-up</th>
                  <th className="px-4 py-2 text-left">Kreirano</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-6 text-center text-[var(--color-foreground-muted)]"
                    >
                      Nema lead-ova za ove filtere.
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
                              aria-label={`Selektuj ${lead.email}`}
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
                            {LEVEL_LABEL[lead.level] ?? lead.level}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={STAGE_TONE[lead.stage] ?? "neutral"}>
                            {STAGE_LABEL[lead.stage] ?? lead.stage}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={PRIORITY_TONE[lead.priority] ?? "neutral"}>
                            {PRIORITY_LABEL[lead.priority] ?? lead.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={TEMPERATURE_TONE[lead.temperature] ?? "neutral"}>
                            {TEMPERATURE_LABEL[lead.temperature] ?? lead.temperature}
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
                            {AUDIENCE_LABEL[lead.audience] ?? lead.audience}
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
                              Uzmi
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                          {lead.nextFollowUpAt
                            ? formatDateTime(new Date(lead.nextFollowUpAt))
                            : "—"}
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
  const [assignee, setAssignee] = useState<string>("");
  const [stage, setStage] = useState<string>("");
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-2 text-sm">
      <strong className="mr-2">{count} selektovano</strong>
      {canReassign ? (
        <>
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="h-8 rounded-md border border-[var(--color-border)] bg-white px-2 text-xs"
            disabled={busy}
          >
            <option value="">— dodeli članu tima —</option>
            <option value="__unassign__">Ukloni vlasnika</option>
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
            Dodeli
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
            <option value="">— promeni fazu —</option>
            {Object.entries(STAGE_LABEL)
              .filter(([v]) => v !== "LOST")
              .map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
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
                ? "Bulk stage change (forward + reopen dozvoljeno)"
                : "Bulk stage change — samo forward tranzicije; ostalo se preskače"
            }
          >
            Postavi fazu
          </Button>
          {!canReopen ? (
            <span className="text-xs italic text-[var(--color-foreground-muted)]">
              (forward-only; ne-forward će biti preskočeni)
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => setLostOpen(true)}
          >
            Označi izgubljene
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
        Otkaži selekciju
      </Button>

      {lostOpen ? (
        <div className="ml-auto flex w-full items-center gap-2 border-t border-[var(--color-brand-200)] pt-2">
          <input
            type="text"
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            placeholder="Razlog gubitka (opciono)"
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
            Potvrdi
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setLostOpen(false)}
          >
            Otkaži
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
        setErr("Greška pri kreiranju lead-a.");
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
          <h3 className="text-base font-semibold">Novi marketing lead</h3>
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
                    Otvori postojeći lead →
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Email *</span>
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
              <span className="mb-1 block text-xs font-medium">Ime</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Prezime</span>
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
              <span className="mb-1 block text-xs font-medium">Telefon</span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Grad</span>
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
              <span className="mb-1 block text-xs font-medium">Publika</span>
              <select
                value={audience}
                onChange={(e) =>
                  setAudience(e.target.value as typeof audience)
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                <option value="INVESTOR">Investitor</option>
                <option value="AGENCY">Agencija</option>
                <option value="OTHER">Ostalo</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Izvor</span>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="npr. manual, referral, event"
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
            </label>
          </div>
          {canReassign ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Dodeli članu tima
              </span>
              <select
                value={assigneeUserId}
                onChange={(e) => setAssigneeUserId(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                <option value="">— dodeli meni (podrazumevano) —</option>
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
                Naziv firme
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
              <span className="mb-1 block text-xs font-medium">Website</span>
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
              <span className="mb-1 block text-xs font-medium">Budžet</span>
              <select
                value={budgetTier}
                onChange={(e) =>
                  setBudgetTier(e.target.value as typeof budgetTier)
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                <option value="UNKNOWN">Nepoznato</option>
                <option value="STARTER">Starter</option>
                <option value="GROWTH">Growth</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Timeline</span>
              <select
                value={timelineHorizon}
                onChange={(e) =>
                  setTimelineHorizon(e.target.value as typeof timelineHorizon)
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                <option value="UNDECIDED">Neodređeno</option>
                <option value="WITHIN_30D">≤ 30 dana</option>
                <option value="WITHIN_90D">30–90 dana</option>
                <option value="LATER">Kasnije</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Prioritet</span>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as typeof priority)
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                <option value="LOW">Nizak</option>
                <option value="NORMAL">Normalan</option>
                <option value="HIGH">Visok</option>
                <option value="URGENT">Hitno</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Temperatura
              </span>
              <select
                value={temperature}
                onChange={(e) =>
                  setTemperature(e.target.value as typeof temperature)
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                <option value="COLD">Cold</option>
                <option value="WARM">Warm</option>
                <option value="HOT">Hot</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium">Beleška</span>
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
            Otkaži
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={busy || !email.trim()}
            loading={busy}
          >
            Kreiraj
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

function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return "Došlo je do greške.";
}
