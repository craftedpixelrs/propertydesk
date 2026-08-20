import "server-only";
import { createId } from "@paralleldrive/cuid2";
import { Prisma } from "@prisma/client";
import type {
  OrganizationStatus,
  OrganizationType,
  PropertyDeskLeadScope,
  PropertyDeskTeamRole,
  SubscriptionStatus,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainError, DomainErrors } from "@/lib/errors";
import { logger } from "@/server/logger";
import {
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
} from "@/server/services/property-desk/team.service";
import {
  rolesForOrgType,
  type OrganizationRole,
} from "@/server/permissions/roles";
import {
  AGENCY_PARTNER_PLAN_CODE,
  applyAgencyOrgDefaults,
} from "@/lib/billing/agency-partner";
import { normalizeWebsite } from "@/server/services/organization-profile-completeness";
import { addDays, remainingTrialDays } from "@/server/services/subscriptions/trial-days";

/**
 * Platform administration service. Callers must be SUPER_ADMIN.
 *
 * All mutations record an entry in `audit_log`.
 */

// -----------------------------------------------------------------------------
// SaaS plans
// -----------------------------------------------------------------------------

export interface SaaSPlanInput {
  code: string;
  name: string;
  description?: string | null;
  monthlyPrice: number;
  /** Optional per-cycle prices. When missing, callers pay `monthlyPrice * cycleMonths`. */
  quarterlyPrice?: number | null;
  semiAnnualPrice?: number | null;
  annualPrice?: number | null;
  /** One-off charge added to the first invoice after activation. */
  onboardingFee?: number | null;
  currency: string;
  maxActiveProjects?: number | null;
  maxUnits?: number | null;
  maxMembers?: number | null;
  maxAgencyConnections?: number | null;
  features?: Record<string, unknown>;
  active?: boolean;
  publiclyAvailable?: boolean;
  recommended?: boolean;
  /** Overrides `GlobalBillingSettings.defaultTrialDays` when set. */
  defaultTrialDays?: number | null;
  sortOrder?: number;
}

export async function listSaaSPlans() {
  return prisma.saaSPlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { monthlyPrice: "asc" }],
  });
}

async function ensurePartnerPlan() {
  return prisma.saaSPlan.upsert({
    where: { code: AGENCY_PARTNER_PLAN_CODE },
    update: { active: true },
    create: {
      code: AGENCY_PARTNER_PLAN_CODE,
      name: "Partner",
      description:
        "Besplatan portal agencije. Pristup ide preko poziva investitora, bez pretplate.",
      monthlyPrice: 0,
      currency: "EUR",
      maxActiveProjects: 0,
      maxUnits: 0,
      maxMembers: 25,
      maxAgencyConnections: null,
      features: { audience: "agency", agencySharing: true, whiteLabel: false },
      active: true,
      publiclyAvailable: false,
      sortOrder: 20,
    },
  });
}

export async function createSaaSPlan(
  input: SaaSPlanInput,
  actorUserId: string,
) {
  const existing = await prisma.saaSPlan.findUnique({
    where: { code: input.code },
  });
  if (existing) {
    throw DomainErrors.conflict(`Plan sa oznakom "${input.code}" već postoji.`);
  }

  const plan = await prisma.saaSPlan.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      monthlyPrice: new Prisma.Decimal(input.monthlyPrice),
      quarterlyPrice:
        input.quarterlyPrice != null ? new Prisma.Decimal(input.quarterlyPrice) : null,
      semiAnnualPrice:
        input.semiAnnualPrice != null ? new Prisma.Decimal(input.semiAnnualPrice) : null,
      annualPrice: input.annualPrice != null ? new Prisma.Decimal(input.annualPrice) : null,
      onboardingFee:
        input.onboardingFee != null ? new Prisma.Decimal(input.onboardingFee) : null,
      currency: input.currency,
      maxActiveProjects: input.maxActiveProjects ?? null,
      maxUnits: input.maxUnits ?? null,
      maxMembers: input.maxMembers ?? null,
      maxAgencyConnections: input.maxAgencyConnections ?? null,
      features: (input.features ?? {}) as Prisma.InputJsonValue,
      active: input.active ?? true,
      publiclyAvailable: input.publiclyAvailable ?? true,
      recommended: input.recommended ?? false,
      defaultTrialDays: input.defaultTrialDays ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  await recordAudit({
    action: "platform.plan_created",
    entityType: "SaaSPlan",
    entityId: plan.id,
    actorUserId,
    newValues: plan,
  });

  return plan;
}

