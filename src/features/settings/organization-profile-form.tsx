"use client";

import { useState } from "react";
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

interface OrganizationProfileFormProps {
  organization: { id: string; name: string; slug: string | null };
  profile: OrganizationProfile | null;
  subscription: {
    plan: { code: string; name: string };
    status: string;
    trialEndsAt: Date | null;
  } | null;
  quota: QuotaSnapshot;
}

export function OrganizationProfileForm({
  organization,
  profile,
  subscription,
  quota,
}: OrganizationProfileFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const fd = new FormData(evt.currentTarget);
    const payload = {
      displayName: String(fd.get("displayName") ?? "").trim(),
      legalName: String(fd.get("legalName") ?? "").trim(),
      registrationNumber:
        (String(fd.get("registrationNumber") ?? "").trim() || null) ?? null,
      taxNumber: (String(fd.get("taxNumber") ?? "").trim() || null) ?? null,
      address: (String(fd.get("address") ?? "").trim() || null) ?? null,
      city: (String(fd.get("city") ?? "").trim() || null) ?? null,
      postalCode: (String(fd.get("postalCode") ?? "").trim() || null) ?? null,
      country: (String(fd.get("country") ?? "").trim() || null) ?? null,
      phone: (String(fd.get("phone") ?? "").trim() || null) ?? null,
      email: (String(fd.get("email") ?? "").trim() || null) ?? null,
      website: (String(fd.get("website") ?? "").trim() || null) ?? null,
    };

    try {
      await apiClient.patch("/organization/profile", payload);
      toast.success("Profil je sačuvan.");
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
              <Label htmlFor="displayName">Prikazni naziv</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={profile?.displayName ?? organization.name}
                required
              />
            </div>
            <div>
              <Label htmlFor="legalName">Pravni naziv</Label>
              <Input
                id="legalName"
                name="legalName"
                defaultValue={profile?.legalName ?? ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="taxNumber">PIB</Label>
              <Input
                id="taxNumber"
                name="taxNumber"
                defaultValue={profile?.taxNumber ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="registrationNumber">Matični broj</Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                defaultValue={profile?.registrationNumber ?? ""}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Adresa</Label>
              <Input
                id="address"
                name="address"
                defaultValue={profile?.address ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="city">Grad</Label>
              <Input id="city" name="city" defaultValue={profile?.city ?? ""} />
            </div>
            <div>
              <Label htmlFor="postalCode">Poštanski broj</Label>
              <Input
                id="postalCode"
                name="postalCode"
                defaultValue={profile?.postalCode ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile?.email ?? ""}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="website">Web adresa</Label>
              <Input id="website" name="website" defaultValue={profile?.website ?? ""} />
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
