"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { intlLocale, type TranslateFn } from "@/lib/i18n";

export type ContractTemplateOption = {
  id: string;
  name: string;
  kind: "PRE_CONTRACT" | "CONTRACT";
};

const STATUS_STYLES: Record<string, string> = {
  NONE: "bg-slate-100 text-slate-700",
  GENERATED: "bg-blue-100 text-blue-800",
  SENT: "bg-amber-100 text-amber-800",
  SIGNED: "bg-emerald-100 text-emerald-800",
  CANCELED: "bg-slate-100 text-slate-500",
};

function contractStatusLabel(status: string, t: TranslateFn): string {
  switch (status) {
    case "NONE":
      return t("deals.contract.status.NONE");
    case "GENERATED":
      return t("deals.contract.status.GENERATED");
    case "SENT":
      return t("deals.contract.status.SENT");
    case "SIGNED":
      return t("deals.contract.status.SIGNED");
    case "CANCELED":
      return t("deals.contract.status.CANCELED");
    default:
      return status;
  }
}

/**
 * Faza 8.1 (A1) — "Ugovor" panel on `/prodaje/[id]`.
 *
 * Renders a status badge + template picker + Generate PDF button, plus
 * lifecycle actions (Označi poslatim / Označi potpisanim). The
 * generated PDF is streamed as a download AND filed as a Sale
 * Document; refreshing the page surfaces the newly attached file.
 */
export function ContractSection(props: {
  saleId: string;
  contractStatus: string;
  contractSentAt: string | null;
  contractSignedAt: string | null;
  contractTemplateId: string | null;
  templates: ContractTemplateOption[];
  canManage: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(
    props.contractTemplateId ??
      props.templates.find((tmpl) => tmpl.kind === "PRE_CONTRACT")?.id ??
      props.templates[0]?.id ??
      "",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const pre = props.templates.filter((tmpl) => tmpl.kind === "PRE_CONTRACT");
    const full = props.templates.filter((tmpl) => tmpl.kind === "CONTRACT");
    return { pre, full };
  }, [props.templates]);

  const noTemplates = props.templates.length === 0;

  async function generatePdf() {
    if (!selectedId) return;
    setError(null);
    setBusy("generate");
    try {
      const res = await fetch(`/api/v1/sales/${props.saleId}/contract/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: selectedId, attachToSale: true }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(err.error?.message ?? t("deals.contract.generateFailed"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const cd = res.headers.get("content-disposition") ?? "";
      const filenameMatch = /filename="?([^"]+)"?/.exec(cd);
      anchor.href = url;
      anchor.download = filenameMatch?.[1] ?? t("deals.contract.defaultFilename");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(null);
    }
  }

  async function transition(action: "mark-sent" | "mark-signed") {
    setError(null);
    setBusy(action);
    try {
      await apiClient.post(`/sales/${props.saleId}/contract/${action}`, {});
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : t("errors.generic"),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[props.contractStatus] ?? STATUS_STYLES.NONE}`}
        >
          {contractStatusLabel(props.contractStatus, t)}
        </span>
        <div className="text-xs text-[var(--color-foreground-muted)]">
          {props.contractSignedAt ? (
            <span>
              {t("deals.contract.signedOn", {
                date: new Date(props.contractSignedAt).toLocaleDateString(intlLocale(locale)),
              })}
            </span>
          ) : props.contractSentAt ? (
            <span>
              {t("deals.contract.sentOn", {
                date: new Date(props.contractSentAt).toLocaleDateString(intlLocale(locale)),
              })}
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {noTemplates ? (
        <p className="rounded-md border border-dashed border-[var(--color-border)] p-3 text-sm text-[var(--color-foreground-muted)]">
          {t("deals.contract.noTemplates")}{" "}
          <a
            href="/podesavanja/ugovori-sabloni"
            className="font-medium text-[var(--color-brand-700)] hover:underline"
          >
            {t("deals.contract.openSettings")}
          </a>
        </p>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs text-[var(--color-foreground-muted)]">
            {t("deals.contract.pickTemplate")}
          </label>
          <select
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={!props.canManage || busy != null}
          >
            {groups.pre.length ? (
              <optgroup label={t("deals.contract.preContracts")}>
                {groups.pre.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {groups.full.length ? (
              <optgroup label={t("deals.contract.contracts")}>
                {groups.full.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </div>
      )}

      {props.canManage ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            loading={busy === "generate"}
            disabled={noTemplates || !selectedId}
            onClick={generatePdf}
          >
            {t("deals.contract.generatePdf")}
          </Button>
          {props.contractStatus === "GENERATED" ? (
            <Button
              size="sm"
              variant="outline"
              loading={busy === "mark-sent"}
              onClick={() => transition("mark-sent")}
            >
              {t("deals.contract.markSent")}
            </Button>
          ) : null}
          {props.contractStatus === "GENERATED" ||
          props.contractStatus === "SENT" ? (
            <Button
              size="sm"
              loading={busy === "mark-signed"}
              onClick={() => transition("mark-signed")}
            >
              {t("deals.contract.markSigned")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
