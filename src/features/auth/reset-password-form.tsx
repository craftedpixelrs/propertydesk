"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormActions } from "@/components/forms/form-actions";
import { t } from "@/lib/i18n";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError(t("validation.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("validation.passwordsDoNotMatch"));
      return;
    }
    if (!token) {
      setError(t("errors.generic"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await authClient.resetPassword({ token, newPassword: password });
      if (res.error) {
        setError(res.error.message ?? t("errors.generic"));
        return;
      }
      router.push("/sign-in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Label htmlFor="password">{t("auth.password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-[var(--color-foreground-muted)] mt-1">
          {t("auth.weakPasswordHint")}
        </p>
      </div>

      <div>
        <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      <FormActions>
        <Button type="submit" loading={submitting} className="w-full sm:w-auto">
          {t("auth.newPasswordSubmit")}
        </Button>
      </FormActions>
    </form>
  );
}
