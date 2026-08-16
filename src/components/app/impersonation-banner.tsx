"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";

export interface ImpersonationBannerProps {
  userName: string;
  organizationName: string | null;
}

/**
 * Rendered by the dashboard shell whenever `session.impersonatedBy` is set.
 * Provides a highly visible cue that the currently signed-in session was
 * initiated by a SUPER_ADMIN via the admin plugin's impersonation flow.
 */
export function ImpersonationBanner({ userName, organizationName }: ImpersonationBannerProps) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleStop() {
    setBusy(true);
    try {
      await authClient.admin.stopImpersonating();
      router.push("/administracija");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-2 border-b border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-4 py-2 text-sm text-[var(--color-warning)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert aria-hidden className="mt-0.5 size-4 flex-none" />
        <div>
          <div className="font-medium">{t("impersonation.banner")}</div>
          <div className="text-xs opacity-90">
            {t("impersonation.impersonatingAs")} <strong>{userName}</strong>
            {organizationName ? (
              <>
                {" "}
                {t("impersonation.inOrganization")} <strong>{organizationName}</strong>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleStop}
        loading={busy}
        className="self-start bg-[var(--color-surface)] sm:self-auto"
      >
        {t("impersonation.stop")}
      </Button>
    </div>
  );
}
