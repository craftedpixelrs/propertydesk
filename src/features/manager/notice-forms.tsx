"use client";

import { useMemo, useState } from "react";
import type {
  BuildingNoticeAudience,
  BuildingNoticeChannel,
  ManagedUnitType,
} from "@prisma/client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field, SelectField, TextareaField } from "./_shared/action-dialog";

const CHANNELS: BuildingNoticeChannel[] = ["PORTAL_ONLY", "PORTAL_AND_EMAIL", "EMAIL_ONLY"];
const AUDIENCES: BuildingNoticeAudience[] = [
  "ALL",
  "BY_ENTRANCE",
  "BY_UNIT_TYPE",
  "SPECIFIC_UNITS",
];
const UNIT_TYPES: ManagedUnitType[] = [
  "APARTMENT",
  "COMMERCIAL",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "OFFICE",
  "OTHER",
];

export interface NoticeFormBuilding {
  id: string;
  name: string;
}

export interface NoticeFormEntrance {
  id: string;
  code: string;
  label: string | null;
  buildingId: string;
}

export interface NoticeFormUnit {
  id: string;
  code: string;
  buildingId: string;
  entranceId: string | null;
  type: ManagedUnitType;
}

export function NewNoticeDialog({
  buildings,
  entrances,
  units,
  defaultBuildingId,
}: {
  buildings: NoticeFormBuilding[];
  entrances: NoticeFormEntrance[];
  units: NoticeFormUnit[];
  defaultBuildingId?: string;
}) {
  const t = useT();
  const [buildingId, setBuildingId] = useState(defaultBuildingId ?? buildings[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<BuildingNoticeChannel>("PORTAL_AND_EMAIL");
  const [audience, setAudience] = useState<BuildingNoticeAudience>("ALL");
  const [entranceIds, setEntranceIds] = useState<string[]>([]);
  const [unitTypes, setUnitTypes] = useState<ManagedUnitType[]>([]);
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [publishNow, setPublishNow] = useState(true);

  const buildingEntrances = useMemo(
    () => entrances.filter((e) => e.buildingId === buildingId),
    [entrances, buildingId],
  );
  const buildingUnits = useMemo(
    () => units.filter((u) => u.buildingId === buildingId),
    [units, buildingId],
  );

  function toggle<T>(current: T[], value: T): T[] {
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  }

  return (
    <ActionDialog
      trigger={<Button>{t("manager.notices.newButton")}</Button>}
      title={t("manager.notices.newButton")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        // Trim empty audience params so the server records exactly what
        // the operator chose — otherwise an ALL notice would carry a
        // stale `unitIds: []` that confuses the audit trail.
        const audienceParams: {
          entranceIds?: string[];
          unitTypes?: ManagedUnitType[];
          unitIds?: string[];
        } = {};
        if (audience === "BY_ENTRANCE") {
          if (entranceIds.length === 0) throw new Error("Izaberite bar jedan ulaz.");
          audienceParams.entranceIds = entranceIds;
        } else if (audience === "BY_UNIT_TYPE") {
          if (unitTypes.length === 0) throw new Error("Izaberite bar jedan tip posebnog dela.");
          audienceParams.unitTypes = unitTypes;
        } else if (audience === "SPECIFIC_UNITS") {
          if (unitIds.length === 0) throw new Error("Izaberite bar jedan posebni deo.");
          audienceParams.unitIds = unitIds;
        }
        await apiClient.post("/manager/notices", {
          buildingId,
          title: title.trim(),
          body: body.trim(),
          channel,
          audience,
          audienceParams,
          publishNow,
        });
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.notices.columns.building")}
            id="nn-building"
            value={buildingId}
            options={buildings.map((b) => ({ value: b.id, label: b.name }))}
            onChange={(v) => {
              if (v) {
                setBuildingId(v);
                setEntranceIds([]);
                setUnitIds([]);
              }
            }}
          />
          <Field
            label={t("manager.notices.titleField")}
            id="nn-title"
            value={title}
            required
            onChange={setTitle}
          />
          <TextareaField
            label={t("manager.notices.bodyField")}
            id="nn-body"
            value={body}
            required
            rows={6}
            onChange={setBody}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t("manager.notices.channelField")}
              id="nn-ch"
              value={channel}
              options={CHANNELS.map((c) => ({
                value: c,
                label: t(`manager.notices.channels.${c}` as const),
              }))}
              onChange={(v) => v && setChannel(v)}
            />
            <SelectField
              label={t("manager.notices.audienceField")}
              id="nn-aud"
              value={audience}
              options={AUDIENCES.map((a) => ({
                value: a,
                label: t(`manager.notices.audiences.${a}` as const),
              }))}
              onChange={(v) => {
                if (v) setAudience(v);
              }}
            />
          </div>

          {audience === "BY_ENTRANCE" ? (
            <CheckboxList
              label={t("manager.notices.audiences.BY_ENTRANCE")}
              items={buildingEntrances.map((e) => ({
                value: e.id,
                label: e.label ? `${e.code} — ${e.label}` : e.code,
              }))}
              selected={entranceIds}
              onToggle={(v) => setEntranceIds((cur) => toggle(cur, v))}
              empty={t("manager.notices.noEntrances")}
            />
          ) : null}
          {audience === "BY_UNIT_TYPE" ? (
            <CheckboxList
              label={t("manager.notices.audiences.BY_UNIT_TYPE")}
              items={UNIT_TYPES.map((u) => ({
                value: u,
                label: t(`manager.unitTypes.${u}` as const),
              }))}
              selected={unitTypes}
              onToggle={(v) => setUnitTypes((cur) => toggle(cur, v as ManagedUnitType))}
            />
          ) : null}
          {audience === "SPECIFIC_UNITS" ? (
            <CheckboxList
              label={t("manager.notices.audiences.SPECIFIC_UNITS")}
              items={buildingUnits.map((u) => ({ value: u.id, label: u.code }))}
              selected={unitIds}
              onToggle={(v) => setUnitIds((cur) => toggle(cur, v))}
              empty={t("manager.notices.noUnits")}
            />
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.currentTarget.checked)}
            />
            <span>{t("manager.notices.publishNow")}</span>
          </label>
        </>
      )}
    </ActionDialog>
  );
}

function CheckboxList<V extends string>({
  label,
  items,
  selected,
  onToggle,
  empty,
}: {
  label: string;
  items: Array<{ value: V; label: string }>;
  selected: V[];
  onToggle: (value: V) => void;
  empty?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium tracking-wide text-[var(--color-foreground-muted)] uppercase">
        {label}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--color-foreground-muted)]">{empty ?? "—"}</p>
      ) : (
        <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm">
          {items.map((it) => (
            <label key={it.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(it.value)}
                onChange={() => onToggle(it.value)}
              />
              <span>{it.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublishNoticeButton({ noticeId }: { noticeId: string }) {
  const t = useT();
  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          {t("manager.notices.publishAction")}
        </Button>
      }
      title={t("manager.notices.publishAction")}
      submitLabel={t("manager.notices.publishAction")}
      onSubmit={async () => {
        await apiClient.post(`/manager/notices/${noticeId}/publish`);
      }}
    >
      {() => <p className="text-sm">{t("manager.notices.publishNow")}?</p>}
    </ActionDialog>
  );
}
