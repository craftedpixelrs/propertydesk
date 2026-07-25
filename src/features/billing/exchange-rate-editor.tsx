"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { formatMoney } from "@/lib/formatters/money";

/**
 * A single row in the rate list as it comes back from the API. `rate` is
 * serialised as a decimal string (Prisma → JSON), `effectiveDate` as an
 * ISO timestamp (midnight UTC of the effective day).
 */
export interface ExchangeRateRow {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  effectiveDate: string;
  source: "MANUAL" | "NBS";
  note: string | null;
  createdAt: string;
}

interface Props {
  initialRates: ExchangeRateRow[];
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("sr-Latn-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ExchangeRateEditor({ initialRates }: Props) {
  const router = useRouter();
  const [rates, setRates] = useState<ExchangeRateRow[]>(initialRates);
  const [effectiveDate, setEffectiveDate] = useState<string>(todayIsoDate());
  const [rate, setRate] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = Number(rate.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Kurs mora biti pozitivan broj (npr. 117.25).");
      return;
    }

    startSave(async () => {
      try {
        const created = await apiClient.post<ExchangeRateRow>(
          "/billing/exchange-rates",
          {
            baseCurrency: "EUR",
            quoteCurrency: "RSD",
            rate: parsed.toString(),
            effectiveDate,
            note: note.trim() || null,
          },
        );
        setRates((prev) =>
          [created, ...prev.filter((r) => r.id !== created.id)].sort((a, b) =>
            b.effectiveDate.localeCompare(a.effectiveDate),
          ),
        );
        setRate("");
        setNote("");
        setEffectiveDate(todayIsoDate());
        router.refresh();
      } catch (err) {
        setError(
          err instanceof ApiClientError ? err.message : "Snimanje nije uspelo.",
        );
      }
    });
  }

  async function onDelete(id: string) {
    if (!window.confirm("Obrisati ovaj kurs? Ova akcija se ne može poništiti.")) {
      return;
    }
    setError(null);
    setPendingDeleteId(id);
    try {
      await apiClient.delete(`/billing/exchange-rates/${id}`);
      setRates((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Brisanje nije uspelo.",
      );
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={onCreate}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-[var(--color-foreground-muted)]">
              Datum važenja
            </span>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-[var(--color-foreground-muted)]">
              1 EUR = ? RSD
            </span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="npr. 117.25"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-xs text-[var(--color-foreground-muted)]">
              Napomena (opciono)
            </span>
            <Input
              type="text"
              placeholder="npr. NBS srednji kurs"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </label>
        </div>
        {error ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <div className="mt-3 flex justify-end">
          <Button type="submit" loading={isSaving}>
            Dodaj kurs
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-inset)]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Datum važenja</th>
              <th className="px-3 py-2 text-left font-semibold">Kurs</th>
              <th className="px-3 py-2 text-left font-semibold">Izvor</th>
              <th className="px-3 py-2 text-left font-semibold">Napomena</th>
              <th className="w-24 px-3 py-2 text-right font-semibold">Akcija</th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-[var(--color-foreground-muted)]"
                >
                  Nema unetih kurseva. Dodajte prvi kurs kako biste omogućili
                  dinarske fakture.
                </td>
              </tr>
            ) : (
              rates.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-[var(--color-border)]"
                >
                  <td className="px-3 py-1.5">{formatDate(r.effectiveDate)}</td>
                  <td className="px-3 py-1.5 font-mono">
                    1 {r.baseCurrency} = {formatMoney(r.rate, "RSD", { withSymbol: false, decimals: 4 })} {r.quoteCurrency}
                  </td>
                  <td className="px-3 py-1.5 text-xs">
                    {r.source === "MANUAL" ? "Ručno" : "NBS"}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-[var(--color-foreground-muted)]">
                    {r.note ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(r.id)}
                      disabled={pendingDeleteId === r.id}
                      className="text-xs text-red-700 hover:underline disabled:opacity-50"
                    >
                      {pendingDeleteId === r.id ? "Brisanje…" : "Obriši"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
