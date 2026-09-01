"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

export function NetworkCatalogRequestForm({
  investorOrganizationId,
  projectId,
  canRequest,
  lockedHint,
}: {
  investorOrganizationId: string;
  projectId: string;
  canRequest: boolean;
  lockedHint?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canRequest) {
    if (!lockedHint) return null;
    return (
      <p className="text-xs text-[var(--color-foreground-muted)]">
        {t("partners.catalog.needVerification")}
      </p>
    );
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/agency/connection-requests", {
        investorOrganizationId,
        projectId,
        message: message.trim() || null,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        {t("partners.catalog.request")}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        rows={3}
        maxLength={2000}
        placeholder={t("partners.catalog.messagePlaceholder")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={submit} loading={loading}>
          {t("partners.catalog.send")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          {t("common.cancel")}
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
