import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";

/**
 * Share-link service — creates opaque public tokens for the `/p/[token]`
 * unit offer page and resolves them into a whitelisted payload that is
 * safe to render without authentication.
 *
 * Whitelist rules:
 *   - never expose `internalNotes`, `basePrice`, `discountValue`,
 *     `discountType`, or any buyer-side PII.
 *   - never expose the full document object — public callers only ever
 *     get `documentId + originalFileName + mimeType`, and files stream
 *     through a token-scoped route that validates parentage.
 *
 * The service never lets an agency share a unit they do not have
 * `isVisibleToAgencies` access to. Investor callers can share any unit
 * in their own org (their `inventory.read` permission is already
 * enforced at the API layer).
 */

/**
 * ~192 bits of entropy — high enough that brute-forcing the URL is not
 * feasible even at millions of tries per second. Base64url so the
 * token is safe inside a path segment without percent-encoding.
 */
function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

async function assertUnitVisibleToOrg(input: {
  organizationId: string;
  organizationType: "INVESTOR" | "AGENCY";
  unitId: string;
}): Promise<{ unitOrganizationId: string }> {
  const unit = await prisma.unit.findFirst({
    where: { id: input.unitId, archivedAt: null },
    select: {
      id: true,
      organizationId: true,
      isVisibleToAgencies: true,
      projectId: true,
    },
  });
  if (!unit) throw DomainErrors.notFound("Jedinica");

  if (input.organizationType === "INVESTOR") {
    if (unit.organizationId !== input.organizationId) {
      throw DomainErrors.forbidden(
        "Ova jedinica ne pripada vašoj organizaciji.",
      );
    }
    return { unitOrganizationId: unit.organizationId };
  }

  // AGENCY: must have an active connection and access to the project,
  // and the unit itself must be visible.
  if (!unit.isVisibleToAgencies) {
    throw DomainErrors.forbidden("Ova jedinica nije vidljiva agencijama.");
  }
  const access = await prisma.agencyProjectAccess.findFirst({
    where: {
      projectId: unit.projectId,
      status: "ACTIVE",
      agencyConnection: {
        agencyOrganizationId: input.organizationId,
        status: "ACTIVE",
      },
    },
  });
  if (!access) {
    throw DomainErrors.forbidden("Nemate pristup ovom projektu.");
  }
  const now = new Date();
  if (access.accessStartsAt && access.accessStartsAt > now) {
    throw DomainErrors.forbidden("Pristup projektu još nije aktivan.");
  }
  if (access.accessEndsAt && access.accessEndsAt < now) {
    throw DomainErrors.forbidden("Pristup projektu je istekao.");
  }
  return { unitOrganizationId: unit.organizationId };
}

export interface CreateShareLinkInput {
  organizationId: string;
  organizationType: "INVESTOR" | "AGENCY";
  actorUserId: string;
  entityType: "Unit";
  entityId: string;
  showPrice?: boolean;
  expiresAt?: Date | null;
}

export async function createShareLink(input: CreateShareLinkInput) {
  const { unitOrganizationId } = await assertUnitVisibleToOrg({
    organizationId: input.organizationId,
    organizationType: input.organizationType,
    unitId: input.entityId,
  });

  const link = await prisma.shareLink.create({
    data: {
      // The link always belongs to the investor org that owns the
      // unit — that way public offers are branded by the seller, not
      // the agency, and revocation stays with the seller.
      organizationId: unitOrganizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      token: generateToken(),
      createdByUserId: input.actorUserId,
      showPrice: input.showPrice ?? true,
      expiresAt: input.expiresAt ?? null,
    },
  });

  await recordAudit({
    action: "share_link.created",
    entityType: "ShareLink",
    entityId: link.id,
    organizationId: unitOrganizationId,
    actorUserId: input.actorUserId,
    newValues: {
      target: `${input.entityType}:${input.entityId}`,
      showPrice: link.showPrice,
      expiresAt: link.expiresAt,
    },
  });

  return link;
}

export async function revokeShareLink(input: {
  organizationId: string;
  actorUserId: string;
  linkId: string;
}) {
  const link = await prisma.shareLink.findFirst({
    where: {
      id: input.linkId,
      organizationId: input.organizationId,
      revokedAt: null,
    },
  });
  if (!link) throw DomainErrors.notFound("Deljivi link");
  const updated = await prisma.shareLink.update({
    where: { id: link.id },
    data: { revokedAt: new Date() },
  });
  await recordAudit({
    action: "share_link.revoked",
    entityType: "ShareLink",
    entityId: link.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      target: `${link.entityType}:${link.entityId}`,
    },
  });
  return updated;
}

