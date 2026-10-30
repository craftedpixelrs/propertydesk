"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { ActionDialog, SelectField } from "./_shared/action-dialog";

type AllowedCategory = "BUILDING" | "TICKET" | "ASSEMBLY" | "DUES" | "INVOICE" | "OTHER";

const DEFAULT_CATEGORIES: AllowedCategory[] = ["BUILDING", "INVOICE", "DUES", "ASSEMBLY", "OTHER"];

export function UploadDocumentDialog({
  entityType,
  entityId,
  categories = DEFAULT_CATEGORIES,
  defaultCategory = "BUILDING",
}: {
  entityType: string;
  entityId: string;
  categories?: AllowedCategory[];
  defaultCategory?: AllowedCategory;
}) {
  const t = useT();
  const [category, setCategory] = useState<AllowedCategory>(defaultCategory);
  const [file, setFile] = useState<File | null>(null);
  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.uploadDocument")}</Button>}
      title={t("manager.actions.uploadDocument")}
      submitLabel={t("manager.actions.uploadDocument")}
      onSubmit={async () => {
        if (!file) throw new Error("Odaberite datoteku.");
        const form = new FormData();
        form.append("file", file);
        form.append("category", category);
        form.append("entityType", entityType);
        form.append("entityId", entityId);
        form.append("visibility", "INTERNAL");
        const res = await fetch("/api/v1/documents", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          throw new Error(j.error?.message ?? `HTTP ${res.status}`);
        }
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.documents.categoryField")}
            id="ud-cat"
            value={category}
            options={categories.map((c) => ({
              value: c,
              label: t(`manager.documents.category.${c}` as const),
            }))}
            onChange={(v) => v && setCategory(v)}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("manager.documents.fileField")}</label>
            <input
              type="file"
              onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </div>
        </>
      )}
    </ActionDialog>
  );
}

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onClick() {
    if (!window.confirm(t("manager.documents.deleteConfirm"))) return;
    setBusy(true);
    try {
      await fetch(`/api/v1/documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={busy}>
      {t("manager.actions.delete")}
    </Button>
  );
}
