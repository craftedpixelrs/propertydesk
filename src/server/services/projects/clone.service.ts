import "server-only";
import type { Project } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertQuota } from "@/server/services/quotas.service";

/**
 * Faza 8.2 — B4. Project cloning.
 *
 * A common pattern in Serbian real-estate development is "we're launching
 * an identical building on the plot next to the last one". Instead of
 * re-typing 8 buildings × 4 entrances × 6 floors × 12 units, the operator
 * clones the source project's *structure* into a fresh, empty project.
 *
 * What we clone:
 *   - Project header (name/code/slug — user provides new ones).
 *   - Cost fields (land/construction/marketing/other) — usually similar
 *     for a follow-up building.
 *   - Optionally: `Building` → `Entrance` → `Floor` → `Unit` tree.
 *     Units are always cloned as `AVAILABLE` regardless of source status.
 *
 * What we do NOT clone:
 *   - Sales / Reservations / Buyers / Payments / Documents.
 *   - Public share links.
 *   - Comments, tasks, activities.
 *   - Floor-plan uploads (files stay attached to the source floor;
 *     operators can re-upload after clone).
 *
 * The clone runs inside a single `$transaction` and emits a
 * `project.cloned` audit event with the source and target IDs.
 */

export interface CloneProjectStructureInput {
  organizationId: string;
  actorUserId: string;
  sourceProjectId: string;
  /** Required — operator picks a distinct code for the new project. */
  newProjectCode: string;
  /** Required — operator picks a distinct name. */
  newProjectName: string;
  /** Optional — slug is derived from the name if omitted. */
  newProjectSlug?: string;
  copyBuildings?: boolean;
  copyEntrances?: boolean;
  copyFloors?: boolean;
  copyUnitsAsAvailable?: boolean;
  copyCosts?: boolean;
}

