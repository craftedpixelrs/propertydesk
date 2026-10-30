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

  // Resolve units for this audience.
  const audienceParams = (notice.audienceParams ?? {}) as {
    entranceIds?: string[];
    unitTypes?: ManagedUnitType[];
    unitIds?: string[];
  };

  const unitWhere: Prisma.ManagedUnitWhereInput = {
    organizationId: notice.organizationId,
    buildingId: notice.buildingId,
    archivedAt: null,
  };
  if (notice.audience === "BY_ENTRANCE" && audienceParams.entranceIds?.length) {
    unitWhere.entranceId = { in: audienceParams.entranceIds };
  } else if (notice.audience === "BY_UNIT_TYPE" && audienceParams.unitTypes?.length) {
    unitWhere.type = { in: audienceParams.unitTypes };
  } else if (notice.audience === "SPECIFIC_UNITS" && audienceParams.unitIds?.length) {
    unitWhere.id = { in: audienceParams.unitIds };
  }

  const owners = await prisma.unitOwnership.findMany({
    where: {
      endedAt: null,
      unit: unitWhere,
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
