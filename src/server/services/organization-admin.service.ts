import "server-only";
import { createId } from "@paralleldrive/cuid2";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import {
  ALL_ORG_ROLE_NAMES,
  rolesForOrgType,
  type OrganizationRole,
} from "@/server/permissions/roles";
import { loadQuotaSnapshot } from "@/server/services/quotas.service";
import { invitationEmail, sendEmail } from "@/server/auth/email";
import { serverEnv } from "@/lib/env";
import {
  INVESTOR_PROFILE_FIELD_LABEL,
  isInvestorProfileComplete,
  missingInvestorProfileFields,
  normalizeWebsite,
} from "@/server/services/organization-profile-completeness";

/**
 * Tenant-side organization administration (owners/admins operate here).
 *
 * Scope: profile update, member listing & role changes, invitations,
 * subscription visibility. Suspensions/plan changes remain a platform-admin
 * concern.
 */

// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

export async function loadOrganizationProfile(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      profile: true,
      subscription: { include: { plan: true } },
    },
  });
  if (!org) throw DomainErrors.notFound("Organizacija");
  const snapshot = await loadQuotaSnapshot(organizationId);
  return { organization: org, quota: snapshot };
}

export interface UpdateOrganizationProfileInput {
  displayName?: string;
  legalName?: string;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  paymentAccountNumber?: string | null;
  paymentBankName?: string | null;
}

export async function updateOrganizationProfile(
  organizationId: string,
  input: UpdateOrganizationProfileInput,
  actorUserId: string,
) {
  const previous = await prisma.organizationProfile.findUnique({
    where: { organizationId },
  });
  if (!previous) throw DomainErrors.notFound("Profil organizacije");

  const website =
    input.website === undefined ? undefined : normalizeWebsite(input.website);

  if (previous.type === "INVESTOR") {
    const merged = {
      displayName: input.displayName ?? previous.displayName,
      legalName: input.legalName ?? previous.legalName,
      taxNumber:
        input.taxNumber === undefined ? previous.taxNumber : input.taxNumber,
      registrationNumber:
        input.registrationNumber === undefined
          ? previous.registrationNumber
          : input.registrationNumber,
      address: input.address === undefined ? previous.address : input.address,
      city: input.city === undefined ? previous.city : input.city,
      postalCode:
        input.postalCode === undefined ? previous.postalCode : input.postalCode,
      phone: input.phone === undefined ? previous.phone : input.phone,
      email: input.email === undefined ? previous.email : input.email,
      website: website === undefined ? previous.website : website,
    };
    const missing = missingInvestorProfileFields(merged);
    if (missing.length > 0) {
      const fieldErrors: Record<string, string[]> = {};
      for (const field of missing) {
        fieldErrors[field] = ["Obavezno za investitorsku organizaciju."];
      }
      throw DomainErrors.validation(
        `Popunite sva obavezna polja: ${missing
          .map((f) => INVESTOR_PROFILE_FIELD_LABEL[f])
          .join(", ")}.`,
        fieldErrors,
      );
    }
  }

  const updated = await prisma.organizationProfile.update({
    where: { organizationId },
    data: {
      displayName: input.displayName ?? undefined,
      legalName: input.legalName ?? undefined,
      registrationNumber:
        input.registrationNumber === undefined
          ? undefined
          : input.registrationNumber,
      taxNumber: input.taxNumber === undefined ? undefined : input.taxNumber,
      address: input.address === undefined ? undefined : input.address,
      city: input.city === undefined ? undefined : input.city,
      postalCode: input.postalCode === undefined ? undefined : input.postalCode,
      country: input.country === undefined ? undefined : input.country,
      phone: input.phone === undefined ? undefined : input.phone,
      email: input.email === undefined ? undefined : input.email,
      website: website === undefined ? undefined : website,
      logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl,
      paymentAccountNumber:
        input.paymentAccountNumber === undefined
          ? undefined
          : input.paymentAccountNumber,
      paymentBankName:
        input.paymentBankName === undefined
          ? undefined
          : input.paymentBankName,
    },
  });

  await recordAudit({
    action: "organization.updated",
    entityType: "OrganizationProfile",
    entityId: organizationId,
    organizationId,
    actorUserId,
    previousValues: previous,
    newValues: updated,
  });

  if (input.displayName && input.displayName !== previous.displayName) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { name: input.displayName },
    });
  }

  return updated;
}

export async function isInvestorOrgSetupComplete(
  organizationId: string,
): Promise<boolean> {
  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId },
    select: {
      type: true,
      displayName: true,
      legalName: true,
      taxNumber: true,
      registrationNumber: true,
      address: true,
      city: true,
      postalCode: true,
      phone: true,
      email: true,
      website: true,
    },
  });
  if (!profile || profile.type !== "INVESTOR") return true;
  return isInvestorProfileComplete(profile);
}

// -----------------------------------------------------------------------------
// Members
// -----------------------------------------------------------------------------

export interface MemberListItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
}

