import "server-only";
import { createId } from "@paralleldrive/cuid2";
import type {
  CompanyBillingProfile,
  Prisma,
  SefEnvironment,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import { encryptSecret, maskSecret } from "@/server/security/secrets";

/**
 * Company billing profile — the issuer identity used on every invoice.
 *
 * Kept as a table (not env vars) so operators can update the profile from
 * the admin UI. Historical invoices are shielded from changes via
 * `Invoice.issuerSnapshot`, which is populated at issue time from the
 * then-current profile.
 */

export interface CompanyBillingProfileInput {
  legalName: string;
  tradeName?: string | null;
  taxNumber: string;
  registrationNumber?: string | null;
  vatId?: string | null;
  vatRegistered?: boolean;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode: string;
  country?: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoStorageKey?: string | null;
  invoiceNote?: string | null;
  sefEnvironment?: SefEnvironment;
  sefEndpointUrl?: string | null;
  /** Provide a new plaintext SEF key to rotate it. Pass `null` to clear. */
  sefApiKey?: string | null;
}

export interface CompanyBillingProfilePublic
  extends Omit<CompanyBillingProfile, "sefApiKeyEncrypted"> {
  sefApiKeyMasked: string | null;
  sefApiKeyPresent: boolean;
}

function toPublic(row: CompanyBillingProfile): CompanyBillingProfilePublic {
  const { sefApiKeyEncrypted, ...rest } = row;
  return {
    ...rest,
    sefApiKeyMasked: sefApiKeyEncrypted ? maskSecret(sefApiKeyEncrypted) : null,
    sefApiKeyPresent: Boolean(sefApiKeyEncrypted),
  };
}

export async function getCompanyBillingProfile(): Promise<CompanyBillingProfilePublic | null> {
  const row = await prisma.companyBillingProfile.findFirst({
    where: { active: true },
  });
  return row ? toPublic(row) : null;
}

/**
 * Return the raw (encrypted-column-included) row. Never expose the ciphertext
 * to the client — this is intended for PDF rendering and SEF submission only.
 */
export async function getRawCompanyBillingProfile(): Promise<CompanyBillingProfile | null> {
  return prisma.companyBillingProfile.findFirst({ where: { active: true } });
}

export async function upsertCompanyBillingProfile(
  input: CompanyBillingProfileInput,
  actorUserId: string | null,
): Promise<CompanyBillingProfilePublic> {
  const existing = await prisma.companyBillingProfile.findFirst({
    where: { active: true },
  });

  // Basic Serbian tax-number sanity check: 9 digits.
  if (!/^\d{7,13}$/.test(input.taxNumber.replace(/\s+/g, ""))) {
    throw DomainErrors.badRequest(
      "PIB / poreski broj mora sadržati samo cifre (7–13 znakova).",
    );
  }

  const encryptedKey =
    input.sefApiKey === undefined
      ? undefined
      : input.sefApiKey === null
        ? null
        : encryptSecret(input.sefApiKey);

  const dataCommon: Prisma.CompanyBillingProfileUncheckedUpdateInput = {
    legalName: input.legalName,
    tradeName: input.tradeName ?? null,
    taxNumber: input.taxNumber,
    registrationNumber: input.registrationNumber ?? null,
    vatId: input.vatId ?? null,
    vatRegistered: input.vatRegistered ?? false,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? null,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country ?? "RS",
    email: input.email ?? null,
    phone: input.phone ?? null,
    website: input.website ?? null,
    logoStorageKey: input.logoStorageKey ?? null,
    invoiceNote: input.invoiceNote ?? null,
    sefEnvironment: input.sefEnvironment ?? "DISABLED",
    sefEndpointUrl: input.sefEndpointUrl ?? null,
  };
  if (encryptedKey !== undefined) {
    dataCommon.sefApiKeyEncrypted = encryptedKey;
  }

  const row = existing
    ? await prisma.companyBillingProfile.update({
        where: { id: existing.id },
        data: dataCommon,
      })
    : await prisma.companyBillingProfile.create({
        data: {
          ...(dataCommon as Prisma.CompanyBillingProfileUncheckedCreateInput),
          id: createId(),
          active: true,
        },
      });

  await recordAudit({
    action: "billing.company_profile_updated",
    entityType: "CompanyBillingProfile",
    entityId: row.id,
    actorUserId,
    previousValues: existing ? { ...existing, sefApiKeyEncrypted: "[REDACTED]" } : null,
    newValues: { ...row, sefApiKeyEncrypted: "[REDACTED]" },
  });

  return toPublic(row);
}
