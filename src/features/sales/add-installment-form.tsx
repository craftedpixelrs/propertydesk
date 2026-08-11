"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Props {
  saleId: string;
  currency: string;
}

/**
 * Append-installment modal for an existing PaymentPlan.
 *
 * We deliberately do NOT try to preserve the "sum == finalPrice"
 * invariant here — the plan detail page shows a yellow banner when
 * the totals diverge. Operators use this to handle penalty rows,
 * agreed adjustments, or corrections that arrived after the plan
 * was signed.
 */
export function AddInstallmentButton({ saleId, currency }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setLabel("");
    setAmount("");
    setDueDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setError(null);
  }

  async function submit() {
    if (!label.trim()) {
      setError("Naziv rate je obavezan.");
      return;
    }
    const amtNum = Number(amount);
    if (!Number.isFinite(amtNum) || amtNum <= 0) {
      setError("Unesite ispravan iznos.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/sales/${saleId}/payment-plan/installments`, {
        label: label.trim(),
        amount,
        dueDate,
        notes: notes.trim() || null,
      });
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Dodavanje nije uspelo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-1 size-4" /> Dodaj ratu
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => (busy ? null : setOpen(false))}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg bg-[var(--color-surface)] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <h3 className="text-base font-semibold">Dodaj ratu</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)]"
                aria-label="Zatvori"
                disabled={busy}
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 p-4">
              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
              <div>
                <label className="block text-xs text-[var(--color-foreground-muted)]">
                  Naziv rate
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                  placeholder="npr. Vanredna rata"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-foreground-muted)]">
                  Iznos ({currency})
                </label>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-foreground-muted)]">
                  Datum dospeća
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-foreground-muted)]">
                  Napomena (opciono)
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Otkaži
              </Button>
              <Button size="sm" onClick={submit} loading={busy}>
                Dodaj ratu
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
