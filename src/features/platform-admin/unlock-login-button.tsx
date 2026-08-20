"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

export function UnlockLoginButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUnlock() {
    if (
      !window.confirm(
        t("admin.unlockLogin.confirm", { name: userName }),
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.patch(`/platform/users/${userId}`, { unlockLogin: true });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : t("admin.unlockLogin.failed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        loading={busy}
        onClick={onUnlock}
      >
        <Unlock aria-hidden className="size-4" />
        {t("admin.unlockLogin.trigger")}
      </Button>
      {error ? (
        <p className="max-w-40 text-right text-xs text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
