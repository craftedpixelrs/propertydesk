"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationProfile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/app/stat-card";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { PermissionGuard } from "@/components/app/permission-guard";
import { formatDate } from "@/lib/formatters/date";
import { toast } from "sonner";
import type { QuotaSnapshot } from "@/server/services/quotas.service";
import { Building2, Handshake, ImagePlus, Package, Users } from "lucide-react";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";
import { planAllowsWhiteLabel, withLogoCacheBust } from "@/lib/billing/white-label";
import {
  isInvestorProfileComplete,
  normalizeWebsite,
} from "@/server/services/organization-profile-completeness";

const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

interface OrganizationProfileFormProps {
  organization: { id: string; name: string; slug: string | null };
  profile: OrganizationProfile | null;
  subscription: {
    plan: { code: string; name: string };
    status: string;
    trialEndsAt: Date | null;
  } | null;
  quota: QuotaSnapshot;
  orgType: "INVESTOR" | "AGENCY" | null;
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {required ? (
        <span className="ml-0.5 text-[var(--color-danger)]" aria-hidden>
          *
        </span>
      ) : null}
    </Label>
  );
}

export function OrganizationProfileForm({
  organization,
  profile,
  subscription,
  quota,
  orgType,
}: OrganizationProfileFormProps) {
  const t = useT();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const investorRequired = orgType === "INVESTOR";
  const setupIncomplete =
    investorRequired && !isInvestorProfileComplete(profile);

  function subscriptionStatusLabel(status: string) {
    const key = `billing.subscriptionStatus.${status}` as TranslationKey;
    const out = t(key);
    return out === key ? status : out;
  }

  async function onSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const fd = new FormData(evt.currentTarget);
    const websiteRaw = String(fd.get("website") ?? "").trim();
    const payload = {
      displayName: String(fd.get("displayName") ?? "").trim(),
      legalName: String(fd.get("legalName") ?? "").trim(),
      registrationNumber:
        String(fd.get("registrationNumber") ?? "").trim() || null,
      taxNumber: String(fd.get("taxNumber") ?? "").trim() || null,
      address: String(fd.get("address") ?? "").trim() || null,
      city: String(fd.get("city") ?? "").trim() || null,
      postalCode: String(fd.get("postalCode") ?? "").trim() || null,
      country: String(fd.get("country") ?? "").trim() || null,
      phone: String(fd.get("phone") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      website: normalizeWebsite(websiteRaw),
    };

    try {
      await apiClient.patch("/organization/profile", payload);
      toast.success(
        setupIncomplete ? t("orgProfile.savedAndReady") : t("ops.org.profileSaved"),
      );
      if (setupIncomplete) router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError(t("common.unexpectedError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("ops.quota.activeProjects")}
          value={`${quota.usage.projects}${quota.limits.projects != null ? " / " + quota.limits.projects : ""}`}
          icon={<Building2 className="size-5" />}
        />
        <StatCard
          label={t("ops.quota.units")}
          value={`${quota.usage.units}${quota.limits.units != null ? " / " + quota.limits.units : ""}`}
          icon={<Package className="size-5" />}
        />
        <StatCard
          label={t("ops.quota.members")}
          value={`${quota.usage.members}${quota.limits.members != null ? " / " + quota.limits.members : ""}`}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label={t("ops.quota.agencies")}
          value={`${quota.usage.agencies}${quota.limits.agencies != null ? " / " + quota.limits.agencies : ""}`}
          icon={<Handshake className="size-5" />}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("ops.settings.subscription")}</CardTitle>
          {subscription ? (
            <Badge tone="brand">{subscription.plan.name}</Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          {subscription ? (
            <ul className="text-sm">
              <li>
                {t("common.statusLabel")}:{" "}
                <strong>{subscriptionStatusLabel(subscription.status)}</strong>
              </li>
              {subscription.trialEndsAt ? (
                <li>
                  {t("ops.org.trialUntil")}{" "}
                  <strong>{formatDate(subscription.trialEndsAt)}</strong>
                </li>
              ) : null}
              <li>
                {t("ops.org.planCode")}{" "}
                <span className="font-mono text-xs">{subscription.plan.code}</span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("ops.org.noSubscription")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("ops.org.logoTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationLogoField
            logoUrl={profile?.logoUrl ?? null}
            updatedAt={profile?.updatedAt ?? null}
            planCode={subscription?.plan.code ?? null}
          />
        </CardContent>
      </Card>

      <form onSubmit={onSubmit} className="space-y-4">
        {setupIncomplete ? (
          <Alert tone="warning">
            <AlertTitle>{t("orgProfile.setupBanner")}</AlertTitle>
            <AlertDescription>{t("orgProfile.requiredHint")}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert tone="danger">
            <AlertTitle>{t("ops.error")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("ops.org.profileTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="displayName" required={investorRequired}>
                {t("ops.org.displayName")}
              </FieldLabel>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={profile?.displayName ?? organization.name}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="legalName" required={investorRequired}>
                {t("ops.org.legalName")}
              </FieldLabel>
              <Input
                id="legalName"
                name="legalName"
                defaultValue={profile?.legalName ?? ""}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="taxNumber" required={investorRequired}>
                {t("ops.org.taxNumber")}
              </FieldLabel>
              <Input
                id="taxNumber"
                name="taxNumber"
                defaultValue={profile?.taxNumber ?? ""}
                required={investorRequired}
              />
            </div>
            <div>
              <FieldLabel htmlFor="registrationNumber" required={investorRequired}>
                {t("ops.org.registrationNumber")}
              </FieldLabel>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                defaultValue={profile?.registrationNumber ?? ""}
                required={investorRequired}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="address" required={investorRequired}>
                {t("projects.fields.address")}
              </FieldLabel>
              <Input
                id="address"
                name="address"
                defaultValue={profile?.address ?? ""}
                required={investorRequired}
              />
            </div>
            <div>
              <FieldLabel htmlFor="city" required={investorRequired}>
                {t("projects.fields.city")}
              </FieldLabel>
              <Input
                id="city"
                name="city"
                defaultValue={profile?.city ?? ""}
                required={investorRequired}
              />
            </div>
            <div>
              <FieldLabel htmlFor="postalCode" required={investorRequired}>
                {t("projects.fields.postalCode")}
              </FieldLabel>
              <Input
                id="postalCode"
                name="postalCode"
                defaultValue={profile?.postalCode ?? ""}
                required={investorRequired}
              />
            </div>
            <div>
              <FieldLabel htmlFor="phone" required={investorRequired}>
                {t("common.phone")}
              </FieldLabel>
              <Input
                id="phone"
                name="phone"
                defaultValue={profile?.phone ?? ""}
                required={investorRequired}
              />
            </div>
            <div>
              <FieldLabel htmlFor="email" required={investorRequired}>
                {t("common.email")}
              </FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile?.email ?? ""}
                required={investorRequired}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="website" required={investorRequired}>
                {t("ops.org.website")}
              </FieldLabel>
              <Input
                id="website"
                name="website"
                defaultValue={profile?.website ?? ""}
                required={investorRequired}
                placeholder="https://"
              />
            </div>
          </CardContent>
        </Card>

        <PermissionGuard
          permission="organization.manage"
          fallback={
            <Alert tone="info">
              <AlertDescription>
                {t("ops.org.adminOnly")}
              </AlertDescription>
            </Alert>
          }
        >
          <div>
            <Button type="submit" loading={submitting}>
              {t("common.saveChanges")}
            </Button>
            {Object.keys(fieldErrors).length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-[var(--color-danger)]">
                {Object.entries(fieldErrors).map(([field, msgs]) => (
                  <li key={field}>
                    <strong>{field}:</strong> {msgs.join(", ")}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </PermissionGuard>
      </form>
    </div>
  );
}

function OrganizationLogoField({
  logoUrl,
  updatedAt,
  planCode,
}: {
  logoUrl: string | null;
  updatedAt: Date | null;
  planCode: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = withLogoCacheBust(logoUrl, updatedAt);
  const whiteLabel = planAllowsWhiteLabel(planCode);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(t("ops.org.logoMustBeImage"));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError(t("ops.org.logoTooBig"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/organization/logo", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      if (!res.ok) {
        throw new Error(payload?.error?.message ?? t("ops.org.logoUploadFailed"));
      }
      if (inputRef.current) inputRef.current.value = "";
      toast.success(t("ops.org.logoUploaded"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ops.org.logoUploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      await apiClient.delete("/organization/logo");
      toast.success(t("ops.org.logoRemoved"));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : t("common.unexpectedError"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-foreground-muted)]">
        {t("ops.org.logoHint")}{" "}
        {whiteLabel ? t("ops.org.logoWhiteLabelHint") : t("ops.org.logoStarterHint")}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)]">
          {preview ? (
            <img
              src={preview}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <ImagePlus
              aria-hidden
              className="size-6 text-[var(--color-foreground-muted)]"
            />
          )}
        </div>
        <PermissionGuard permission="organization.manage">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={LOGO_ACCEPT}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={busy}
              onClick={() => inputRef.current?.click()}
            >
              {preview ? t("ops.org.logoChange") : t("ops.org.logoUpload")}
            </Button>
            {preview ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={handleRemove}
              >
                {t("ops.org.logoRemove")}
              </Button>
            ) : null}
          </div>
        </PermissionGuard>
      </div>
      {error ? (
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      ) : null}
    </div>
  );
}
