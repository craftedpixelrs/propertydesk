"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormActions } from "@/components/forms/form-actions";
import { t } from "@/lib/i18n";

export interface AcceptInvitationView {
  id: string;
  email: string;
  organizationName: string;
  role: string;
  status: string;
}

export function AcceptInvitationForm({
  invitation,
}: {
  invitation: AcceptInvitationView;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sessionEmail = session?.user.email?.trim().toLowerCase() ?? null;
  const inviteEmail = invitation.email.trim().toLowerCase();
  const emailMatches = Boolean(sessionEmail && sessionEmail === inviteEmail);

  async function acceptAsCurrentUser() {
    await apiClient.post(`/public/invitations/${invitation.id}/accept`);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleAccept() {
    setError(null);
    setSubmitting(true);
    try {
      await acceptAsCurrentUser();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : t("errors.generic"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    setError(null);
    setSubmitting(true);
    try {
      await authClient.signOut();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
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
    setSubmitting(true);
    try {
      await apiClient.post(`/public/invitations/${invitation.id}/register`, {
        name,
        password,
      });
      const res = await authClient.signIn.email({
        email: invitation.email,
        password,
      });
      if (res.error) {
        setError(res.error.message ?? t("errors.generic"));
        setMode("signin");
        return;
      }
      await acceptAsCurrentUser();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : t("errors.generic"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authClient.signIn.email({
        email: invitation.email,
        password,
      });
      if (res.error) {
        setError(res.error.message ?? t("errors.generic"));
        return;
      }
      await acceptAsCurrentUser();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : t("errors.generic"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending) {
    return (
      <p className="text-sm text-[var(--color-foreground-muted)]">
        {t("common.loading")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-foreground-muted)]">
        {t("auth.invitationOrg", { name: invitation.organizationName })}
      </p>

      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {emailMatches ? (
        <FormActions>
          <Button onClick={() => void handleAccept()} loading={submitting}>
            {t("auth.acceptInvitation")}
          </Button>
        </FormActions>
      ) : sessionEmail ? (
        <div className="space-y-3">
          <Alert tone="danger">
            <AlertDescription>
              {t("auth.invitationWrongUser", {
                current: session?.user.email ?? sessionEmail ?? "",
                invited: invitation.email,
              })}
            </AlertDescription>
          </Alert>
          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSignOut()}
              loading={submitting}
            >
              {t("nav.signOut")}
            </Button>
          </FormActions>
        </div>
      ) : mode === "register" ? (
        <form onSubmit={(e) => void handleRegister(e)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="invite-email">{t("auth.email")}</Label>
            <Input
              id="invite-email"
              type="email"
              value={invitation.email}
              readOnly
              disabled
            />
          </div>
          <div>
            <Label htmlFor="invite-name">{t("auth.fullName")}</Label>
            <Input
              id="invite-name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="invite-password">{t("auth.password")}</Label>
            <Input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
              {t("auth.weakPasswordHint")}
            </p>
          </div>
          <div>
            <Label htmlFor="invite-confirm">{t("auth.confirmPassword")}</Label>
            <Input
              id="invite-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <FormActions>
            <Button type="submit" loading={submitting} className="w-full sm:w-auto">
              {t("auth.invitationCreateAccount")}
            </Button>
          </FormActions>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            <button
              type="button"
              className="font-medium text-[var(--color-brand-700)] hover:underline"
              onClick={() => {
                setError(null);
                setMode("signin");
              }}
            >
              {t("auth.invitationHaveAccount")}
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={(e) => void handleSignIn(e)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="signin-email">{t("auth.email")}</Label>
            <Input
              id="signin-email"
              type="email"
              value={invitation.email}
              readOnly
              disabled
            />
          </div>
          <div>
            <Label htmlFor="signin-password">{t("auth.password")}</Label>
            <Input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <FormActions>
            <Button type="submit" loading={submitting} className="w-full sm:w-auto">
              {t("auth.invitationSignInAccept")}
            </Button>
          </FormActions>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            <button
              type="button"
              className="font-medium text-[var(--color-brand-700)] hover:underline"
              onClick={() => {
                setError(null);
                setMode("register");
              }}
            >
              {t("auth.invitationNewAccount")}
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
