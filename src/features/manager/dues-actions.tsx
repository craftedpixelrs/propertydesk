"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field, SelectField, TextareaField } from "./_shared/action-dialog";

export function RecordPaymentDialog({
  chargeId,
  remainingAmount,
}: {
  chargeId: string;
  remainingAmount: string;
}) {
  const t = useT();
  const [amount, setAmount] = useState(remainingAmount);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"BANK_TRANSFER" | "CARD" | "OTHER">("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.recordPayment")}</Button>}
      title={t("manager.payments.recordTitle")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post(`/manager/dues/${chargeId}/payments`, {
          amount: Number(amount),
          paidAt,
          method,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        });
      }}
    >
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("manager.payments.amountField")}
              id="rp-amount"
              type="number"
              required
              value={amount}
              onChange={setAmount}
            />
            <Field
              label={t("manager.payments.paidAtField")}
              id="rp-paid"
              type="date"
              value={paidAt}
              onChange={setPaidAt}
            />
            <SelectField
              label={t("manager.payments.methodField")}
              id="rp-method"
              value={method}
              options={(["BANK_TRANSFER", "CARD", "OTHER"] as const).map((m) => ({
                value: m,
                label: t(`manager.payments.method.${m}` as const),
              }))}
              onChange={(v) => v && setMethod(v)}
            />
            <Field
              label={t("manager.payments.referenceField")}
              id="rp-ref"
              value={reference}
              onChange={setReference}
            />
          </div>
          <TextareaField
            label={t("manager.payments.notesField")}
            id="rp-notes"
            value={notes}
            onChange={setNotes}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function ReversePaymentButton({ paymentId }: { paymentId: string }) {
  const t = useT();
  const [reason, setReason] = useState("");
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("manager.actions.reversePayment")}
        </Button>
      }
      title={t("manager.payments.reverseTitle")}
      submitLabel={t("manager.actions.reversePayment")}
      submitVariant="destructive"
      onSubmit={async () => {
        await apiClient.post(`/manager/dues/payments/${paymentId}/reverse`, {
          reason: reason.trim(),
        });
      }}
    >
      {() => (
        <TextareaField
          label={t("manager.payments.reverseReason")}
          id="rev-reason"
          value={reason}
          required
          onChange={setReason}
        />
      )}
    </ActionDialog>
  );
}

export function WriteOffDialog({ chargeId }: { chargeId: string }) {
  const t = useT();
  const [reason, setReason] = useState("");
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.writeOff")}</Button>}
      title={t("manager.payments.writeOffTitle")}
      submitLabel={t("manager.actions.writeOff")}
      submitVariant="destructive"
      onSubmit={async () => {
        await apiClient.post(`/manager/dues/${chargeId}/write-off`, {
          reason: reason.trim(),
        });
      }}
    >
      {() => (
        <TextareaField
          label={t("manager.payments.writeOffReason")}
          id="wo-reason"
          value={reason}
          required
          onChange={setReason}
        />
      )}
    </ActionDialog>
  );
}

export function ImportBankStatementDialog({
  buildings,
}: {
  buildings: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  const [buildingId, setBuildingId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<{
    matched: number;
    unmatched: number;
    duplicates: number;
  } | null>(null);
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.importBankStatement")}</Button>}
      title={t("manager.bankStatement.title")}
      description={t("manager.bankStatement.description")}
      submitLabel={t("manager.bankStatement.runImport")}
      onSubmit={async () => {
        if (!file) throw new Error("Odaberite fajl.");
        const form = new FormData();
        form.append("file", file);
        if (buildingId) form.append("buildingId", buildingId);
        const res = await fetch("/api/v1/manager/dues/bank-statement", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: { matched: number; unmatched: number; duplicates: number };
          error?: { message?: string };
        };
        if (!res.ok || !json.data) {
          throw new Error(json.error?.message ?? `HTTP ${res.status}`);
        }
        setSummary(json.data);
        return false;
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.bankStatement.buildingField")}
            id="bs-building"
            value={buildingId}
            options={[
              { value: "", label: "— sve zgrade —" },
              ...buildings.map((b) => ({ value: b.id, label: b.name })),
            ]}
            onChange={setBuildingId}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("manager.bankStatement.fileField")}</label>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </div>
          {summary ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <div>{t("manager.bankStatement.resultTitle")}:</div>
              <div>
                {t("manager.bankStatement.matched")}: {summary.matched} ·{" "}
                {t("manager.bankStatement.unmatched")}: {summary.unmatched} ·{" "}
                {t("manager.bankStatement.duplicates")}: {summary.duplicates}
              </div>
            </div>
          ) : null}
        </>
      )}
    </ActionDialog>
  );
}

