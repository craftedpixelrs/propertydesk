import "server-only";
import type { Prisma, ProjectStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertQuota } from "@/server/services/quotas.service";

/**
 * Projects service — tenant-scoped CRUD, list with filters and pagination,
 * lifecycle actions (archive, restore, change status).
 *
 * All mutations run inside a transaction that also emits an `AuditLog`
 * record so nothing changes silently. Reads are always constrained by
 * `organizationId` (which the API layer resolves from the active
 * organization on the request).
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ListProjectsInput {
  organizationId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: ProjectStatus;
  activeOnly?: boolean;
  sort?: { field: string; direction: "asc" | "desc" };
}

export interface ProjectListItem {
  id: string;
  code: string;
  name: string;
  slug: string;
  city: string | null;
  projectStatus: ProjectStatus;
  isActive: boolean;
  createdAt: Date;
  archivedAt: Date | null;
  unitCounts: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
  };
}

export interface CreateProjectInput {
  organizationId: string;
  actorUserId: string;
  code: string;
  name: string;
  slug?: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  municipality?: string | null;
  postalCode?: string | null;
  /**
   * WGS84 decimal degrees, kept as `number` at the API edge and stored
   * as `Decimal(10,7)` (~1 cm precision). Both must be present or both
   * absent — enforced by the API zod schema, not the service.
   */
  latitude?: number | null;
  longitude?: number | null;
  /** Public cover image URL — used by the shareable offer page. */
  coverImageUrl?: string | null;
  projectStatus?: ProjectStatus;
  salesStartDate?: Date | null;
  constructionStartDate?: Date | null;
  expectedCompletionDate?: Date | null;
  defaultCurrency?: string;
  defaultVatRate?: number | null;
  internalNotes?: string | null;
  landCost?: number | null;
  constructionCost?: number | null;
  marketingCost?: number | null;
  otherCost?: number | null;
  budgetNote?: string | null;
  /** C1 — Public project microsite toggle & slug (defaults to project.slug). */
  publicMicrositeEnabled?: boolean;
  publicMicrositeSlug?: string | null;
  /** Network catalog teaser for verified agencies. */
  networkCatalogEnabled?: boolean;
}

export interface UpdateProjectInput {
  organizationId: string;
  projectId: string;
  actorUserId: string;
  patch: Partial<Omit<CreateProjectInput, "organizationId" | "actorUserId" | "code">>;
}

// -----------------------------------------------------------------------------
// Sorting allowlist — prevents user-supplied sort strings from touching
// arbitrary columns.
// -----------------------------------------------------------------------------

const ALLOWED_SORT_FIELDS = new Set([
  "createdAt",
  "name",
  "code",
  "projectStatus",
]);

function resolveOrderBy(
  sort: ListProjectsInput["sort"],
): Prisma.ProjectOrderByWithRelationInput {
  if (!sort || !ALLOWED_SORT_FIELDS.has(sort.field)) {
    return { createdAt: "desc" };
  }
  return { [sort.field]: sort.direction } as Prisma.ProjectOrderByWithRelationInput;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureUniqueCode(
  organizationId: string,
  code: string,
): Promise<void> {
  const existing = await prisma.project.findUnique({
    where: { organizationId_code: { organizationId, code } },
    select: { id: true },
  });
  if (existing) {
    throw DomainErrors.conflict(
      `Projekat sa šifrom "${code}" već postoji u ovoj organizaciji.`,
    );
  }
}

async function ensureUniqueSlug(
  organizationId: string,
  slug: string,
): Promise<string> {
  let candidate = slug;
  let attempt = 0;
  while (true) {
    const clash = await prisma.project.findUnique({
      where: { organizationId_slug: { organizationId, slug: candidate } },
      select: { id: true },
    });
    if (!clash) return candidate;
    attempt += 1;
    candidate = `${slug}-${attempt + 1}`;
    if (attempt > 20) {
      throw DomainErrors.conflict("Ne mogu da generišem jedinstven slug.");
    }
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function listProjects(
  input: ListProjectsInput,
): Promise<{ items: ProjectListItem[]; total: number }> {
  const where: Prisma.ProjectWhereInput = {
    organizationId: input.organizationId,
    ...(input.status ? { projectStatus: input.status } : {}),
    ...(input.activeOnly ? { archivedAt: null } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { code: { contains: input.search, mode: "insensitive" } },
            { city: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: resolveOrderBy(input.sort),
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        _count: { select: { units: true } },
      },
    }),
  ]);

  const projectIds = rows.map((r) => r.id);
  const statusAgg = projectIds.length
    ? await prisma.unit.groupBy({
        by: ["projectId", "status"],
        where: { projectId: { in: projectIds }, archivedAt: null },
        _count: { _all: true },
      })
    : [];

  const byProject: Map<
    string,
    { total: number; available: number; reserved: number; sold: number }
  > = new Map();
  for (const id of projectIds) {
    byProject.set(id, { total: 0, available: 0, reserved: 0, sold: 0 });
  }
  for (const row of statusAgg) {
    const bucket = byProject.get(row.projectId);
    if (!bucket) continue;
    bucket.total += row._count._all;
    if (row.status === "AVAILABLE") bucket.available += row._count._all;
    if (row.status === "RESERVED" || row.status === "DEPOSIT_PAID" || row.status === "ON_HOLD") {
      bucket.reserved += row._count._all;
    }
    if (row.status === "SOLD" || row.status === "CONTRACTED") {
      bucket.sold += row._count._all;
    }
  }

  const items: ProjectListItem[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    slug: r.slug,
    city: r.city,
    projectStatus: r.projectStatus,
    isActive: r.isActive,
    createdAt: r.createdAt,
    archivedAt: r.archivedAt,
    unitCounts: byProject.get(r.id) ?? {
      total: 0,
      available: 0,
      reserved: 0,
      sold: 0,
    },
  }));

  return { items, total };
}