export async function updateSaaSPlan(
  id: string,
  input: Partial<SaaSPlanInput>,
  actorUserId: string,
) {
  const previous = await prisma.saaSPlan.findUnique({ where: { id } });
  if (!previous) throw DomainErrors.notFound("Plan");

  const decimalOrUndef = (v: number | null | undefined) =>
    v === undefined ? undefined : v === null ? null : new Prisma.Decimal(v);

  const updated = await prisma.saaSPlan.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      description: input.description === undefined ? undefined : input.description,
      monthlyPrice:
        input.monthlyPrice === undefined
          ? undefined
          : new Prisma.Decimal(input.monthlyPrice),
      quarterlyPrice: decimalOrUndef(input.quarterlyPrice),
      semiAnnualPrice: decimalOrUndef(input.semiAnnualPrice),
      annualPrice: decimalOrUndef(input.annualPrice),
      onboardingFee: decimalOrUndef(input.onboardingFee),
      currency: input.currency ?? undefined,
      maxActiveProjects:
        input.maxActiveProjects === undefined ? undefined : input.maxActiveProjects,
      maxUnits: input.maxUnits === undefined ? undefined : input.maxUnits,
      maxMembers: input.maxMembers === undefined ? undefined : input.maxMembers,
      maxAgencyConnections:
        input.maxAgencyConnections === undefined
          ? undefined
          : input.maxAgencyConnections,
      features:
        input.features === undefined
          ? undefined
          : (input.features as Prisma.InputJsonValue),
      active: input.active ?? undefined,
      publiclyAvailable: input.publiclyAvailable ?? undefined,
      recommended: input.recommended ?? undefined,
      defaultTrialDays:
        input.defaultTrialDays === undefined ? undefined : input.defaultTrialDays,
      sortOrder: input.sortOrder ?? undefined,
    },
  });

  await recordAudit({
    action: "platform.plan_updated",
    entityType: "SaaSPlan",
    entityId: id,
    actorUserId,
    previousValues: previous,
    newValues: updated,
  });

  return updated;
}

/**
 * Soft-deactivate a plan. It stays in the database and remains attached
 * to any existing subscriptions (so historical invoices still resolve),
 * but disappears from the "publicly available" list and can no longer be
 * assigned to a new subscription. Prefer this over hard delete.
 */
export async function archiveSaaSPlan(id: string, actorUserId: string) {
  const previous = await prisma.saaSPlan.findUnique({ where: { id } });
  if (!previous) throw DomainErrors.notFound("Plan");

  const updated = await prisma.saaSPlan.update({
    where: { id },
    data: { active: false, publiclyAvailable: false },
  });

  await recordAudit({
    action: "platform.plan_archived",
    entityType: "SaaSPlan",
    entityId: id,
    actorUserId,
    previousValues: previous,
    newValues: updated,
  });

  return updated;
}

export async function restoreSaaSPlan(id: string, actorUserId: string) {
  const previous = await prisma.saaSPlan.findUnique({ where: { id } });
  if (!previous) throw DomainErrors.notFound("Plan");

  const updated = await prisma.saaSPlan.update({
    where: { id },
    data: { active: true },
  });

  await recordAudit({
    action: "platform.plan_restored",
    entityType: "SaaSPlan",
    entityId: id,
    actorUserId,
    previousValues: previous,
    newValues: updated,
  });

  return updated;
}

/**
 * Hard delete a plan. Only allowed when nothing references it. Callers
 * that want to remove a plan that still has active subscriptions should
 * use `archiveSaaSPlan` instead.
 */
export async function deleteSaaSPlan(id: string, actorUserId: string) {
  const plan = await prisma.saaSPlan.findUnique({
    where: { id },
    include: {
      _count: { select: { subscriptions: true, invoices: true } },
    },
  });
  if (!plan) throw DomainErrors.notFound("Plan");

  if (plan._count.subscriptions > 0) {
    throw DomainErrors.invalidState(
      `Ne mogu obrisati plan „${plan.name}" — postoji ${plan._count.subscriptions} pretplata koje ga koriste. Umesto brisanja, arhivirajte plan.`,
    );
  }
  if (plan._count.invoices > 0) {
    throw DomainErrors.invalidState(
      `Ne mogu obrisati plan „${plan.name}" — postoji ${plan._count.invoices} istorijskih faktura koje ga referenciraju. Umesto brisanja, arhivirajte plan.`,
    );
  }

  await prisma.saaSPlan.delete({ where: { id } });

  await recordAudit({
    action: "platform.plan_deleted",
    entityType: "SaaSPlan",
    entityId: id,
    actorUserId,
    previousValues: plan,
  });

  return { id, deleted: true };
}

// -----------------------------------------------------------------------------
// Organizations (platform view)
// -----------------------------------------------------------------------------

export interface PlatformOrganizationRow {
  id: string;
  name: string;
  slug: string | null;
  type: OrganizationType | null;
  status: OrganizationStatus | null;
  planCode: string | null;
  planName: string | null;
  memberCount: number;
  projectCount: number;
  unitCount: number;
  createdAt: Date;
}

export interface ListPlatformOrganizationsInput {
  page: number;
  pageSize: number;
  search?: string;
  type?: OrganizationType;
  status?: OrganizationStatus;
}