export function SendRemindersDialog({
  buildings,
}: {
  buildings: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  const [buildingId, setBuildingId] = useState("");
  const [minOutstanding, setMinOutstanding] = useState("");
  const [cooldownDays, setCooldownDays] = useState("7");
  const [summary, setSummary] = useState<{
    sent: number;
    skipped: number;
    dedupedSkipped: number;
    totalDebtors: number;
  } | null>(null);
  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.sendReminders")}</Button>}
      title={t("manager.reminders.title")}
      description={t("manager.reminders.description")}
      submitLabel={t("manager.actions.sendReminders")}
      onSubmit={async () => {
        const payload: Record<string, unknown> = {};
        if (buildingId) payload.buildingId = buildingId;
        if (minOutstanding.trim()) payload.minOutstanding = Number(minOutstanding);
        if (cooldownDays.trim()) payload.cooldownDays = Math.max(0, Number(cooldownDays));
        const r = await apiClient.post<{
          sent: number;
          skipped: number;
          dedupedSkipped: number;
          totalDebtors: number;
        }>("/manager/dues/reminders", payload);
        setSummary(r);
        return false;
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.bankStatement.buildingField")}
            id="rm-building"
            value={buildingId}
            options={[
              { value: "", label: "— sve zgrade —" },
              ...buildings.map((b) => ({ value: b.id, label: b.name })),
            ]}
            onChange={setBuildingId}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("manager.reminders.minOutstandingField")}
              id="rm-min"
              type="number"
              value={minOutstanding}
              onChange={setMinOutstanding}
            />
            <Field
              label={t("manager.reminders.cooldownField")}
              id="rm-cool"
              type="number"
              value={cooldownDays}
              onChange={setCooldownDays}
            />
          </div>
          {summary ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <div>
                {t(
                  "manager.reminders.successBody",
                  summary as unknown as Record<string, string | number>,
                )}
              </div>
              {summary.dedupedSkipped > 0 ? (
                <div className="mt-1 text-xs text-emerald-900">
                  {t("manager.reminders.dedupeNote", {
                    count: summary.dedupedSkipped,
                  } as unknown as Record<string, string | number>)}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </ActionDialog>
  );
}

export function BulkUplatnicaDialog({
  buildings,
}: {
  buildings: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  const now = new Date();
  const [buildingId, setBuildingId] = useState(buildings[0]?.id ?? "");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [includePaid, setIncludePaid] = useState(false);
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.bulkUplatnica")}</Button>}
      title={t("manager.actions.bulkUplatnica")}
      submitLabel={t("manager.actions.downloadPdf")}
      onSubmit={async () => {
        if (!buildingId) throw new Error("Izaberite zgradu.");
        const url = `/api/v1/manager/dues/bulk-pdf?buildingId=${encodeURIComponent(
          buildingId,
        )}&year=${year}&month=${month}&includePaid=${includePaid ? "1" : "0"}`;
        // Opening in a new tab lets the operator keep the dialog state
        // if they want to re-generate for another period.
        window.open(url, "_blank", "noopener");
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.bankStatement.buildingField")}
            id="bu-building"
            value={buildingId}
            options={buildings.map((b) => ({ value: b.id, label: b.name }))}
            onChange={(v) => v && setBuildingId(v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("manager.dues.yearField")}
              id="bu-year"
              type="number"
              value={year}
              onChange={setYear}
            />
            <Field
              label={t("manager.dues.monthField")}
              id="bu-month"
              type="number"
              value={month}
              onChange={setMonth}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePaid}
              onChange={(e) => setIncludePaid(e.currentTarget.checked)}
            />
            <span>{t("manager.dues.includePaidField")}</span>
          </label>
        </>
      )}
    </ActionDialog>
  );
}

export function NewExpenseDialog({
  buildingId,
  suppliers,
}: {
  buildingId: string;
  suppliers: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  const [fund, setFund] = useState<"CURRENT_MAINTENANCE" | "INVESTMENT_FUND" | "OTHER">(
    "CURRENT_MAINTENANCE",
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState("");
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.newExpense")}</Button>}
      title={t("manager.actions.newExpense")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post(`/manager/buildings/${buildingId}/expenses`, {
          fund,
          description: description.trim(),
          amount: Number(amount),
          spentAt,
          supplierId: supplierId || null,
        });
      }}
    >
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t("manager.finance.expenseFund")}
              id="ex-fund"
              value={fund}
              options={(["CURRENT_MAINTENANCE", "INVESTMENT_FUND", "OTHER"] as const).map((f) => ({
                value: f,
                label: t(`manager.expenseFund.${f}` as const),
              }))}
              onChange={(v) => v && setFund(v)}
            />
            <Field
              label={t("manager.finance.expenseAmount")}
              id="ex-amount"
              type="number"
              required
              value={amount}
              onChange={setAmount}
            />
            <Field
              label={t("manager.finance.expenseDate")}
              id="ex-date"
              type="date"
              value={spentAt}
              onChange={setSpentAt}
            />
            <SelectField
              label={t("manager.finance.expenseSupplier")}
              id="ex-supplier"
              value={supplierId}
              options={[
                { value: "", label: "—" },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
              onChange={setSupplierId}
            />
          </div>
          <TextareaField
            label={t("manager.finance.expenseDescription")}
            id="ex-desc"
            value={description}
            required
            onChange={setDescription}
          />
        </>
      )}
    </ActionDialog>
  );
}