export interface CloneProjectResult {
  newProjectId: string;
  newProjectCode: string;
  counts: {
    buildings: number;
    entrances: number;
    floors: number;
    units: number;
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function resolveUniqueSlug(
  organizationId: string,
  base: string,
): Promise<string> {
  let candidate = base;
  let attempt = 0;
  while (true) {
    const clash = await prisma.project.findUnique({
      where: { organizationId_slug: { organizationId, slug: candidate } },
      select: { id: true },
    });
    if (!clash) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
    if (attempt > 20) {
      throw DomainErrors.conflict("Ne mogu da generišem jedinstven slug.");
    }
  }
}

export async function cloneProjectStructure(
  input: CloneProjectStructureInput,
): Promise<CloneProjectResult> {
  const source = await prisma.project.findFirst({
    where: { id: input.sourceProjectId, organizationId: input.organizationId },
    include: {
      buildings: {
        include: {
          entrances: {
            include: {
              floors: true,
            },
          },
        },
      },
    },
  });
  if (!source) throw DomainErrors.notFound("Projekat");

  const newCode = input.newProjectCode.trim();
  if (!newCode) {
    throw DomainErrors.badRequest("Šifra novog projekta je obavezna.");
  }
  const newName = input.newProjectName.trim();
  if (!newName) {
    throw DomainErrors.badRequest("Naziv novog projekta je obavezan.");
  }

  const codeClash = await prisma.project.findUnique({
    where: {
      organizationId_code: {
        organizationId: input.organizationId,
        code: newCode,
      },
    },
    select: { id: true },
  });
  if (codeClash) {
    throw DomainErrors.conflict(
      `Projekat sa šifrom "${newCode}" već postoji u ovoj organizaciji.`,
    );
  }

  await assertQuota(input.organizationId, "projects");

  const baseSlug = slugify(input.newProjectSlug || newName);
  const slug = await resolveUniqueSlug(input.organizationId, baseSlug);

  const copyBuildings = input.copyBuildings ?? true;
  const copyEntrances = input.copyEntrances ?? copyBuildings;
  const copyFloors = input.copyFloors ?? copyEntrances;
  const copyUnits = input.copyUnitsAsAvailable ?? false;
  const copyCosts = input.copyCosts ?? true;

  // Pre-flight unit-quota assertion when copying units so we fail fast
  // before starting the transaction.
  let plannedUnitCount = 0;
  if (copyUnits) {
    plannedUnitCount = await prisma.unit.count({
      where: { projectId: source.id, organizationId: input.organizationId },
    });
    if (plannedUnitCount > 0) {
      await assertQuota(input.organizationId, "units", plannedUnitCount);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const newProject: Project = await tx.project.create({
      data: {
        organizationId: input.organizationId,
        code: newCode,
        name: newName,
        slug,
        description: source.description ?? null,
        address: source.address ?? null,
        city: source.city ?? null,
        municipality: source.municipality ?? null,
        postalCode: source.postalCode ?? null,
        latitude: source.latitude ?? null,
        longitude: source.longitude ?? null,
        coverImageUrl: null,
        projectStatus: "DRAFT",
        defaultCurrency: source.defaultCurrency,
        defaultVatRate: source.defaultVatRate ?? null,
        internalNotes: null,
        createdByUserId: input.actorUserId,
        landCost: copyCosts ? source.landCost : null,
        constructionCost: copyCosts ? source.constructionCost : null,
        marketingCost: copyCosts ? source.marketingCost : null,
        otherCost: copyCosts ? source.otherCost : null,
        budgetNote: copyCosts ? source.budgetNote : null,
      },
    });

    let buildingsCreated = 0;
    let entrancesCreated = 0;
    let floorsCreated = 0;
    let unitsCreated = 0;

    if (copyBuildings) {
      for (const b of source.buildings) {
        const nb = await tx.building.create({
          data: {
            projectId: newProject.id,
            code: b.code,
            name: b.name,
            description: b.description ?? null,
            sortOrder: b.sortOrder,
          },
        });
        buildingsCreated += 1;

        // Map old→new IDs so units can be attached correctly.
        const entranceIdMap = new Map<string, string>();
        const floorIdMap = new Map<string, string>();

        if (copyEntrances) {
          for (const e of b.entrances) {
            const ne = await tx.entrance.create({
              data: {
                buildingId: nb.id,
                code: e.code,
                name: e.name,
                sortOrder: e.sortOrder,
              },
            });
            entrancesCreated += 1;
            entranceIdMap.set(e.id, ne.id);

            if (copyFloors) {
              for (const f of e.floors) {
                const nf = await tx.floor.create({
                  data: {
                    entranceId: ne.id,
                    number: f.number ?? null,
                    label: f.label,
                    sortOrder: f.sortOrder,
                    // Deliberately drop `floorPlanUrl` — operators must
                    // re-upload plans in the new project because storage
                    // paths are namespaced by projectId.
                    floorPlanUrl: null,
                  },
                });
                floorsCreated += 1;
                floorIdMap.set(f.id, nf.id);
              }
            }
          }
        }

        if (copyUnits) {
          // We hydrate units per-building to keep the map lookups small.
          const sourceUnits = await tx.unit.findMany({
            where: {
              projectId: source.id,
              organizationId: input.organizationId,
              buildingId: b.id,
            },
          });
          for (const u of sourceUnits) {
            const targetEntranceId =
              u.entranceId && entranceIdMap.has(u.entranceId)
                ? entranceIdMap.get(u.entranceId)!
                : null;
            const targetFloorId =
              u.floorId && floorIdMap.has(u.floorId)
                ? floorIdMap.get(u.floorId)!
                : null;
            await tx.unit.create({
              data: {
                organizationId: input.organizationId,
                projectId: newProject.id,
                buildingId: nb.id,
                entranceId: targetEntranceId,
                floorId: targetFloorId,
                code: u.code,
                externalReference: null,
                type: u.type,
                status: "AVAILABLE",
                structure: u.structure ?? null,
                roomCount: u.roomCount ?? null,
                totalArea: u.totalArea,
                internalArea: u.internalArea ?? null,
                terraceArea: u.terraceArea ?? null,
                gardenArea: u.gardenArea ?? null,
                orientation: u.orientation ?? null,
                basePrice: u.basePrice,
                finalPrice: u.finalPrice ?? null,
                pricePerSquareMeter: u.pricePerSquareMeter ?? null,
                currency: u.currency,
                vatRate: u.vatRate ?? null,
                bedrooms: u.bedrooms ?? null,
                bathrooms: u.bathrooms ?? null,
                publicDescription: u.publicDescription ?? null,
                internalNotes: null,
              },
            });
            unitsCreated += 1;
          }
        }
      }
    }

    // Units without a building (rare — free-floating on the project) are
    // cloned only when `copyUnitsAsAvailable` is on and buildings were also
    // copied (otherwise there's no structural context to attach to).
    if (copyUnits && !copyBuildings) {
      const orphanUnits = await tx.unit.findMany({
        where: {
          projectId: source.id,
          organizationId: input.organizationId,
          buildingId: null,
        },
      });
      for (const u of orphanUnits) {
        await tx.unit.create({
          data: {
            organizationId: input.organizationId,
            projectId: newProject.id,
            buildingId: null,
            entranceId: null,
            floorId: null,
            code: u.code,
            externalReference: null,
            type: u.type,
            status: "AVAILABLE",
            structure: u.structure ?? null,
            roomCount: u.roomCount ?? null,
            totalArea: u.totalArea,
            internalArea: u.internalArea ?? null,
            terraceArea: u.terraceArea ?? null,
            gardenArea: u.gardenArea ?? null,
            orientation: u.orientation ?? null,
            basePrice: u.basePrice,
            finalPrice: u.finalPrice ?? null,
            pricePerSquareMeter: u.pricePerSquareMeter ?? null,
            currency: u.currency,
            vatRate: u.vatRate ?? null,
            bedrooms: u.bedrooms ?? null,
            bathrooms: u.bathrooms ?? null,
            publicDescription: u.publicDescription ?? null,
            internalNotes: null,
          },
        });
        unitsCreated += 1;
      }
    }

    return {
      newProjectId: newProject.id,
      newProjectCode: newProject.code,
      counts: {
        buildings: buildingsCreated,
        entrances: entrancesCreated,
        floors: floorsCreated,
        units: unitsCreated,
      },
    };
  });

  await recordAudit({
    action: "project.cloned",
    entityType: "Project",
    entityId: result.newProjectId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      sourceProjectId: source.id,
      sourceProjectCode: source.code,
      newProjectCode: result.newProjectCode,
      counts: result.counts,
      options: {
        copyBuildings,
        copyEntrances,
        copyFloors,
        copyUnitsAsAvailable: copyUnits,
        copyCosts,
      },
    },
  });

  return result;
}