export async function listAllOrganizations(
  input: ListPlatformOrganizationsInput,
): Promise<{ items: PlatformOrganizationRow[]; total: number }> {
  const where: Prisma.OrganizationWhereInput = {
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { slug: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(input.type || input.status
      ? {
          profile: {
            is: {
              ...(input.type ? { type: input.type } : {}),
              ...(input.status ? { status: input.status } : {}),
            },
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      include: {
        profile: true,
        subscription: { include: { plan: true } },
        _count: {
          select: {
            members: true,
            projects: true,
            units: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  const items: PlatformOrganizationRow[] = rows.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.profile?.type ?? null,
    status: org.profile?.status ?? null,
    planCode: org.subscription?.plan.code ?? null,
    planName: org.subscription?.plan.name ?? null,
    memberCount: org._count.members,
    projectCount: org._count.projects,
    unitCount: org._count.units,
    createdAt: org.createdAt,
  }));

  return { items, total };
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  type: OrganizationType;
  legalName: string;
  displayName: string;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  planCode: string;
  status?: OrganizationStatus;
  trialDays?: number | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
  ownerRole?: string | null;
}

export async function createOrganizationByPlatformAdmin(
  input: CreateOrganizationInput,
  actorUserId: string,
) {
  const existingSlug = await prisma.organization.findUnique({
    where: { slug: input.slug },
  });
  if (existingSlug) {
    throw DomainErrors.conflict(
      `Organizacija sa oznakom "${input.slug}" već postoji.`,
    );
  }

  const billing = applyAgencyOrgDefaults(input);
  const plan =
    billing.type === "AGENCY"
      ? await ensurePartnerPlan()
      : await prisma.saaSPlan.findUnique({
          where: { code: billing.planCode },
        });
  if (!plan || !plan.active) {
    throw DomainErrors.notFound("Plan");
  }

  const now = new Date();
  const trialDays = billing.trialDays ?? 30;
  const initialStatus: OrganizationStatus = billing.status ?? "TRIAL";
  const subscriptionStatus: SubscriptionStatus =
    billing.type === "AGENCY"
      ? "ACTIVE"
      : initialStatus === "TRIAL"
        ? "TRIAL"
        : "ACTIVE";

  const result = await prisma.$transaction(async (tx) => {
    const orgId = createId();
    const org = await tx.organization.create({
      data: {
        id: orgId,
        name: input.name,
        slug: input.slug,
      },
    });

    const profile = await tx.organizationProfile.create({
      data: {
        organizationId: org.id,
        type: billing.type,
        legalName: input.legalName,
        displayName: input.displayName,
        registrationNumber: input.registrationNumber ?? null,
        taxNumber: input.taxNumber ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        postalCode: input.postalCode ?? null,
        country: input.country ?? "RS",
        phone: input.phone ?? null,
        email: input.email ?? null,
        website: input.website ?? null,
        status: initialStatus,
      },
    });

    const subscription = await tx.organizationSubscription.create({
      data: {
        organizationId: org.id,
        planId: plan.id,
        status: subscriptionStatus,
        trialEndsAt:
          billing.type === "AGENCY" || subscriptionStatus !== "TRIAL"
            ? null
            : new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000),
      },
    });

    return { org, profile, subscription };
  });

  await recordAudit({
    action: "organization.created",
    entityType: "Organization",
    entityId: result.org.id,
    organizationId: result.org.id,
    actorUserId,
    newValues: {
      name: result.org.name,
      slug: result.org.slug,
      type: billing.type,
      status: initialStatus,
      planCode: plan.code,
    },
  });

  return result;
}

export type UpdateOrganizationInput = Omit<
  CreateOrganizationInput,
  "ownerEmail" | "ownerName" | "ownerRole"
>;

export async function getOrganizationForPlatformAdmin(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      profile: true,
      subscription: { include: { plan: true } },
    },
  });
  if (!org) throw DomainErrors.notFound("Organizacija");
  return org;
}

function subscriptionStatusForOrgStatus(
  status: OrganizationStatus,
): Pick<
  Prisma.OrganizationSubscriptionUncheckedUpdateInput,
  "status" | "endsAt"
> {
  if (status === "SUSPENDED") return { status: "SUSPENDED" };
  if (status === "RESTRICTED") return { status: "RESTRICTED" };
  if (status === "CLOSED") {
    return { status: "CANCELED", endsAt: new Date() };
  }
  if (status === "ACTIVE") return { status: "ACTIVE", endsAt: null };
  return { status: "TRIAL" };
}

export async function updateOrganizationByPlatformAdmin(
  organizationId: string,
  input: UpdateOrganizationInput,
  actorUserId: string,
) {
  const existing = await getOrganizationForPlatformAdmin(organizationId);

  if (input.slug !== existing.slug) {
    const clash = await prisma.organization.findUnique({
      where: { slug: input.slug },
    });
    if (clash) {
      throw DomainErrors.validation(
        `Organizacija sa oznakom "${input.slug}" već postoji.`,
        { slug: [`Organizacija sa oznakom "${input.slug}" već postoji.`] },
      );
    }
  }

  const effectiveType =
    existing.profile?.type === "AGENCY" || input.type === "AGENCY"
      ? "AGENCY"
      : input.type;
  const billing = applyAgencyOrgDefaults({
    ...input,
    type: effectiveType,
  });
  const plan =
    billing.type === "AGENCY"
      ? await ensurePartnerPlan()
      : await prisma.saaSPlan.findUnique({
          where: { code: billing.planCode },
        });
  const currentPlanId = existing.subscription?.planId ?? null;
  if (!plan) throw DomainErrors.notFound("Plan");
  if (!plan.active && plan.id !== currentPlanId) {
    throw DomainErrors.notFound("Plan");
  }

  const previousStatus = existing.profile?.status ?? "TRIAL";
  let nextStatus: OrganizationStatus = billing.status ?? input.status ?? previousStatus;
  const website = normalizeWebsite(input.website);
  const now = new Date();
  const currentRemaining = remainingTrialDays(existing.subscription?.trialEndsAt, now);
  const requestedDays = billing.type === "AGENCY" ? 0 : (input.trialDays ?? null);
  const trialChanged =
    billing.type !== "AGENCY" &&
    requestedDays != null &&
    (currentRemaining == null ? requestedDays > 0 : requestedDays !== currentRemaining);
  if (trialChanged && requestedDays > 0 && (nextStatus === "RESTRICTED" || nextStatus === "TRIAL")) {
    nextStatus = "TRIAL";
  }
  if (billing.type === "AGENCY" && nextStatus === "TRIAL") {
    nextStatus = "ACTIVE";
  }

  const profileData = {
    type: billing.type,
    legalName: input.legalName,
    displayName: input.displayName,
    registrationNumber: input.registrationNumber ?? null,
    taxNumber: input.taxNumber ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    postalCode: input.postalCode ?? null,
    country: input.country ?? existing.profile?.country ?? "RS",
    phone: input.phone ?? null,
    email: input.email ?? null,
    website,
    status: nextStatus,
  };

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: { name: input.name, slug: input.slug },
    });

    if (existing.profile) {
      await tx.organizationProfile.update({
        where: { organizationId },
        data: profileData,
      });
    } else {
      await tx.organizationProfile.create({
        data: { organizationId, ...profileData },
      });
    }

    const trialEndsAt =
      billing.type === "AGENCY"
        ? null
        : trialChanged && requestedDays != null
          ? addDays(now, requestedDays)
          : undefined;

    const subPatch: Prisma.OrganizationSubscriptionUncheckedUpdateInput = {
      ...subscriptionStatusForOrgStatus(
        billing.type === "AGENCY" && nextStatus === "TRIAL" ? "ACTIVE" : nextStatus,
      ),
      ...(plan.id !== currentPlanId
        ? {
            planId: plan.id,
            ...(!existing.subscription?.customPrice
              ? { price: plan.monthlyPrice, currency: plan.currency }
              : {}),
          }
        : {}),
      ...(billing.type === "AGENCY"
        ? {
            trialEndsAt: null,
            trialStartsAt: null,
            autoRenew: false,
            nextBillingDate: null,
            price: 0,
            customPrice: false,
          }
        : trialEndsAt
          ? {
              trialEndsAt,
              trialStartsAt: existing.subscription?.trialStartsAt ?? now,
              ...(nextStatus === "TRIAL" ? { restrictedAt: null } : {}),
            }
          : {}),
    };

    if (existing.subscription) {
      await tx.organizationSubscription.update({
        where: { organizationId },
        data: subPatch,
      });
    } else {
      await tx.organizationSubscription.create({
        data: {
          organizationId,
          planId: plan.id,
          status: nextStatus === "TRIAL" ? "TRIAL" : "ACTIVE",
          trialEndsAt:
            trialEndsAt ??
            (nextStatus === "TRIAL"
              ? new Date(now.getTime() + (input.trialDays ?? 30) * 24 * 60 * 60 * 1000)
              : null),
        },
      });
    }
  });

  await recordAudit({
    action: "organization.updated",
    entityType: "Organization",
    entityId: organizationId,
    organizationId,
    actorUserId,
    previousValues: {
      name: existing.name,
      slug: existing.slug,
      type: existing.profile?.type ?? null,
      status: previousStatus,
      planCode: existing.subscription?.plan.code ?? null,
    },
    newValues: {
      name: input.name,
      slug: input.slug,
      type: billing.type,
      status: nextStatus,
      planCode: plan.code,
      ...(trialChanged ? { trialDays: requestedDays } : {}),
    },
  });

  return getOrganizationForPlatformAdmin(organizationId);
}

