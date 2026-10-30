"use client";

import { useState } from "react";
import type { DuesTariffBasis, DuesTariffKind, ManagedUnitType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field, SelectField, TextareaField } from "./_shared/action-dialog";

const KINDS: DuesTariffKind[] = [
  "CURRENT_MAINTENANCE",
  "INVESTMENT_FUND",
  "MANAGER_FEE",
  "INSURANCE",
  "OTHER",
];
const BASES: DuesTariffBasis[] = ["PER_UNIT", "PER_SQUARE_METER"];
const UNIT_FILTERS: ManagedUnitType[] = [
  "APARTMENT",
  "COMMERCIAL",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "OFFICE",
  "OTHER",
];

export function NewTariffDialog({ buildingId }: { buildingId: string }) {
  const t = useT();
  const [name, setName] = useState("Mesečna taksa");
  const [kind, setKind] = useState<DuesTariffKind>("CURRENT_MAINTENANCE");
  const [basis, setBasis] = useState<DuesTariffBasis>("PER_SQUARE_METER");
  const [amount, setAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [unitTypeFilter, setUnitTypeFilter] = useState<"" | ManagedUnitType>("");
  const [notes, setNotes] = useState("");
  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.newTariff")}</Button>}
      title={t("manager.actions.newTariff")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post(`/manager/buildings/${buildingId}/tariffs`, {
          name: name.trim(),
          kind,
          basis,
          amount: Number(amount),
          effectiveFrom,
          unitTypeFilter: unitTypeFilter || null,
          notes: notes.trim() || null,
        });
      }}
    >
      {() => (
        <>
          <Field
            label={t("manager.tariffs.columns.name")}
            id="t-name"
            value={name}
            required
            onChange={setName}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t("manager.tariffs.columns.kind")}
              id="t-kind"
              value={kind}
              options={KINDS.map((k) => ({
                value: k,
                label: t(`manager.tariffs.kinds.${k}` as const),
              }))}
              onChange={(v) => v && setKind(v)}
            />
            <SelectField
              label={t("manager.tariffs.columns.basis")}
              id="t-basis"
              value={basis}
              options={BASES.map((b) => ({
                value: b,
                label: t(`manager.tariffs.basis.${b}` as const),
              }))}
              onChange={(v) => v && setBasis(v)}
            />
            <Field
              label={t("manager.tariffs.columns.amount")}
              id="t-amount"
              type="number"
              required
              value={amount}
              onChange={setAmount}
            />
            <Field
              label={t("manager.tariffs.columns.effective")}
              id="t-eff"
              type="date"
              value={effectiveFrom}
              onChange={setEffectiveFrom}
            />
            <SelectField
              label={t("manager.units.columns.type")}
              id="t-utf"
              value={unitTypeFilter}
              options={[
                { value: "", label: "— svi —" },
                ...UNIT_FILTERS.map((u) => ({ value: u, label: u })),
              ]}
              onChange={setUnitTypeFilter}
            />
          </div>
          <TextareaField
            label={t("manager.building.fields.notes")}
            id="t-notes"
            value={notes}
            onChange={setNotes}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function TariffToggleButton({
  tariffId,
  active,
  label,
}: {
  tariffId: string;
  active: boolean;
  label: string;
}) {
  const t = useT();
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          {active ? "Deaktiviraj" : "Aktiviraj"}
        </Button>
      }
      title={`${active ? "Deaktiviraj" : "Aktiviraj"} · ${label}`}
      submitLabel={t("common.yes")}
      submitVariant={active ? "destructive" : "primary"}
      onSubmit={async () => {
        await apiClient.patch(`/manager/tariffs/${tariffId}`, { active: !active });
      }}
    >
      {() => <p className="text-sm">{t("manager.common.confirmDelete")}</p>}
    </ActionDialog>
  );
}

export function GenerateDuesDialog({ buildingId }: { buildingId: string }) {
  const t = useT();
  const now = new Date();
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [dueDay, setDueDay] = useState("15");
  const [summary, setSummary] = useState<{ created: number; skipped: number } | null>(null);
  return (
    <ActionDialog
      trigger={<Button>{t("manager.dues.generateButton")}</Button>}
      title={t("manager.dues.generatorTitle")}
      description={t("manager.dues.generatorBody")}
      submitLabel={t("manager.dues.generateButton")}
      onSubmit={async () => {
        const result = await apiClient.post<{ created: number; skipped: number }>(
          `/manager/buildings/${buildingId}/dues/generate`,
          {
            periodYear: Number(year),
            periodMonth: Number(month),
            dueDay: Number(dueDay),
          },
        );
        setSummary(result);
        return false; // keep dialog open to show the result
      }}
    >
      {() => (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Godina" id="gd-year" type="number" value={year} onChange={setYear} />
            <Field label="Mesec" id="gd-month" type="number" value={month} onChange={setMonth} />
            <Field
              label="Rok (dan)"
              id="gd-day"
              type="number"
              value={dueDay}
              onChange={setDueDay}
            />
          </div>
          {summary ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {t(
                "manager.dues.successGenerated",
                summary as unknown as Record<string, string | number>,
              )}
            </p>
          ) : null}
        </>
      )}
    </ActionDialog>
  );
}
