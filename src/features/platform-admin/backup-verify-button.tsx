"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

interface Response {
  status: "OK" | "FAIL";
  message: string;
}

/**
 * SUPER_ADMIN-only button that triggers the backup verifier on-demand.
 * The scheduled cron entry still runs weekly; this exists so ops can
 * confirm a fresh restore right after tweaking the backup pipeline.
 */
export function BackupVerifyButton() {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await apiClient.post<Response>(
        "/platform/monitoring/backup-verify",
        {},
      );
      if (res.status === "OK") {
        toast.success(t("admin.backupVerify.ok"), { description: res.message });
      } else {
        toast.error(t("admin.backupVerify.fail"), {
          description: res.message,
        });
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      toast.error(t("admin.backupVerify.error"), {
        description: (err as Error)?.message ?? t("admin.unknownError"),
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={run}
      disabled={running || pending}
    >
      {running || pending ? t("admin.running") : t("admin.backupVerify.runNow")}
    </Button>
  );
}
