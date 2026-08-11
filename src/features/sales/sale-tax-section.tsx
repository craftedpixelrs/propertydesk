"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

type VatMode = "NEW_BUILD_10" | "SECONDARY_MARKET_2_5" | "NONE";
type TaxPayer = "BUYER" | "SELLER";

interface Props {
  saleId: string;
  finalPrice: string;
  currency: string;
  vatMode: VatMode | null;
  taxAmount: string | null;
  taxPayer: TaxPayer;
  canManage: boolean;
}

const VAT_MODE_LABELS: Record<VatMode | "NULL", string> = {
  NULL: "Nije određeno",
  NEW_BUILD_10: "PDV 10% (novogradnja)",
  SECONDARY_MARKET_2_5: "PPAP 2,5% (sekundarno tržište)",
  NONE: "Bez poreza",
};

const TAX_PAYER_LABELS: Record<TaxPayer, string> = {
  BUYER: "Kupac",
  SELLER: "Prodavac",
};

function estimateTax(finalPrice: string, mode: VatMode | null): string | null {
  if (!mode) return null;
  const price = Number(finalPrice);
  if (!Number.isFinite(price)) return null;
  const rate = mode === "NEW_BUILD_10" ? 0.1 : mode === "SECONDARY_MARKET_2_5" ? 0.025 : 0;
  return (Math.round(price * rate * 100) / 100).toFixed(2);
}

export function SaleTaxSection({
  saleId,
  finalPrice,
  currency,
  vatMode,
  taxAmount,
  taxPayer,
  canManage,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<VatMode | "NULL">(vatMode ?? "NULL");
  const [payer, setPayer] = useState<TaxPayer>(taxPayer);
  const [amountOverride, setAmountOverride] = useState<string>(
    taxAmount ?? "",
  );
  const [useOverride, setUseOverride] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const derived = useMemo(
    () => estimateTax(finalPrice, mode === "NULL" ? null : mode),
    [finalPrice, mode],
  );

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/sales/${saleId}/tax`, {
        vatMode: mode === "NULL" ? null : mode,
        taxPayer: payer,
        taxAmount: useOverride && amountOverride ? amountOverride : null,
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Došlo je do neočekivane greške.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    const displayMode: VatMode | "NULL" = vatMode ?? "NULL";
    return (
      <div className="space-y-2 text-sm">
        <Row label="Poreski režim" value={VAT_MODE_LABELS[displayMode]} />
        <Row
          label="Iznos poreza"
          value={
            taxAmount
              ? `${new Intl.NumberFormat("sr-Latn-RS", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(Number(taxAmount))} ${currency}`
              : "—"
          }
        />
        <Row label="Porez plaća" value={TAX_PAYER_LABELS[taxPayer]} />
        {canManage ? (
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Izmeni porez
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="vatMode">
          Poreski režim
        </label>
        <select
          id="vatMode"
          value={mode}
          onChange={(e) => setMode(e.target.value as VatMode | "NULL")}
          className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        >
          <option value="NULL">Nije određeno</option>
          <option value="NEW_BUILD_10">PDV 10% (novogradnja)</option>
          <option value="SECONDARY_MARKET_2_5">
            PPAP 2,5% (sekundarno tržište)
          </option>
          <option value="NONE">Bez poreza</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="taxPayer">
          Porez plaća
        </label>
        <select
          id="taxPayer"
          value={payer}
          onChange={(e) => setPayer(e.target.value as TaxPayer)}
          className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        >
          <option value="BUYER">Kupac</option>
          <option value="SELLER">Prodavac</option>
        </select>
      </div>

      {mode !== "NULL" ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-foreground-muted)]">
              Automatski izračunat porez
            </span>
            <span className="font-mono text-sm">
              {derived ?? "—"} {currency}
            </span>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={useOverride}
              onChange={(e) => setUseOverride(e.target.checked)}
            />
            <span>Ručno postavi iznos</span>
          </label>
          {useOverride ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountOverride}
              onChange={(e) => setAmountOverride(e.target.value)}
              placeholder="0.00"
              className="mt-2 h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            />
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} loading={saving}>
          Sačuvaj
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(false)}
          disabled={saving}
        >
          Odustani
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[var(--color-foreground-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
