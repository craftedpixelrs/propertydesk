"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

type Audience = "INVESTOR" | "AGENCY" | "OTHER";

export interface ProvisionOrgOption {
  id: string;
  name: string;
  type: "INVESTOR" | "AGENCY" | null;
}

export interface ProvisionPlanOption {
  code: string;
  name: string;
}

interface Props {
  leadId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  audience: Audience;
  organizations: ProvisionOrgOption[];
  plans: ProvisionPlanOption[];
  canCreateNewOrg: boolean;
  convertedOrgId: string | null;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onError: (message: string | null) => void;
  onConverted: (organizationId: string, createdOwnerEmail?: string) => void;
}

const inputClass =
  "h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm disabled:opacity-60";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function LeadProvisionPanel(props: Props) {
  const {
    leadId,
    email,
    firstName,
    lastName,
    phone,
    city,
    country,
    companyName,
    companyWebsite,
    audience,
    organizations,
    plans,
    canCreateNewOrg,
    convertedOrgId,
    busy,
    onBusy,
    onError,
    onConverted,
  } = props;
  const t = useT();

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const defaultOrgName = companyName?.trim() || fullName || email.split("@")[0];
  const audienceLocked = audience === "INVESTOR" || audience === "AGENCY";
  const orgType = audience === "AGENCY" ? "AGENCY" : "INVESTOR";
  const ownerRoleLabel =
    orgType === "AGENCY" ? t("admin.pdProvision.ownerAgency") : t("admin.pdProvision.ownerInvestor");

  const [mode, setMode] = useState<"existing" | "new">(
    canCreateNewOrg ? "new" : "existing",
  );
  const [convertOrg, setConvertOrg] = useState("");

  const [orgName, setOrgName] = useState(defaultOrgName);
  const [slug, setSlug] = useState(slugify(defaultOrgName));
  const [legalName, setLegalName] = useState(companyName?.trim() || defaultOrgName);
  const [orgCity, setOrgCity] = useState(city ?? "");
  const [orgCountry, setOrgCountry] = useState(
    country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : "RS",
  );
  const [orgEmail, setOrgEmail] = useState(email);
  const [orgPhone, setOrgPhone] = useState(phone ?? "");
  const [orgWebsite, setOrgWebsite] = useState(companyWebsite ?? "");
  const [planCode, setPlanCode] = useState(plans[0]?.code ?? "");
  const [trialDays, setTrialDays] = useState("30");
  const [ownerName, setOwnerName] = useState(fullName || email);
  const [ownerEmail, setOwnerEmail] = useState(email);
  const [ownerPassword, setOwnerPassword] = useState("");

  const matchingOrgs = useMemo(() => {
    if (!audienceLocked) return organizations;
    return organizations.filter((o) => o.type === orgType || o.type === null);
  }, [audienceLocked, organizations, orgType]);

  if (convertedOrgId) {
    const linked = organizations.find((o) => o.id === convertedOrgId);
    return (
      <Card>
        <CardContent className="space-y-2 p-4">
          <h3 className="text-sm font-semibold">{t("admin.pdProvision.tenantOrg")}</h3>
          <p className="text-sm">
            {t("admin.pdProvision.linked", { name: linked?.name ?? t("admin.pdProvision.linkedFallback") })}
          </p>
        </CardContent>
      </Card>
    );
  }

  async function linkExisting() {
    if (!convertOrg) {
      onError(t("admin.pdProvision.pickExisting"));
      return;
    }
    onBusy(true);
    onError(null);
    try {
      await apiClient.post(`/platform/property-desk/leads/${leadId}/convert`, {
        organizationId: convertOrg,
      });
      onConverted(convertOrg);
    } catch (err) {
      onError(
        err instanceof ApiClientError
          ? err.message
          : t("admin.pdProvision.linkFailed"),
      );
    } finally {
      onBusy(false);
    }
  }

  async function createNew() {
    if (!audienceLocked) {
      onError(
        t("admin.pdProvision.audienceFirst"),
      );
      return;
    }
    if (ownerPassword.trim().length < 10) {
      onError(t("admin.pdProvision.passwordMin"));
      return;
    }
    if (orgType !== "AGENCY" && !planCode) {
      onError(t("admin.pdProvision.pickPlan"));
      return;
    }
    onBusy(true);
    onError(null);
    try {
      const result = await apiClient.post<{
        lead: { convertedOrganizationId: string | null };
        organization: { id: string };
        owner: { email: string };
      }>(`/platform/property-desk/leads/${leadId}/convert`, {
        createOrganization: {
          name: orgName.trim(),
          slug: slug.trim() || null,
          legalName: legalName.trim() || orgName.trim(),
          displayName: orgName.trim(),
          city: orgCity.trim() || null,
          country: orgCountry.trim().slice(0, 2) || "RS",
          email: orgEmail.trim() || null,
          phone: orgPhone.trim() || null,
          website: orgWebsite.trim() || null,
          planCode: orgType === "AGENCY" ? "partner" : planCode,
          trialDays: orgType === "AGENCY" ? 0 : Number.parseInt(trialDays, 10) || 30,
          owner: {
            name: ownerName.trim(),
            email: ownerEmail.trim(),
            password: ownerPassword,
          },
        },
      });
      onConverted(result.organization.id, result.owner.email);
    } catch (err) {
      onError(
        err instanceof ApiClientError
          ? err.message
          : t("admin.pdProvision.createFailed"),
      );
    } finally {
      onBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="text-sm font-semibold">{t("admin.pdProvision.onboarding")}</h3>
          <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
            {canCreateNewOrg
              ? t("admin.pdProvision.onboardingCanCreate")
              : t("admin.pdProvision.onboardingLinkOnly")}
          </p>
        </div>

        {canCreateNewOrg ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "new" ? "primary" : "outline"}
              onClick={() => setMode("new")}
              disabled={busy}
            >
              {t("admin.pdProvision.newOrg")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "existing" ? "primary" : "outline"}
              onClick={() => setMode("existing")}
              disabled={busy}
            >
              {t("admin.pdProvision.existingOrg")}
            </Button>
          </div>
        ) : null}

        {mode === "existing" || !canCreateNewOrg ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                {t("admin.pdProvision.organization")}
              </span>
              <select
                value={convertOrg}
                onChange={(e) => setConvertOrg(e.target.value)}
                className={inputClass}
                disabled={busy}
              >
                <option value="">{t("admin.pdProvision.pickOrg")}</option>
                {matchingOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.type === "AGENCY"
                      ? t("admin.pdProvision.agencySuffix")
                      : o.type === "INVESTOR"
                        ? t("admin.pdProvision.investorSuffix")
                        : ""}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              onClick={linkExisting}
              disabled={busy || !convertOrg}
            >
              {t("admin.pdProvision.linkOrg")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!audienceLocked ? (
              <p className="rounded-md border border-[var(--color-warning)] p-3 text-sm">
                {t("admin.pdProvision.audienceWarn")}
              </p>
            ) : (
              <p className="text-xs text-[var(--color-foreground-muted)]">
                {t("admin.pdProvision.typeLocked", {
                  type: t(`admin.pd.audience.${orgType}` as TranslationKey),
                  role: ownerRoleLabel,
                })}
              </p>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdProvision.orgName")}
                </span>
                <input
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    setSlug(slugify(e.target.value));
                  }}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdProvision.slug")}</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdProvision.legalName")}
                </span>
                <input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdProvision.city")}</span>
                <input
                  value={orgCity}
                  onChange={(e) => setOrgCity(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdProvision.countryIso")}
                </span>
                <input
                  value={orgCountry}
                  onChange={(e) =>
                    setOrgCountry(e.target.value.toUpperCase().slice(0, 2))
                  }
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                  maxLength={2}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdProvision.orgEmail")}
                </span>
                <input
                  type="email"
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdProvision.phone")}</span>
                <input
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdProvision.website")}</span>
                <input
                  value={orgWebsite}
                  onChange={(e) => setOrgWebsite(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              {orgType === "AGENCY" ? (
                <p className="md:col-span-2 text-sm text-[var(--color-foreground-muted)]">
                  {t("admin.pdProvision.agencyPartnerNote")}
                </p>
              ) : (
                <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdProvision.plan")}</span>
                <select
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                >
                  {plans.length === 0 ? (
                    <option value="">{t("admin.pdProvision.noPlans")}</option>
                  ) : (
                    plans.filter((p) => p.code !== "partner" && p.code !== "trial").map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdProvision.trialDays")}
                </span>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
                </>
              )}
            </div>

            <div className="rounded-md border border-[var(--color-border)] p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
                {t("admin.pdProvision.ownerHeading", { role: ownerRoleLabel })}
              </h4>
              <p className="mt-1 mb-3 text-xs text-[var(--color-foreground-muted)]">
                {t("admin.pdProvision.ownerHint")}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium">{t("admin.pdProvision.ownerName")}</span>
                  <input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className={inputClass}
                    disabled={busy || !audienceLocked}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium">{t("admin.pdProvision.ownerEmail")}</span>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className={inputClass}
                    disabled={busy || !audienceLocked}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-medium">
                    {t("admin.pdProvision.ownerPassword")}
                  </span>
                  <input
                    type="text"
                    autoComplete="new-password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className={inputClass}
                    disabled={busy || !audienceLocked}
                  />
                </label>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={createNew}
              disabled={busy || !audienceLocked || (orgType !== "AGENCY" && !planCode)}
            >
              {t("admin.pdProvision.createOwner")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
