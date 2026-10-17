"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import type { TranslateFn } from "@/lib/i18n";
import {
  SETTLEMENT_PRESETS,
  summarizeSettlement,
  type SettlementLineKind,
  type SettlementPresetCode,
} from "@/lib/sales/settlement";

export interface SettlementLineItem {
  id: string;
  kind: SettlementLineKind;
  presetCode: string | null;
  label: string;
  amount: string;
  note: string | null;
}

interface Props {
  saleId: string;
  currency: SupportedCurrency;
  contracted: string;
  paid: string;
  editable: boolean;
  remainingLabel: string | null;
  lines: SettlementLineItem[];
}

function presetLabel(code: string, t: TranslateFn): string {
  switch (code) {
    case "CERAMICS":
      return t("deals.settlement.preset.CERAMICS");
    case "SANITARY":
      return t("deals.settlement.preset.SANITARY");
    case "KITCHEN":
      return t("deals.settlement.preset.KITCHEN");
    case "FLOORING":
      return t("deals.settlement.preset.FLOORING");
    case "DOORS":
      return t("deals.settlement.preset.DOORS");
    case "PARKING":
      return t("deals.settlement.preset.PARKING");
    case "STORAGE":
      return t("deals.settlement.preset.STORAGE");
    case "EQUIPMENT":
      return t("deals.settlement.preset.EQUIPMENT");
    case "CUSTOM":
      return t("deals.settlement.preset.CUSTOM");
    default:
      return code;
  }
}

function lineTitle(line: SettlementLineItem, t: TranslateFn): string {
  if (line.presetCode && line.presetCode !== "CUSTOM") {
    return presetLabel(line.presetCode, t);
  }
  return line.label;
}

export function FinalSettlement({
  saleId,
  currency,
  contracted,
  paid,
  editable,
  remainingLabel,
  lines,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [preset, setPreset] = useState<SettlementPresetCode>("CERAMICS");
  const [kind, setKind] = useState<SettlementLineKind>("DEDUCTION");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = SETTLEMENT_PRESETS.find((item) => item.code === preset) ?? SETTLEMENT_PRESETS[0];
  const resolvedKind: SettlementLineKind = selected.kind ?? kind;

  const summary = useMemo(
    () =>
      summarizeSettlement({
        contracted,
        paid,
        lines: lines.map((line) => ({ kind: line.kind, amount: line.amount })),
      }),
    [contracted, paid, lines],
  );

  const differenceLabel = summary.difference.isZero()
    ? t("deals.settlement.closed")
    : summary.difference.isNegative()
      ? t("deals.settlement.refund")
      : t("deals.settlement.buyerOwes");
  const differenceClass = summary.difference.isZero()
    ? "text-emerald-700"
    : summary.difference.isNegative()
      ? "text-sky-800"
      : "text-amber-800";

  async function addLine() {
    if (!amount.trim()) {
      setError(t("deals.payments.amountRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/sales/${saleId}/settlement`, {
        kind: resolvedKind,
        presetCode: preset,
        label: preset === "CUSTOM" ? label.trim() : null,
        amount: amount.trim().replace(/\s/g, "").replace(",", "."),
        note: note.trim() || null,
      });
      setAmount("");
      setNote("");
      setLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function removeLine(lineId: string) {
    setBusy(true);
    setError(null);
    try {
      await apiClient.delete(`/sales/${saleId}/settlement/${lineId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-foreground-muted)]">{t("deals.settlement.intro")}</p>
      {!editable && remainingLabel ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("deals.settlement.locked", { amount: remainingLabel })}
        </p>
      ) : null}

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <SummaryRow
          label={t("deals.settlement.contracted")}
          value={formatMoney(contracted, currency)}
        />
        <SummaryRow
          label={t("deals.settlement.deductions")}
          value={
            summary.deductions.isZero() ? "—" : `− ${formatMoney(summary.deductions, currency)}`
          }
        />
        <SummaryRow
          label={t("deals.settlement.surcharges")}
          value={
            summary.surcharges.isZero() ? "—" : `+ ${formatMoney(summary.surcharges, currency)}`
          }
        />
        <SummaryRow
          label={t("deals.settlement.settled")}
          value={formatMoney(summary.settled, currency)}
          strong
        />
        <SummaryRow label={t("deals.settlement.paid")} value={formatMoney(paid, currency)} />
        <SummaryRow
          label={differenceLabel}
          value={formatMoney(summary.difference.abs(), currency)}
          valueClass={differenceClass}
          strong
        />
      </dl>

      {lines.length === 0 ? (
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("deals.settlement.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] text-sm">
          {lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 py-2">
              <div>
                <p className="font-medium">{lineTitle(line, t)}</p>
                <p className="text-xs text-[var(--color-foreground-muted)]">
                  {line.kind === "DEDUCTION"
                    ? t("deals.settlement.kindDeduction")
                    : t("deals.settlement.kindSurcharge")}
                  {line.note ? ` · ${line.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={line.kind === "DEDUCTION" ? "text-sky-800" : "text-amber-800"}>
                  {line.kind === "DEDUCTION" ? "−" : "+"} {formatMoney(line.amount, currency)}
                </span>
                {editable ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--color-foreground-muted)] hover:underline"
                    disabled={busy}
                    onClick={() => removeLine(line.id)}
                  >
                    {t("deals.settlement.remove")}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editable ? (
        <div className="space-y-3 rounded-md border border-[var(--color-border)] p-3">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs text-[var(--color-foreground-muted)]">
                {t("deals.settlement.item")}
              </label>
              <select
                value={preset}
                onChange={(event) => setPreset(event.target.value as SettlementPresetCode)}
                className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
              >
                {SETTLEMENT_PRESETS.map((item) => (
                  <option key={item.code} value={item.code}>
                    {presetLabel(item.code, t)}
                  </option>
                ))}
              </select>
            </div>
            {preset === "CUSTOM" ? (
              <>
                <div>
                  <label className="block text-xs text-[var(--color-foreground-muted)]">
                    {t("deals.settlement.kind")}
                  </label>
                  <select
                    value={kind}
                    onChange={(event) => setKind(event.target.value as SettlementLineKind)}
                    className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                  >
                    <option value="DEDUCTION">{t("deals.settlement.kindDeduction")}</option>
                    <option value="SURCHARGE">{t("deals.settlement.kindSurcharge")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-foreground-muted)]">
                    {t("deals.settlement.customName")}
                  </label>
                  <input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder={t("deals.settlement.customNamePlaceholder")}
                    className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                  />
                </div>
              </>
            ) : null}
            <div>
              <label className="block text-xs text-[var(--color-foreground-muted)]">
                {t("deals.settlement.amount", { currency })}
              </label>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
                className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-foreground-muted)]">
                {t("deals.settlement.note")}
              </label>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("deals.settlement.notePlaceholder")}
                className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={busy} onClick={addLine}>
              {t("deals.settlement.add")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  valueClass,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[var(--color-surface-muted,transparent)]">
      <dt className="text-[var(--color-foreground-muted)]">{label}</dt>
      <dd className={strong ? `font-semibold ${valueClass ?? ""}` : valueClass}>{value}</dd>
    </div>
  );
}
