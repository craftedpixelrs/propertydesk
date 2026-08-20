"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";

const ACCEPT = "image/png,image/jpeg,image/webp";

interface Props {
  value: string;
  projectId?: string;
  onChange: (url: string) => void;
  error?: string[];
}

export function CoverImageField({ value, projectId, onChange, error }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const preview = localPreview ?? value;

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLocalError(t("inventory.form.coverMustBeImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError(t("inventory.form.coverTooBig"));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setBusy(true);
    setLocalError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (projectId) form.append("projectId", projectId);
      const res = await fetch("/api/v1/projects/cover", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const payload = (await res.json().catch(() => null)) as {
        data?: { coverImageUrl?: string };
        error?: { message?: string };
      } | null;
      if (!res.ok || !payload?.data?.coverImageUrl) {
        throw new Error(payload?.error?.message ?? t("inventory.form.coverUploadFailed"));
      }
      onChange(payload.data.coverImageUrl);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : t("inventory.form.coverUploadFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{t("inventory.form.coverImageUrl")}</div>
      <p className="text-xs text-[var(--color-foreground-muted)]">
        {t("inventory.form.coverImageUrlHint")}
      </p>
      {preview ? (
        <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="h-48 w-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {preview ? t("inventory.form.coverChange") : t("inventory.form.coverUpload")}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setLocalPreview(null);
              onChange("");
            }}
          >
            {t("inventory.form.coverRemove")}
          </Button>
        ) : null}
      </div>
      {localError ? <p className="text-xs text-red-600">{localError}</p> : null}
      {error?.map((msg, idx) => (
        <p key={idx} className="text-xs text-red-600">
          {msg}
        </p>
      ))}
    </div>
  );
}
