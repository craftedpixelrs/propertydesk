"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markAll() {
    setBusy(true);
    try {
      await apiClient.post("/notifications/read-all");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" loading={busy} disabled={disabled} onClick={markAll}>
      {t("ui.notifications.markAllRead")}
    </Button>
  );
}
