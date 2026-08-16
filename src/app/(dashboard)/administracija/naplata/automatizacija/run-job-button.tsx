"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useT } from "@/components/app/i18n-provider";

/**
 * Manual-run trigger. Posts to `/api/v1/billing/jobs/{name}/run`, refreshes
 * the current page on success so the "recent runs" table reflects the new
 * `BillingJobRun` row without a full navigation.
 */
export function RunJobButton({ name }: { name: string }) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();

  async function trigger() {
    if (!confirm(t("admin.automation.confirmRun", { name }))) return;
    try {
      const res = await fetch(`/api/v1/billing/jobs/${name}/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(t("admin.errorPrefix", { message: err?.error?.message ?? res.statusText }));
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      alert(t("admin.errorPrefix", { message: (err as Error).message }));
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={trigger} disabled={pending}>
      <Play className="size-4" />
      {pending ? t("admin.runningEllipsis") : t("admin.automation.runNow")}
    </Button>
  );
}
