import "server-only";
import type { DocumentCategory, DocumentVisibility, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { storage, assertAllowedMimeType, MAX_UPLOAD_BYTES } from "@/server/storage";

/**
 * DocumentService — thin wrapper around the storage abstraction that adds
 * organization scoping, category/visibility rules and audit logging.
 *
 * Access matrix (category × visibility):
 *
 *   category=BUYER + visibility=BUYER_SHARED  → buyer + investor team
 *   category=SALE  + visibility=INVESTOR_TEAM → investor team only
 *   category=AGENCY|COMMISSION + visibility=AGENCY_SHARED → agency users
 *   any            + visibility=INTERNAL      → investor OWNER / MANAGER only
 *
 * `getSignedDownloadUrl` is the single ingress used by the UI. It resolves
 * per-caller permissions before yielding a URL from the storage provider.
 */

export interface UploadDocumentInput {
  organizationId: string;
  /**
   * Signed-in operator who performed the upload. `null` is accepted for
   * resident-portal flows — residents are not `User` rows so there is no
   * valid id to persist on `uploadedByUserId`. In that case callers pass
   * `actorPersonId` so we can still trace the resident identity on the
   * document itself (and the audit log entry is written with a null
   * actor plus a `metadata.personId` field).
   */
  actorUserId: string | null;
  actorPersonId?: string | null;
  category: DocumentCategory;
  entityType: string;
  entityId: string;
  visibility?: DocumentVisibility;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  expiresAt?: Date | null;
}

export interface ListDocumentsInput {
  organizationId: string;
  entityType: string;
  entityId: string;
  category?: DocumentCategory;
  /**
   * When true, restricts results to documents whose `mimeType` starts
   * with `image/`. Used by the photo-gallery on unit and project detail
   * pages.
   */
  imagesOnly?: boolean;
  /**
   * When true, filters OUT documents whose `mimeType` starts with
   * `image/`. Complement of `imagesOnly` — used by the sale detail's
   * "Dokumentacija jedinice" pane, which does not want to duplicate
   * the photo gallery.
   */
  excludeImages?: boolean;
  page: number;
  pageSize: number;
}

const AGENCY_VISIBLE: DocumentVisibility[] = ["AGENCY_SHARED", "BUYER_SHARED"];

function assertBuffer(buffer: Buffer): void {
  if (!buffer || buffer.byteLength === 0) {
    throw DomainErrors.badRequest("Datoteka je prazna.");
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw DomainErrors.badRequest(
      `Datoteka je prevelika (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`,
    );
  }
}

export async function uploadDocument(input: UploadDocumentInput) {
  assertAllowedMimeType(input.mimeType);
  assertBuffer(input.buffer);

  const put = await storage().put({
    organizationId: input.organizationId,
    category: input.category,
    fileName: input.fileName,
    contentType: input.mimeType,
    body: input.buffer,
  });

  const doc = await prisma.document.create({
    data: {
      organizationId: input.organizationId,
      category: input.category,
      entityType: input.entityType,
      entityId: input.entityId,
      fileName: input.fileName,
      originalFileName: input.fileName,
      mimeType: input.mimeType,
      size: put.size,
      storageKey: put.storageKey,
      uploadedByUserId: input.actorUserId,
      uploadedByPersonId: input.actorPersonId ?? null,
      visibility: input.visibility ?? "INTERNAL",
      expiresAt: input.expiresAt ?? null,
    },
  });

  await recordAudit({
    action: "document.uploaded",
    entityType: "Document",
    entityId: doc.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      category: doc.category,
      visibility: doc.visibility,
      size: doc.size,
      target: `${input.entityType}:${input.entityId}`,
    },
    metadata: input.actorPersonId ? { personId: input.actorPersonId } : undefined,
  });

  return doc;
}

export async function listDocuments(input: ListDocumentsInput) {
  const where: Prisma.DocumentWhereInput = {
    organizationId: input.organizationId,
    entityType: input.entityType,
    entityId: input.entityId,
    deletedAt: null,
    ...(input.category ? { category: input.category } : {}),
    ...(input.imagesOnly ? { mimeType: { startsWith: "image/" } } : {}),
    ...(input.excludeImages ? { NOT: { mimeType: { startsWith: "image/" } } } : {}),
  };
  // The gallery uses (sortOrder ASC, createdAt DESC) so operator drag
  // ordering wins, but new uploads that keep the default sortOrder are
  // still surfaced newest-first.
  const orderBy: Prisma.DocumentOrderByWithRelationInput[] = input.imagesOnly
    ? [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }]
    : [{ createdAt: "desc" }];
  const [total, rows] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        uploadedByUser: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { items: rows, total };
}

