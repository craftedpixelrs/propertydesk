"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { authClient } from "@/lib/auth-client";
import { useT } from "@/components/app/i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpCodeInput } from "@/features/auth/otp-code-input";
import { toast } from "sonner";

function secretFromUri(uri: string): string | null {
  try {
    return new URL(uri).searchParams.get("secret");
  } catch {
    return null;
  }
}

function authErrorMessage(
  code: string | undefined,
  fallback: string,
  t: (
    key: "ops.account.twoFactorWrongPassword" | "auth.twoFactorInvalid" | "errors.generic",
  ) => string,
): string {
  if (code === "INVALID_PASSWORD") return t("ops.account.twoFactorWrongPassword");
  if (code === "INVALID_CODE") return t("auth.twoFactorInvalid");
  return fallback;
}

export function TwoFactorSettings({
  enabled,
  required,
  impersonating,
  requiredGate = false,
}: {
  enabled: boolean;
  required: boolean;
  impersonating: boolean;
  /** Full-screen lock: the user cannot leave until enrollment finishes. */
  requiredGate?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!setup?.totpURI) {
      setQr(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(setup.totpURI, { margin: 1, width: 196 }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [setup?.totpURI]);

  async function startSetup() {
    setError(null);
    setBusy(true);
    try {
      const res = await authClient.twoFactor.enable({ password });
      if (res.error || !res.data) {
        setError(authErrorMessage(res.error?.code, res.error?.message ?? t("errors.generic"), t));
        return;
      }
      setSetup({
        totpURI: res.data.totpURI,
        backupCodes: res.data.backupCodes,
      });
      setPassword("");
    } catch {
      setError(t("errors.network"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(code: string) {
    setConfirmError(null);
    setConfirming(true);
    try {
      const res = await authClient.twoFactor.verifyTotp({ code });
      if (res.error) {
        setConfirmError(
          authErrorMessage(res.error.code, res.error.message ?? t("errors.generic"), t),
        );
        return;
      }
      toast.success(t("ops.account.twoFactorEnabled"));
      setSetup(null);
      router.refresh();
    } catch {
      setConfirmError(t("errors.network"));
    } finally {
      setConfirming(false);
    }
  }

  async function disable() {
    setError(null);
    setBusy(true);
    try {
      const res = await authClient.twoFactor.disable({ password });
      if (res.error) {
        setError(authErrorMessage(res.error.code, res.error.message ?? t("errors.generic"), t));
        return;
      }
      setPassword("");
      toast.success(t("ops.account.twoFactorDisabled"));
      router.refresh();
    } catch {
      setError(t("errors.network"));
    } finally {
      setBusy(false);
    }
  }

  const secret = setup ? secretFromUri(setup.totpURI) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("ops.account.twoFactorTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {requiredGate
            ? t("ops.account.twoFactorRequiredBanner")
            : t("ops.account.twoFactorSubtitle")}
        </p>

        {error ? (
          <Alert tone="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {enabled && !setup ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">{t("ops.account.twoFactorOn")}</p>
            {required ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {t("ops.account.twoFactorRequiredHint")}
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="two-factor-disable-password">
                    {t("ops.account.twoFactorPassword")}
                  </Label>
                  <Input
                    id="two-factor-disable-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    disabled={impersonating || busy}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  loading={busy}
                  disabled={impersonating || password.length === 0}
                  onClick={() => void disable()}
                >
                  {t("ops.account.twoFactorDisable")}
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {!enabled && !setup ? (
          <div className="space-y-3">
            <p className="text-sm">{t("ops.account.twoFactorOff")}</p>
            <div>
              <Label htmlFor="two-factor-password">{t("ops.account.twoFactorPassword")}</Label>
              <Input
                id="two-factor-password"
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={impersonating || busy}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="button"
              loading={busy}
              disabled={impersonating || password.length === 0}
              onClick={() => void startSetup()}
            >
              {t("ops.account.twoFactorStart")}
            </Button>
          </div>
        ) : null}

        {setup ? (
          <div className="space-y-4">
            <p className="text-sm">{t("ops.account.twoFactorScan")}</p>
            {qr ? (
              <img
                src={qr}
                alt={t("ops.account.twoFactorTitle")}
                width={196}
                height={196}
                className="rounded-md border border-[var(--color-border)] bg-white p-2"
              />
            ) : null}
            {secret ? (
              <div>
                <div className="text-xs text-[var(--color-foreground-muted)]">
                  {t("ops.account.twoFactorManual")}
                </div>
                <div className="mt-1 font-mono text-sm break-all">{secret}</div>
              </div>
            ) : null}
            <div>
              <div className="text-sm font-medium">{t("ops.account.twoFactorBackupCodes")}</div>
              <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
                {t("ops.account.twoFactorBackupOnce")}
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
                {setup.backupCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
            <OtpCodeInput
              id="two-factor-confirm"
              label={t("auth.twoFactorTitle")}
              hint={t("ops.account.twoFactorConfirmHint")}
              error={confirmError}
              disabled={confirming}
              onComplete={confirmCode}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