export async function setOrganizationStatus(
  organizationId: string,
  status: OrganizationStatus,
  actorUserId: string,
  reason?: string,
): Promise<void> {
  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId },
  });
  if (!profile) throw DomainErrors.notFound("Organizacija");

  const previous = profile.status;
  if (previous === status) return;

  await prisma.$transaction(async (tx) => {
    await tx.organizationProfile.update({
      where: { organizationId },
      data: { status },
    });

    if (status === "SUSPENDED" || status === "CLOSED") {
      await tx.organizationSubscription.update({
        where: { organizationId },
        data: {
          status:
            status === "SUSPENDED"
              ? "SUSPENDED"
              : ("CANCELED" as SubscriptionStatus),
          endsAt: status === "CLOSED" ? new Date() : null,
        },
      });
    } else if (status === "ACTIVE") {
      await tx.organizationSubscription.update({
        where: { organizationId },
        data: { status: "ACTIVE", endsAt: null },
      });
    }
  });

  await recordAudit({
    action:
      status === "SUSPENDED"
        ? "organization.suspended"
        : status === "CLOSED"
          ? "organization.closed"
          : status === "ACTIVE"
            ? "organization.reactivated"
            : "organization.updated",
    entityType: "Organization",
    entityId: organizationId,
    organizationId,
    actorUserId,
    previousValues: { status: previous },
    newValues: { status },
    metadata: reason ? { reason } : null,
  });

  logger.info("organization.status_changed", {
    organizationId,
    previousStatus: previous,
    newStatus: status,
    userId: actorUserId,
  });
}

