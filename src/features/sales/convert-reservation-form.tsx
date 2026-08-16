"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
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
  const t = useT();
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
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
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
            {t("deals.listPrice")}
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
            {t("deals.convert.discountType")}
          </label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "" | "PERCENTAGE" | "FIXED")}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          >
            <option value="">{t("deals.convert.noDiscount")}</option>
            <option value="PERCENTAGE">{t("deals.convert.percentage")}</option>
            <option value="FIXED">{t("deals.convert.fixed")}</option>
          </select>
        </div>
        {discountType ? (
          <div>
            <label className="block text-xs text-[var(--color-foreground-muted)]">
              {discountType === "PERCENTAGE"
                ? t("deals.convert.discountPercent")
                : t("deals.convert.discountAmount", { currency: defaultCurrency })}
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
            {t("deals.convert.depositAmount", { currency: defaultCurrency })}
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
        <label className="block text-xs text-[var(--color-foreground-muted)]">
          {t("common.notes")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
        />
      </div>
      <div className="flex justify-end">
        <Button loading={busy} onClick={submit}>
          {t("deals.createSale")}
        </Button>
      </div>
    </div>
  );
}
