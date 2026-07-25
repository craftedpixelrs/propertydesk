"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { apiClient } from "@/lib/api-client";

export function TaskCompleteButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function complete() {
    setBusy(true);
    try {
      await apiClient.post(`/tasks/${taskId}/complete`);
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={complete}
      disabled={busy}
      aria-label="Označi kao završeno"
      className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
    >
      <Check className="size-3.5" /> Završi
    </button>
  );
}