export async function assignOrganizationOwner(
  organizationId: string,
  userId: string,
  role: string,
  actorUserId: string,
) {
  const existing = await prisma.member.findFirst({
    where: { organizationId, userId },
  });
  if (existing) {
    throw DomainError.prototype.constructor
      ? DomainErrors.conflict("Korisnik je već član ove organizacije.")
      : DomainErrors.conflict("Korisnik je već član ove organizacije.");
  }

  const member = await prisma.member.create({
    data: {
      id: createId(),
      organizationId,
      userId,
      role,
    },
  });

  await recordAudit({
    action: "organization.member_joined",
    entityType: "Member",
    entityId: member.id,
    organizationId,
    actorUserId,
    newValues: { userId, role },
  });

  return member;
}

// -----------------------------------------------------------------------------
// Users (platform view) — used by the SUPER_ADMIN impersonation launcher
// -----------------------------------------------------------------------------

export interface PlatformUserPropertyDeskTeam {
  id: string;
  teamRole: PropertyDeskTeamRole;
  leadScope: PropertyDeskLeadScope;
  enabled: boolean;
}

export interface PlatformUserRow {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    organizationType: OrganizationType | null;
    role: string;
  }>;
  propertyDeskTeam: PlatformUserPropertyDeskTeam | null;
}

export type PlatformUserStatusFilter = "verified" | "unverified" | "banned";
export type PlatformUserLayerFilter = "SUPER_ADMIN" | "user";

export interface ListPlatformUsersInput {
  page: number;
  pageSize: number;
  search?: string;
  /** Organization id, or `"none"` for accounts without a tenant membership. */
  organizationId?: string;
  role?: string;
  orgType?: OrganizationType;
  /**
   * Property Desk team (Sloj C):
   * `true` = any team member, `"none"` = not on the team, or a specific role.
   */
  propertyDeskTeam?: boolean | "none" | PropertyDeskTeamRole;
  status?: PlatformUserStatusFilter;
  platform?: PlatformUserLayerFilter;
}

export function buildPlatformUserListWhere(
  input: Omit<ListPlatformUsersInput, "page" | "pageSize">,
): Prisma.UserWhereInput {
  const search = input.search?.trim();
  const searchFilter: Prisma.UserWhereInput = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  let membershipFilter: Prisma.UserWhereInput = {};
  if (input.organizationId === "none") {
    membershipFilter = { memberships: { none: {} } };
  } else if (input.organizationId || input.role || input.orgType) {
    membershipFilter = {
      memberships: {
        some: {
          ...(input.organizationId ? { organizationId: input.organizationId } : {}),
          ...(input.role ? { role: input.role } : {}),
          ...(input.orgType
            ? { organization: { profile: { type: input.orgType } } }
            : {}),
        },
      },
    };
  }

  const pd = input.propertyDeskTeam;
  const pdFilter: Prisma.UserWhereInput =
    pd === true
      ? { propertyDeskTeam: { isNot: null } }
      : pd === "none"
        ? { propertyDeskTeam: { is: null } }
        : typeof pd === "string"
          ? { propertyDeskTeam: { is: { teamRole: pd } } }
          : {};

  const statusFilter: Prisma.UserWhereInput =
    input.status === "banned"
      ? { banned: true }
      : input.status === "verified"
        ? { emailVerified: true, banned: { not: true } }
        : input.status === "unverified"
          ? { emailVerified: false, banned: { not: true } }
          : {};

  const platformFilter: Prisma.UserWhereInput =
    input.platform === "SUPER_ADMIN"
      ? { role: "SUPER_ADMIN" }
      : input.platform === "user"
        ? { OR: [{ role: null }, { role: { not: "SUPER_ADMIN" } }] }
        : {};

  return {
    ...searchFilter,
    ...membershipFilter,
    ...pdFilter,
    ...statusFilter,
    ...platformFilter,
  };
}

