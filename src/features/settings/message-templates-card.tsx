"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

const KEYS = ["installment_reminder", "payment_receipt", "reservation_expiring"] as const;

type TemplateKey = (typeof KEYS)[number];

export function MessageTemplatesCard(props: { initial: Array<{ key: string; body: string }> }) {
  const { t } = useI18n();
  const [bodies, setBodies] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const row of props.initial) next[row.key] = row.body;
    return next;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiClient.put("/organization/message-templates", {
        templates: KEYS.map((key) => ({ key, body: bodies[key] ?? "" })),
      });
      setMessage(t("deals.messages.saved"));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("deals.messages.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--color-foreground-muted)]">{t("deals.messages.hint")}</p>
        {KEYS.map((key) => (
          <label key={key} className="block space-y-1">
            <span className="text-xs text-[var(--color-foreground-muted)]">
              {t(`deals.messages.${key}` as `deals.messages.${TemplateKey}`)}
            </span>
            <textarea
              className="min-h-20 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              value={bodies[key] ?? ""}
              disabled={busy}
              onChange={(event) =>
                setBodies((current) => ({ ...current, [key]: event.target.value }))
              }
            />
          </label>
        ))}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <Button size="sm" loading={busy} onClick={save}>
          {t("deals.messages.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
