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
import { useI18n } from "@/components/app/i18n-provider";

export interface AcceptInvitationView {
  id: string;
  email: string;
  organizationName: string;
  role: string;
  status: string;
  requiresAgencyProfile?: boolean;
  investorName?: string | null;
}

export function AcceptInvitationForm({
  invitation,
}: {
  invitation: AcceptInvitationView;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agencyDisplayName, setAgencyDisplayName] = useState(
    invitation.organizationName,
  );
  const [agencyLegalName, setAgencyLegalName] = useState("");
  const [agencyTaxNumber, setAgencyTaxNumber] = useState("");
  const [agencyRegistrationNumber, setAgencyRegistrationNumber] = useState("");
  const [agencyAddress, setAgencyAddress] = useState("");
  const [agencyCity, setAgencyCity] = useState("");
  const [agencyPostalCode, setAgencyPostalCode] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const needsAgencyProfile = Boolean(invitation.requiresAgencyProfile);

  const sessionEmail = session?.user.email?.trim().toLowerCase() ?? null;
  const inviteEmail = invitation.email.trim().toLowerCase();
  const emailMatches = Boolean(sessionEmail && sessionEmail === inviteEmail);

  function agencyProfilePayload() {
    if (!needsAgencyProfile) return undefined;
    return {
      displayName: agencyDisplayName.trim(),
      legalName: agencyLegalName.trim(),
      taxNumber: agencyTaxNumber.trim(),
      registrationNumber: agencyRegistrationNumber.trim(),
      address: agencyAddress.trim(),
      city: agencyCity.trim(),
      postalCode: agencyPostalCode.trim(),
      phone: agencyPhone.trim(),
      email: invitation.email,
    };
  }

  async function acceptAsCurrentUser() {
    await apiClient.post(`/public/invitations/${invitation.id}/accept`, {
      agencyProfile: agencyProfilePayload(),
    });
    try {
      await apiClient.patch("/me", { locale });
    } catch {
      // Cookie already holds the guest choice.
    }
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
        agencyProfile: agencyProfilePayload(),
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

  function AgencyFields() {
    if (!needsAgencyProfile) return null;
    return (
      <div className="space-y-3 rounded-md border border-[var(--color-border)] p-3">
        <p className="text-sm font-medium">{t("auth.invitationAgencyFields")}</p>
        <p className="text-xs text-[var(--color-foreground-muted)]">
          {t("auth.invitationAgencyHint")}
        </p>
        <div>
          <Label htmlFor="agency-displayName">{t("ops.org.displayName")}</Label>
          <Input
            id="agency-displayName"
            required
            value={agencyDisplayName}
            onChange={(e) => setAgencyDisplayName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="agency-legalName">{t("ops.org.legalName")}</Label>
          <Input
            id="agency-legalName"
            required
            value={agencyLegalName}
            onChange={(e) => setAgencyLegalName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="agency-taxNumber">{t("ops.org.taxNumber")}</Label>
          <Input
            id="agency-taxNumber"
            required
            value={agencyTaxNumber}
            onChange={(e) => setAgencyTaxNumber(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="agency-registrationNumber">
            {t("ops.org.registrationNumber")}
          </Label>
          <Input
            id="agency-registrationNumber"
            required
            value={agencyRegistrationNumber}
            onChange={(e) => setAgencyRegistrationNumber(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="agency-address">{t("projects.fields.address")}</Label>
          <Input
            id="agency-address"
            required
            value={agencyAddress}
            onChange={(e) => setAgencyAddress(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="agency-city">{t("projects.fields.city")}</Label>
          <Input
            id="agency-city"
            required
            value={agencyCity}
            onChange={(e) => setAgencyCity(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="agency-postalCode">{t("projects.fields.postalCode")}</Label>
          <Input
            id="agency-postalCode"
            required
            value={agencyPostalCode}
            onChange={(e) => setAgencyPostalCode(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="agency-phone">{t("common.phone")}</Label>
          <Input
            id="agency-phone"
            required
            value={agencyPhone}
            onChange={(e) => setAgencyPhone(e.target.value)}
          />
        </div>
      </div>
    );
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
        {needsAgencyProfile
          ? t("auth.invitationAgencyOrg")
          : t("auth.invitationOrg", { name: invitation.organizationName })}
      </p>

      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {emailMatches ? (
        <div className="space-y-4">
          {needsAgencyProfile ? <AgencyFields /> : null}
          <FormActions>
            <Button onClick={() => void handleAccept()} loading={submitting}>
              {t("auth.acceptInvitation")}
            </Button>
          </FormActions>
        </div>
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
          <AgencyFields />
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
          <AgencyFields />
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
