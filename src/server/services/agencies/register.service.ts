import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { randomBytes } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { AGENCY_PARTNER_PLAN_CODE } from "@/lib/billing/agency-partner";
import { agencyNameFromEmail, slugifyAgencyName } from "@/lib/agencies/name";
import { isAgencyProfileComplete } from "@/server/services/organization-profile-completeness";

export interface RegisterAgencyInput {
  ownerName: string;
  email: string;
  password: string;
  displayName: string;
  legalName: string;
  taxNumber: string;
  registrationNumber: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  website?: string | null;
}

async function hashCredentialPassword(password: string): Promise<string> {
  const mod = (await import("better-auth/crypto")) as {
    hashPassword?: (p: string) => Promise<string>;
  };
  if (!mod.hashPassword) {
    throw DomainErrors.invalidState(
      "Hashiranje lozinke nije dostupno. Proverite better-auth paket.",
    );
  }
  return mod.hashPassword(password);
}

async function uniqueAgencySlug(base: string): Promise<string> {
  const root = slugifyAgencyName(base);
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix =
      attempt === 0
        ? ""
        : `-${Array.from(randomBytes(3))
            .map((b) => alphabet[b % alphabet.length])
            .join("")}`;
    const slug = `${root}${suffix}`;
    const clash = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!clash) return slug;
  }
  return `${root}-${createId().slice(0, 8)}`;
}

/**
 * Public self-registration for an agency partner account.
 *
 * Creates User + credential Account + AGENCY org on the free `partner`
 * plan. Profile starts `PENDING` — the agency can browse the network
 * catalog, but cannot send connection requests until a super-admin
 * (or a later investor accept) marks them `VERIFIED`.
 */
export async function registerAgency(
  input: RegisterAgencyInput,
): Promise<{ email: string; organizationId: string }> {
  const ownerName = input.ownerName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const profile = {
    displayName: input.displayName.trim(),
    legalName: input.legalName.trim(),
    taxNumber: input.taxNumber.trim(),
    registrationNumber: input.registrationNumber.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    postalCode: input.postalCode.trim(),
    phone: input.phone.trim(),
    email,
    website: input.website?.trim() || null,
  };

  if (ownerName.length < 2) {
    throw DomainErrors.validation("Unesite ime i prezime.", {
      name: ["Obavezno."],
    });
  }
  if (password.length < 10) {
    throw DomainErrors.validation("Lozinka mora imati najmanje 10 karaktera.", {
      password: ["Najmanje 10 karaktera."],
    });
  }
  if (password.length > 128) {
    throw DomainErrors.validation("Lozinka je predugačka.", {
      password: ["Najviše 128 karaktera."],
    });
  }
  if (!isAgencyProfileComplete(profile)) {
    throw DomainErrors.validation(
      "Popunite sva obavezna polja agencije (sve sem sajta).",
    );
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingUser) {
    throw DomainErrors.conflict(
      "Nalog sa ovom adresom već postoji. Prijavite se.",
    );
  }

  const existingProfileEmail = await prisma.organizationProfile.findFirst({
    where: { type: "AGENCY", email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingProfileEmail) {
    throw DomainErrors.conflict(
      "Agencija sa ovom email adresom već postoji. Prijavite se.",
    );
  }

  const existingPib = await prisma.organizationProfile.findFirst({
    where: {
      type: "AGENCY",
      taxNumber: { equals: profile.taxNumber, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existingPib) {
    throw DomainErrors.validation("Agencija sa ovim PIB-om već postoji.", {
      taxNumber: ["PIB je već registrovan."],
    });
  }

  const plan = await prisma.saaSPlan.findUnique({
    where: { code: AGENCY_PARTNER_PLAN_CODE },
  });
  if (!plan?.active) {
    throw DomainErrors.invalidState(
      "Partner plan nije dostupan. Kontaktirajte podršku.",
    );
  }

  const hashed = await hashCredentialPassword(password);
  const userId = createId();
  const orgId = createId();
  const orgName = profile.displayName.slice(0, 120);
  const slug = await uniqueAgencySlug(orgName || agencyNameFromEmail(email));

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        email,
        name: ownerName,
        emailVerified: true,
      },
    });
    await tx.account.create({
      data: {
        id: createId(),
        userId,
        accountId: userId,
        providerId: "credential",
        password: hashed,
      },
    });
    await tx.organization.create({
      data: { id: orgId, name: orgName, slug },
    });
    await tx.organizationProfile.create({
      data: {
        organizationId: orgId,
        type: "AGENCY",
        legalName: profile.legalName,
        displayName: profile.displayName,
        registrationNumber: profile.registrationNumber,
        taxNumber: profile.taxNumber,
        address: profile.address,
        city: profile.city,
        postalCode: profile.postalCode,
        country: "RS",
        phone: profile.phone,
        email,
        website: profile.website,
        status: "ACTIVE",
        verificationStatus: "PENDING",
      },
    });
    await tx.organizationSubscription.create({
      data: {
        organizationId: orgId,
        planId: plan.id,
        status: "ACTIVE",
        trialEndsAt: null,
        price: 0,
        currency: plan.currency,
      },
    });
    await tx.member.create({
      data: {
        id: createId(),
        organizationId: orgId,
        userId,
        role: "AGENCY_OWNER",
      },
    });
  });

  await recordAudit({
    action: "agency.self_registered",
    entityType: "Organization",
    entityId: orgId,
    organizationId: orgId,
    actorUserId: userId,
    newValues: { email, taxNumber: profile.taxNumber },
  });

  return { email, organizationId: orgId };
}
