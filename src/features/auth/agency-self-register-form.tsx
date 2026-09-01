"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormActions } from "@/components/forms/form-actions";
import { useI18n } from "@/components/app/i18n-provider";

export function AgencySelfRegisterForm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
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
    setSubmitting(true);
    try {
      await apiClient.post("/public/agencies/register", {
        name,
        email,
        password,
        displayName,
        legalName,
        taxNumber,
        registrationNumber,
        address,
        city,
        postalCode,
        phone,
        website: website.trim() || null,
      });
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? t("errors.generic"));
        router.push("/sign-in");
        return;
      }
      try {
        await apiClient.patch("/me", { locale });
      } catch {
        // Cookie already holds the guest choice.
      }
      router.push("/katalog");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="owner-name">{t("auth.fullName")}</Label>
          <Input
            id="owner-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="owner-email">{t("common.email")}</Label>
          <Input
            id="owner-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("auth.weakPasswordHint")}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
      </div>

      <p className="text-sm font-medium">{t("auth.agencyRegisterFields")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">{t("ops.org.displayName")}</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="legalName">{t("ops.org.legalName")}</Label>
          <Input
            id="legalName"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taxNumber">{t("ops.org.taxNumber")}</Label>
          <Input
            id="taxNumber"
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registrationNumber">{t("ops.org.registrationNumber")}</Label>
          <Input
            id="registrationNumber"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address">{t("projects.fields.address")}</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">{t("projects.fields.city")}</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postalCode">{t("projects.fields.postalCode")}</Label>
          <Input
            id="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t("common.phone")}</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website">{t("ops.org.website")}</Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={t("common.optional")}
          />
        </div>
      </div>

      <FormActions>
        <Button type="submit" loading={submitting} className="w-full">
          {t("auth.agencyRegisterSubmit")}
        </Button>
      </FormActions>
    </form>
  );
}
