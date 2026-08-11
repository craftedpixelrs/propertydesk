import "server-only";
import { createId } from "@paralleldrive/cuid2";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import { rolesForOrgType, type OrganizationRole } from "@/server/permissions/roles";
import { auth } from "@/server/auth/auth";
import { loadQuotaSnapshot } from "@/server/services/quotas.service";
import { headers } from "next/headers";

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
      website: input.website === undefined ? undefined : input.website,
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
// Invitations — delegated to Better Auth's organization plugin.
// -----------------------------------------------------------------------------

export async function inviteMember(input: {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  actorUserId: string;
}): Promise<void> {
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

  const hdrs = await headers();
  // Better Auth infers a strict literal role type from its access-control
  // definition. We validate the role at runtime against organizationRoles
  // above, so an `unknown` cast here is safe and keeps the invitation call
  // decoupled from Better Auth's internal role type inference.
  await (auth.api.createInvitation as unknown as (args: {
    body: { email: string; role: string; organizationId: string };
    headers: Headers;
  }) => Promise<unknown>)({
    body: {
      email: input.email,
      role: input.role,
      organizationId: input.organizationId,
    },
    headers: hdrs,
  });

  await recordAudit({
    action: "organization.member_invited",
    entityType: "Invitation",
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { email: input.email, role: input.role },
  });
}

export async function listPendingInvitations(organizationId: string) {
  const where: Prisma.InvitationWhereInput = { organizationId };
  return prisma.invitation.findMany({
    where,
    include: { inviter: { select: { id: true, name: true, email: true } } },
    orderBy: { expiresAt: "desc" },
  });
}

// -----------------------------------------------------------------------------
// Helpers for API layer
// -----------------------------------------------------------------------------

export function generateMemberId(): string {
  return createId();
}
