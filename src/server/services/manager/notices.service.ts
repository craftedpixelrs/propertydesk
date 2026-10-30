import "server-only";
import type {
  BuildingNoticeAudience,
  BuildingNoticeChannel,
  ManagedUnitType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertBuildingBelongsToOrg } from "@/server/services/manager/buildings.service";
import { sendEmail } from "@/server/auth/email";

/**
 * Faza 11 — building notices for residents (PORTAL + EMAIL).
 *
 * Notices are durable records persisted on `BuildingNotice`. The resident
 * portal (Phase 7) reads them live from the DB; emails are delivered in a
 * best-effort loop against each matched owner's email. Delivery counts are
 * stored on the notice row so operators get instant feedback in the UI.
 *
 * Audience targeting:
 *   - ALL          — every active unit in the building
 *   - BY_ENTRANCE  — audienceParams.entranceIds[]
 *   - BY_UNIT_TYPE — audienceParams.unitTypes[]
 *   - SPECIFIC_UNITS — audienceParams.unitIds[]
 *
 * Only addresses with `endedAt = null` on `UnitOwnership` + a non-null email
 * are notified. Operator decides channel: PORTAL_ONLY / EMAIL_ONLY / BOTH.
 */

export interface CreateBuildingNoticeInput {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  title: string;
  body: string;
  channel?: BuildingNoticeChannel;
  audience?: BuildingNoticeAudience;
  audienceParams?: {
    entranceIds?: string[];
    unitTypes?: ManagedUnitType[];
    unitIds?: string[];
  };
  publishNow?: boolean;
}

export async function createBuildingNotice(input: CreateBuildingNoticeInput) {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);

  const notice = await prisma.buildingNotice.create({
    data: {
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      title: input.title.trim(),
      body: input.body.trim(),
      channel: input.channel ?? "PORTAL_AND_EMAIL",
      audience: input.audience ?? "ALL",
      audienceParams: (input.audienceParams ?? {}) as Prisma.InputJsonValue,
      publishedAt: input.publishNow ? new Date() : null,
      publishedByUserId: input.publishNow ? input.actorUserId : null,
    },
  });

  await recordAudit({
    action: "manager.notice_published",
    entityType: "BuildingNotice",
    entityId: notice.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { title: notice.title, channel: notice.channel, audience: notice.audience },
  });

  if (input.publishNow) {
    // Deliver emails asynchronously via a direct call. We don't block the
    // request on SMTP latency for large audiences — fire-and-forget keeps
    // the UI responsive. Errors are logged inside `deliverNoticeEmails`.
    void deliverNoticeEmails(notice.id).catch(() => undefined);
  }

  return notice;
}

export async function publishBuildingNotice(input: {
  organizationId: string;
  actorUserId: string;
  noticeId: string;
}) {
  const existing = await prisma.buildingNotice.findFirst({
    where: { id: input.noticeId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Obaveštenje nije pronađeno.");
  if (existing.publishedAt) return existing;

  const updated = await prisma.buildingNotice.update({
    where: { id: existing.id },
    data: { publishedAt: new Date(), publishedByUserId: input.actorUserId },
  });

  await recordAudit({
    action: "manager.notice_published",
    entityType: "BuildingNotice",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });

  void deliverNoticeEmails(updated.id).catch(() => undefined);
  return updated;
}

export async function listBuildingNotices(input: {
  organizationId: string;
  buildingId?: string;
  publishedOnly?: boolean;
}) {
  return prisma.buildingNotice.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.buildingId ? { buildingId: input.buildingId } : {}),
      ...(input.publishedOnly ? { publishedAt: { not: null } } : {}),
    },
    include: {
      building: { select: { id: true, name: true } },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
}

interface AudienceShape {
  entranceIds?: string[];
  unitTypes?: ManagedUnitType[];
  unitIds?: string[];
}

/**
 * Resolve the set of units a notice targets. The audience discriminator
 * on the notice chooses which `audienceParams` field is honoured; any
 * other fields are ignored. For `ALL` this returns every active unit in
 * the building.
 *
 * Centralising this logic lets the email sender, the resident portal and
 * the unit tests all agree on exactly who sees a notice.
 */
export async function resolveNoticeUnitIds(notice: {
  organizationId: string;
  buildingId: string;
  audience: BuildingNoticeAudience;
  audienceParams: Prisma.JsonValue | null;
}): Promise<string[]> {
  const params = ((notice.audienceParams ?? {}) as AudienceShape) || {};

  const where: Prisma.ManagedUnitWhereInput = {
    organizationId: notice.organizationId,
    buildingId: notice.buildingId,
    archivedAt: null,
  };
  if (notice.audience === "BY_ENTRANCE") {
    if (!params.entranceIds?.length) return [];
    where.entranceId = { in: params.entranceIds };
  } else if (notice.audience === "BY_UNIT_TYPE") {
    if (!params.unitTypes?.length) return [];
    where.type = { in: params.unitTypes };
  } else if (notice.audience === "SPECIFIC_UNITS") {
    if (!params.unitIds?.length) return [];
    where.id = { in: params.unitIds };
  }
  // ALL (fallthrough) targets every active unit in the building.

  const units = await prisma.managedUnit.findMany({ where, select: { id: true } });
  return units.map((u) => u.id);
}

/**
 * Resolve audience → unique list of email addresses, then send a plain-text
 * email to each. Updates `emailDeliveredCount` on the notice row.
 *
 * Called synchronously from the API handler for small buildings and
 * fire-and-forget from `publishBuildingNotice` for large ones.
 */
export async function deliverNoticeEmails(noticeId: string): Promise<number> {
  const notice = await prisma.buildingNotice.findUnique({
    where: { id: noticeId },
    include: {
      building: { select: { id: true, name: true, address: true, city: true } },
    },
  });
  if (!notice) return 0;
  if (notice.channel === "PORTAL_ONLY") return 0;

  const unitIds = await resolveNoticeUnitIds(notice);
  if (unitIds.length === 0) return 0;

  const owners = await prisma.unitOwnership.findMany({
    where: {
      endedAt: null,
      unitId: { in: unitIds },
      person: { email: { not: null } },
    },
    select: {
      person: { select: { email: true } },
    },
  });

  const emails = Array.from(
    new Set(
      owners
        .map((o) => (o.person.email ?? "").trim().toLowerCase())
        .filter((e) => /.+@.+\..+/.test(e)),
    ),
  );
  if (emails.length === 0) return 0;

  let delivered = 0;
  for (const to of emails) {
    try {
      await sendEmail({
        to,
        subject: `[${notice.building.name}] ${notice.title}`,
        text: `${notice.body}\n\n— ${notice.building.name}, ${notice.building.address}, ${notice.building.city}`,
      });
      delivered += 1;
    } catch {
      // keep going — one bad address shouldn't abort the whole batch.
    }
  }

  await prisma.buildingNotice.update({
    where: { id: noticeId },
    data: { emailDeliveredCount: delivered },
  });

  return delivered;
}
