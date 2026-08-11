import "server-only";
import { createId } from "@paralleldrive/cuid2";
import type { Prisma, ReservationRequestStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { toDecimal } from "@/lib/formatters/money";
import { serbianIpsQrProvider } from "@/server/services/billing/ips-qr";
import { storage } from "@/server/storage";
import { createReservation } from "@/server/services/reservations.service";
import { normalizeEmail as libNormalizeEmail, normalizePhone as libNormalizePhone } from "@/lib/normalize";

/**
 * ReservationRequestsService — Faza 8.1 (A2).
 *
 * A `ReservationRequest` is the public-facing shell that captures a
 * buyer's intent to reserve a unit off a shareable link (`/p/[token]`).
 * The flow is:
 *
 *   1. Buyer submits the form. We generate a `poziv-na-broj` reference
 *      and, when the currency is RSD and the investor has an IPS-ready
 *      bank account on file, a pre-rendered IPS QR PNG.
 *   2. Unit is soft-held (`ON_HOLD`) for `expiresAt` (default 48h).
 *   3. Investor sees the request in `/rezervacije/zahtevi` and either
 *      confirms (deposit received) — which materialises a real
 *      `Reservation` (+ `Buyer`) — or declines / lets it expire.
 *
 * Every write is audit-logged. Public callers can never enumerate
 * requests, so this service is careful to keep listing queries
 * scoped to a `organizationId`.
 */

const DEFAULT_EXPIRATION_HOURS = 48;
const MAX_PENDING_PER_UNIT = 1;
const HOLDABLE_STATUSES = new Set(["AVAILABLE", "ON_HOLD"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateReservationRequestInput {
  token: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  depositAmount: number;
  notes?: string | null;
  referralCode?: string | null;
  expirationHours?: number;
}

export interface CreateReservationRequestResult {
  id: string;
  ipsReference: string;
  ipsQrAvailable: boolean;
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeString(v: string | null | undefined, max: number): string {
  return (v ?? "").toString().trim().slice(0, max);
}

function stripPhone(v: string): string {
  const cleaned = v.replace(/[^\d+\s()-]/g, "").trim().slice(0, 32);
  if (!cleaned) throw DomainErrors.badRequest("Telefon je obavezan.");
  return cleaned;
}

/**
 * Generate a 12-digit numeric `poziv-na-broj` for the deposit
 * reference. Includes a mod-97 control-digit prefix so the resulting
 * IPS `RO:97 <ref>` field is well-formed. Collisions with existing
 * `payment.referenceNumber` values are astronomically unlikely at 12
 * digits, but the caller stores it separately anyway.
 */
function generateIpsReference(): { compact: string; model97: string } {
  const now = Date.now(); // 13-digit epoch ms; drop leading char
  const base = String(now).slice(-10);
  const salt = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  const twelve = `${base}${salt}`; // exactly 12 digits
  const check = 98 - (BigInt(twelve) % 97n);
  const checkStr = check.toString().padStart(2, "0");
  return {
    compact: twelve,
    model97: `97 ${checkStr}-${twelve}`,
  };
}

async function resolveOfferedUnit(token: string) {
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link) return null;
  if (link.revokedAt) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;
  if (link.entityType !== "Unit") return null;

  const unit = await prisma.unit.findFirst({
    where: {
      id: link.entityId,
      organizationId: link.organizationId,
      archivedAt: null,
    },
    select: {
      id: true,
      code: true,
      status: true,
      currency: true,
      finalPrice: true,
      basePrice: true,
      projectId: true,
      organizationId: true,
      project: { select: { name: true } },
    },
  });
  if (!unit) return null;
  if (!HOLDABLE_STATUSES.has(unit.status) && unit.status !== "RESERVED" && unit.status !== "DEPOSIT_PAID") {
    return null;
  }
  return { link, unit };
}

async function resolveAgencyFromReferral(input: {
  organizationId: string;
  referralCode: string | null | undefined;
}): Promise<{ agencyOrganizationId: string } | null> {
  const code = input.referralCode?.trim();
  if (!code) return null;
  const conn = await prisma.agencyConnection.findFirst({
    where: {
      investorOrganizationId: input.organizationId,
      referralCode: code,
      status: "ACTIVE",
    },
    select: { agencyOrganizationId: true },
  });
  return conn ? { agencyOrganizationId: conn.agencyOrganizationId } : null;
}

async function tryGenerateIpsQr(input: {
  organizationId: string;
  amount: string | number;
  currency: string;
  reference: string;
  payerName: string;
  description: string;
}): Promise<{ storageKey: string } | null> {
  if (input.currency !== "RSD") return null;
  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId: input.organizationId },
    select: {
      legalName: true,
      displayName: true,
      paymentAccountNumber: true,
    },
  });
  const account = profile?.paymentAccountNumber?.replace(/\s/g, "");
  if (!account) return null;

  try {
    const result = await serbianIpsQrProvider.generate({
      receiverName: profile?.legalName ?? profile?.displayName ?? "",
      receiverAccount: account,
      amount: input.amount,
      payerName: input.payerName,
      paymentReference: input.reference,
      description: input.description,
      currency: "RSD",
    });
    const put = await storage().put({
      organizationId: input.organizationId,
      category: "reservation-request",
      fileName: `ips-${Date.now()}.png`,
      contentType: "image/png",
      body: result.pngBuffer,
    });
    return { storageKey: put.storageKey };
  } catch {
    // If IPS QR generation fails (e.g. bad account format, EUR bug)
    // we degrade gracefully: the request is still valid, buyer just
    // gets a plain reference instead of the QR.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Create (public)
// ---------------------------------------------------------------------------

export async function createReservationRequest(
  input: CreateReservationRequestInput,
): Promise<CreateReservationRequestResult> {
  const firstName = sanitizeString(input.firstName, 60);
  const lastName = sanitizeString(input.lastName, 60);
  const email = (input.email ?? "").trim().toLowerCase().slice(0, 320);
  const phone = stripPhone(input.phone ?? "");
  const notes = sanitizeString(input.notes ?? "", 500) || null;
  const referralCode = sanitizeString(input.referralCode ?? "", 32) || null;

  if (!firstName || !lastName) {
    throw DomainErrors.badRequest("Ime i prezime su obavezni.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw DomainErrors.badRequest("Neispravan e-mail.");
  }

  const depositDec = toDecimal(input.depositAmount);
  if (depositDec.isNegative() || depositDec.isZero()) {
    throw DomainErrors.badRequest("Iznos kapare mora biti pozitivan.");
  }
  const depositAmount = depositDec.toDecimalPlaces(2);

  const resolved = await resolveOfferedUnit(input.token);
  if (!resolved) throw DomainErrors.notFound("Ponuda");
  const { link, unit } = resolved;

  const existingPending = await prisma.reservationRequest.count({
    where: {
      unitId: unit.id,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });
  if (existingPending >= MAX_PENDING_PER_UNIT) {
    throw DomainErrors.conflict(
      "Za ovu jedinicu već postoji aktivan zahtev za rezervaciju. Pokušajte kasnije.",
    );
  }

  const ref = generateIpsReference();
  const description = `Kapara ${unit.code}`.slice(0, 35);
  const expiresAt = new Date(
    Date.now() + (input.expirationHours ?? DEFAULT_EXPIRATION_HOURS) * 3_600_000,
  );

  const qr = await tryGenerateIpsQr({
    organizationId: unit.organizationId,
    amount: depositAmount.toString(),
    currency: unit.currency,
    reference: ref.model97,
    payerName: `${firstName} ${lastName}`,
    description,
  });

  const created = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "unit" WHERE id = ${unit.id} AND "organizationId" = ${unit.organizationId} FOR UPDATE`;

    const row = await tx.reservationRequest.create({
      data: {
        id: createId(),
        organizationId: unit.organizationId,
        shareLinkId: link.id,
        unitId: unit.id,
        firstName,
        lastName,
        email,
        phone,
        depositAmount,
        currency: unit.currency,
        ipsReference: ref.compact,
        ipsQrPngPath: qr?.storageKey ?? null,
        status: "PENDING",
        expiresAt,
        referralCode,
        notes,
      },
    });

    if (unit.status === "AVAILABLE") {
      // Public flow — no logged-in actor, so we bypass
      // `changeUnitStatus` (which requires `changedByUserId`) and
      // do a targeted transition. The next status change
      // (accept/decline/expire) goes through the proper service.
      await tx.unit.updateMany({
        where: { id: unit.id, status: "AVAILABLE" },
        data: { status: "ON_HOLD" },
      });
    }

    return row;
  });

  await recordAudit({
    action: "reservation_request.created",
    entityType: "ReservationRequest",
    entityId: created.id,
    organizationId: unit.organizationId,
    actorUserId: null,
    newValues: {
      unitId: unit.id,
      depositAmount: depositAmount.toString(),
      currency: unit.currency,
      referralCode,
    },
  });

  return {
    id: created.id,
    ipsReference: ref.model97,
    ipsQrAvailable: qr != null,
    expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Investor-side operations
// ---------------------------------------------------------------------------

export interface ListReservationRequestsInput {
  organizationId: string;
  status?: ReservationRequestStatus | "ALL";
  page?: number;
  pageSize?: number;
}

export async function listReservationRequests(
  input: ListReservationRequestsInput,
) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const where: Prisma.ReservationRequestWhereInput = {
    organizationId: input.organizationId,
    ...(input.status && input.status !== "ALL" ? { status: input.status } : {}),
  };
  const [items, total, pendingCount] = await Promise.all([
    prisma.reservationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        unit: {
          select: {
            id: true,
            code: true,
            project: { select: { id: true, name: true } },
          },
        },
        decidedByUser: { select: { id: true, name: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.reservationRequest.count({ where }),
    prisma.reservationRequest.count({
      where: {
        organizationId: input.organizationId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    }),
  ]);
  return { items, total, pendingCount, page, pageSize };
}

export async function getReservationRequest(input: {
  organizationId: string;
  requestId: string;
}) {
  const row = await prisma.reservationRequest.findFirst({
    where: { id: input.requestId, organizationId: input.organizationId },
    include: {
      unit: {
        select: {
          id: true,
          code: true,
          status: true,
          project: { select: { id: true, name: true } },
        },
      },
      decidedByUser: { select: { id: true, name: true } },
    },
  });
  if (!row) throw DomainErrors.notFound("Zahtev za rezervaciju");
  return row;
}

/**
 * Materialise a `Buyer` + `Reservation` (+ optional `Payment` for the
 * received deposit) from a `PENDING` `ReservationRequest`. This is
 * the "we saw the money hit the account" step.
 */
export async function confirmReservationRequest(input: {
  organizationId: string;
  actorUserId: string;
  requestId: string;
  recordDepositPayment?: boolean;
  paymentDate?: Date | null;
  paymentMethod?: string | null;
  buyerNotes?: string | null;
}) {
  const req = await getReservationRequest({
    organizationId: input.organizationId,
    requestId: input.requestId,
  });
  if (req.status !== "PENDING") {
    throw DomainErrors.invalidState(
      "Zahtev za rezervaciju je već obrađen ili je istekao.",
    );
  }

  const agency = await resolveAgencyFromReferral({
    organizationId: input.organizationId,
    referralCode: req.referralCode,
  });

  const outcome = await prisma.$transaction(async (tx) => {
    const normEmail = libNormalizeEmail(req.email);
    const normPhone = libNormalizePhone(req.phone) ?? req.phone;
    const buyer = await tx.buyer.create({
      data: {
        organizationId: input.organizationId,
        firstName: req.firstName,
        lastName: req.lastName,
        email: req.email || null,
        normalizedEmail: normEmail,
        phone: req.phone,
        normalizedPhone: normPhone,
        entityType: "NATURAL",
        source: "public-offer",
        notes: input.buyerNotes ?? req.notes ?? null,
      },
      select: { id: true },
    });

    const decided = await tx.reservationRequest.update({
      where: { id: req.id },
      data: {
        status: "CONFIRMED",
        decidedAt: new Date(),
        decidedByUserId: input.actorUserId,
      },
    });

    return { buyerId: buyer.id, decided };
  });

  const reservation = await createReservation({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    unitId: req.unitId,
    buyerId: outcome.buyerId,
    reservationAmount: Number(req.depositAmount.toString()),
    currency: req.currency,
    notes: `Zahtev sa javne ponude ${req.ipsReference}${
      req.referralCode ? ` (ref: ${req.referralCode})` : ""
    }`,
    sourceType: agency ? "AGENCY" : "INTERNAL",
    agencyOrganizationId: agency?.agencyOrganizationId ?? null,
    referralCode: req.referralCode ?? null,
  });

  await recordAudit({
    action: "reservation_request.confirmed",
    entityType: "ReservationRequest",
    entityId: req.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      reservationId: reservation.id,
      buyerId: outcome.buyerId,
      agencyOrganizationId: agency?.agencyOrganizationId ?? null,
    },
  });

  return { requestId: req.id, reservationId: reservation.id };
}

export async function declineReservationRequest(input: {
  organizationId: string;
  actorUserId: string;
  requestId: string;
  reason?: string | null;
}) {
  const req = await getReservationRequest({
    organizationId: input.organizationId,
    requestId: input.requestId,
  });
  if (req.status !== "PENDING") {
    throw DomainErrors.invalidState("Zahtev je već obrađen.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservationRequest.update({
      where: { id: req.id },
      data: {
        status: "DECLINED",
        decidedAt: new Date(),
        decidedByUserId: input.actorUserId,
        notes: input.reason ?? req.notes,
      },
    });

    const stillPending = await tx.reservationRequest.count({
      where: {
        unitId: req.unitId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });
    if (stillPending === 0) {
      await tx.unit.updateMany({
        where: {
          id: req.unitId,
          status: "ON_HOLD",
        },
        data: { status: "AVAILABLE" },
      });
    }
  });

  await recordAudit({
    action: "reservation_request.declined",
    entityType: "ReservationRequest",
    entityId: req.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { reason: input.reason ?? null },
  });
  return { requestId: req.id };
}

/**
 * Batch-expire stale `PENDING` requests. Called by the daily cron
 * job; also runs opportunistically when the investor opens the
 * list page.
 */
export async function expireStaleReservationRequests(): Promise<{
  expired: number;
}> {
  const now = new Date();
  const stale = await prisma.reservationRequest.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    select: { id: true, unitId: true, organizationId: true },
    take: 500,
  });
  if (stale.length === 0) return { expired: 0 };

  const staleIds = stale.map((s) => s.id);
  await prisma.reservationRequest.updateMany({
    where: { id: { in: staleIds } },
    data: { status: "EXPIRED" },
  });

  for (const row of stale) {
    const stillPending = await prisma.reservationRequest.count({
      where: {
        unitId: row.unitId,
        status: "PENDING",
        expiresAt: { gt: now },
      },
    });
    if (stillPending === 0) {
      await prisma.unit.updateMany({
        where: { id: row.unitId, status: "ON_HOLD" },
        data: { status: "AVAILABLE" },
      });
    }
    await recordAudit({
      action: "reservation_request.expired",
      entityType: "ReservationRequest",
      entityId: row.id,
      organizationId: row.organizationId,
      actorUserId: null,
    });
  }
  return { expired: stale.length };
}
