import "server-only";

import { prisma } from "@/server/db/prisma";
import { sanitizeReferralCode } from "@/lib/referral";

/**
 * Public buyer catalog behind an agency referral code (`/p/r/<code>`).
 *
 * The visitor is not signed in. We only return projects the agency
 * may already sell (ACTIVE connection + ACTIVE access in window).
 * Investor-internal fields stay off the payload.
 */

function isAccessInWindow(access: {
  accessStartsAt: Date | null;
  accessEndsAt: Date | null;
}): boolean {
  const now = new Date();
  if (access.accessStartsAt && access.accessStartsAt > now) return false;
  if (access.accessEndsAt && access.accessEndsAt < now) return false;
  return true;
}

export interface ReferralCatalogProject {
  id: string;
  code: string;
  name: string;
  slug: string;
  city: string | null;
  description: string | null;
  coverImageUrl: string | null;
}

export interface ReferralCatalog {
  code: string;
  investorName: string;
  investorLogoUrl: string | null;
  agencyName: string;
  projects: ReferralCatalogProject[];
}

export async function resolveReferralCatalog(
  rawCode: string,
): Promise<ReferralCatalog | null> {
  const code = sanitizeReferralCode(rawCode);
  if (!code) return null;

  const connection = await prisma.agencyConnection.findFirst({
    where: { referralCode: code, status: "ACTIVE" },
    include: {
      investor: {
        include: { profile: { select: { displayName: true, logoUrl: true } } },
      },
      agency: {
        include: { profile: { select: { displayName: true } } },
      },
      projectAccess: {
        where: { status: "ACTIVE" },
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true,
              slug: true,
              publicMicrositeSlug: true,
              city: true,
              description: true,
              coverImageUrl: true,
              archivedAt: true,
            },
          },
        },
      },
    },
  });
  if (!connection) return null;

  const projects = connection.projectAccess
    .filter(isAccessInWindow)
    .map((row) => row.project)
    .filter((project) => project.archivedAt == null)
    .map((project) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      slug: project.publicMicrositeSlug ?? project.slug,
      city: project.city,
      description: project.description,
      coverImageUrl: project.coverImageUrl,
    }));

  return {
    code,
    investorName:
      connection.investor.profile?.displayName ?? connection.investor.name,
    investorLogoUrl: connection.investor.profile?.logoUrl ?? null,
    agencyName:
      connection.agency.profile?.displayName ?? connection.agency.name,
    projects,
  };
}

/** True when this code unlocks the investor project for a public visitor. */
export async function referralUnlocksProject(input: {
  referralCode: string | null | undefined;
  projectId: string;
  investorOrganizationId: string;
}): Promise<boolean> {
  const code = sanitizeReferralCode(input.referralCode);
  if (!code) return false;

  const access = await prisma.agencyProjectAccess.findFirst({
    where: {
      projectId: input.projectId,
      status: "ACTIVE",
      agencyConnection: {
        referralCode: code,
        status: "ACTIVE",
        investorOrganizationId: input.investorOrganizationId,
      },
    },
    select: { accessStartsAt: true, accessEndsAt: true },
  });
  return Boolean(access && isAccessInWindow(access));
}
