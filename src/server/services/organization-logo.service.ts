import "server-only";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { planAllowsWhiteLabel, withLogoCacheBust } from "@/lib/billing/white-label";
import { recordAudit } from "@/server/audit/audit";
import { uploadDocument } from "@/server/services/documents.service";
import { storage } from "@/server/storage";

const LOGO_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function organizationLogoPublicPath(organizationId: string): string {
  return `/api/v1/public/organization-logo/${organizationId}`;
}

export { planAllowsWhiteLabel };

export async function uploadOrganizationLogo(input: {
  organizationId: string;
  actorUserId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  if (!LOGO_MIME.has(input.mimeType)) {
    throw DomainErrors.badRequest("Logo mora biti PNG, JPG ili WebP.");
  }
  if (!input.buffer.byteLength) {
    throw DomainErrors.badRequest("Datoteka je prazna.");
  }
  if (input.buffer.byteLength > MAX_LOGO_BYTES) {
    throw DomainErrors.badRequest("Logo je prevelik (maksimalno 2 MB).");
  }

  const doc = await uploadDocument({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    category: "OTHER",
    entityType: "Organization",
    entityId: input.organizationId,
    visibility: "INVESTOR_TEAM",
    fileName: input.fileName,
    mimeType: input.mimeType,
    buffer: input.buffer,
  });

  const logoUrl = organizationLogoPublicPath(input.organizationId);
  const previous = await prisma.organizationProfile.findUnique({
    where: { organizationId: input.organizationId },
    select: { logoUrl: true },
  });
  if (!previous) {
    throw DomainErrors.notFound("Profil organizacije");
  }

  await prisma.$transaction([
    prisma.organizationProfile.update({
      where: { organizationId: input.organizationId },
      data: { logoUrl },
    }),
    prisma.organization.update({
      where: { id: input.organizationId },
      data: { logo: logoUrl },
    }),
  ]);

  await recordAudit({
    action: "organization.updated",
    entityType: "OrganizationProfile",
    entityId: input.organizationId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: { logoUrl: previous.logoUrl },
    newValues: { logoUrl, documentId: doc.id },
  });

  return { logoUrl, documentId: doc.id };
}

export async function removeOrganizationLogo(input: {
  organizationId: string;
  actorUserId: string;
}) {
  const previous = await prisma.organizationProfile.findUnique({
    where: { organizationId: input.organizationId },
    select: { logoUrl: true },
  });
  if (!previous) {
    throw DomainErrors.notFound("Profil organizacije");
  }

  await prisma.$transaction([
    prisma.organizationProfile.update({
      where: { organizationId: input.organizationId },
      data: { logoUrl: null },
    }),
    prisma.organization.update({
      where: { id: input.organizationId },
      data: { logo: null },
    }),
  ]);

  await recordAudit({
    action: "organization.updated",
    entityType: "OrganizationProfile",
    entityId: input.organizationId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: { logoUrl: previous.logoUrl },
    newValues: { logoUrl: null },
  });
}

export async function resolveOrganizationLogo(organizationId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
} | { redirectUrl: string } | null> {
  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId },
    select: { logoUrl: true },
  });
  if (!profile?.logoUrl) return null;

  if (/^https?:\/\//i.test(profile.logoUrl)) {
    return { redirectUrl: profile.logoUrl };
  }

  const doc = await prisma.document.findFirst({
    where: {
      organizationId,
      entityType: "Organization",
      entityId: organizationId,
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

  // Same path as document download / share images: S3 gets a signed URL,
  // local storage streams bytes through this route.
  const url = await storage().getSignedUrl(doc.storageKey, 300);
  if (!url.startsWith("local:")) {
    return { redirectUrl: url };
  }

  const buffer = await storage().read(doc.storageKey);
  return {
    buffer,
    mimeType: doc.mimeType,
    fileName: doc.originalFileName,
  };
}

export async function loadOrganizationBranding(organizationId: string): Promise<{
  name: string;
  logoUrl: string | null;
  whiteLabel: boolean;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      logo: true,
      profile: { select: { displayName: true, logoUrl: true, updatedAt: true } },
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
    whiteLabel: planAllowsWhiteLabel(plan?.code, plan?.features),
  };
}
