"use client";

import * as React from "react";
import {
  Download,
  File as FileIcon,
  FileText,
  FileSpreadsheet,
  FileImage,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { formatDate } from "@/lib/formatters";

/**
 * Serialisable shape passed from RSC into this client list. The parent
 * page pre-fetches through `listDocuments()` and hands us a JSON-safe
 * subset — Dates are ISO strings, Decimals are already numbers.
 */
export interface DocumentItem {
  id: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  category: string;
  visibility: string;
  createdAt: string;
  uploadedByName: string | null;
}

interface Props {
  entityType: string;
  entityId: string;
  documents: DocumentItem[];
  category:
    | "PROJECT"
    | "UNIT"
    | "BUYER"
    | "RESERVATION"
    | "SALE"
    | "PAYMENT"
    | "AGENCY"
    | "COMMISSION"
    | "KYC"
    | "OTHER";
  canManage: boolean;
  /** If true, the "Deljivo sa kupcem" checkbox is offered next to upload. */
  offerBuyerVisibility?: boolean;
  /** Title used above the empty state. */
  emptyTitle?: string;
  /** Description used inside the empty state. */
  emptyDescription?: string;
  /** MIME accept string. Defaults to a broad "docs + images" list. */
  accept?: string;
  /**
   * When set and `canManage` is false, upload UI is fully hidden and the
   * list is read-only. Handy for the "unit docs" pane on Sale detail
   * page where operators must edit on the Unit itself.
   */
  hideUploadWhenNoPermission?: boolean;
}

const DEFAULT_ACCEPT =
  "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*,text/plain";

function iconFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return FileSpreadsheet;
  }
  if (mimeType.includes("word") || mimeType.includes("document")) {
    return FileText;
  }
  return FileIcon;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const VISIBILITY_LABELS: Record<string, string> = {
  INTERNAL: "Interno",
  INVESTOR_TEAM: "Investitor",
  AGENCY_SHARED: "Agencija",
  BUYER_SHARED: "Kupac",
};

/**
 * Non-image variant of PhotoGallery. Renders a list with a file icon,
 * name, uploader and size, plus download / delete actions. Uploads
 * flow through the same `POST /api/v1/documents` pipeline as the
 * gallery, with `entityType` / `entityId` / `category` fixed by the
 * parent page.
 */
export function DocumentList({
  entityType,
  entityId,
  documents,
  category,
  canManage,
  offerBuyerVisibility = false,
  emptyTitle = "Nema dokumenata",
  emptyDescription = "Otpremite ugovore, priloge i drugu dokumentaciju.",
  accept = DEFAULT_ACCEPT,
  hideUploadWhenNoPermission = false,
}: Props) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [buyerShared, setBuyerShared] = React.useState(false);

  const showUploadUi = canManage || !hideUploadWhenNoPermission;

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("category", category);
        form.append(
          "visibility",
          offerBuyerVisibility && buyerShared ? "BUYER_SHARED" : "INTERNAL",
        );
        form.append("entityType", entityType);
        form.append("entityId", entityId);
        const res = await fetch("/api/v1/documents", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
          throw new Error(
            payload?.error?.message ?? "Otpremanje nije uspelo.",
          );
        }
      }
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Došlo je do greške.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Obrisati dokument "${name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Brisanje nije uspelo.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Došlo je do greške.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {canManage && showUploadUi ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            loading={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1 size-4" /> Otpremi dokument
          </Button>
          {offerBuyerVisibility ? (
            <label className="flex items-center gap-1.5 text-xs text-[var(--color-foreground-muted)]">
              <input
                type="checkbox"
                checked={buyerShared}
                onChange={(e) => setBuyerShared(e.target.checked)}
              />
              Deljivo sa kupcem
            </label>
          ) : null}
          <span className="ml-auto text-xs text-[var(--color-foreground-muted)]">
            PDF, DOCX, XLSX, slike. Više fajlova odjednom.
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
          {documents.map((doc) => {
            const Icon = iconFor(doc.mimeType);
            return (
              <li
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <Icon className="size-5 shrink-0 text-[var(--color-foreground-muted)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {doc.originalFileName}
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {humanSize(doc.size)} ·{" "}
                    {VISIBILITY_LABELS[doc.visibility] ?? doc.visibility}
                    {doc.uploadedByName ? ` · ${doc.uploadedByName}` : ""} ·{" "}
                    {formatDate(doc.createdAt)}
                  </div>
                </div>
                <a
                  href={`/api/v1/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noopener"
                  className="rounded p-1.5 text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-foreground)]"
                  aria-label={`Preuzmi ${doc.originalFileName}`}
                  title="Preuzmi"
                >
                  <Download className="size-4" />
                </a>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(doc.id, doc.originalFileName)
                    }
                    className="rounded p-1.5 text-red-600 hover:bg-red-50"
                    aria-label={`Obriši ${doc.originalFileName}`}
                    title="Obriši"
                    disabled={busy}
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