/**
 * Flip the `isCover` flag on exactly one document within an entity. Any
 * existing cover on the same (entityType, entityId) is demoted in the
 * same transaction so there is never more than one cover per entity.
 */
export async function setCoverImage(input: {
  organizationId: string;
  actorUserId: string;
  documentId: string;
}) {
  const doc = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
  });
  if (!doc) throw DomainErrors.notFound("Dokument");
  if (!doc.mimeType.startsWith("image/")) {
    throw DomainErrors.badRequest("Naslovna slika mora biti slika (image/*).");
  }

  await prisma.$transaction([
    prisma.document.updateMany({
      where: {
        organizationId: input.organizationId,
        entityType: doc.entityType,
        entityId: doc.entityId,
        deletedAt: null,
        isCover: true,
        NOT: { id: doc.id },
      },
      data: { isCover: false },
    }),
    prisma.document.update({
      where: { id: doc.id },
      data: { isCover: true },
    }),
  ]);

  await recordAudit({
    action: "document.set_cover",
    entityType: "Document",
    entityId: doc.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { target: `${doc.entityType}:${doc.entityId}` },
  });
}

/**
 * Persist a full ordering of documents for a single entity. `ids` must
 * all belong to the same (entityType, entityId) tuple owned by the
 * caller organization — a mismatch aborts the whole transaction so
 * partial reorders never occur.
 */
