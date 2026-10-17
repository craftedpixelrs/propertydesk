import "server-only";

import { Prisma } from "@prisma/client";

import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { sendEmail, type EmailMessage } from "@/server/auth/email";
import { prisma } from "@/server/db/prisma";

export const MESSAGE_TEMPLATE_KEYS = [
  "installment_reminder",
  "payment_receipt",
  "reservation_expiring",
] as const;

export type MessageTemplateKey = (typeof MESSAGE_TEMPLATE_KEYS)[number];

export async function listMessageTemplates(organizationId: string) {
  const rows = await prisma.orgMessageTemplate.findMany({
    where: { organizationId },
    select: { key: true, body: true },
  });
  const byKey = new Map(rows.map((row) => [row.key, row.body]));
  return MESSAGE_TEMPLATE_KEYS.map((key) => ({
    key,
    body: byKey.get(key) ?? "",
  }));
}

export async function saveMessageTemplates(input: {
  organizationId: string;
  actorUserId: string;
  templates: Array<{ key: MessageTemplateKey; body: string }>;
}) {
  for (const template of input.templates) {
    const body = template.body.trim().slice(0, 2000);
    if (!body) {
      await prisma.orgMessageTemplate.deleteMany({
        where: { organizationId: input.organizationId, key: template.key },
      });
      continue;
    }
    await prisma.orgMessageTemplate.upsert({
      where: {
        organizationId_key: {
          organizationId: input.organizationId,
          key: template.key,
        },
      },
      create: {
        organizationId: input.organizationId,
        key: template.key,
        body,
      },
      update: { body },
    });
  }
  await recordAudit({
    action: "organization.message_templates_saved",
    entityType: "Organization",
    entityId: input.organizationId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
}

export async function messageExtra(
  organizationId: string,
  key: MessageTemplateKey,
): Promise<string | null> {
  const row = await prisma.orgMessageTemplate.findUnique({
    where: { organizationId_key: { organizationId, key } },
    select: { body: true },
  });
  const body = row?.body.trim();
  return body ? body : null;
}

/**
 * Sends one buyer email per (kind, entity). A unique row is the lock:
 * a second call for the same installment or payment is a no-op.
 */
export async function sendBuyerNoticeOnce(input: {
  organizationId: string;
  buyerId: string;
  kind: string;
  entityId: string;
  email: string | null | undefined;
  message: EmailMessage;
}): Promise<boolean> {
  const to = input.email?.trim();
  if (!to) return false;
  try {
    await prisma.buyerNotice.create({
      data: {
        organizationId: input.organizationId,
        buyerId: input.buyerId,
        kind: input.kind,
        entityId: input.entityId,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return false;
    }
    throw err;
  }
  try {
    await sendEmail({ ...input.message, to });
    return true;
  } catch (err) {
    await prisma.buyerNotice.deleteMany({
      where: { kind: input.kind, entityId: input.entityId },
    });
    throw err;
  }
}

export function assertTemplateKey(key: string): MessageTemplateKey {
  if ((MESSAGE_TEMPLATE_KEYS as readonly string[]).includes(key)) {
    return key as MessageTemplateKey;
  }
  throw DomainErrors.badRequest("Nepoznat šablon pisma.");
}