export async function listMembers(
  organizationId: string,
): Promise<MemberListItem[]> {
  const rows = await prisma.member.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          deactivatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    emailVerified: m.user.emailVerified,
    deactivatedAt: m.user.deactivatedAt,
    createdAt: m.createdAt,
  }));
}

export async function updateMemberRole(
  organizationId: string,
  membershipId: string,
  newRole: OrganizationRole,
  actorUserId: string,
): Promise<void> {
  const membership = await prisma.member.findFirst({
    where: { id: membershipId, organizationId },
  });
  if (!membership) throw DomainErrors.notFound("Član");

  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId },
    select: { type: true },
  });
  const orgType = profile?.type ?? null;
  if (orgType && !rolesForOrgType(orgType).includes(newRole)) {
    throw DomainErrors.badRequest(
      "Izabrana uloga nije dozvoljena za ovaj tip organizacije.",
    );
  }

  const previousRole = membership.role;
  if (previousRole === newRole) return;

  await prisma.member.update({
    where: { id: membershipId },
    data: { role: newRole },
  });

  await recordAudit({
    action: "organization.member_role_updated",
    entityType: "Member",
    entityId: membershipId,
    organizationId,
    actorUserId,
    previousValues: { role: previousRole },
    newValues: { role: newRole },
  });
}

export async function removeMember(
  organizationId: string,
  membershipId: string,
  actorUserId: string,
): Promise<void> {
  const membership = await prisma.member.findFirst({
    where: { id: membershipId, organizationId },
    include: { user: true },
  });
  if (!membership) throw DomainErrors.notFound("Član");

  await prisma.member.delete({ where: { id: membershipId } });

  await recordAudit({
    action: "organization.member_removed",
    entityType: "Member",
    entityId: membershipId,
    organizationId,
    actorUserId,
    previousValues: { userId: membership.userId, role: membership.role },
  });
}

export async function setMemberActivation(
  organizationId: string,
  membershipId: string,
  active: boolean,
  actorUserId: string,
): Promise<void> {
  const membership = await prisma.member.findFirst({
    where: { id: membershipId, organizationId },
    include: { user: true },
  });
  if (!membership) throw DomainErrors.notFound("Član");

  if (!active && membership.userId === actorUserId) {
    throw DomainErrors.invalidState(
      "Ne možete deaktivirati nalog na koji ste ulogovani.",
    );
  }

  await prisma.user.update({
    where: { id: membership.userId },
    data: { deactivatedAt: active ? null : new Date() },
  });

  await recordAudit({
    action: active
      ? "organization.member_reactivated"
      : "organization.member_deactivated",
    entityType: "User",
    entityId: membership.userId,
    organizationId,
    actorUserId,
    previousValues: { deactivatedAt: membership.user.deactivatedAt },
    newValues: { deactivatedAt: active ? null : new Date() },
  });
}

// -----------------------------------------------------------------------------
// Invitations — we write the `invitation` row ourselves. Better Auth 1.6
// createInvitation injects fields (`createdAt`, `teamId`) that the plugin
// adapter then sends to Prisma; a stale or narrower client rejects them and
// the tenant "Pošalji poziv" flow 500s. Accept is our own public flow
// (`/accept-invitation/:id` → register/sign-in → POST accept) against
// the same table.
// -----------------------------------------------------------------------------

const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;

export async function inviteMember(input: {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  actorUserId: string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw DomainErrors.validation("Unesite ispravnu email adresu.");
  }

  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId: input.organizationId },
    select: { type: true },
  });
  const orgType = profile?.type ?? null;
  if (orgType && !rolesForOrgType(orgType).includes(input.role)) {
    throw DomainErrors.badRequest(
      "Izabrana uloga nije dozvoljena za ovaj tip organizacije.",
    );
  }

  await loadQuotaSnapshot(input.organizationId).then((snap) => {
    if (snap.limits.members != null && snap.usage.members >= snap.limits.members) {
      throw DomainErrors.quotaExceeded(
        `Dostigli ste ograničenje plana (${snap.limits.members} korisnika).`,
      );
    }
  });

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingUser) {
    const alreadyMember = await prisma.member.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: existingUser.id,
      },
      select: { id: true },
    });
    if (alreadyMember) {
      throw DomainErrors.conflict("Korisnik je već član ove organizacije.");
    }
  }

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { name: true },
  });
  if (!org) throw DomainErrors.notFound("Organizacija");

  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  const pending = await prisma.invitation.findFirst({
    where: {
      organizationId: input.organizationId,
      email: { equals: email, mode: "insensitive" },
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  const invitationId = pending?.id ?? createId();
  if (pending) {
    await prisma.invitation.update({
      where: { id: pending.id },
      data: { role: input.role, expiresAt },
    });
  } else {
    await prisma.invitation.create({
      data: {
        id: invitationId,
        organizationId: input.organizationId,
        email,
        role: input.role,
        status: "pending",
        expiresAt,
        inviterId: input.actorUserId,
      },
    });
  }

  const url = `${serverEnv.BETTER_AUTH_URL.replace(/\/$/, "")}/accept-invitation/${invitationId}`;
  const msg = invitationEmail(org.name, url);
  await sendEmail({ ...msg, to: email });

  await recordAudit({
    action: "organization.member_invited",
    entityType: "Invitation",
    entityId: invitationId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { email, role: input.role, resent: Boolean(pending) },
  });
}

export async function listPendingInvitations(organizationId: string) {
  const where: Prisma.InvitationWhereInput = {
    organizationId,
    status: "pending",
    expiresAt: { gt: new Date() },
  };
  return prisma.invitation.findMany({
    where,
    include: { inviter: { select: { id: true, name: true, email: true } } },
    orderBy: { expiresAt: "desc" },
  });
}

export interface PublicInvitation {
  id: string;
  email: string;
  organizationName: string;
  role: string;
  status: string;
  expiresAt: Date;
}

export async function getPublicInvitation(
  id: string,
): Promise<PublicInvitation | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  });
  if (!invitation) return null;
  const expired = invitation.expiresAt <= new Date();
  const status =
    invitation.status === "pending" && expired ? "expired" : invitation.status;
  return {
    id: invitation.id,
    email: invitation.email,
    organizationName: invitation.organization.name,
    role: invitation.role ?? "",
    status,
    expiresAt: invitation.expiresAt,
  };
}