export async function reorderDocuments(input: {
  organizationId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  orderedDocumentIds: string[];
}) {
  if (input.orderedDocumentIds.length === 0) return;
  const docs = await prisma.document.findMany({
    where: {
      id: { in: input.orderedDocumentIds },
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (docs.length !== input.orderedDocumentIds.length) {
    throw DomainErrors.badRequest("Neki dokumenti ne pripadaju ovom entitetu.");
  }
  await prisma.$transaction(
    input.orderedDocumentIds.map((id, index) =>
      prisma.document.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  await recordAudit({
    action: "document.reordered",
    entityType: "Document",
    entityId: input.orderedDocumentIds[0]!,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      target: `${input.entityType}:${input.entityId}`,
      count: input.orderedDocumentIds.length,
    },
  });
}

export async function softDeleteDocument(input: {
  organizationId: string;
  actorUserId: string;
  documentId: string;
}) {
  const existing = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
  });
  if (!existing) throw DomainErrors.notFound("Dokument");
  // Soft-delete only. The object stays in S3/local for
  // DOCUMENT_STORAGE_RETENTION_DAYS; `purge-deleted-documents` removes it.
  const updated = await prisma.document.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });
  await recordAudit({
    action: "document.deleted",
    entityType: "Document",
    entityId: existing.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
  return updated;
}

export interface DocumentAccessContext {
  organizationId: string;
  organizationType: "INVESTOR" | "AGENCY" | "MANAGER" | "PLATFORM";
  userId: string;
  /**
   * For agency callers: the investor org whose data they're consuming. When
   * set, and `organizationType === "AGENCY"`, we treat the document owner as
   * the investor and verify an active connection.
   */
  investorOrganizationId?: string | null;
}

/**
 * Resolve download authorisation and return a storage-signed URL.
 *
 * The Local provider returns a `local:<key>` sentinel — the API route is
 * expected to stream the file via `storage().read()` when it sees that
 * scheme. This keeps callsites uniform.
 */
export async function getSignedDownloadUrl(input: {
  actor: DocumentAccessContext;
  documentId: string;
  expiresInSec?: number;
}) {
  const doc = await prisma.document.findFirst({
    where: { id: input.documentId, deletedAt: null },
  });
  if (!doc) throw DomainErrors.notFound("Dokument");

  // Investor + manager + platform callers can access their own org's
  // documents. MANAGER organizacije koriste iste `Document` red za
  // uplatnice, zapisnike i račune zgrada.
  if (
    (input.actor.organizationType === "INVESTOR" ||
      input.actor.organizationType === "MANAGER" ||
      input.actor.organizationType === "PLATFORM") &&
    doc.organizationId === input.actor.organizationId
  ) {
    // INTERNAL is fine for these; further role gating is the API layer's job.
    const url = await storage().getSignedUrl(doc.storageKey, input.expiresInSec);
    return { doc, url };
  }

  // Agency callers can only see documents that (a) belong to a connected
  // investor and (b) are shared with the agency channel.
  if (input.actor.organizationType === "AGENCY") {
    if (!AGENCY_VISIBLE.includes(doc.visibility)) {
      throw DomainErrors.forbidden("Nemate pristup ovom dokumentu.");
    }
    const connection = await prisma.agencyConnection.findFirst({
      where: {
        investorOrganizationId: doc.organizationId,
        agencyOrganizationId: input.actor.organizationId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!connection) {
      throw DomainErrors.forbidden("Nemate pristup ovom dokumentu.");
    }
    const url = await storage().getSignedUrl(doc.storageKey, input.expiresInSec);
    return { doc, url };
  }

  throw DomainErrors.forbidden("Nemate pristup ovom dokumentu.");
}

/**
 * Faza 11 — list every document a resident can see based on their
 * `ResidentAccess` rows. Includes:
 *   - documents on a building the resident has access to, visibility=RESIDENT_SHARED
 *   - documents on one of the resident's units, visibility=RESIDENT_SHARED
 *   - documents on a MaintenanceTicket the resident filed (reportedByPersonId)
 *     — these are always readable to that specific resident even when the
 *     visibility is INTERNAL (it's their own report).
 */
export async function listResidentDocuments(input: {
  personId: string;
  buildingIds: string[];
  unitIds: string[];
  page: number;
  pageSize: number;
}) {
  const { personId, buildingIds, unitIds, page, pageSize } = input;
  if (buildingIds.length === 0 && unitIds.length === 0) {
    return { items: [], total: 0 };
  }

  // Tickets this resident filed — we expose every document attached to
  // them regardless of visibility (it's their own evidence).
  const myTickets = await prisma.maintenanceTicket.findMany({
    where: { reportedByPersonId: personId },
    select: { id: true },
    take: 500,
  });
  const myTicketIds = myTickets.map((t) => t.id);

  const or: Prisma.DocumentWhereInput[] = [];
  if (buildingIds.length > 0) {
    or.push({
      entityType: "ManagedBuilding",
      entityId: { in: buildingIds },
      visibility: "RESIDENT_SHARED",
    });
  }
  if (unitIds.length > 0) {
    or.push({
      entityType: "ManagedUnit",
      entityId: { in: unitIds },
      visibility: "RESIDENT_SHARED",
    });
  }
  if (myTicketIds.length > 0) {
    or.push({
      entityType: "MaintenanceTicket",
      entityId: { in: myTicketIds },
    });
  }

  const where: Prisma.DocumentWhereInput = { deletedAt: null, OR: or };
  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ]);
  return { items, total };
}

/**
 * Guard used by the resident-facing download route. Returns the document
 * row if the resident may read it, otherwise throws forbidden. Mirrors
 * `listResidentDocuments` so a document shown in the list is downloadable
 * and vice-versa.
 */
export async function assertResidentCanReadDocument(input: {
  personId: string;
  buildingIds: string[];
  unitIds: string[];
  documentId: string;
}) {
  const { personId, buildingIds, unitIds, documentId } = input;
  const doc = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
  });
  if (!doc) throw DomainErrors.notFound("Dokument");

  if (doc.entityType === "ManagedBuilding" && buildingIds.includes(doc.entityId)) {
    if (doc.visibility === "RESIDENT_SHARED") return doc;
  }
  if (doc.entityType === "ManagedUnit" && unitIds.includes(doc.entityId)) {
    if (doc.visibility === "RESIDENT_SHARED") return doc;
  }
  if (doc.entityType === "MaintenanceTicket") {
    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id: doc.entityId },
      select: { reportedByPersonId: true },
    });
    if (ticket?.reportedByPersonId === personId) return doc;
    // Also allow RESIDENT_SHARED tickets to a unit they own.
    if (doc.visibility === "RESIDENT_SHARED") {
      const ticketWithUnit = await prisma.maintenanceTicket.findUnique({
        where: { id: doc.entityId },
        select: { unitId: true },
      });
      if (ticketWithUnit?.unitId && unitIds.includes(ticketWithUnit.unitId)) return doc;
    }
  }
  throw DomainErrors.forbidden("Nemate pristup ovom dokumentu.");
}