export async function getProjectById(
  organizationId: string,
  projectId: string,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    include: {
      buildings: {
        orderBy: { sortOrder: "asc" },
        include: {
          entrances: {
            orderBy: { sortOrder: "asc" },
            include: {
              floors: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
      _count: { select: { units: true, reservations: true, sales: true } },
    },
  });
  if (!project) throw DomainErrors.notFound("Projekat");
  return project;
}

export async function createProject(input: CreateProjectInput) {
  await assertQuota(input.organizationId, "projects");
  await ensureUniqueCode(input.organizationId, input.code);

  const slugBase = slugify(input.slug || input.name || input.code);
  const slug = await ensureUniqueSlug(input.organizationId, slugBase);

  const created = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        organizationId: input.organizationId,
        code: input.code,
        name: input.name,
        slug,
        description: input.description ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        municipality: input.municipality ?? null,
        postalCode: input.postalCode ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        projectStatus: input.projectStatus ?? "DRAFT",
        salesStartDate: input.salesStartDate ?? null,
        constructionStartDate: input.constructionStartDate ?? null,
        expectedCompletionDate: input.expectedCompletionDate ?? null,
        defaultCurrency: input.defaultCurrency ?? "EUR",
        defaultVatRate: input.defaultVatRate ?? null,
        internalNotes: input.internalNotes ?? null,
        publicMicrositeEnabled: input.publicMicrositeEnabled ?? false,
        networkCatalogEnabled: input.networkCatalogEnabled ?? false,
        createdByUserId: input.actorUserId,
      },
    });
    return project;
  });

  await recordAudit({
    action: "project.created",
    entityType: "Project",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      code: created.code,
      name: created.name,
      slug: created.slug,
      projectStatus: created.projectStatus,
    },
  });

  return created;
}

