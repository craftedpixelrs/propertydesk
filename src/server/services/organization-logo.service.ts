import "server-only";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { planAllowsWhiteLabel, withLogoCacheBust } from "@/lib/billing/white-label";
import { recordAudit } from "@/server/audit/audit";
import { uploadDocument } from "@/server/services/documents.service";
import { isSvgFile, sanitizeSvg } from "@/lib/images/svg";
import { storage } from "@/server/storage";

const LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export type LogoVariant = "default" | "light";

function resolveLogoMime(fileName: string, mimeType: string): string {
  return isSvgFile(fileName, mimeType) ? "image/svg+xml" : mimeType;
}

export function parseLogoVariant(value: string | null | undefined): LogoVariant {
  return value === "light" ? "light" : "default";
}

function logoDocumentEntityId(organizationId: string, variant: LogoVariant): string {
  return variant === "light" ? `${organizationId}:logo-light` : organizationId;
}

export function organizationLogoPublicPath(
  organizationId: string,
  variant: LogoVariant = "default",
): string {
  const base = `/api/v1/public/organization-logo/${organizationId}`;
  return variant === "light" ? `${base}?variant=light` : base;
}

export { planAllowsWhiteLabel };

export async function uploadOrganizationLogo(input: {
  organizationId: string;
  actorUserId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  variant?: LogoVariant;
}) {
  const variant = input.variant ?? "default";
  const mimeType = resolveLogoMime(input.fileName, input.mimeType);
  if (!LOGO_MIME.has(mimeType)) {
    throw DomainErrors.badRequest("Logo mora biti PNG, JPG, WebP ili SVG.");
  }
  if (!input.buffer.byteLength) {
    throw DomainErrors.badRequest("Datoteka je prazna.");
  }
  if (input.buffer.byteLength > MAX_LOGO_BYTES) {
    throw DomainErrors.badRequest("Logo je prevelik (maksimalno 2 MB).");
  }

  let buffer = input.buffer;
  if (mimeType === "image/svg+xml") {
    try {
      buffer = sanitizeSvg(buffer);
    } catch {
      throw DomainErrors.badRequest("Neispravan SVG fajl.");
    }
  }

  const doc = await uploadDocument({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    category: "OTHER",
    entityType: "Organization",
    entityId: logoDocumentEntityId(input.organizationId, variant),
    visibility: "INVESTOR_TEAM",
    fileName: input.fileName,
    mimeType,
    buffer,
  });

  const logoUrl = organizationLogoPublicPath(input.organizationId, variant);
  const previous = await prisma.organizationProfile.findUnique({
    where: { organizationId: input.organizationId },
    select: { logoUrl: true, logoLightUrl: true, type: true },
  });
  if (!previous) {
    throw DomainErrors.notFound("Profil organizacije");
  }
  if (variant === "light" && previous.type !== "INVESTOR") {
    throw DomainErrors.forbidden("Svetli logo je dostupan samo investitorima.");
  }

  await prisma.$transaction([
    prisma.organizationProfile.update({
      where: { organizationId: input.organizationId },
      data:
        variant === "light" ? { logoLightUrl: logoUrl } : { logoUrl },
    }),
    ...(variant === "default"
      ? [
          prisma.organization.update({
            where: { id: input.organizationId },
            data: { logo: logoUrl },
          }),
        ]
      : []),
  ]);

  await recordAudit({
    action: "organization.updated",
    entityType: "OrganizationProfile",
    entityId: input.organizationId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues:
      variant === "light"
        ? { logoLightUrl: previous.logoLightUrl }
        : { logoUrl: previous.logoUrl },
    newValues:
      variant === "light"
        ? { logoLightUrl: logoUrl, documentId: doc.id }
        : { logoUrl, documentId: doc.id },
  });

  return variant === "light"
    ? { logoLightUrl: logoUrl, documentId: doc.id }
    : { logoUrl, documentId: doc.id };
}

export async function removeOrganizationLogo(input: {
  organizationId: string;
  actorUserId: string;
  variant?: LogoVariant;
}) {
  const variant = input.variant ?? "default";
  const previous = await prisma.organizationProfile.findUnique({
    where: { organizationId: input.organizationId },
    select: { logoUrl: true, logoLightUrl: true, type: true },
  });
  if (!previous) {
    throw DomainErrors.notFound("Profil organizacije");
  }
  if (variant === "light" && previous.type !== "INVESTOR") {
    throw DomainErrors.forbidden("Svetli logo je dostupan samo investitorima.");
  }

  await prisma.$transaction([
    prisma.organizationProfile.update({
      where: { organizationId: input.organizationId },
      data:
        variant === "light" ? { logoLightUrl: null } : { logoUrl: null },
    }),
    ...(variant === "default"
      ? [
          prisma.organization.update({
            where: { id: input.organizationId },
            data: { logo: null },
          }),
        ]
      : []),
  ]);

  await recordAudit({
    action: "organization.updated",
    entityType: "OrganizationProfile",
    entityId: input.organizationId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues:
      variant === "light"
        ? { logoLightUrl: previous.logoLightUrl }
        : { logoUrl: previous.logoUrl },
    newValues:
      variant === "light" ? { logoLightUrl: null } : { logoUrl: null },
  });
}

export async function resolveOrganizationLogo(
  organizationId: string,
  variant: LogoVariant = "default",
): Promise<
  | {
      buffer: Buffer;
      mimeType: string;
      fileName: string;
    }
  | { redirectUrl: string }
  | null
> {
  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId },
    select: { logoUrl: true, logoLightUrl: true },
  });
  const stored = variant === "light" ? profile?.logoLightUrl : profile?.logoUrl;
  if (!stored) return null;

  if (/^https?:\/\//i.test(stored)) {
    return { redirectUrl: stored };
  }

  const doc = await prisma.document.findFirst({
    where: {
      organizationId,
      entityType: "Organization",
      entityId: logoDocumentEntityId(organizationId, variant),
      mimeType: { startsWith: "image/" },
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      storageKey: true,
      mimeType: true,
      originalFileName: true,
    },
  });
  if (!doc) return null;

  // Raster logos on S3 use a signed redirect. SVG is always streamed
  // through this route so we can set CSP and avoid executing scripts
  // if someone opens the URL as a document.
  const isSvg = isSvgFile(doc.originalFileName, doc.mimeType);
  const url = await storage().getSignedUrl(doc.storageKey, 300);
  if (!isSvg && !url.startsWith("local:")) {
    return { redirectUrl: url };
  }

  const buffer = await storage().read(doc.storageKey);
  return {
    buffer,
    mimeType: isSvg ? "image/svg+xml" : doc.mimeType,
    fileName: doc.originalFileName,
  };
}

export async function loadOrganizationBranding(organizationId: string): Promise<{
  name: string;
  logoUrl: string | null;
  logoLightUrl: string | null;
  whiteLabel: boolean;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      logo: true,
      profile: {
        select: {
          displayName: true,
          logoUrl: true,
          logoLightUrl: true,
          updatedAt: true,
        },
      },
      subscription: {
        select: {
          plan: { select: { code: true, features: true } },
        },
      },
    },
  });

  const plan = org?.subscription?.plan;
  return {
    name: org?.profile?.displayName || org?.name || "",
    logoUrl: withLogoCacheBust(
      org?.profile?.logoUrl || org?.logo,
      org?.profile?.updatedAt,
    ),
    logoLightUrl: withLogoCacheBust(
      org?.profile?.logoLightUrl,
      org?.profile?.updatedAt,
    ),
    whiteLabel: planAllowsWhiteLabel(plan?.code, plan?.features),
  };
}
