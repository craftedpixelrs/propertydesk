"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

type Step = "upload" | "map" | "preview" | "done";

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

const IMPORT_FIELDS: { value: string; label: string }[] = [
  { value: "code", label: "Šifra jedinice (obavezno)" },
  { value: "type", label: "Tip (obavezno)" },
  { value: "status", label: "Status" },
  { value: "buildingCode", label: "Šifra objekta" },
  { value: "entranceCode", label: "Šifra ulaza" },
  { value: "floorLabel", label: "Oznaka sprata" },
  { value: "totalArea", label: "Ukupna površina (obavezno)" },
  { value: "internalArea", label: "Neto površina" },
  { value: "terraceArea", label: "Terasa" },
  { value: "gardenArea", label: "Bašta" },
  { value: "basePrice", label: "Osnovna cena (obavezno)" },
  { value: "finalPrice", label: "Konačna cena" },
  { value: "currency", label: "Valuta" },
  { value: "vatRate", label: "PDV" },
  { value: "bedrooms", label: "Spavaće sobe" },
  { value: "bathrooms", label: "Kupatila" },
  { value: "orientation", label: "Orijentacija" },
  { value: "publicDescription", label: "Javni opis" },
  { value: "internalNotes", label: "Interne napomene" },
  { value: "externalReference", label: "Ext. referenca" },
];

const AUTO_MAP: Record<string, string> = {
  code: "code",
  "šifra": "code",
  sifra: "code",
  type: "type",
  tip: "type",
  status: "status",
  buildingcode: "buildingCode",
  building_code: "buildingCode",
  objekat: "buildingCode",
  entrancecode: "entranceCode",
  ulaz: "entranceCode",
  floorlabel: "floorLabel",
  sprat: "floorLabel",
  totalarea: "totalArea",
  ukupna: "totalArea",
  povrsina: "totalArea",
  površina: "totalArea",
  internalarea: "internalArea",
  neto: "internalArea",
  terracearea: "terraceArea",
  terasa: "terraceArea",
  gardenarea: "gardenArea",
  basta: "gardenArea",
  bašta: "gardenArea",
  baseprice: "basePrice",
  cena: "basePrice",
  finalprice: "finalPrice",
  currency: "currency",
  valuta: "currency",
  vatrate: "vatRate",
  pdv: "vatRate",
  bedrooms: "bedrooms",
  spavace: "bedrooms",
  bathrooms: "bathrooms",
  kupatila: "bathrooms",
  orientation: "orientation",
  orijentacija: "orientation",
  publicdescription: "publicDescription",
  javnideskripcija: "publicDescription",
  internalnotes: "internalNotes",
  napomena: "internalNotes",
  externalreference: "externalReference",
};

function autoMap(header: string): string | null {
  const key = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  return AUTO_MAP[key] ?? null;
}

export function ImportWizard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [headerMap, setHeaderMap] = useState<Record<string, string | null>>({});
  const [validated, setValidated] = useState<ValidatedRow[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; ok: number; errors: number } | null>(null);
  const [commitResult, setCommitResult] = useState<{
    created: number;
    skipped: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const contentBase64 = btoa(binary);
      const data = await apiClient.post<ParsedFile>(
        `/projects/${projectId}/units/import`,
        { action: "parse", fileName: file.name, contentBase64 },
      );
      setParsed(data);
      const initialMap: Record<string, string | null> = {};
      for (const header of data.headers) {
        initialMap[header] = autoMap(header);
      }
      setHeaderMap(initialMap);
      setStep("map");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Greška prilikom čitanja fajla.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    if (!parsed) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.post<{ rows: ValidatedRow[]; summary: { total: number; ok: number; errors: number } }>(
        `/projects/${projectId}/units/import`,
        { action: "validate", headerMap, rows: parsed.rows },
      );
      setValidated(result.rows);
      setSummary(result.summary);
      setStep("preview");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Greška prilikom validacije.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!parsed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<typeof commitResult>(
        `/projects/${projectId}/units/import`,
        { action: "commit", headerMap, rows: parsed.rows },
      );
      setCommitResult(res as NonNullable<typeof commitResult>);
      setStep("done");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Greška prilikom uvoza.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Korak 1: Otpremanje fajla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={step !== "upload" || loading}
            className="block w-full text-sm"
          />
          {step === "upload" ? (
            <Button onClick={handleUpload} loading={loading} disabled={!file}>
              Učitaj i pređi na mapiranje
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {step !== "upload" && parsed ? (
        <Card>
          <CardHeader>
            <CardTitle>Korak 2: Mapiranje kolona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {parsed.headers.map((header) => (
                <div key={header} className="grid grid-cols-2 items-center gap-2">
                  <div className="font-mono text-xs">{header}</div>
                  <select
                    value={headerMap[header] ?? ""}
                    onChange={(e) =>
                      setHeaderMap((prev) => ({
                        ...prev,
                        [header]: e.target.value || null,
                      }))
                    }
                    className="h-10 rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
                    disabled={step !== "map"}
                  >
                    <option value="">— preskoči —</option>
                    {IMPORT_FIELDS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {step === "map" ? (
              <Button onClick={handleValidate} loading={loading}>
                Validiraj i pregledaj
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === "preview" || step === "done" ? (
        <Card>
          <CardHeader>
            <CardTitle>Korak 3: Pregled i potvrda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary ? (
              <div className="text-sm">
                Ukupno redova: <strong>{summary.total}</strong>. Ispravnih:{" "}
                <strong className="text-emerald-700">{summary.ok}</strong>. Sa greškom:{" "}
                <strong className="text-red-700">{summary.errors}</strong>.
              </div>
            ) : null}
            {validated?.some((r) => !r.ok) ? (
              <div className="max-h-80 overflow-auto rounded-md border border-red-200 bg-red-50 p-2 text-xs">
                {validated
                  .filter((r) => !r.ok)
                  .map((r) => (
                    <div key={r.index}>
                      Red {r.index + 1}: {r.errors.join("; ")}
                    </div>
                  ))}
              </div>
            ) : null}
            {step === "preview" ? (
              <div className="flex gap-2">
                <Button
                  onClick={handleCommit}
                  loading={loading}
                  disabled={!summary || summary.ok === 0}
                >
                  Potvrdi i uvezi {summary?.ok ?? 0} jedinica
                </Button>
                <Button variant="outline" onClick={() => setStep("map")}>
                  Nazad na mapiranje
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === "done" && commitResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Uvoz završen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              Kreirano: <strong className="text-emerald-700">{commitResult.created}</strong>.
              Preskočeno: <strong>{commitResult.skipped}</strong>. Grešaka:{" "}
              <strong className="text-red-700">{commitResult.errors.length}</strong>.
            </div>
            {commitResult.errors.length > 0 ? (
              <div className="max-h-60 overflow-auto rounded-md border border-red-200 bg-red-50 p-2 text-xs">
                {commitResult.errors.map((e, i) => (
                  <div key={i}>
                    Red {e.row}: {e.message}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button onClick={() => router.push(`/projekti/${projectId}`)}>
                Nazad na projekat
              </Button>
              <Button variant="outline" onClick={() => router.push("/jedinice")}>
                Pogledaj jedinice
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
