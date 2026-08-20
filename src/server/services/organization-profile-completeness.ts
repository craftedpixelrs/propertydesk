/**
 * Investor organization profile must be fully filled before the tenant
 * can use the product. Agencies use the same checklist except website.
 */

export const INVESTOR_REQUIRED_PROFILE_FIELDS = [
  "displayName",
  "legalName",
  "taxNumber",
  "registrationNumber",
  "address",
  "city",
  "postalCode",
  "phone",
  "email",
  "website",
] as const;

export type InvestorRequiredProfileField =
  (typeof INVESTOR_REQUIRED_PROFILE_FIELDS)[number];

export const INVESTOR_PROFILE_FIELD_LABEL: Record<
  InvestorRequiredProfileField,
  string
> = {
  displayName: "Prikazni naziv",
  legalName: "Pravni naziv",
  taxNumber: "PIB",
  registrationNumber: "Matični broj",
  address: "Adresa",
  city: "Grad",
  postalCode: "Poštanski broj",
  phone: "Telefon",
  email: "Email",
  website: "Web adresa",
};

export interface InvestorProfileFields {
  displayName?: string | null;
  legalName?: string | null;
  taxNumber?: string | null;
  registrationNumber?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

function filled(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function missingInvestorProfileFields(
  profile: InvestorProfileFields | null | undefined,
): InvestorRequiredProfileField[] {
  if (!profile) return [...INVESTOR_REQUIRED_PROFILE_FIELDS];
  return INVESTOR_REQUIRED_PROFILE_FIELDS.filter((field) => !filled(profile[field]));
}

export function isInvestorProfileComplete(
  profile: InvestorProfileFields | null | undefined,
): boolean {
  return missingInvestorProfileFields(profile).length === 0;
}

export const AGENCY_REQUIRED_PROFILE_FIELDS = [
  "displayName",
  "legalName",
  "taxNumber",
  "registrationNumber",
  "address",
  "city",
  "postalCode",
  "phone",
  "email",
] as const;

export type AgencyRequiredProfileField =
  (typeof AGENCY_REQUIRED_PROFILE_FIELDS)[number];

export function missingAgencyProfileFields(
  profile: InvestorProfileFields | null | undefined,
): AgencyRequiredProfileField[] {
  if (!profile) return [...AGENCY_REQUIRED_PROFILE_FIELDS];
  return AGENCY_REQUIRED_PROFILE_FIELDS.filter((field) => !filled(profile[field]));
}

export function isAgencyProfileComplete(
  profile: InvestorProfileFields | null | undefined,
): boolean {
  return missingAgencyProfileFields(profile).length === 0;
}

/** Accept `example.rs` by prefixing https:// so the URL check can run. */
export function normalizeWebsite(
  value: string | null | undefined,
): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}