export async function listAllUsers(
  input: ListPlatformUsersInput,
): Promise<{ items: PlatformUserRow[]; total: number }> {
  const where = buildPlatformUserListWhere(input);

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        memberships: {
          include: {
            organization: {
              select: { id: true, name: true, profile: { select: { type: true } } },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        propertyDeskTeam: {
          select: {
            id: true,
            teamRole: true,
            leadScope: true,
            enabled: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  const items: PlatformUserRow[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u as { role?: string | null }).role ?? null,
    emailVerified: u.emailVerified,
    banned: Boolean((u as { banned?: boolean | null }).banned),
    banReason: (u as { banReason?: string | null }).banReason ?? null,
    createdAt: u.createdAt,
    memberships: u.memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationType: m.organization.profile?.type ?? null,
      role: m.role,
    })),
    propertyDeskTeam: u.propertyDeskTeam
      ? {
          id: u.propertyDeskTeam.id,
          teamRole: u.propertyDeskTeam.teamRole,
          leadScope: u.propertyDeskTeam.leadScope,
          enabled: u.propertyDeskTeam.enabled,
        }
      : null,
  }));

  return { items, total };
}

export interface UpdatePlatformUserInput {
  name?: string;
  email?: string;
  emailVerified?: boolean;
  banned?: boolean;
  banReason?: string | null;
  /** `SUPER_ADMIN` to grant platform access; `null` to revoke it. */
  platformRole?: "SUPER_ADMIN" | null;
  propertyDeskTeam?: {
    member: boolean;
    teamRole?: PropertyDeskTeamRole;
    leadScope?: PropertyDeskLeadScope;
    enabled?: boolean;
  };
}

/**
 * SUPER_ADMIN mutation for a platform user account. Tenant application roles
 * (Sloj B) stay in the organization — this only touches the account itself
 * (Sloj A) and optional Property Desk team membership (Sloj C).
 */
