import "server-only";
import { createId } from "@paralleldrive/cuid2";
import { Prisma } from "@prisma/client";
import type {
  OrganizationStatus,
  OrganizationType,
  SubscriptionStatus,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainError, DomainErrors } from "@/lib/errors";
import { logger } from "@/server/logger";

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

  const plan = await prisma.saaSPlan.findUnique({
    where: { code: input.planCode },
  });
  if (!plan || !plan.active) {
    throw DomainErrors.notFound("Plan");
  }

  const now = new Date();
  const trialDays = input.trialDays ?? 30;
  const initialStatus: OrganizationStatus = input.status ?? "TRIAL";
  const subscriptionStatus: SubscriptionStatus =
    initialStatus === "TRIAL" ? "TRIAL" : "ACTIVE";

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
        type: input.type,
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
          subscriptionStatus === "TRIAL"
            ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
            : null,
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
      type: input.type,
      status: initialStatus,
      planCode: plan.code,
    },
  });

  return result;
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
}

export interface ListPlatformUsersInput {
  page: number;
  pageSize: number;
  search?: string;
  organizationId?: string;
  role?: string;
}

export async function listAllUsers(
  input: ListPlatformUsersInput,
): Promise<{ items: PlatformUserRow[]; total: number }> {
  const searchFilter = input.search
    ? {
        OR: [
          { email: { contains: input.search, mode: "insensitive" as const } },
          { name: { contains: input.search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const membershipFilter =
    input.organizationId || input.role
      ? {
          memberships: {
            some: {
              ...(input.organizationId
                ? { organizationId: input.organizationId }
                : {}),
              ...(input.role ? { role: input.role } : {}),
            },
          },
        }
      : {};

  const where: Prisma.UserWhereInput = {
    ...searchFilter,
    ...membershipFilter,
  };

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
  }));

  return { items, total };
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