export async function listShareLinksForEntity(input: {
  organizationId: string;
  entityType: "Unit";
  entityId: string;
}) {
  return prisma.shareLink.findMany({
    where: {
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// -----------------------------------------------------------------------------
// Public resolution
// -----------------------------------------------------------------------------

export interface PublicUnitOfferImage {
  documentId: string;
  fileName: string;
  isCover: boolean;
}

export interface PublicUnitOffer {
  token: string;
  showPrice: boolean;
  organization: {
    name: string;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  project: {
    name: string;
    address: string | null;
    city: string | null;
    coverImageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    publicDescription: string | null;
  };
  unit: {
    id: string;
    code: string;
    type: string;
    structure: string | null;
    totalArea: string;
    internalArea: string | null;
    terraceArea: string | null;
    gardenArea: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    orientation: string | null;
    publicDescription: string | null;
    price: string | null;
    currency: string;
    status: string;
  };
  images: PublicUnitOfferImage[];
}

const PUBLICLY_VISIBLE_STATUSES = new Set([
  "AVAILABLE",
  "ON_HOLD",
  "RESERVED",
  "DEPOSIT_PAID",
]);

/**
 * Resolve a public share token into a whitelisted offer payload.
 *
 * Returns `null` when the token does not exist, is revoked, has
 * expired, or points at an entity that is no longer offerable.
 * Consumers render a generic 404 in all four cases so a probe cannot
 * distinguish "wrong token" from "expired token".
 */
export async function resolvePublicUnitOffer(
  token: string,
): Promise<PublicUnitOffer | null> {
  if (!token || token.length > 128) return null;

  const link = await prisma.shareLink.findUnique({
    where: { token },
  });
  if (!link) return null;
  if (link.revokedAt) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;
  if (link.entityType !== "Unit") return null;

  const [unit, orgProfile, images] = await Promise.all([
    prisma.unit.findFirst({
      where: {
        id: link.entityId,
        organizationId: link.organizationId,
        archivedAt: null,
      },
      select: {
        id: true,
        code: true,
        type: true,
        structure: true,
        totalArea: true,
        internalArea: true,
        terraceArea: true,
        gardenArea: true,
        bedrooms: true,
        bathrooms: true,
        orientation: true,
        publicDescription: true,
        finalPrice: true,
        basePrice: true,
        currency: true,
        status: true,
        project: {
          select: {
            name: true,
            address: true,
            city: true,
            coverImageUrl: true,
            latitude: true,
            longitude: true,
            description: true,
          },
        },
      },
    }),
    prisma.organizationProfile.findUnique({
      where: { organizationId: link.organizationId },
      select: {
        displayName: true,
        legalName: true,
        logoUrl: true,
        phone: true,
        email: true,
        website: true,
      },
    }),
    prisma.document.findMany({
      where: {
        organizationId: link.organizationId,
        entityType: "Unit",
        entityId: link.entityId,
        deletedAt: null,
        mimeType: { startsWith: "image/" },
      },
      orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      take: 24,
      select: {
        id: true,
        originalFileName: true,
        isCover: true,
      },
    }),
  ]);

  if (!unit) return null;
  if (!PUBLICLY_VISIBLE_STATUSES.has(unit.status)) return null;

  const price = link.showPrice
    ? (unit.finalPrice ?? unit.basePrice).toString()
    : null;

  return {
    token,
    showPrice: link.showPrice,
    organization: {
      name: orgProfile?.displayName ?? orgProfile?.legalName ?? "",
      logoUrl: orgProfile?.logoUrl ?? null,
      phone: orgProfile?.phone ?? null,
      email: orgProfile?.email ?? null,
      website: orgProfile?.website ?? null,
    },
    project: {
      name: unit.project.name,
      address: unit.project.address,
      city: unit.project.city,
      coverImageUrl: unit.project.coverImageUrl,
      latitude:
        unit.project.latitude != null ? Number(unit.project.latitude) : null,
      longitude:
        unit.project.longitude != null ? Number(unit.project.longitude) : null,
      publicDescription: unit.project.description ?? null,
    },
    unit: {
      id: unit.id,
      code: unit.code,
      type: unit.type,
      structure: unit.structure ?? null,
      totalArea: unit.totalArea.toString(),
      internalArea: unit.internalArea ? unit.internalArea.toString() : null,
      terraceArea: unit.terraceArea ? unit.terraceArea.toString() : null,
      gardenArea: unit.gardenArea ? unit.gardenArea.toString() : null,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      orientation: unit.orientation,
      publicDescription: unit.publicDescription,
      price,
      currency: unit.currency,
      status: unit.status,
    },
    images: images.map((d) => ({
      documentId: d.id,
      fileName: d.originalFileName,
      isCover: d.isCover,
    })),
  };
}

/**
 * Increment the `viewCount` and stamp `lastViewedAt` on the given
 * token. Ignores unknown tokens silently — the caller has already
 * resolved the offer at this point.
 */
export async function recordShareView(token: string): Promise<void> {
  try {
    await prisma.shareLink.update({
      where: { token },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });
  } catch {
    // The unique-by-token constraint means a missing row throws
    // P2025 here; we swallow it because view tracking should never
    // break the public page render.
  }
}

/**
 * Resolve a token + `documentId` into a `document` row, verifying
 * that the document is an image AND belongs to the same unit the
 * token points at. Returns `null` when anything is off — the API
 * route renders a 404 in that case.
 *
 * This is the ONLY function through which unauthenticated callers may
 * reach the storage layer, so all guards must live here.
 */
export async function resolveShareImage(input: {
  token: string;
  documentId: string;
}): Promise<{ storageKey: string; mimeType: string; fileName: string } | null> {
  if (!input.token || !input.documentId) return null;
  const link = await prisma.shareLink.findUnique({
    where: { token: input.token },
  });
  if (!link) return null;
  if (link.revokedAt) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;

  const doc = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      organizationId: link.organizationId,
      entityType: link.entityType,
      entityId: link.entityId,
      deletedAt: null,
      mimeType: { startsWith: "image/" },
    },
    select: {
      storageKey: true,
      mimeType: true,
      originalFileName: true,
    },
  });
  if (!doc) return null;
  return {
    storageKey: doc.storageKey,
    mimeType: doc.mimeType,
    fileName: doc.originalFileName,
  };
}

// The Prisma model is exported so callers can attach `select` clauses
// consistently.
export type ShareLinkWhere = Prisma.ShareLinkWhereInput;