export async function updatePlatformUser(
  userId: string,
  input: UpdatePlatformUserInput,
  actorUserId: string,
): Promise<PlatformUserRow> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      propertyDeskTeam: {
        select: {
          id: true,
          teamRole: true,
          leadScope: true,
          enabled: true,
        },
      },
    },
  });
  if (!existing) throw DomainErrors.notFound("Korisnik");

  const nextEmail = input.email
    ? input.email.trim().toLowerCase()
    : undefined;
  if (nextEmail && nextEmail !== existing.email.toLowerCase()) {
    const clash = await prisma.user.findFirst({
      where: {
        email: { equals: nextEmail, mode: "insensitive" },
        NOT: { id: userId },
      },
      select: { id: true },
    });
    if (clash) {
      throw DomainErrors.conflict("E-mail adresa je već zauzeta.");
    }
  }

  if (input.banned === true && userId === actorUserId) {
    throw DomainErrors.forbidden("Ne možete banovati sopstveni nalog.");
  }

  if (input.platformRole !== undefined) {
    const currentlyAdmin = existing.role === "SUPER_ADMIN";
    const willBeAdmin = input.platformRole === "SUPER_ADMIN";
    if (currentlyAdmin && !willBeAdmin) {
      if (userId === actorUserId) {
        throw DomainErrors.forbidden(
          "Ne možete ukloniti SUPER_ADMIN ulogu sa sopstvenog naloga.",
        );
      }
      const otherAdmins = await prisma.user.count({
        where: { role: "SUPER_ADMIN", id: { not: userId } },
      });
      if (otherAdmins === 0) {
        throw DomainErrors.invalidState(
          "Ne možete ukloniti poslednjeg administratora platforme.",
        );
      }
    }
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (nextEmail !== undefined) data.email = nextEmail;
  if (input.emailVerified !== undefined) data.emailVerified = input.emailVerified;
  if (input.banned !== undefined) {
    data.banned = input.banned;
    if (input.banned) {
      data.banReason = input.banReason?.trim() || "Banovan od strane administratora platforme.";
    } else {
      data.banReason = null;
      data.banExpires = null;
    }
  } else if (input.banReason !== undefined && existing.banned) {
    data.banReason = input.banReason;
  }
  if (input.platformRole !== undefined) {
    data.role = input.platformRole;
  }

  const previousSnapshot = {
    name: existing.name,
    email: existing.email,
    emailVerified: existing.emailVerified,
    banned: Boolean(existing.banned),
    banReason: existing.banReason,
    role: existing.role,
  };

  const updated = Object.keys(data).length
    ? await prisma.user.update({ where: { id: userId }, data })
    : existing;

  if (input.banned !== undefined && input.banned !== Boolean(existing.banned)) {
    await recordAudit({
      action: input.banned ? "platform.user_banned" : "platform.user_unbanned",
      entityType: "User",
      entityId: userId,
      actorUserId,
      previousValues: { banned: Boolean(existing.banned), banReason: existing.banReason },
      newValues: {
        banned: Boolean(updated.banned),
        banReason: updated.banReason,
      },
    });
  }

  const accountChanged =
    (input.name !== undefined && input.name.trim() !== existing.name) ||
    (nextEmail !== undefined && nextEmail !== existing.email.toLowerCase()) ||
    (input.emailVerified !== undefined &&
      input.emailVerified !== existing.emailVerified) ||
    (input.platformRole !== undefined &&
      (input.platformRole ?? null) !== (existing.role ?? null));

  if (accountChanged) {
    await recordAudit({
      action: "platform.user_updated",
      entityType: "User",
      entityId: userId,
      actorUserId,
      previousValues: previousSnapshot,
      newValues: {
        name: updated.name,
        email: updated.email,
        emailVerified: updated.emailVerified,
        banned: Boolean(updated.banned),
        banReason: updated.banReason,
        role: updated.role,
      },
    });
  }

  if (input.propertyDeskTeam) {
    const pd = input.propertyDeskTeam;
    const current = existing.propertyDeskTeam;
    if (!pd.member) {
      if (current) {
        await removeTeamMember(current.id, actorUserId);
      }
    } else if (!current) {
      if (!pd.teamRole) {
        throw DomainErrors.validation(
          "Izaberite ulogu Property Desk tima.",
          { teamRole: ["Obavezno pri dodavanju u tim."] },
        );
      }
      await addTeamMember(
        {
          userId,
          teamRole: pd.teamRole,
          leadScope: pd.leadScope,
        },
        actorUserId,
      );
    } else {
      const roleChanged =
        pd.teamRole !== undefined && pd.teamRole !== current.teamRole;
      const scopeChanged =
        pd.leadScope !== undefined && pd.leadScope !== current.leadScope;
      const enabledChanged =
        pd.enabled !== undefined && pd.enabled !== current.enabled;
      if (roleChanged || scopeChanged || enabledChanged) {
        await updateTeamMember(
          current.id,
          {
            teamRole: pd.teamRole,
            leadScope: pd.leadScope,
            enabled: pd.enabled,
          },
          actorUserId,
        );
      }
    }
  }

  const reloaded = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, profile: { select: { type: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      propertyDeskTeam: {
        select: {
          id: true,
          teamRole: true,
          leadScope: true,
          enabled: true,
        },
      },
    },
  });
  if (!reloaded) throw DomainErrors.notFound("Korisnik");

  return {
    id: reloaded.id,
    name: reloaded.name,
    email: reloaded.email,
    role: reloaded.role ?? null,
    emailVerified: reloaded.emailVerified,
    banned: Boolean(reloaded.banned),
    banReason: reloaded.banReason ?? null,
    createdAt: reloaded.createdAt,
    memberships: reloaded.memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationType: m.organization.profile?.type ?? null,
      role: m.role,
    })),
    propertyDeskTeam: reloaded.propertyDeskTeam
      ? {
          id: reloaded.propertyDeskTeam.id,
          teamRole: reloaded.propertyDeskTeam.teamRole,
          leadScope: reloaded.propertyDeskTeam.leadScope,
          enabled: reloaded.propertyDeskTeam.enabled,
        }
      : null,
  };
}

export interface OrganizationPickerRow {
  id: string;
  name: string;
  type: OrganizationType | null;
}

export async function listOrganizationsForPicker(): Promise<
  OrganizationPickerRow[]
> {
  const rows = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      profile: { select: { type: true } },
    },
    orderBy: { name: "asc" },
    take: 200,
  });
  return rows.map((org) => ({
    id: org.id,
    name: org.name,
    type: org.profile?.type ?? null,
  }));
}