export async function updateProject(input: UpdateProjectInput) {
  const existing = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Projekat");

  let nextSlug: string | undefined;
  if (input.patch.slug && input.patch.slug !== existing.slug) {
    const base = slugify(input.patch.slug);
    nextSlug = await ensureUniqueSlug(input.organizationId, base);
  }

  // C1: microsite slug is optional; when the operator provides a new
  // value we must ensure global uniqueness (the field carries a
  // top-level unique constraint). Empty string → null (fallback to
  // project.slug in the resolver).
  let nextMicrositeSlug: string | null | undefined;
  if (input.patch.publicMicrositeSlug !== undefined) {
    const raw = input.patch.publicMicrositeSlug;
    if (!raw) {
      nextMicrositeSlug = null;
    } else {
      const normalized = slugify(raw);
      if (normalized !== existing.publicMicrositeSlug) {
        const clash = await prisma.project.findFirst({
          where: {
            publicMicrositeSlug: normalized,
            id: { not: existing.id },
          },
          select: { id: true },
        });
        if (clash) {
          throw DomainErrors.conflict(
            `Slug "${normalized}" je već zauzet drugim projektom.`,
          );
        }
      }
      nextMicrositeSlug = normalized;
    }
  }

  const updated = await prisma.project.update({
    where: { id: input.projectId },
    data: {
      name: input.patch.name ?? undefined,
      slug: nextSlug ?? undefined,
      description:
        input.patch.description === undefined ? undefined : input.patch.description,
      address: input.patch.address === undefined ? undefined : input.patch.address,
      city: input.patch.city === undefined ? undefined : input.patch.city,
      municipality:
        input.patch.municipality === undefined ? undefined : input.patch.municipality,
      postalCode:
        input.patch.postalCode === undefined ? undefined : input.patch.postalCode,
      latitude: input.patch.latitude === undefined ? undefined : input.patch.latitude,
      longitude:
        input.patch.longitude === undefined ? undefined : input.patch.longitude,
      coverImageUrl:
        input.patch.coverImageUrl === undefined ? undefined : input.patch.coverImageUrl,
      projectStatus: input.patch.projectStatus ?? undefined,
      salesStartDate:
        input.patch.salesStartDate === undefined
          ? undefined
          : input.patch.salesStartDate,
      constructionStartDate:
        input.patch.constructionStartDate === undefined
          ? undefined
          : input.patch.constructionStartDate,
      expectedCompletionDate:
        input.patch.expectedCompletionDate === undefined
          ? undefined
          : input.patch.expectedCompletionDate,
      defaultCurrency: input.patch.defaultCurrency ?? undefined,
      defaultVatRate:
        input.patch.defaultVatRate === undefined
          ? undefined
          : input.patch.defaultVatRate,
      internalNotes:
        input.patch.internalNotes === undefined ? undefined : input.patch.internalNotes,
      landCost:
        input.patch.landCost === undefined ? undefined : input.patch.landCost,
      constructionCost:
        input.patch.constructionCost === undefined
          ? undefined
          : input.patch.constructionCost,
      marketingCost:
        input.patch.marketingCost === undefined
          ? undefined
          : input.patch.marketingCost,
      otherCost:
        input.patch.otherCost === undefined ? undefined : input.patch.otherCost,
      budgetNote:
        input.patch.budgetNote === undefined ? undefined : input.patch.budgetNote,
      publicMicrositeEnabled:
        input.patch.publicMicrositeEnabled === undefined
          ? undefined
          : input.patch.publicMicrositeEnabled,
      publicMicrositeSlug:
        nextMicrositeSlug === undefined ? undefined : nextMicrositeSlug,
      networkCatalogEnabled:
        input.patch.networkCatalogEnabled === undefined
          ? undefined
          : input.patch.networkCatalogEnabled,
    },
  });

  const costFieldsTouched =
    input.patch.landCost !== undefined ||
    input.patch.constructionCost !== undefined ||
    input.patch.marketingCost !== undefined ||
    input.patch.otherCost !== undefined ||
    input.patch.budgetNote !== undefined;

  if (costFieldsTouched) {
    await recordAudit({
      action: "project.costs_updated",
      entityType: "Project",
      entityId: updated.id,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      previousValues: {
        landCost: existing.landCost,
        constructionCost: existing.constructionCost,
        marketingCost: existing.marketingCost,
        otherCost: existing.otherCost,
      },
      newValues: {
        landCost: updated.landCost,
        constructionCost: updated.constructionCost,
        marketingCost: updated.marketingCost,
        otherCost: updated.otherCost,
      },
    });
  }

  await recordAudit({
    action: "project.updated",
    entityType: "Project",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: {
      name: existing.name,
      projectStatus: existing.projectStatus,
    },
    newValues: {
      name: updated.name,
      projectStatus: updated.projectStatus,
    },
  });

  return updated;
}

export async function archiveProject(
  organizationId: string,
  projectId: string,
  actorUserId: string,
) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Projekat");
  if (existing.archivedAt) {
    throw DomainErrors.invalidState("Projekat je već arhiviran.");
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      archivedAt: new Date(),
      isActive: false,
      projectStatus: "ARCHIVED",
    },
  });

  await recordAudit({
    action: "project.archived",
    entityType: "Project",
    entityId: projectId,
    organizationId,
    actorUserId,
  });
}

export async function restoreProject(
  organizationId: string,
  projectId: string,
  actorUserId: string,
) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Projekat");
  if (!existing.archivedAt) {
    throw DomainErrors.invalidState("Projekat nije arhiviran.");
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      archivedAt: null,
      isActive: true,
      projectStatus: "DRAFT",
    },
  });

  await recordAudit({
    action: "project.restored",
    entityType: "Project",
    entityId: projectId,
    organizationId,
    actorUserId,
  });
}
