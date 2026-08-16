"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/components/app/i18n-provider";

export interface ImpersonateButtonProps {
  userId: string;
  userName: string;
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * SUPER_ADMIN-only button that starts a Better Auth impersonation session
 * for the target user. On success, we hard-reload into the tenant dashboard
 * so the newly minted cookie is honored on the very next request.
 *
 * The impersonation banner (rendered by the dashboard layout when
 * `session.impersonatedBy` is set) provides the "Vrati se u admin" exit.
 */
export function ImpersonateButton({
  userId,
  userName,
  disabled,
  disabledReason,
}: ImpersonateButtonProps) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImpersonate() {
    if (busy) return;
    const confirmed = window.confirm(
      t("admin.impersonate.confirm", { name: userName }),
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    try {
      const res = await authClient.admin.impersonateUser({ userId });
      if (res?.error) {
        setError(res.error.message ?? t("admin.impersonate.failed"));
        return;
      }
      // Force a full navigation so the new cookie is picked up cleanly.
      if (typeof window !== "undefined") {
        window.location.href = "/dashboard";
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message ?? t("admin.impersonate.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleImpersonate}
        loading={busy}
        disabled={disabled}
        title={disabled ? disabledReason : t("admin.impersonate.title")}
        className="gap-1"
      >
        <UserCog aria-hidden className="size-4" />
        {t("admin.impersonate.button")}
      </Button>
      {error ? (
        <span className="text-xs text-[var(--color-danger)]">{error}</span>
      ) : null}
    </div>
  );
}