export interface CreatePlatformUserInput {
  name: string;
  email: string;
  password?: string;
  emailVerified?: boolean;
  platformRole?: "SUPER_ADMIN" | null;
  organizationId?: string | null;
  organizationRole?: OrganizationRole;
  propertyDeskTeam?: {
    teamRole: PropertyDeskTeamRole;
    leadScope?: PropertyDeskLeadScope;
  } | null;
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

/**
 * SUPER_ADMIN creates (or reuses) a platform account and optionally places
 * it in a tenant organization (Sloj B) and/or the Property Desk team (Sloj C).
 */
export async function createPlatformUser(
  input: CreatePlatformUserInput,
  actorUserId: string,
): Promise<PlatformUserRow> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) throw DomainErrors.validation("Ime je obavezno.");
  if (!email) throw DomainErrors.validation("E-mail je obavezan.");

  const wantsOrg = Boolean(input.organizationId);
  const wantsPdTeam = Boolean(input.propertyDeskTeam);
  const wantsPlatformAdmin = input.platformRole === "SUPER_ADMIN";
  if (!wantsOrg && !wantsPdTeam && !wantsPlatformAdmin) {
    throw DomainErrors.validation(
      "Izaberite gde korisnik ide: organizacija, Property Desk tim, ili SUPER_ADMIN.",
    );
  }

  let orgType: OrganizationType | null = null;
  if (input.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, profile: { select: { type: true } } },
    });
    if (!org) throw DomainErrors.notFound("Organizacija");
    orgType = org.profile?.type ?? null;
    if (!input.organizationRole) {
      throw DomainErrors.validation("Izaberite ulogu u organizaciji.", {
        organizationRole: ["Obavezno."],
      });
    }
    if (orgType && !rolesForOrgType(orgType).includes(input.organizationRole)) {
      throw DomainErrors.badRequest(
        "Izabrana uloga nije dozvoljena za ovaj tip organizacije.",
      );
    }
  }

  let user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  let created = false;

  if (!user) {
    const password = input.password?.trim() ?? "";
    if (password.length < 10) {
      throw DomainErrors.validation(
        "Lozinka mora imati najmanje 10 karaktera.",
        { password: ["Najmanje 10 karaktera."] },
      );
    }
    const hashed = await hashCredentialPassword(password);
    const id = createId();
    user = await prisma.user.create({
      data: {
        id,
        email,
        name,
        emailVerified: input.emailVerified ?? true,
        role: input.platformRole ?? null,
      },
    });
    await prisma.account.create({
      data: {
        id: createId(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashed,
      },
    });
    created = true;
    await recordAudit({
      action: "platform.user_created",
      entityType: "User",
      entityId: user.id,
      actorUserId,
      newValues: {
        email,
        name,
        role: user.role,
        organizationId: input.organizationId ?? null,
      },
    });
  } else if (input.platformRole === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "SUPER_ADMIN" },
    });
  }

  if (input.organizationId && input.organizationRole) {
    const existingMember = await prisma.member.findFirst({
      where: { organizationId: input.organizationId, userId: user.id },
    });
    if (!existingMember) {
      await assignOrganizationOwner(
        input.organizationId,
        user.id,
        input.organizationRole,
        actorUserId,
      );
    } else if (created === false) {
      throw DomainErrors.conflict(
        "Korisnik sa ovim e-mailom je već član izabrane organizacije.",
      );
    }
  }

  if (input.propertyDeskTeam) {
    const existingTeam = await prisma.propertyDeskTeamMember.findUnique({
      where: { userId: user.id },
    });
    if (!existingTeam) {
      await addTeamMember(
        {
          userId: user.id,
          teamRole: input.propertyDeskTeam.teamRole,
          leadScope: input.propertyDeskTeam.leadScope,
        },
        actorUserId,
      );
    } else if (!created && !wantsOrg) {
      throw DomainErrors.conflict(
        "Korisnik je već član Property Desk tima.",
      );
    }
  }

  const reloaded = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, profile: { select: { type: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      propertyDeskTeam: {
        select: {
          id: true,
          teamRole: true,
          leadScope: true,
          enabled: true,
        },
      },
    },
  });
  if (!reloaded) throw DomainErrors.notFound("Korisnik");

  return {
    id: reloaded.id,
    name: reloaded.name,
    email: reloaded.email,
    role: reloaded.role ?? null,
    emailVerified: reloaded.emailVerified,
    banned: Boolean(reloaded.banned),
    banReason: reloaded.banReason ?? null,
    createdAt: reloaded.createdAt,
    memberships: reloaded.memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationType: m.organization.profile?.type ?? null,
      role: m.role,
    })),
    propertyDeskTeam: reloaded.propertyDeskTeam
      ? {
          id: reloaded.propertyDeskTeam.id,
          teamRole: reloaded.propertyDeskTeam.teamRole,
          leadScope: reloaded.propertyDeskTeam.leadScope,
          enabled: reloaded.propertyDeskTeam.enabled,
        }
      : null,
  };
}

/**
 * Called by the impersonation launcher endpoint before Better Auth mints a
 * scoped session. Writes a first-class audit trail so we can always answer
 * "who was acting as whom, and when?" — Better Auth's `session.impersonatedBy`
 * only tells us about *live* sessions.
 */
export async function recordImpersonationStart(input: {
  actorUserId: string;
  targetUserId: string;
  organizationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const target = await prisma.user.findUnique({
    where: { id: input.targetUserId },
    select: { id: true, email: true, name: true },
  });
  if (!target) throw DomainErrors.notFound("Korisnik");

  await recordAudit({
    action: "platform.impersonation_started",
    entityType: "User",
    entityId: target.id,
    organizationId: input.organizationId ?? null,
    actorUserId: input.actorUserId,
    metadata: {
      targetEmail: target.email,
      targetName: target.name,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

// -----------------------------------------------------------------------------
// Audit log (platform-wide view)
// -----------------------------------------------------------------------------

export interface PlatformAuditListInput {
  page: number;
  pageSize: number;
  organizationId?: string;
  action?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
}

export async function listAuditLogs(input: PlatformAuditListInput) {
  const where: Prisma.AuditLogWhereInput = {
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    ...(input.action ? { action: { contains: input.action } } : {}),
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(input.from || input.to
      ? {
          createdAt: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        actor: { select: { id: true, name: true, email: true } },
        impersonatedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  return { items: rows, total };
}
