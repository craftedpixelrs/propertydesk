import { z } from "zod";
import type { DocumentCategory, DocumentVisibility } from "@prisma/client";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { listDocuments, uploadDocument } from "@/server/services/documents.service";
import { DomainErrors } from "@/lib/errors";

const CATEGORIES = [
  "PROJECT",
  "UNIT",
  "BUYER",
  "RESERVATION",
  "SALE",
  "PAYMENT",
  "AGENCY",
  "COMMISSION",
  "INVOICE",
  "KYC",
  "OTHER",
] as const;
const VISIBILITIES = [
  "INTERNAL",
  "INVESTOR_TEAM",
  "AGENCY_SHARED",
  "BUYER_SHARED",
] as const;

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("document.read");
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  if (!entityType || !entityId) {
    throw DomainErrors.badRequest("entityType i entityId su obavezni.");
  }
  const categoryRaw = searchParams.get("category");
  const category = categoryRaw && (CATEGORIES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as DocumentCategory)
    : undefined;
  // `excludeImages=1` mirrors PhotoGallery's imagesOnly flag from the
  // other direction. Used by the sale detail page to render only
  // Unit-attached non-image documents (photos live in the gallery).
  const excludeImages = searchParams.get("excludeImages") === "1"
    || searchParams.get("excludeImages") === "true";
  const { items, total } = await listDocuments({
    organizationId: ctx.organization.organizationId,
    entityType,
    entityId,
    category,
    excludeImages,
    page: query.page,
    pageSize: query.pageSize,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

/**
 * Multipart upload endpoint.
 *
 * Expects fields:
 *   - file        (File)          — the document payload
 *   - category    (string)        — DocumentCategory
 *   - visibility  (string?)       — DocumentVisibility (defaults to INTERNAL)
 *   - entityType  (string)        — e.g. "Sale", "Unit"
 *   - entityId    (string)        — target entity id
 */
export const POST = apiHandler({}, async ({ req }) => {
  const ctx = await requirePermission("document.manage");
  const form = await req.formData().catch(() => null);
  if (!form) throw DomainErrors.badRequest("Neispravna forma.");

  const file = form.get("file");
  if (!(file instanceof File)) throw DomainErrors.badRequest("Datoteka je obavezna.");
  const category = String(form.get("category") ?? "");
  const entityType = String(form.get("entityType") ?? "");
  const entityId = String(form.get("entityId") ?? "");
  const visibilityRaw = String(form.get("visibility") ?? "INTERNAL");
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    throw DomainErrors.badRequest("Nepoznata kategorija.");
  }
  if (!entityType || !entityId) {
    throw DomainErrors.badRequest("entityType i entityId su obavezni.");
  }
  const visibility = (VISIBILITIES as readonly string[]).includes(visibilityRaw)
    ? (visibilityRaw as DocumentVisibility)
    : "INTERNAL";

  const buffer = Buffer.from(await file.arrayBuffer());
  const doc = await uploadDocument({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    category: category as DocumentCategory,
    entityType,
    entityId,
    visibility,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer,
  });
  return { data: doc, status: 201 };
});

/**
 * @swagger
 * /api/v1/documents:
 *   get:
 *     tags:
 *       - documents
 *     summary: List / read documents
 *     description: |
 *       **Auth:** `requirePermission("document.read")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - documents
 *     summary: Create documents
 *     description: |
 *       **Auth:** `requirePermission("document.manage") + requirePermission("document.read")`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
