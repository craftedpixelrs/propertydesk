"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { ActionDialog, TextareaField } from "./_shared/action-dialog";

export function ResendInviteButton({ accessId }: { accessId: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function onClick() {
    setBusy(true);
    setMsg(null);
    try {
      await apiClient.post(`/manager/residents/${accessId}/resend`);
      setMsg("Pozivnica je ponovo poslata.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : "Greška.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onClick} disabled={busy}>
        {t("manager.actions.resendInvite")}
      </Button>
      {msg ? <span className="text-xs text-[var(--color-foreground-muted)]">{msg}</span> : null}
    </span>
  );
}

export function RevokeAccessButton({ accessId }: { accessId: string }) {
  const t = useT();
  const [reason, setReason] = useState("");
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("manager.actions.revokeAccess")}
        </Button>
      }
      title={t("manager.residents.revoke")}
      submitLabel={t("manager.actions.revokeAccess")}
      submitVariant="destructive"
      onSubmit={async () => {
        const qs = reason.trim() ? `?reason=${encodeURIComponent(reason.trim())}` : "";
        await apiClient.delete(`/manager/residents/${accessId}${qs}`);
      }}
    >
      {() => (
        <TextareaField
          label={t("manager.payments.notesField")}
          id="rv-reason"
          value={reason}
          onChange={setReason}
        />
      )}
    </ActionDialog>
  );
}
