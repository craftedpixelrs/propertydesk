"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

/**
 * Faza 11 — guided XLSX/CSV import of a building's units + primary owners.
 *
 * Steps: upload → parse → validate → commit. Field mapping uses heuristic
 * header auto-detection (header text or lowercased header matches the
 * canonical column name), with a dropdown override before validation.
 */

const CANONICAL_FIELDS = [
  "code",
  "type",
  "entranceCode",
  "floor",
  "totalArea",
  "participationShare",
  "roomCount",
  "ownerFirstName",
  "ownerLastName",
  "ownerLegalName",
  "ownerEmail",
  "ownerPhone",
  "ownerRole",
  "notes",
] as const;

type Field = (typeof CANONICAL_FIELDS)[number];

const HEADER_HINTS: Record<Field, RegExp> = {
  code: /^(oznaka|code|šifra|sifra)/i,
  type: /^(tip|type)/i,
  entranceCode: /^(ulaz|entrance)/i,
  floor: /^(sprat|floor)/i,
  totalArea: /^(površina|povrsina|area|m2|m²)/i,
  participationShare: /^(udeo|share)/i,
  roomCount: /^(broj\s*soba|rooms|sobe)/i,
  ownerFirstName: /ime/i,
  ownerLastName: /prezime/i,
  ownerLegalName: /pravno/i,
  ownerEmail: /email/i,
  ownerPhone: /(telefon|phone)/i,
  ownerRole: /(uloga|role)/i,
  notes: /(napomena|note)/i,
};

function autoMap(header: string): Field | null {
  for (const field of CANONICAL_FIELDS) {
    if (HEADER_HINTS[field].test(header)) return field;
  }
  return null;
}

interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

interface ValidatedRow {
  index: number;
  ok: boolean;
  errors: string[];
  raw: Record<string, string>;
}

export function BuildingImportWizard({ buildingId }: { buildingId: string }) {
  const t = useT();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [headerMap, setHeaderMap] = useState<Record<string, Field | null>>({});
  const [validated, setValidated] = useState<ValidatedRow[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; ok: number; errors: number } | null>(
    null,
  );
  const [commitResult, setCommitResult] = useState<{
    created: number;
    skipped: number;
    ownersCreated: number;
    ownershipsCreated: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fieldOptions = useMemo(() => CANONICAL_FIELDS, []);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      // Base64-encode the file so we can POST it as JSON through apiClient.
      const base64 = base64FromArrayBuffer(buffer);
      const result = await apiClient.post<ParsedFile>(`/manager/buildings/${buildingId}/import`, {
        action: "parse",
        fileName: file.name,
        contentBase64: base64,
      });
      setParsed(result);
      // seed header map with heuristics
      const seed: Record<string, Field | null> = {};
      for (const h of result.headers) {
        seed[h] = autoMap(h);
      }
      setHeaderMap(seed);
      setValidated(null);
      setSummary(null);
      setCommitResult(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    if (!parsed) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.post<{
        rows: ValidatedRow[];
        summary: { total: number; ok: number; errors: number };
      }>(`/manager/buildings/${buildingId}/import`, {
        action: "validate",
        headerMap,
        rows: parsed.rows,
      });
      setValidated(result.rows);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!parsed) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.post<{
        created: number;
        skipped: number;
        ownersCreated: number;
        ownershipsCreated: number;
      }>(`/manager/buildings/${buildingId}/import`, {
        action: "commit",
        headerMap,
        rows: parsed.rows,
      });
      setCommitResult(result);
      // refresh server data so the units tab shows the new rows.
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">1. {t("manager.import.chooseFile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("manager.import.description")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <a href={`/api/v1/manager/buildings/${buildingId}/import`}>
                {t("manager.import.downloadTemplate")}
              </a>
            </Button>
          </div>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
            className="block text-sm"
          />
          <Button type="button" onClick={handleUpload} disabled={!file || loading}>
            {t("manager.import.actionParse")}
          </Button>
        </CardContent>
      </Card>

      {parsed ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">2. {t("manager.import.actionValidate")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {parsed.headers.map((h) => (
                <label key={h} className="flex items-center gap-2 text-sm">
                  <span className="min-w-[12rem] truncate text-[var(--color-foreground-muted)]">
                    {h}
                  </span>
                  <select
                    className="h-9 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                    value={headerMap[h] ?? ""}
                    onChange={(e) =>
                      setHeaderMap((prev) => ({
                        ...prev,
                        [h]: (e.currentTarget.value || null) as Field | null,
                      }))
                    }
                  >
                    <option value="">—</option>
                    {fieldOptions.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <Button type="button" onClick={handleValidate} disabled={loading}>
              {t("manager.import.actionValidate")}
            </Button>
            {summary ? (
              <p className="text-sm">
                {t("manager.import.summary", {
                  total: summary.total,
                  ok: summary.ok,
                  errors: summary.errors,
                })}
              </p>
            ) : null}
            {validated && validated.filter((r) => !r.ok).length > 0 ? (
              <div className="max-h-64 overflow-auto rounded-md border border-red-200 bg-red-50/40 p-3 text-xs">
                <ul className="space-y-1">
                  {validated
                    .filter((r) => !r.ok)
                    .slice(0, 50)
                    .map((r) => (
                      <li key={r.index}>
                        <strong>#{r.index + 2}</strong>: {r.errors.join(" · ")}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {summary && summary.ok > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">3. {t("manager.import.actionCommit")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" onClick={handleCommit} disabled={loading}>
              {t("manager.import.actionCommit")} ({summary.ok})
            </Button>
            {commitResult ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <strong className="block">{t("manager.import.successTitle")}</strong>
                {t("manager.import.successBody", {
                  created: commitResult.created,
                  owners: commitResult.ownersCreated,
                  ownerships: commitResult.ownershipsCreated,
                  skipped: commitResult.skipped,
                })}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function base64FromArrayBuffer(buffer: ArrayBuffer): string {
  // btoa works on binary strings only, so chunk the bytes to avoid blowing the stack.
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return typeof window !== "undefined"
    ? window.btoa(binary)
    : Buffer.from(buffer).toString("base64");
}
