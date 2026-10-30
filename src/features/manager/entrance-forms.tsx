"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field } from "./_shared/action-dialog";

export interface EntranceRow {
  id: string;
  code: string;
  label: string | null;
  sortOrder: number;
}

export function NewEntranceDialog({ buildingId }: { buildingId: string }) {
  const t = useT();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [sort, setSort] = useState("0");
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.newEntrance")}</Button>}
      title={t("manager.actions.newEntrance")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post(`/manager/buildings/${buildingId}/entrances`, {
          code: code.trim(),
          label: label.trim() || null,
          sortOrder: Number(sort) || 0,
        });
      }}
    >
      {() => (
        <>
          <Field
            label={t("manager.entrances.codeField")}
            id="ent-code"
            value={code}
            required
            onChange={setCode}
            autoFocus
          />
          <Field
            label={t("manager.entrances.labelField")}
            id="ent-label"
            value={label}
            onChange={setLabel}
          />
          <Field
            label={t("manager.entrances.columns.order")}
            id="ent-sort"
            type="number"
            value={sort}
            onChange={setSort}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function EditEntranceDialog({
  buildingId,
  entrance,
}: {
  buildingId: string;
  entrance: EntranceRow;
}) {
  const t = useT();
  const [label, setLabel] = useState(entrance.label ?? "");
  const [sort, setSort] = useState(String(entrance.sortOrder));
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("manager.actions.edit")}
        </Button>
      }
      title={`${t("manager.actions.edit")} · ${entrance.code}`}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post(`/manager/buildings/${buildingId}/entrances`, {
          code: entrance.code,
          label: label.trim() || null,
          sortOrder: Number(sort) || 0,
        });
      }}
    >
      {() => (
        <>
          <Field
            label={t("manager.entrances.labelField")}
            id="edit-ent-label"
            value={label}
            onChange={setLabel}
          />
          <Field
            label={t("manager.entrances.columns.order")}
            id="edit-ent-sort"
            type="number"
            value={sort}
            onChange={setSort}
          />
        </>
      )}
    </ActionDialog>
  );
}
