"use client";

import * as React from "react";
import { Star, StarOff, Trash2, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { useT } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

export interface PhotoItem {
  id: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  isCover: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PhotoGalleryProps {
  entityType: "Unit" | "Project";
  entityId: string;
  photos: PhotoItem[];
  /** Show upload UI + cover/delete controls; view-only when false. */
  canManage: boolean;
  /**
   * Category to attach to newly-uploaded images. Defaults to the
   * capitalised `entityType`.
   */
  uploadCategory?: "UNIT" | "PROJECT";
}

/**
 * Photo grid + lightbox + upload panel for entity detail pages.
 *
 * The component itself is intentionally UI-only: it drives all mutations
 * through the existing `/api/v1/documents/*` routes and calls
 * `router.refresh()` after each write so the RSC parent can re-fetch
 * from the server.
 */
export function PhotoGallery({
  entityType,
  entityId,
  photos,
  canManage,
  uploadCategory,
}: PhotoGalleryProps) {
  const t = useT();
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const category =
    uploadCategory ?? (entityType === "Unit" ? "UNIT" : "PROJECT");

  const orderedPhotos = React.useMemo(() => photos, [photos]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error(t("ops.gallery.notImage", { name: file.name }));
        }
        const form = new FormData();
        form.append("file", file);
        form.append("category", category);
        form.append("visibility", "BUYER_SHARED");
        form.append("entityType", entityType);
        form.append("entityId", entityId);
        const res = await fetch("/api/v1/documents", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(
            (payload?.error?.message as string | undefined) ??
              t("ops.documents.uploadFailed"),
          );
        }
      }
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSetCover(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/documents/${id}/set-cover`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(t("ops.gallery.coverFailed"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("ops.gallery.deleteConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("ops.documents.deleteFailed"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function navigate(direction: 1 | -1) {
    if (lightboxIndex == null) return;
    const next = (lightboxIndex + direction + orderedPhotos.length) % orderedPhotos.length;
    setLightboxIndex(next);
  }

  // Keyboard navigation while lightbox is open.
  React.useEffect(() => {
    if (lightboxIndex == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") navigate(-1);
      else if (e.key === "ArrowRight") navigate(1);
      else if (e.key === "Escape") setLightboxIndex(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, orderedPhotos.length]);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {t("ops.gallery.title")}{" "}
            <span className="text-xs font-normal text-[var(--color-foreground-muted)]">
              ({orderedPhotos.length})
            </span>
          </h3>
          {canManage ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
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
                <Upload className="mr-1 size-4" /> {t("ops.gallery.uploadPhotos")}
              </Button>
            </>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {orderedPhotos.length === 0 ? (
          <EmptyState
            title={t("ops.gallery.emptyTitle")}
            description={
              canManage
                ? t("ops.gallery.emptyCanManage")
                : t("ops.gallery.emptyReadOnly")
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {orderedPhotos.map((photo, index) => (
              <figure
                key={photo.id}
                className={cn(
                  "group relative overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)]",
                  photo.isCover ? "ring-2 ring-[var(--color-brand-600)]" : "",
                )}
              >
                <button
                  type="button"
                  onClick={() => openLightbox(index)}
                  className="block aspect-[4/3] w-full"
                  aria-label={t("ops.gallery.openPhoto", {
                    name: photo.originalFileName,
                  })}
                >
                  {/*
                   * Serve directly through the authenticated download
                   * route. `next/image` cannot help here because the
                   * origin is same-app and `images.remotePatterns` is
                   * empty by design.
                   */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/documents/${photo.id}/download`}
                    alt={photo.originalFileName}
                    loading="lazy"
                    className="size-full object-cover transition group-hover:scale-[1.02]"
                  />
                </button>
                {photo.isCover ? (
                  <div className="absolute left-1 top-1 rounded bg-[var(--color-brand-600)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                    {t("ops.gallery.coverBadge")}
                  </div>
                ) : null}
                {canManage ? (
                  <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetCover(photo.id);
                      }}
                      className="rounded bg-white/95 p-1 text-[var(--color-foreground)] shadow"
                      aria-label={
                        photo.isCover
                          ? t("ops.gallery.removeCover")
                          : t("ops.gallery.setCover")
                      }
                      disabled={busy}
                    >
                      {photo.isCover ? (
                        <StarOff className="size-3.5" />
                      ) : (
                        <Star className="size-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(photo.id);
                      }}
                      className="rounded bg-white/95 p-1 text-red-600 shadow"
                      aria-label={t("ops.gallery.deletePhoto")}
                      disabled={busy}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </figure>
            ))}
          </div>
        )}
      </CardContent>

      {lightboxIndex != null && orderedPhotos[lightboxIndex] ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded p-2 text-white hover:bg-white/10"
            aria-label={t("common.close")}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
          >
            <X className="size-6" />
          </button>
          {orderedPhotos.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label={t("common.previous")}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(-1);
                }}
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label={t("common.next")}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(1);
                }}
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/v1/documents/${orderedPhotos[lightboxIndex]!.id}/download`}
            alt={orderedPhotos[lightboxIndex]!.originalFileName}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-md shadow-xl"
          />
        </div>
      ) : null}
    </Card>
  );
}
