"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormActions } from "@/components/forms/form-actions";
import { useT } from "@/components/app/i18n-provider";
import { publicEnv } from "@/lib/env";

export function ForgotPasswordForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Intentionally ignore success/error to avoid account-existence leak.
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/reset-password`,
      });
    } catch {
      // Same: never reveal whether a lookup failed.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <Alert tone="info">
        <AlertDescription>{t("auth.resetPasswordSent")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

      <FormActions>
        <Button type="submit" loading={submitting} className="w-full sm:w-auto">
          {t("auth.resetPasswordSubmit")}
        </Button>
      </FormActions>
    </form>
  );
}
