"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Small upload UI for a floor plan raster (PNG / JPG / SVG).
 *
 * Uploads go through the standard document pipeline
 * (`POST /api/v1/documents`, multipart, `entityType="Floor"`) so we
 * reuse the storage provider, RBAC and rate-limit already in place.
 * `loadFloorPlan()` falls back to the newest Floor-scoped image
 * Document when `Floor.floorPlanUrl` is null.
 *
 * Two render variants are available so callers can drop this into
 * either the empty state (large, self-explanatory) or the toolbar
 * (compact "change" button).
 */
interface Props {
  floorId: string;
  variant: "empty-state" | "compact";
  onUploaded?: () => void;
}

const ACCEPTED_MIME = "image/png,image/jpeg,image/jpg,image/webp,image/svg+xml";

export function FloorPlanUpload({ floorId, variant, onUploaded }: Props) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Datoteka mora biti slika.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", "OTHER");
      form.append("visibility", "INTERNAL");
      form.append("entityType", "Floor");
      form.append("entityId", floorId);
      const res = await fetch("/api/v1/documents", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(
          payload?.error?.message ?? "Otpremanje osnove nije uspelo.",
        );
      }
      if (inputRef.current) inputRef.current.value = "";
      onUploaded?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Došlo je do greške.");
    } finally {
      setBusy(false);
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_MIME}
      className="hidden"
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  if (variant === "compact") {
    return (
      <>
        {input}
        <Button
          variant="outline"
          size="sm"
          loading={busy}
          onClick={() => inputRef.current?.click()}
          title="Otpremi novu sliku osnove za ovaj sprat"
        >
          <Upload className="mr-1 size-4" />
          Promeni osnovu
        </Button>
        {error ? (
          <span className="ml-2 text-xs text-red-600">{error}</span>
        ) : null}
      </>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-inset)] p-6 text-center">
      {input}
      <p className="text-sm text-[var(--color-foreground)]">
        Ovaj sprat još nema učitanu osnovu.
      </p>
      <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
        Otpremite sliku plana (PNG, JPG, WebP ili SVG). Preko nje ćete
        kasnije crtati poligone jedinica.
      </p>
      <div className="mt-3">
        <Button
          loading={busy}
          onClick={() => inputRef.current?.click()}
          size="sm"
        >
          <Upload className="mr-1 size-4" />
          Otpremi osnovu
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
