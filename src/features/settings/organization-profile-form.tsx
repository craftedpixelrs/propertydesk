"use client";

import { useState, type ReactNode } from "react";
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
import { Building2, Users, Package, Handshake } from "lucide-react";
import { t } from "@/lib/i18n";
import {
  isInvestorProfileComplete,
  normalizeWebsite,
} from "@/server/services/organization-profile-completeness";

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
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const investorRequired = orgType === "INVESTOR";
  const setupIncomplete =
    investorRequired && !isInvestorProfileComplete(profile);

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
        setupIncomplete ? t("orgProfile.savedAndReady") : "Profil je sačuvan.",
      );
      if (setupIncomplete) router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError("Neočekivana greška.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Aktivni projekti"
          value={`${quota.usage.projects}${quota.limits.projects != null ? " / " + quota.limits.projects : ""}`}
          icon={<Building2 className="size-5" />}
        />
        <StatCard
          label="Jedinice"
          value={`${quota.usage.units}${quota.limits.units != null ? " / " + quota.limits.units : ""}`}
          icon={<Package className="size-5" />}
        />
        <StatCard
          label="Korisnici"
          value={`${quota.usage.members}${quota.limits.members != null ? " / " + quota.limits.members : ""}`}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Agencije"
          value={`${quota.usage.agencies}${quota.limits.agencies != null ? " / " + quota.limits.agencies : ""}`}
          icon={<Handshake className="size-5" />}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Pretplata</CardTitle>
          {subscription ? (
            <Badge tone="brand">{subscription.plan.name}</Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          {subscription ? (
            <ul className="text-sm">
              <li>
                Status:{" "}
                <strong>{subscription.status}</strong>
              </li>
              {subscription.trialEndsAt ? (
                <li>
                  Probni period do:{" "}
                  <strong>{formatDate(subscription.trialEndsAt)}</strong>
                </li>
              ) : null}
              <li>
                Oznaka plana:{" "}
                <span className="font-mono text-xs">{subscription.plan.code}</span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Nema aktivne pretplate.
            </p>
          )}
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
            <AlertTitle>Greška</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Profil organizacije</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="displayName" required={investorRequired}>
                Prikazni naziv
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
                Pravni naziv
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
                PIB
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
                Matični broj
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
                Adresa
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
                Grad
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
                Poštanski broj
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
                Telefon
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
                Email
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
                Web adresa
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
                Samo administratori organizacije mogu menjati profil.
              </AlertDescription>
            </Alert>
          }
        >
          <div>
            <Button type="submit" loading={submitting}>
              Sačuvaj izmene
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
