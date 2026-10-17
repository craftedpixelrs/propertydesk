"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

export function BuyerLinkButton(props: { saleId: string }) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const data = await apiClient.post<{ url: string }>(`/sales/${props.saleId}/buyer-link`, {});
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" loading={busy} onClick={create}>
        {t("deals.clientPack.buyerLink")}
      </Button>
      {url ? (
        <div className="space-y-1">
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("deals.clientPack.buyerLinkReady")}
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              className="h-9 min-w-0 flex-1 rounded-md border border-[var(--color-border)] px-2 text-xs"
              value={url}
            />
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? t("deals.clientPack.copied") : t("deals.clientPack.copy")}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
