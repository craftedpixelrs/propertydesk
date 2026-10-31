"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field, TextareaField } from "./_shared/action-dialog";

export function AdjustmentDialog({ unitId }: { unitId: string }) {
  const t = useT();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.ledger.adjustmentButton")}</Button>}
      title={t("manager.ledger.adjustmentTitle")}
      description={t("manager.ledger.adjustmentHint")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post(`/manager/units/${unitId}/adjustments`, {
          amount: Number(amount.replace(",", ".")),
          reason: reason.trim(),
          effectiveDate,
        });
        setAmount("");
        setReason("");
      }}
    >
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("manager.ledger.adjustmentAmount")}
              id="adj-amount"
              type="text"
              required
              placeholder="-150.00"
              value={amount}
              onChange={setAmount}
            />
            <Field
              label={t("manager.ledger.adjustmentDate")}
              id="adj-date"
              type="date"
              required
              value={effectiveDate}
              onChange={setEffectiveDate}
            />
          </div>
          <TextareaField
            label={t("manager.ledger.adjustmentReason")}
            id="adj-reason"
            required
            value={reason}
            onChange={setReason}
          />
        </>
      )}
    </ActionDialog>
  );
}
