"use client";

import { useState } from "react";
import type {
  AgendaItemMajority,
  AgendaItemVoteKind,
  AssemblyPresenceMode,
  AssemblyType,
} from "@prisma/client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field, SelectField, TextareaField } from "./_shared/action-dialog";

const TYPES: AssemblyType[] = ["REGULAR", "EXTRAORDINARY", "WRITTEN_PROCEDURE"];
const VOTE_KINDS: AgendaItemVoteKind[] = ["DECISION", "INFORMATION", "ELECTION"];
const MAJORITIES: AgendaItemMajority[] = ["SIMPLE", "ABSOLUTE", "TWO_THIRDS"];

interface AgendaDraft {
  title: string;
  description: string;
  voteKind: AgendaItemVoteKind;
  majority: AgendaItemMajority;
}

export function NewAssemblyDialog({
  buildings,
  defaultBuildingId,
}: {
  buildings: Array<{ id: string; name: string }>;
  defaultBuildingId?: string;
}) {
  const t = useT();
  const [buildingId, setBuildingId] = useState(defaultBuildingId ?? buildings[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssemblyType>("REGULAR");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400_000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [agenda, setAgenda] = useState<AgendaDraft[]>([
    { title: "", description: "", voteKind: "DECISION", majority: "SIMPLE" },
  ]);

  function updateAgenda(idx: number, patch: Partial<AgendaDraft>) {
    setAgenda((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }
  function removeAgenda(idx: number) {
    setAgenda((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.newAssembly")}</Button>}
      title={t("manager.actions.newAssembly")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        const payload = {
          buildingId,
          title: title.trim(),
          description: description.trim() || null,
          type,
          scheduledAt: new Date(scheduledAt).toISOString(),
          location: location.trim() || null,
          agenda: agenda
            .filter((a) => a.title.trim())
            .map((a) => ({
              title: a.title.trim(),
              description: a.description.trim() || null,
              voteKind: a.voteKind,
              majority: a.majority,
            })),
        };
        await apiClient.post("/manager/assemblies", payload);
      }}
    >
      {() => (
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t("manager.assemblies.columns.building")}
              id="na-building"
              value={buildingId}
              options={buildings.map((b) => ({ value: b.id, label: b.name }))}
              onChange={(v) => v && setBuildingId(v)}
            />
            <SelectField
              label={t("manager.assemblies.columns.type")}
              id="na-type"
              value={type}
              options={TYPES.map((t2) => ({
                value: t2,
                label: t(`manager.assemblies.type.${t2}` as const),
              }))}
              onChange={(v) => v && setType(v)}
            />
            <Field
              label={t("manager.assembly.scheduledField")}
              id="na-sched"
              type="datetime-local"
              value={scheduledAt}
              onChange={setScheduledAt}
            />
            <Field
              label={t("manager.assembly.locationField")}
              id="na-loc"
              value={location}
              onChange={setLocation}
            />
          </div>
          <div className="mt-3">
            <Field
              label={t("manager.assemblies.columns.title")}
              id="na-title"
              value={title}
              required
              onChange={setTitle}
            />
          </div>
          <div className="mt-3">
            <TextareaField
              label={t("manager.building.fields.notes")}
              id="na-desc"
              value={description}
              onChange={setDescription}
            />
          </div>

          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-semibold">{t("manager.assembly.agendaTitle")}</h3>
            {agenda.map((item, idx) => (
              <div
                key={idx}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <Field
                    label={`${idx + 1}. ${t("manager.assembly.agendaItemTitle")}`}
                    id={`ag-${idx}-t`}
                    value={item.title}
                    onChange={(v) => updateAgenda(idx, { title: v })}
                  />
                  <SelectField
                    label={t("manager.assembly.voteKindField")}
                    id={`ag-${idx}-vk`}
                    value={item.voteKind}
                    options={VOTE_KINDS.map((v) => ({
                      value: v,
                      label: t(`manager.assembly.voteKind.${v}` as const),
                    }))}
                    onChange={(v) => v && updateAgenda(idx, { voteKind: v })}
                  />
                  <SelectField
                    label={t("manager.assembly.majorityField")}
                    id={`ag-${idx}-mj`}
                    value={item.majority}
                    options={MAJORITIES.map((m) => ({
                      value: m,
                      label: t(`manager.assembly.majority.${m}` as const),
                    }))}
                    onChange={(v) => v && updateAgenda(idx, { majority: v })}
                  />
                </div>
                <TextareaField
                  label={t("manager.assembly.agendaItemDesc")}
                  id={`ag-${idx}-d`}
                  value={item.description}
                  onChange={(v) => updateAgenda(idx, { description: v })}
                  rows={2}
                />
                {agenda.length > 1 ? (
                  <div className="mt-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAgenda(idx)}
                    >
                      {t("manager.actions.delete")}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setAgenda((p) => [
                  ...p,
                  { title: "", description: "", voteKind: "DECISION", majority: "SIMPLE" },
                ])
              }
            >
              {t("manager.actions.addAgendaItem")}
            </Button>
          </div>
        </div>
      )}
    </ActionDialog>
  );
}

export function SendInvitationsButton({ assemblyId }: { assemblyId: string }) {
  const t = useT();
  const [summary, setSummary] = useState<{ sent: number } | null>(null);
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.sendInvitations")}</Button>}
      title={t("manager.actions.sendInvitations")}
      submitLabel={t("manager.actions.sendInvitations")}
      onSubmit={async () => {
        const r = await apiClient.post<{ sent: number; skipped: number }>(
          `/manager/assemblies/${assemblyId}/invitations`,
        );
        setSummary(r);
        return false;
      }}
    >
      {() => (
        <>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("manager.assembly.inviteHint")}
          </p>
          {summary ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {t(
                "manager.assembly.sentInvites",
                summary as unknown as Record<string, string | number>,
              )}
            </p>
          ) : null}
        </>
      )}
    </ActionDialog>
  );
}

export function AssemblyStateButton({
  assemblyId,
  action,
  label,
  destructive,
  hint,
}: {
  assemblyId: string;
  action: "open-voting" | "close-voting" | "cancel";
  label: string;
  destructive?: boolean;
  hint?: string;
}) {
  const t = useT();
  return (
    <ActionDialog
      trigger={<Button variant={destructive ? "outline" : "primary"}>{label}</Button>}
      title={label}
      submitLabel={label}
      submitVariant={destructive ? "destructive" : "primary"}
      onSubmit={async () => {
        await apiClient.patch(`/manager/assemblies/${assemblyId}`, { action });
      }}
    >
      {() => <p className="text-sm">{hint ?? t("manager.common.confirmDelete")}</p>}
    </ActionDialog>
  );
}

export function CastVoteDialog({
  agendaItemId,
  units,
}: {
  agendaItemId: string;
  units: Array<{ id: string; code: string }>;
}) {
  const t = useT();
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [choice, setChoice] = useState<"YES" | "NO" | "ABSTAIN">("YES");
  const [notes, setNotes] = useState("");
  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          {t("manager.actions.castVote")}
        </Button>
      }
      title={t("manager.assembly.castForUnit")}
      submitLabel={t("manager.actions.castVote")}
      onSubmit={async () => {
        await apiClient.post(`/manager/agenda/${agendaItemId}/vote`, {
          unitId,
          choice,
          notes: notes.trim() || null,
        });
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.assembly.unitField")}
            id="cv-unit"
            value={unitId}
            options={units.map((u) => ({ value: u.id, label: u.code }))}
            onChange={(v) => v && setUnitId(v)}
          />
          <SelectField
            label="Glas"
            id="cv-choice"
            value={choice}
            options={[
              { value: "YES", label: t("manager.assembly.choiceYes") },
              { value: "NO", label: t("manager.assembly.choiceNo") },
              { value: "ABSTAIN", label: t("manager.assembly.choiceAbstain") },
            ]}
            onChange={(v) => v && setChoice(v)}
          />
          <TextareaField
            label={t("manager.payments.notesField")}
            id="cv-notes"
            value={notes}
            onChange={setNotes}
          />
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("manager.assembly.oneVoteHint")}
          </p>
        </>
      )}
    </ActionDialog>
  );
}

export function OpenVotingDialog({ assemblyId }: { assemblyId: string }) {
  const t = useT();
  const [closesAt, setClosesAt] = useState("");
  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.openVoting")}</Button>}
      title={t("manager.actions.openVoting")}
      submitLabel={t("manager.actions.openVoting")}
      onSubmit={async () => {
        await apiClient.patch(`/manager/assemblies/${assemblyId}`, {
          action: "open-voting",
          votingClosesAt: closesAt ? new Date(closesAt).toISOString() : null,
        });
      }}
    >
      {() => (
        <>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("manager.assembly.openVotingHint")}
          </p>
          <Field
            label={t("manager.assembly.votingUntil")}
            id="ov-close"
            type="datetime-local"
            value={closesAt}
            onChange={setClosesAt}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function AddAgendaItemDialog({ assemblyId }: { assemblyId: string }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [voteKind, setVoteKind] = useState<AgendaItemVoteKind>("DECISION");
  const [majority, setMajority] = useState<AgendaItemMajority>("SIMPLE");
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.addAgendaItem")}</Button>}
      title={t("manager.actions.addAgendaItem")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post(`/manager/assemblies/${assemblyId}/items`, {
          title: title.trim(),
          description: description.trim() || null,
          voteKind,
          majority,
        });
        setTitle("");
        setDescription("");
      }}
    >
      {() => (
        <>
          <Field
            label={t("manager.assembly.agendaItemTitle")}
            id="ai-title"
            required
            value={title}
            onChange={setTitle}
          />
          <SelectField
            label={t("manager.assembly.voteKindField")}
            id="ai-kind"
            value={voteKind}
            options={VOTE_KINDS.map((kind) => ({
              value: kind,
              label: t(`manager.assembly.voteKind.${kind}`),
            }))}
            onChange={(value) => value && setVoteKind(value)}
          />
          {voteKind === "INFORMATION" ? null : (
            <SelectField
              label={t("manager.assembly.majorityField")}
              id="ai-maj"
              value={majority}
              options={MAJORITIES.map((item) => ({
                value: item,
                label: t(`manager.assembly.majority.${item}`),
              }))}
              onChange={(value) => value && setMajority(value)}
            />
          )}
          <TextareaField
            label={t("manager.assembly.agendaItemDesc")}
            id="ai-desc"
            value={description}
            onChange={setDescription}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function RemoveAgendaItemButton({
  assemblyId,
  itemId,
}: {
  assemblyId: string;
  itemId: string;
}) {
  const t = useT();
  return (
    <ActionDialog
      trigger={
        <Button type="button" variant="ghost" size="sm">
          {t("manager.actions.delete")}
        </Button>
      }
      title={t("manager.actions.delete")}
      submitLabel={t("manager.actions.delete")}
      submitVariant="destructive"
      onSubmit={async () => {
        await apiClient.delete(`/manager/assemblies/${assemblyId}/items/${itemId}`);
      }}
    >
      {() => <p className="text-sm">{t("manager.assembly.removeItemHint")}</p>}
    </ActionDialog>
  );
}

export function MarkPresentDialog({
  assemblyId,
  units,
}: {
  assemblyId: string;
  units: Array<{ id: string; code: string }>;
}) {
  const t = useT();
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [mode, setMode] = useState<AssemblyPresenceMode>("IN_PERSON");
  const [note, setNote] = useState("");
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.assembly.markPresent")}</Button>}
      title={t("manager.assembly.markPresent")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post(`/manager/assemblies/${assemblyId}/attendance`, {
          unitId,
          mode,
          note: note.trim() || null,
        });
        setNote("");
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.assembly.unitField")}
            id="at-unit"
            value={unitId}
            options={units.map((unit) => ({ value: unit.id, label: unit.code }))}
            onChange={(value) => value && setUnitId(value)}
          />
          <SelectField
            label={t("manager.assembly.presenceMode")}
            id="at-mode"
            value={mode}
            options={(["IN_PERSON", "PROXY"] as const).map((item) => ({
              value: item,
              label: t(`manager.assembly.attendanceMode.${item}`),
            }))}
            onChange={(value) => value && setMode(value)}
          />
          <TextareaField
            label={t("manager.payments.notesField")}
            id="at-note"
            value={note}
            onChange={setNote}
          />
        </>
      )}
    </ActionDialog>
  );
}
