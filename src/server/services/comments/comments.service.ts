import "server-only";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { notifyMany } from "@/server/services/notifications.service";

/**
 * Comments service.
 *
 * Comments are attached to a domain entity via `(entityType, entityId)`
 * — currently `"Buyer"` and `"Sale"`. The service is intentionally
 * polymorphic so it can accept other entities later without a migration.
 *
 * Mention wire format: authors compose free-form text that embeds
 * mentions as `@[Display Name](userId)` — the same shape used by many
 * markdown-based commenting UIs. The server:
 *   1. Regex-extracts every user id from the body.
 *   2. Verifies each id is an actual member of the caller's org.
 *      Ids that don't match are silently dropped (the text stays).
 *   3. Stores the resulting set on `mentionedUserIds` and fans a
 *      `BUYER` / `SALE` notification out to those users.
 *
 * Server-side verification is the security boundary — never trust a
 * client-supplied `mentionedUserIds` array.
 */

const MENTION_REGEX = /@\[[^\]]+\]\(([a-zA-Z0-9]+)\)/g;

export type CommentEntityType = "Buyer" | "Sale";
const COMMENT_ENTITY_TYPES: CommentEntityType[] = ["Buyer", "Sale"];

function assertEntityType(type: string): asserts type is CommentEntityType {
  if (!COMMENT_ENTITY_TYPES.includes(type as CommentEntityType)) {
    throw DomainErrors.badRequest(`Nepoznat tip entiteta za komentare: ${type}`);
  }
}

function parseMentions(body: string): string[] {
  const ids = new Set<string>();
  const regex = new RegExp(MENTION_REGEX);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) != null) {
    ids.add(match[1]!);
  }
  return Array.from(ids);
}

async function verifyOrgMembers(
  organizationId: string,
  userIds: string[],
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const members = await prisma.member.findMany({
    where: { organizationId, userId: { in: userIds } },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

async function loadEntityForNotification(
  entityType: CommentEntityType,
  entityId: string,
  organizationId: string,
): Promise<{ label: string; actionUrl: string } | null> {
  if (entityType === "Buyer") {
    const buyer = await prisma.buyer.findFirst({
      where: { id: entityId, organizationId },
      select: { firstName: true, lastName: true },
    });
    if (!buyer) return null;
    return {
      label: `${buyer.firstName} ${buyer.lastName}`.trim(),
      actionUrl: `/kupci/${entityId}`,
    };
  }
  const sale = await prisma.sale.findFirst({
    where: { id: entityId, organizationId },
    select: { unit: { select: { code: true } } },
  });
  if (!sale) return null;
  return {
    label: `Prodaja · ${sale.unit?.code ?? entityId}`,
    actionUrl: `/prodaje/${entityId}`,
  };
}

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface CommentDto {
  id: string;
  entityType: string;
  entityId: string;
  body: string;
  mentionedUserIds: string[];
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: CommentAuthor;
}

function toDto(row: {
  id: string;
  entityType: string;
  entityId: string;
  body: string;
  mentionedUserIds: string[];
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; email: string; image: string | null };
}): CommentDto {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    body: row.body,
    mentionedUserIds: row.mentionedUserIds,
    parentId: row.parentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.author,
  };
}

export async function listComments(input: {
  organizationId: string;
  entityType: string;
  entityId: string;
}): Promise<CommentDto[]> {
  assertEntityType(input.entityType);
  const rows = await prisma.comment.findMany({
    where: {
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });
  return rows.map(toDto);
}

export async function createComment(input: {
  organizationId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  body: string;
  parentId?: string | null;
}): Promise<CommentDto> {
  assertEntityType(input.entityType);
  const trimmed = input.body.trim();
  if (trimmed.length === 0) {
    throw DomainErrors.validation("Komentar ne sme biti prazan.");
  }
  if (trimmed.length > 4000) {
    throw DomainErrors.validation("Komentar je predugačak (max 4000 znakova).");
  }

  const mentionCandidates = parseMentions(trimmed).filter(
    (id) => id !== input.actorUserId,
  );
  const verifiedMentions = await verifyOrgMembers(
    input.organizationId,
    mentionCandidates,
  );

  const created = await prisma.comment.create({
    data: {
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      authorUserId: input.actorUserId,
      body: trimmed,
      mentionedUserIds: verifiedMentions,
      parentId: input.parentId ?? null,
    } satisfies Prisma.CommentUncheckedCreateInput,
    include: {
      author: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  await recordAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    entityType: "Comment",
    entityId: created.id,
    action: "comment.created",
    metadata: { parentEntity: input.entityType, parentId: input.entityId },
  });

  if (verifiedMentions.length > 0) {
    const context = await loadEntityForNotification(
      input.entityType as CommentEntityType,
      input.entityId,
      input.organizationId,
    );
    const category = input.entityType === "Buyer" ? "BUYER" : "SALE";
    await notifyMany(verifiedMentions, {
      organizationId: input.organizationId,
      category,
      title: `Spomenuti ste u komentaru · ${context?.label ?? input.entityType}`,
      message: trimmed.slice(0, 240),
      entityType: input.entityType,
      entityId: input.entityId,
      actionUrl: context?.actionUrl ?? null,
    });
  }

  return toDto(created);
}

export async function deleteComment(input: {
  organizationId: string;
  actorUserId: string;
  commentId: string;
  isAdmin?: boolean;
}): Promise<void> {
  const existing = await prisma.comment.findFirst({
    where: { id: input.commentId, organizationId: input.organizationId, deletedAt: null },
    select: { id: true, authorUserId: true, entityType: true, entityId: true },
  });
  if (!existing) throw DomainErrors.notFound("Komentar");
  if (existing.authorUserId !== input.actorUserId && !input.isAdmin) {
    throw DomainErrors.forbidden("Nemate dozvolu za brisanje tuđeg komentara.");
  }
  await prisma.comment.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });
  await recordAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    entityType: "Comment",
    entityId: existing.id,
    action: "comment.deleted",
    metadata: {
      parentEntity: existing.entityType,
      parentId: existing.entityId,
    },
  });
}

export type { CommentDto as ClientComment };
