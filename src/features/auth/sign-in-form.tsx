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
import { apiClient } from "@/lib/api-client";
import { DemoLoginAccountsTable } from "@/features/auth/demo-login-accounts-table";
import {
  DEMO_LOGIN_PASSWORD,
  type DemoLoginAccount,
} from "@/features/auth/demo-login-accounts";

export function SignInForm({
  showDemoAccounts = false,
  afterForm,
}: {
  showDemoAccounts?: boolean;
  afterForm?: ReactNode;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      try {
        await apiClient.patch("/me", { locale });
      } catch {
        // Cookie already holds the guest choice.
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("errors.network"));
    } finally {
      setSubmitting(false);
    }
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
