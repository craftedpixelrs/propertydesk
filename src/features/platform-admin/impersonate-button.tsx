"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImpersonate() {
    if (busy) return;
    const confirmed = window.confirm(
      `Ulogovaćete se kao "${userName}". Sve radnje u sledećih 60 min biće upisane u revizijski zapis pod Vašim imenom kao pokretačem. Nastaviti?`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    try {
      const res = await authClient.admin.impersonateUser({ userId });
      if (res?.error) {
        setError(res.error.message ?? "Impersonacija nije uspela.");
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
      setError((err as Error)?.message ?? "Impersonacija nije uspela.");
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
        title={disabled ? disabledReason : "Uloguj se kao ovaj korisnik"}
        className="gap-1"
      >
        <UserCog aria-hidden className="size-4" />
        Uloguj se kao
      </Button>
      {error ? (
        <span className="text-xs text-[var(--color-danger)]">{error}</span>
      ) : null}
    </div>
  );
}
