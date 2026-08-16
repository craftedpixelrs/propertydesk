"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type { TranslateFn } from "@/lib/i18n";

const METHOD_VALUES = [
  "BANK_TRANSFER",
  "CASH",
  "CARD",
  "LOAN",
  "COMPENSATION",
  "OTHER",
] as const;

function methodLabel(value: (typeof METHOD_VALUES)[number], t: TranslateFn): string {
  switch (value) {
    case "BANK_TRANSFER":
      return t("deals.paymentMethod.BANK_TRANSFER");
    case "CASH":
      return t("deals.paymentMethod.CASH");
    case "CARD":
      return t("deals.paymentMethod.CARD");
    case "LOAN":
      return t("deals.paymentMethod.LOAN");
    case "COMPENSATION":
      return t("deals.paymentMethod.COMPENSATION");
    case "OTHER":
      return t("deals.paymentMethod.OTHER");
  }
}

interface Installment {
  id: string;
  name: string;
  amount: string;
  status: string;
}

interface Props {
  saleId: string;
  currency: string;
  installments: Installment[];
}

export function RecordPaymentForm({ saleId, currency, installments }: Props) {
  const t = useT();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [installmentId, setInstallmentId] = useState<string>("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!amount.trim()) {
      setError(t("deals.payments.amountRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.post("/payments", {
        saleId,
        installmentId: installmentId || undefined,
        amount,
        paymentDate,
        paymentMethod: method,
        referenceNumber: reference || null,
        note: note || null,
      });
      setAmount("");
      setReference("");
      setNote("");
      setInstallmentId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
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
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            {t("deals.plan.amountWithCurrency", { currency })}
          </label>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            {t("common.date")}
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            {t("deals.payments.paymentMethod")}
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          >
            {METHOD_VALUES.map((value) => (
              <option key={value} value={value}>
                {methodLabel(value, t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            {t("deals.payments.installment")}
          </label>
          <select
            value={installmentId}
            onChange={(e) => setInstallmentId(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          >
            <option value="">{t("deals.payments.noInstallment")}</option>
            {installments
              .filter((i) => i.status !== "PAID" && i.status !== "CANCELED")
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} · {i.amount}
                </option>
              ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            {t("deals.reference")}
          </label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            {t("common.notes")}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" loading={busy} onClick={submit}>
          {t("deals.payments.record")}
        </Button>
      </div>
    </div>
  );
}
