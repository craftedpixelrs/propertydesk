"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Props {
  projectId: string;
}

export function RequestHandoverDialog({ projectId }: Props) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tax, setTax] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await apiClient.post(`/manager/handovers`, {
        projectId,
        targetContactEmail: email.trim(),
        targetContactName: name.trim() || null,
        targetTaxNumber: tax.trim() || null,
        notes: notes.trim() || null,
      });
      setSent(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("common.unexpectedError"));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setSent(false);
    setEmail("");
    setName("");
    setTax("");
    setNotes("");
    setError(null);
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("manager.handover.action")}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl">
        {sent ? (
          <>
            <div>
              <h2 className="text-lg font-semibold">{t("manager.handover.sentTitle")}</h2>
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {t("manager.handover.sentBody")}
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={close}>{t("common.close")}</Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold">{t("manager.handover.title")}</h2>
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {t("manager.handover.body")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Field
                label={t("manager.handover.targetEmail")}
                value={email}
                onChange={setEmail}
                type="email"
                required
              />
              <Field label={t("manager.handover.targetName")} value={name} onChange={setName} />
              <Field label={t("manager.handover.targetTax")} value={tax} onChange={setTax} />
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("manager.handover.notes")}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close} disabled={loading}>
                {t("inventory.discard")}
              </Button>
              <Button
                onClick={onSubmit}
                loading={loading}
                disabled={!email.trim() || !email.includes("@")}
              >
                {t("manager.handover.submit")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
      />
    </div>
  );
}
