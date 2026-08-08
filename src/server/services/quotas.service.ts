import "server-only";
import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";

/**
 * Plan-based quota enforcement.
 *
 * An organization has one `OrganizationSubscription` pointing at a `SaaSPlan`.
 * The plan carries numeric caps (maxActiveProjects, maxUnits, maxMembers,
 * maxAgencyConnections). Any of those may be `null` meaning "unlimited".
 *
 * Every service that creates a limited entity must call
 * `assertQuota(organizationId, "projects" | "units" | "members" | "agencies")`
 * before persisting. When the quota is exceeded, a domain `QUOTA_EXCEEDED`
 * error is raised with a Serbian message.
 */

export type QuotaResource = "projects" | "units" | "members" | "agencies";

export interface QuotaSnapshot {
  plan: {
    code: string;
    name: string;
  } | null;
  limits: Record<QuotaResource, number | null>;
  usage: Record<QuotaResource, number>;
}

export async function loadQuotaSnapshot(
  organizationId: string,
): Promise<QuotaSnapshot> {
  const [subscription, projectsCount, unitsCount, membersCount, agenciesCount] =
    await Promise.all([
      prisma.organizationSubscription.findUnique({
        where: { organizationId },
        include: { plan: true },
      }),
      prisma.project.count({
        where: { organizationId, archivedAt: null },
      }),
      prisma.unit.count({ where: { organizationId, archivedAt: null } }),
      prisma.member.count({ where: { organizationId } }),
      prisma.agencyConnection.count({
        where: {
          OR: [
            { investorOrganizationId: organizationId },
            { agencyOrganizationId: organizationId },
          ],
          status: { in: ["INVITED", "ACTIVE"] },
        },
      }),
    ]);

  const plan = subscription?.plan ?? null;

  return {
    plan: plan ? { code: plan.code, name: plan.name } : null,
    limits: {
      projects: plan?.maxActiveProjects ?? null,
      units: plan?.maxUnits ?? null,
      members: plan?.maxMembers ?? null,
      agencies: plan?.maxAgencyConnections ?? null,
    },
    usage: {
      projects: projectsCount,
      units: unitsCount,
      members: membersCount,
      agencies: agenciesCount,
    },
  };
}

const RESOURCE_LABELS: Record<QuotaResource, string> = {
  projects: "aktivnih projekata",
  units: "jedinica",
  members: "korisnika",
  agencies: "agencijskih konekcija",
};

export async function assertQuota(
  organizationId: string,
  resource: QuotaResource,
  extra = 1,
): Promise<void> {
  const snapshot = await loadQuotaSnapshot(organizationId);
  const limit = snapshot.limits[resource];
  const used = snapshot.usage[resource];
  if (limit == null) return;
  if (used + extra > limit) {
    throw DomainErrors.quotaExceeded(
      `Dostigli ste ograničenje plana (${limit} ${RESOURCE_LABELS[resource]}). Kontaktirajte administratora za nadogradnju.`,
    );
  }
}
