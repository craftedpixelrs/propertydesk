"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field, SelectField, TextareaField } from "./_shared/action-dialog";
import type { ManagedUnitType } from "@prisma/client";

const UNIT_TYPES: ManagedUnitType[] = [
  "APARTMENT",
  "COMMERCIAL",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "OFFICE",
  "OTHER",
];

const UNIT_TYPE_LABEL_SR: Record<ManagedUnitType, string> = {
  APARTMENT: "Stan",
  COMMERCIAL: "Lokal",
  GARAGE: "Garaža",
  PARKING_SPACE: "Garažno mesto",
  STORAGE: "Ostava",
  OFFICE: "Kancelarija",
  OTHER: "Ostalo",
};

export interface EntranceOption {
  id: string;
  code: string;
}

export interface UnitFormInput {
  id: string;
  code: string;
  type: ManagedUnitType;
  entranceId: string | null;
  floor: number | null;
  totalArea: string | number;
  participationShare: string | number;
  roomCount: string | number | null;
  notes: string | null;
}

export function NewUnitDialog({
  buildingId,
  entrances,
}: {
  buildingId: string;
  entrances: EntranceOption[];
}) {
  const t = useT();
  const [values, setValues] = useState({
    code: "",
    type: "APARTMENT" as ManagedUnitType,
    entranceId: entrances[0]?.id ?? "",
    floor: "",
    totalArea: "",
    participationShare: "1",
    roomCount: "",
    notes: "",
  });
  function set<K extends keyof typeof values>(k: K, v: (typeof values)[K]) {
    setValues((p) => ({ ...p, [k]: v }));
  }
  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.newUnit")}</Button>}
      title={t("manager.actions.newUnit")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        const payload: Record<string, unknown> = {
          code: values.code.trim(),
          type: values.type,
          totalArea: Number(values.totalArea),
          participationShare: Number(values.participationShare || "1"),
        };
        if (values.entranceId) payload.entranceId = values.entranceId;
        if (values.floor.trim()) payload.floor = Number(values.floor);
        if (values.roomCount.trim()) payload.roomCount = Number(values.roomCount);
        if (values.notes.trim()) payload.notes = values.notes.trim();
        await apiClient.post(`/manager/buildings/${buildingId}/units`, payload);
      }}
    >
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("manager.units.columns.code")}
              id="u-code"
              value={values.code}
              required
              onChange={(v) => set("code", v)}
            />
            <SelectField
              label={t("manager.units.columns.type")}
              id="u-type"
              value={values.type}
              options={UNIT_TYPES.map((u) => ({ value: u, label: UNIT_TYPE_LABEL_SR[u] }))}
              onChange={(v) => v && set("type", v)}
            />
            {entrances.length > 0 ? (
              <SelectField
                label={t("manager.units.columns.entrance")}
                id="u-entrance"
                value={values.entranceId}
                options={[
                  { value: "", label: "—" },
                  ...entrances.map((e) => ({ value: e.id, label: e.code })),
                ]}
                onChange={(v) => set("entranceId", v)}
              />
            ) : null}
            <Field
              label={t("manager.units.columns.floor")}
              id="u-floor"
              type="number"
              value={values.floor}
              onChange={(v) => set("floor", v)}
            />
            <Field
              label={t("manager.units.columns.area")}
              id="u-area"
              type="number"
              required
              value={values.totalArea}
              onChange={(v) => set("totalArea", v)}
            />
            <Field
              label={t("manager.units.columns.share")}
              id="u-share"
              type="number"
              value={values.participationShare}
              onChange={(v) => set("participationShare", v)}
            />
            <Field
              label="Broj soba"
              id="u-rooms"
              type="number"
              value={values.roomCount}
              onChange={(v) => set("roomCount", v)}
            />
          </div>
          <TextareaField
            label={t("manager.building.fields.notes")}
            id="u-notes"
            value={values.notes}
            onChange={(v) => set("notes", v)}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function EditUnitDialog({
  unit,
  entrances,
}: {
  unit: UnitFormInput;
  entrances: EntranceOption[];
}) {
  const t = useT();
  const [values, setValues] = useState({
    code: unit.code,
    type: unit.type,
    entranceId: unit.entranceId ?? "",
    floor: unit.floor != null ? String(unit.floor) : "",
    totalArea: String(unit.totalArea),
    participationShare: String(unit.participationShare),
    roomCount: unit.roomCount != null ? String(unit.roomCount) : "",
    notes: unit.notes ?? "",
  });
  function set<K extends keyof typeof values>(k: K, v: (typeof values)[K]) {
    setValues((p) => ({ ...p, [k]: v }));
  }
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("manager.actions.edit")}
        </Button>
      }
      title={`${t("manager.actions.edit")} · ${unit.code}`}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        const payload: Record<string, unknown> = {
          code: values.code.trim(),
          type: values.type,
          totalArea: Number(values.totalArea),
          participationShare: Number(values.participationShare || "1"),
          entranceId: values.entranceId || null,
          floor: values.floor.trim() ? Number(values.floor) : null,
          roomCount: values.roomCount.trim() ? Number(values.roomCount) : null,
          notes: values.notes.trim() || null,
        };
        await apiClient.patch(`/manager/units/${unit.id}`, payload);
      }}
    >
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("manager.units.columns.code")}
              id="eu-code"
              value={values.code}
              required
              onChange={(v) => set("code", v)}
            />
            <SelectField
              label={t("manager.units.columns.type")}
              id="eu-type"
              value={values.type}
              options={UNIT_TYPES.map((u) => ({ value: u, label: UNIT_TYPE_LABEL_SR[u] }))}
              onChange={(v) => v && set("type", v)}
            />
            {entrances.length > 0 ? (
              <SelectField
                label={t("manager.units.columns.entrance")}
                id="eu-entrance"
                value={values.entranceId}
                options={[
                  { value: "", label: "—" },
                  ...entrances.map((e) => ({ value: e.id, label: e.code })),
                ]}
                onChange={(v) => set("entranceId", v)}
              />
            ) : null}
            <Field
              label={t("manager.units.columns.floor")}
              id="eu-floor"
              type="number"
              value={values.floor}
              onChange={(v) => set("floor", v)}
            />
            <Field
              label={t("manager.units.columns.area")}
              id="eu-area"
              type="number"
              required
              value={values.totalArea}
              onChange={(v) => set("totalArea", v)}
            />
            <Field
              label={t("manager.units.columns.share")}
              id="eu-share"
              type="number"
              value={values.participationShare}
              onChange={(v) => set("participationShare", v)}
            />
          </div>
          <TextareaField
            label={t("manager.building.fields.notes")}
            id="eu-notes"
            value={values.notes}
            onChange={(v) => set("notes", v)}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function ArchiveUnitButton({ unitId, code }: { unitId: string; code: string }) {
  const t = useT();
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("manager.actions.archive")}
        </Button>
      }
      title={`${t("manager.actions.archive")} · ${code}`}
      submitLabel={t("manager.actions.archive")}
      submitVariant="destructive"
      onSubmit={async () => {
        await apiClient.delete(`/manager/units/${unitId}`);
      }}
    >
      {() => <p className="text-sm">{t("manager.common.confirmDelete")}</p>}
    </ActionDialog>
  );
}
