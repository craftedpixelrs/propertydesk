import { prisma } from "@/server/db/prisma";

/**
 * Organization service — reads scoped by membership.
 *
 * Every function that takes a `userId` treats it as the sole tenant boundary
 * and applies `member.userId = userId` in the query. The `isSuperAdmin`
 * flag is the only escape hatch, and it is passed explicitly by the caller
 * (never inferred from the DB inside a repo).
 */

export interface ListOrganizationsInput {
  userId: string;
  isSuperAdmin: boolean;
  page: number;
  pageSize: number;
  search?: string;
}

export interface OrganizationListItem {
  id: string;
  name: string;
  slug: string | null;
  type: "INVESTOR" | "AGENCY" | null;
  status: "TRIAL" | "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "CLOSED" | null;
  memberRole: string | null;
  createdAt: Date;
}

export async function listOrganizationsForUser(
  input: ListOrganizationsInput,
): Promise<{ items: OrganizationListItem[]; total: number }> {
  const { userId, isSuperAdmin, page, pageSize, search } = input;

  const where = isSuperAdmin
    ? search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {}
    : {
        members: { some: { userId } },
        ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      };

  const [total, rows] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      include: {
        profile: true,
        members: isSuperAdmin
          ? false
          : { where: { userId }, select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items: OrganizationListItem[] = rows.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.profile?.type ?? null,
    status: org.profile?.status ?? null,
    memberRole: isSuperAdmin
      ? null
      : (
          (org as unknown as { members: { role: string }[] }).members?.[0]?.role ?? null
        ),
    createdAt: org.createdAt,
  }));

  return { items, total };
}
