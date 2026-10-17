"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormActions } from "@/components/forms/form-actions";
import { useI18n } from "@/components/app/i18n-provider";
import { useTheme } from "@/components/app/theme-provider";
import { apiClient } from "@/lib/api-client";
import { DemoLoginAccountsTable } from "@/features/auth/demo-login-accounts-table";
import { OtpCodeInput } from "@/features/auth/otp-code-input";
import { DEMO_LOGIN_PASSWORD, type DemoLoginAccount } from "@/features/auth/demo-login-accounts";

export function SignInForm({
  showDemoAccounts = false,
  afterForm,
}: {
  showDemoAccounts?: boolean;
  afterForm?: ReactNode;
}) {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [backup, setBackup] = useState("");
  const [verifying, setVerifying] = useState(false);

  function useDemoAccount(account: DemoLoginAccount) {
    setEmail(account.email);
    setPassword(DEMO_LOGIN_PASSWORD);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? t("errors.generic"));
        return;
      }
      const data = res.data as { twoFactorRedirect?: boolean } | null;
      if (data?.twoFactorRedirect) {
        setNeedsCode(true);
        return;
      }
      await finishSignedIn();
    } catch {
      setError(t("errors.network"));
    } finally {
      setSubmitting(false);
    }
  }

  function codeError(code: string | undefined, fallback: string | undefined) {
    if (code === "INVALID_CODE" || code === "INVALID_BACKUP_CODE") {
      return t("auth.twoFactorInvalid");
    }
    if (code === "ACCOUNT_TEMPORARILY_LOCKED") return t("auth.twoFactorLocked");
    return fallback ?? t("errors.generic");
  }

  async function finishSignedIn() {
    try {
      await apiClient.patch("/me", { locale, theme });
    } catch {
      // Cookie already holds the guest choice.
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function verifyCode(code: string) {
    setError(null);
    setVerifying(true);
    try {
      const res = await authClient.twoFactor.verifyTotp({ code });
      if (res.error) {
        setError(codeError(res.error.code, res.error.message));
        return;
      }
      await finishSignedIn();
    } catch {
      setError(t("errors.network"));
    } finally {
      setVerifying(false);
    }
  }

  async function verifyBackup(raw: string) {
    const code = raw.trim();
    if (!/^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/.test(code)) return;
    setError(null);
    setVerifying(true);
    try {
      const res = await authClient.twoFactor.verifyBackupCode({ code });
      if (res.error) {
        setError(codeError(res.error.code, res.error.message));
        setBackup("");
        return;
      }
      await finishSignedIn();
    } catch {
      setError(t("errors.network"));
    } finally {
      setVerifying(false);
    }
  }

  if (needsCode) {
    return (
      <div className="space-y-4">
        {useBackup ? (
          <div className="space-y-2">
            {error ? (
              <Alert tone="danger">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div>
              <Label htmlFor="backup-code">{t("auth.twoFactorBackup")}</Label>
              <Input
                id="backup-code"
                autoComplete="one-time-code"
                autoFocus
                value={backup}
                disabled={verifying}
                onChange={(e) => {
                  const next = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9-]/g, "")
                    .slice(0, 11);
                  setBackup(next);
                  setError(null);
                  if (/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(next)) void verifyBackup(next);
                }}
                className="text-center font-mono tracking-widest"
              />
            </div>
            <p className="text-xs text-[var(--color-foreground-muted)]">
              {t("auth.twoFactorBackupHint")}
            </p>
          </div>
        ) : (
          <OtpCodeInput
            id="sign-in-otp"
            label={t("auth.twoFactorTitle")}
            hint={t("auth.twoFactorHint")}
            error={error}
            disabled={verifying}
            onComplete={verifyCode}
          />
        )}
        <button
          type="button"
          className="text-sm font-medium text-[var(--color-brand-700)] hover:underline"
          onClick={() => {
            setUseBackup((v) => !v);
            setError(null);
            setBackup("");
          }}
        >
          {useBackup ? t("auth.twoFactorUseApp") : t("auth.twoFactorUseBackup")}
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <Alert tone="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div>
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <FormActions>
          <Button type="submit" loading={submitting} className="w-full sm:w-auto">
            {t("auth.signIn")}
          </Button>
        </FormActions>
      </form>
      {afterForm}
      {showDemoAccounts ? <DemoLoginAccountsTable onUse={useDemoAccount} /> : null}
    </>
  );
}