async function loadPendingInvitation(id: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!invitation) throw DomainErrors.notFound("Poziv");
  if (invitation.status !== "pending") {
    throw DomainErrors.invalidState("Ovaj poziv više nije aktivan.");
  }
  if (invitation.expiresAt <= new Date()) {
    throw DomainErrors.invalidState("Poziv je istekao. Zatražite novi.");
  }
  const role = invitation.role;
  if (!role || !ALL_ORG_ROLE_NAMES.includes(role as OrganizationRole)) {
    throw DomainErrors.invalidState("Poziv nema ispravnu ulogu.");
  }
  return { ...invitation, role: role as OrganizationRole };
}

async function assertMemberQuota(organizationId: string) {
  const snap = await loadQuotaSnapshot(organizationId);
  if (snap.limits.members != null && snap.usage.members >= snap.limits.members) {
    throw DomainErrors.quotaExceeded(
      `Dostigli ste ograničenje plana (${snap.limits.members} korisnika).`,
    );
  }
}

async function joinOrganizationFromInvitation(input: {
  invitationId: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}) {
  const existing = await prisma.member.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
    },
    select: { id: true },
  });

  if (!existing) {
    await assertMemberQuota(input.organizationId);
    await prisma.member.create({
      data: {
        id: createId(),
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role,
      },
    });
  }

  await prisma.invitation.update({
    where: { id: input.invitationId },
    data: { status: "accepted" },
  });

  await prisma.session.updateMany({
    where: { userId: input.userId },
    data: { activeOrganizationId: input.organizationId },
  });

  await recordAudit({
    action: "organization.member_joined",
    entityType: "Invitation",
    entityId: input.invitationId,
    organizationId: input.organizationId,
    actorUserId: input.userId,
    newValues: { userId: input.userId, role: input.role, via: "invitation" },
  });
}

export async function acceptPendingInvitation(input: {
  invitationId: string;
  userId: string;
  userEmail: string;
}): Promise<void> {
  const invitation = await loadPendingInvitation(input.invitationId);
  const sessionEmail = input.userEmail.trim().toLowerCase();
  if (sessionEmail !== invitation.email.toLowerCase()) {
    throw DomainErrors.forbidden(
      "Poziv je namenjen drugoj email adresi. Odjavite se i prijavite se sa adresom iz poziva.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, deactivatedAt: true },
  });
  if (!user) throw DomainErrors.notFound("Korisnik");
  if (user.deactivatedAt) {
    throw DomainErrors.forbidden(
      "Vaš nalog je deaktiviran. Kontaktirajte administratora.",
    );
  }

  await joinOrganizationFromInvitation({
    invitationId: invitation.id,
    organizationId: invitation.organizationId,
    userId: input.userId,
    role: invitation.role,
  });
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

export async function registerFromInvitation(input: {
  invitationId: string;
  name: string;
  password: string;
}): Promise<{ email: string }> {
  const name = input.name.trim();
  const password = input.password;
  if (name.length < 2) {
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

  const invitation = await loadPendingInvitation(input.invitationId);
  const email = invitation.email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    throw DomainErrors.conflict(
      "Nalog sa ovom adresom već postoji. Prijavite se, pa prihvatite poziv.",
    );
  }

  const hashed = await hashCredentialPassword(password);
  const userId = createId();
  await prisma.user.create({
    data: {
      id: userId,
      email,
      name,
      emailVerified: true,
    },
  });
  await prisma.account.create({
    data: {
      id: createId(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashed,
    },
  });

  await recordAudit({
    action: "organization.invitee_registered",
    entityType: "User",
    entityId: userId,
    organizationId: invitation.organizationId,
    actorUserId: userId,
    newValues: { email, invitationId: invitation.id },
  });

  return { email };
}

// -----------------------------------------------------------------------------
// Helpers for API layer
// -----------------------------------------------------------------------------

export function generateMemberId(): string {
  return createId();
}
