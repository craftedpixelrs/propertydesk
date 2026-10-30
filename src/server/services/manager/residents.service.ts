import "server-only";
import { randomBytes } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { sendEmail } from "@/server/auth/email";
import { appOrigin } from "@/server/http/app-origin";

/**
 * Faza 11 — Resident access ("stanari / vlasnici") invitation flow.
 *
 * A resident proves they own/occupy a unit through a one-shot invite link
 * emailed by the manager. The link carries a 32-byte opaque token that
 * maps to a `ResidentAccess` row with `status = PENDING_INVITE`. On click
 * the resident lands on `/stanar/pristup/[token]`, which calls
 * `acceptResidentInvite` and sets a persistent signed cookie with the
 * ResidentAccess id. That cookie is the resident's "session" — we do NOT
 * create a `User` row because residents don't belong to the manager org
 * and must not consume a seat on the manager's billing plan.
 *
 * Multiple ResidentAccess rows per email are allowed (one person can own
 * several units in the same building), the resident portal lists them all
 * once logged in.
 */

const INVITE_TTL_HOURS = 24 * 14; // 2 weeks

export interface InviteResidentInput {
  organizationId: string;
  actorUserId: string;
  unitId: string;
  personId: string;
  email: string;
}

export async function inviteResident(input: InviteResidentInput) {
  const unit = await prisma.managedUnit.findFirst({
    where: { id: input.unitId, organizationId: input.organizationId },
    include: { building: { select: { id: true, name: true, address: true, city: true } } },
  });
  if (!unit) throw DomainErrors.notFound("Posebni deo nije pronađen.");

  const person = await prisma.buildingPerson.findFirst({
    where: {
      id: input.personId,
      organizationId: input.organizationId,
      buildingId: unit.buildingId,
    },
  });
  if (!person) throw DomainErrors.notFound("Lice nije pronađeno u ovoj zgradi.");

  const email = input.email.trim().toLowerCase();
  if (!/.+@.+\..+/.test(email)) {
    throw DomainErrors.badRequest("Neispravna email adresa.");
  }

  const token = randomBytes(32).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000);

  const access = await prisma.residentAccess.upsert({
    where: { unitId_email: { unitId: unit.id, email } },
    create: {
      organizationId: input.organizationId,
      personId: person.id,
      unitId: unit.id,
      email,
      status: "PENDING_INVITE",
      inviteToken: token,
      inviteExpiresAt,
    },
    update: {
      personId: person.id,
      status: "PENDING_INVITE",
      inviteToken: token,
      inviteExpiresAt,
      revokedAt: null,
      revokedReason: null,
    },
  });

  const inviteUrl = `${appOrigin()}/stanar/pristup/${token}`;
  try {
    await sendEmail({
      to: email,
      subject: `Pristup portalu stanara · ${unit.building.name}`,
      text:
        `Pozdrav,\n\n` +
        `Dobili ste pristup portalu stanara za posebni deo ${unit.code} u zgradi ` +
        `${unit.building.name}, ${unit.building.address}, ${unit.building.city}.\n\n` +
        `Kliknite ovaj link da aktivirate pristup (važi 14 dana):\n${inviteUrl}\n\n` +
        `Ako niste tražili ovaj pristup, slobodno zanemarite poruku.`,
    });
  } catch {
    // best-effort — the operator can resend the invite later from the UI.
  }

  await recordAudit({
    action: "manager.resident_invited",
    entityType: "ResidentAccess",
    entityId: access.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { email, unitId: unit.id },
  });

  return access;
}

export async function acceptResidentInvite(token: string): Promise<{
  accessId: string;
  organizationId: string;
}> {
  const access = await prisma.residentAccess.findFirst({
    where: {
      inviteToken: token,
      status: "PENDING_INVITE",
      inviteExpiresAt: { gte: new Date() },
    },
  });
  if (!access) throw DomainErrors.badRequest("Pozivnica nije važeća ili je istekla.");

  const updated = await prisma.residentAccess.update({
    where: { id: access.id },
    data: {
      status: "ACTIVE",
      acceptedAt: new Date(),
      inviteToken: null,
      inviteExpiresAt: null,
    },
  });

  await recordAudit({
    action: "manager.resident_accepted",
    entityType: "ResidentAccess",
    entityId: updated.id,
    organizationId: updated.organizationId,
  });

  return { accessId: updated.id, organizationId: updated.organizationId };
}

export async function revokeResidentAccess(input: {
  organizationId: string;
  actorUserId: string;
  accessId: string;
  reason?: string | null;
}) {
  const existing = await prisma.residentAccess.findFirst({
    where: { id: input.accessId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Pristup nije pronađen.");

  const updated = await prisma.residentAccess.update({
    where: { id: existing.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedReason: input.reason?.trim() || null,
      inviteToken: null,
      inviteExpiresAt: null,
    },
  });
  await recordAudit({
    action: "manager.resident_revoked",
    entityType: "ResidentAccess",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    metadata: input.reason ? { reason: input.reason } : undefined,
  });
  return updated;
}

export async function listResidentAccesses(input: { organizationId: string; buildingId?: string }) {
  return prisma.residentAccess.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.buildingId ? { unit: { buildingId: input.buildingId } } : {}),
    },
    include: {
      unit: {
        select: {
          id: true,
          code: true,
          building: { select: { id: true, name: true } },
        },
      },
      person: { select: { id: true, firstName: true, lastName: true, legalName: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}
