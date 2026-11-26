"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useT } from "@/components/app/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface ImportResult {
  updated: number;
  created: number;
  unchanged: number;
  errors: { row: number; message: string }[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function UnitsImportButton() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setFile(null);
    setError(null);
    setResult(null);
    setBusy(false);
  }

  async function submit() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const contentBase64 = await fileToBase64(file);
      const data = await apiClient.post<ImportResult>("/units/import", {
        fileName: file.name,
        contentBase64,
      });
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("inventory.units.importFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {t("inventory.units.importXlsx")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.units.importTitle")}</DialogTitle>
            <DialogDescription>{t("inventory.units.importHelp")}</DialogDescription>
          </DialogHeader>
          <label className="block text-sm">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
                setResult(null);
              }}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-[var(--color-border)] file:bg-[var(--color-surface-inset)] file:px-3 file:py-1.5 file:text-sm"
            />
          </label>
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          {result ? (
            <div className="space-y-2 text-sm">
              <p>
                {t("inventory.units.importDone", {
                  updated: result.updated,
                  created: result.created,
                  unchanged: result.unchanged,
                })}
              </p>
              {result.errors.length > 0 ? (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-[var(--color-danger)]">
                  {result.errors.slice(0, 30).map((item) => (
                    <li key={`${item.row}-${item.message}`}>
                      {t("inventory.import.rowErrors", { row: item.row, errors: item.message })}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {t("common.close")}
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={!file || busy}>
              {busy ? t("inventory.units.importWorking") : t("inventory.units.importSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
