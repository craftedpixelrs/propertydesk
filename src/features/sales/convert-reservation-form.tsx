"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Props {
  reservationId: string;
  defaultListPrice: string;
  defaultCurrency: string;
}

export function ConvertReservationForm({
  reservationId,
  defaultListPrice,
  defaultCurrency,
}: Props) {
  const router = useRouter();
  const [listPrice, setListPrice] = useState(defaultListPrice);
  const [discountType, setDiscountType] = useState<"" | "PERCENTAGE" | "FIXED">("");
  const [discountValue, setDiscountValue] = useState("");
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ id: string }>(
        `/reservations/${reservationId}/convert`,
        {
          listPrice,
          discountType: discountType || null,
          discountValue: discountValue ? discountValue : null,
          currency: defaultCurrency,
          depositAmount: deposit || null,
          notes: notes || null,
        },
      );
      router.push(`/prodaje/${res.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            Cena po ceniku
          </label>
          <input
            inputMode="decimal"
            value={listPrice}
            onChange={(e) => setListPrice(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            Tip popusta
          </label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "" | "PERCENTAGE" | "FIXED")}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          >
            <option value="">Bez popusta</option>
            <option value="PERCENTAGE">Procenat</option>
            <option value="FIXED">Fiksni iznos</option>
          </select>
        </div>
        {discountType ? (
          <div>
            <label className="block text-xs text-[var(--color-foreground-muted)]">
              {discountType === "PERCENTAGE" ? "Popust (%)" : `Popust (${defaultCurrency})`}
            </label>
            <input
              inputMode="decimal"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            />
          </div>
        ) : null}
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            Depozit ({defaultCurrency})
          </label>
          <input
            inputMode="decimal"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-[var(--color-foreground-muted)]">Napomena</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
        />
      </div>
      <div className="flex justify-end">
        <Button loading={busy} onClick={submit}>
          Kreiraj prodaju
        </Button>
      </div>
    </div>
  );
}
