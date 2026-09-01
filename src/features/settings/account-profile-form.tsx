"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { ThemeSwitcher } from "@/components/app/theme-switcher";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { toast } from "sonner";
import { useT } from "@/components/app/i18n-provider";

export function AccountProfileForm({
  name,
  email,
  emailVerified,
  impersonating,
  emailJustChanged,
}: {
  name: string;
  email: string;
  emailVerified: boolean;
  impersonating: boolean;
  emailJustChanged?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name);
  const [newEmail, setNewEmail] = useState(email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [emailPending, setEmailPending] = useState<string | null>(null);

  async function saveName() {
    setNameBusy(true);
    try {
      await apiClient.patch("/me", { name: displayName });
      toast.success(t("ops.account.nameSaved"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setNameBusy(false);
    }
  }

  async function saveEmail() {
    setEmailBusy(true);
    try {
      const result = await apiClient.post<{ requestedEmail: string }>("/me/email", {
        email: newEmail,
      });
      setEmailPending(result.requestedEmail);
      toast.success(t("ops.account.emailPending", { email }));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setEmailBusy(false);
    }
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      toast.error(t("validation.passwordsDoNotMatch"));
      return;
    }
    setPasswordBusy(true);
    try {
      await apiClient.post("/me/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("ops.account.passwordSaved"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-foreground-muted)]">
        {t("ops.account.subtitle")}
      </p>
      {impersonating ? (
        <Alert tone="warning">
          <AlertDescription>{t("ops.account.impersonationBlocked")}</AlertDescription>
        </Alert>
      ) : null}
      {emailJustChanged ? (
        <Alert tone="success">
          <AlertDescription>{t("ops.account.emailChanged")}</AlertDescription>
        </Alert>
      ) : null}
      {emailPending ? (
        <Alert tone="info">
          <AlertDescription>
            {t("ops.account.emailPending", { email })}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ops.account.nameTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="account-name">{t("common.name")}</Label>
            <Input
              id="account-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              disabled={impersonating}
              autoComplete="name"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void saveName()}
              loading={nameBusy}
              disabled={impersonating || displayName.trim().length < 2}
            >
              {t("common.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ops.account.emailTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("ops.account.emailHint")}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>{email}</span>
            <Badge tone={emailVerified ? "success" : "warning"}>
              {emailVerified ? t("ops.account.verified") : t("ops.account.unverified")}
            </Badge>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-email">{t("common.email")}</Label>
            <Input
              id="account-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={impersonating}
              autoComplete="email"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void saveEmail()}
              loading={emailBusy}
              disabled={impersonating || newEmail.trim() === email}
            >
              {t("common.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ops.account.passwordTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="account-current-password">
              {t("ops.account.currentPassword")}
            </Label>
            <Input
              id="account-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={impersonating}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-new-password">{t("ops.account.newPassword")}</Label>
            <Input
              id="account-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={impersonating}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-confirm-password">
              {t("ops.account.confirmNewPassword")}
            </Label>
            <Input
              id="account-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={impersonating}
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void savePassword()}
              loading={passwordBusy}
              disabled={
                impersonating ||
                !currentPassword ||
                newPassword.length < 10 ||
                newPassword !== confirmPassword
              }
            >
              {t("common.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ops.account.languageTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ops.account.themeTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeSwitcher />
        </CardContent>
      </Card>
    </div>
  );
}
