"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

type Template = "MANUAL" | "PERCENTAGE" | "EQUAL";

interface ManualRow {
  name: string;
  amount: string;
  dueDate: string;
}
interface PctRow {
  name: string;
  percentage: string;
  dueDate: string;
}

interface Props {
  saleId: string;
  currency: string;
  finalPrice: string;
}

/**
 * Interactive builder for MANUAL / PERCENTAGE / EQUAL plans. Client-side
 * feedback (running totals, tolerance warnings) helps the user hit the
 * server-side Decimal validation on the first submit.
 */
export function PaymentPlanForm({ saleId, currency, finalPrice }: Props) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template>("EQUAL");
  const [planName, setPlanName] = useState("Standardni plan");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { name: "Prva rata", amount: "", dueDate: new Date().toISOString().slice(0, 10) },
  ]);
  const [pctRows, setPctRows] = useState<PctRow[]>([
    { name: "Prva rata", percentage: "100", dueDate: new Date().toISOString().slice(0, 10) },
  ]);
  const [equalCount, setEqualCount] = useState(12);
  const [equalFirstDue, setEqualFirstDue] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  const manualTotal = manualRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const pctTotal = pctRows.reduce((s, r) => s + Number(r.percentage || 0), 0);
  const finalNum = Number(finalPrice);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { planName, template };
      if (template === "MANUAL") {
        body.manual = manualRows.map((r) => ({
          name: r.name,
          amount: r.amount,
          dueDate: r.dueDate,
        }));
      } else if (template === "PERCENTAGE") {
        body.percentage = pctRows.map((r) => ({
          name: r.name,
          percentage: r.percentage,
          dueDate: r.dueDate,
        }));
      } else {
        body.equal = {
          installments: Number(equalCount),
          firstDueDate: equalFirstDue,
          monthlyGap: 1,
        };
      }
      await apiClient.post(`/sales/${saleId}/payment-plan`, body);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            Naziv plana
          </label>
          <input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">Šablon</label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as Template)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          >
            <option value="EQUAL">Jednake rate</option>
            <option value="PERCENTAGE">Procentualno</option>
            <option value="MANUAL">Ručno</option>
          </select>
        </div>
      </div>

      {template === "EQUAL" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-[var(--color-foreground-muted)]">
              Broj rata
            </label>
            <input
              type="number"
              min={1}
              value={equalCount}
              onChange={(e) => setEqualCount(Number(e.target.value))}
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-foreground-muted)]">
              Prva rata dospeva
            </label>
            <input
              type="date"
              value={equalFirstDue}
              onChange={(e) => setEqualFirstDue(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            />
          </div>
          <p className="sm:col-span-2 text-xs text-[var(--color-foreground-muted)]">
            Rate se automatski računaju iz ugovorene cene {finalNum.toFixed(2)} {currency}.
          </p>
        </div>
      ) : null}

      {template === "PERCENTAGE" ? (
        <div className="space-y-2">
          {pctRows.map((row, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-4">
              <input
                value={row.name}
                onChange={(e) =>
                  setPctRows((rs) => rs.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                }
                className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                placeholder="Naziv"
              />
              <input
                inputMode="decimal"
                value={row.percentage}
                onChange={(e) =>
                  setPctRows((rs) =>
                    rs.map((r, i) => (i === idx ? { ...r, percentage: e.target.value } : r)),
                  )
                }
                className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                placeholder="%"
              />
              <input
                type="date"
                value={row.dueDate}
                onChange={(e) =>
                  setPctRows((rs) =>
                    rs.map((r, i) => (i === idx ? { ...r, dueDate: e.target.value } : r)),
                  )
                }
                className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPctRows((rs) => rs.filter((_, i) => i !== idx))}
              >
                Ukloni
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setPctRows((rs) => [
                ...rs,
                {
                  name: `Rata ${rs.length + 1}`,
                  percentage: "0",
                  dueDate: new Date().toISOString().slice(0, 10),
                },
              ])
            }
          >
            Dodaj ratu
          </Button>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            Zbir procenata: <strong>{pctTotal.toFixed(3)}%</strong> (potrebno 100%).
          </p>
        </div>
      ) : null}

      {template === "MANUAL" ? (
        <div className="space-y-2">
          {manualRows.map((row, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-4">
              <input
                value={row.name}
                onChange={(e) =>
                  setManualRows((rs) =>
                    rs.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                  )
                }
                className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                placeholder="Naziv"
              />
              <input
                inputMode="decimal"
                value={row.amount}
                onChange={(e) =>
                  setManualRows((rs) =>
                    rs.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)),
                  )
                }
                className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                placeholder={`Iznos (${currency})`}
              />
              <input
                type="date"
                value={row.dueDate}
                onChange={(e) =>
                  setManualRows((rs) =>
                    rs.map((r, i) => (i === idx ? { ...r, dueDate: e.target.value } : r)),
                  )
                }
                className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setManualRows((rs) => rs.filter((_, i) => i !== idx))}
              >
                Ukloni
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setManualRows((rs) => [
                ...rs,
                {
                  name: `Rata ${rs.length + 1}`,
                  amount: "",
                  dueDate: new Date().toISOString().slice(0, 10),
                },
              ])
            }
          >
            Dodaj ratu
          </Button>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            Zbir rata: <strong>{manualTotal.toFixed(2)} {currency}</strong> · potrebno{" "}
            {finalNum.toFixed(2)} {currency}.
          </p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button loading={busy} onClick={submit}>
          Sačuvaj plan
        </Button>
      </div>
    </div>
  );
}
