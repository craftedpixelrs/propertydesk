"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";

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

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const defaultOrgName = companyName?.trim() || fullName || email.split("@")[0];
  const audienceLocked = audience === "INVESTOR" || audience === "AGENCY";
  const orgType = audience === "AGENCY" ? "AGENCY" : "INVESTOR";
  const ownerRoleLabel =
    orgType === "AGENCY" ? "Vlasnik agencije" : "Vlasnik (investitor)";

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
          <h3 className="text-sm font-semibold">Tenant organizacija</h3>
          <p className="text-sm">
            Lead je vezan za{" "}
            <strong>{linked?.name ?? "organizaciju"}</strong>. Vlasnik dalje
            upravlja članovima i pristupom iz svog naloga.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function linkExisting() {
    if (!convertOrg) {
      onError("Izaberite postojeću organizaciju.");
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
          : "Povezivanje sa organizacijom nije uspelo.",
      );
    } finally {
      onBusy(false);
    }
  }

  async function createNew() {
    if (!audienceLocked) {
      onError(
        "Prvo postavite publiku na Investitor ili Agencija — polje se zatim zaključava.",
      );
      return;
    }
    if (ownerPassword.trim().length < 10) {
      onError("Lozinka vlasnika mora imati najmanje 10 karaktera.");
      return;
    }
    if (!planCode) {
      onError("Izaberite paket (plan).");
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
          planCode,
          trialDays: Number.parseInt(trialDays, 10) || 30,
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
          : "Kreiranje organizacije nije uspelo.",
      );
    } finally {
      onBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="text-sm font-semibold">Onboarding u tenant</h3>
          <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
            {canCreateNewOrg
              ? "Lead je u L3. Vežite postojeću organizaciju ili napravite novu sa vlasnikom najvišeg stepena i paketom — on dalje dodaje naloge iz svog naloga."
              : "Lead je u L3. Vežite postojeću tenant organizaciju sa kojom je posao zaključen."}
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
              Nova organizacija
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "existing" ? "primary" : "outline"}
              onClick={() => setMode("existing")}
              disabled={busy}
            >
              Postojeća organizacija
            </Button>
          </div>
        ) : null}

        {mode === "existing" || !canCreateNewOrg ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Organizacija
              </span>
              <select
                value={convertOrg}
                onChange={(e) => setConvertOrg(e.target.value)}
                className={inputClass}
                disabled={busy}
              >
                <option value="">— izaberi organizaciju —</option>
                {matchingOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.type === "AGENCY"
                      ? " (Agencija)"
                      : o.type === "INVESTOR"
                        ? " (Investitor)"
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
              Veži za organizaciju
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!audienceLocked ? (
              <p className="rounded-md border border-[var(--color-warning)] p-3 text-sm">
                Publika mora biti Investitor ili Agencija pre kreiranja
                organizacije. Postavite je u kartici Kontakt — nakon toga se
                zaključava.
              </p>
            ) : (
              <p className="text-xs text-[var(--color-foreground-muted)]">
                Tip organizacije je zaključan prema publici:{" "}
                <strong>
                  {orgType === "AGENCY" ? "Agencija" : "Investitor"}
                </strong>
                . Vlasnik dobija ulogu {ownerRoleLabel}.
              </p>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  Naziv organizacije
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
                <span className="mb-1 block text-xs font-medium">Slug</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium">
                  Pravni naziv
                </span>
                <input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">Grad</span>
                <input
                  value={orgCity}
                  onChange={(e) => setOrgCity(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  Država (ISO)
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
                  E-mail organizacije
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
                <span className="mb-1 block text-xs font-medium">Telefon</span>
                <input
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium">Sajt</span>
                <input
                  value={orgWebsite}
                  onChange={(e) => setOrgWebsite(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">Paket</span>
                <select
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  className={inputClass}
                  disabled={busy || !audienceLocked}
                >
                  {plans.length === 0 ? (
                    <option value="">— nema aktivnih planova —</option>
                  ) : (
                    plans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  Probni period (dana)
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
            </div>

            <div className="rounded-md border border-[var(--color-border)] p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
                Vlasnik naloga · {ownerRoleLabel}
              </h4>
              <p className="mt-1 mb-3 text-xs text-[var(--color-foreground-muted)]">
                On se prijavljuje ovim nalogom i dalje sam dodaje članove sa
                potrebnim pristupom.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium">Ime</span>
                  <input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className={inputClass}
                    disabled={busy || !audienceLocked}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium">E-mail</span>
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
                    Početna lozinka (min. 10 karaktera)
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
              disabled={busy || !audienceLocked || !planCode}
            >
              Napravi organizaciju i vlasnika
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
