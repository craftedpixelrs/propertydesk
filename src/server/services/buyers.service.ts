import "server-only";
import type { BuyerStatus, ContactMethod, Prisma, UnitType } from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

/**
 * Buyers (CRM) service.
 *
 * Rules enforced here:
 *   - Phone and email are stored raw AND normalized. Duplicate detection is
 *     done per organization on the normalized values so cosmetic differences
 *     don't create duplicate buyers.
 *   - `findDuplicates` powers a soft warning at the API layer (it does not
 *     block creation — the operator decides).
 *   - Every mutation is tenant-scoped and audited.
 */

export interface ListBuyersInput {
  organizationId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: BuyerStatus[];
  assignedUserId?: string;
  activeOnly?: boolean;
  sort?: { field: string; direction: "asc" | "desc" };
}

export interface BuyerContactInput {
  organizationId: string;
  actorUserId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  secondaryPhone?: string | null;
  preferredContactMethod?: ContactMethod;
  budgetMin?: number | null;
  budgetMax?: number | null;
  preferredCurrency?: string;
  desiredUnitTypes?: UnitType[];
  desiredRoomCounts?: string[];
  desiredAreaMin?: number | null;
  desiredAreaMax?: number | null;
  notes?: string | null;
  source?: string | null;
  status?: BuyerStatus;
  assignedUserId?: string | null;
}

const ALLOWED_BUYER_SORT_FIELDS = new Set([
  "createdAt",
  "lastName",
  "status",
]);

function resolveBuyerOrderBy(
  sort: ListBuyersInput["sort"],
): Prisma.BuyerOrderByWithRelationInput {
  if (!sort || !ALLOWED_BUYER_SORT_FIELDS.has(sort.field)) {
    return { createdAt: "desc" };
  }
  return { [sort.field]: sort.direction } as Prisma.BuyerOrderByWithRelationInput;
}

function toDecimalOrNull(value: number | null | undefined): Decimal | null {
  if (value == null) return null;
  return new Decimal(value);
}

export async function listBuyers(input: ListBuyersInput) {
  const where: Prisma.BuyerWhereInput = {
    organizationId: input.organizationId,
    ...(input.status?.length ? { status: { in: input.status } } : {}),
    ...(input.assignedUserId ? { assignedUserId: input.assignedUserId } : {}),
    ...(input.activeOnly ? { archivedAt: null } : {}),
    ...(input.search
      ? {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" } },
            { lastName: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
            { phone: { contains: input.search } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.buyer.count({ where }),
    prisma.buyer.findMany({
      where,
      orderBy: resolveBuyerOrderBy(input.sort),
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        _count: { select: { reservations: true, tasks: true, activities: true } },
      },
    }),
  ]);

  return { items: rows, total };
}

export async function getBuyerById(organizationId: string, buyerId: string) {
  const buyer = await prisma.buyer.findFirst({
    where: { id: buyerId, organizationId },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 50,
        include: { actor: { select: { id: true, name: true } } },
      },
      tasks: {
        orderBy: { dueAt: "asc" },
        take: 25,
        include: { assignedUser: { select: { id: true, name: true } } },
      },
      reservations: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          unit: { select: { id: true, code: true } },
          project: { select: { id: true, name: true } },
        },
      },
      interests: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: {
          project: { select: { id: true, name: true } },
          unit: { select: { id: true, code: true } },
        },
      },
    },
  });
  if (!buyer) throw DomainErrors.notFound("Kupac");
  return buyer;
}

export interface DuplicateCandidate {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  matchedOn: ("phone" | "email")[];
}

/**
 * Returns existing buyers in the organization that share the normalized phone
 * or email. `excludeBuyerId` skips the buyer currently being edited.
 */
export async function findDuplicates(input: {
  organizationId: string;
  phone?: string | null;
  email?: string | null;
  excludeBuyerId?: string;
}): Promise<DuplicateCandidate[]> {
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedPhone && !normalizedEmail) return [];

  const or: Prisma.BuyerWhereInput[] = [];
  if (normalizedPhone) or.push({ normalizedPhone });
  if (normalizedEmail) or.push({ normalizedEmail });

  const rows = await prisma.buyer.findMany({
    where: {
      organizationId: input.organizationId,
      archivedAt: null,
      ...(input.excludeBuyerId ? { id: { not: input.excludeBuyerId } } : {}),
      OR: or,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      normalizedPhone: true,
      normalizedEmail: true,
    },
    take: 10,
  });

  return rows.map((r) => {
    const matchedOn: ("phone" | "email")[] = [];
    if (normalizedPhone && r.normalizedPhone === normalizedPhone) matchedOn.push("phone");
    if (normalizedEmail && r.normalizedEmail === normalizedEmail) matchedOn.push("email");
    return {
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      email: r.email,
      matchedOn,
    };
  });
}

export async function createBuyer(input: BuyerContactInput) {
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedEmail = normalizeEmail(input.email);

  const created = await prisma.buyer.create({
    data: {
      organizationId: input.organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ?? null,
      normalizedEmail,
      phone: input.phone,
      normalizedPhone: normalizedPhone ?? input.phone,
      secondaryPhone: input.secondaryPhone ?? null,
      preferredContactMethod: input.preferredContactMethod ?? "ANY",
      budgetMin: toDecimalOrNull(input.budgetMin),
      budgetMax: toDecimalOrNull(input.budgetMax),
      preferredCurrency: input.preferredCurrency ?? "EUR",
      desiredUnitTypes: input.desiredUnitTypes ?? [],
      desiredRoomCounts: input.desiredRoomCounts ?? [],
      desiredAreaMin: toDecimalOrNull(input.desiredAreaMin),
      desiredAreaMax: toDecimalOrNull(input.desiredAreaMax),
      notes: input.notes ?? null,
      source: input.source ?? null,
      status: input.status ?? "NEW",
      assignedUserId: input.assignedUserId ?? input.actorUserId,
    },
  });

  await recordAudit({
    action: "buyer.created",
    entityType: "Buyer",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      name: `${created.firstName} ${created.lastName}`,
      phone: created.phone,
      status: created.status,
    },
  });

  return created;
}

export interface UpdateBuyerInput {
  organizationId: string;
  actorUserId: string;
  buyerId: string;
  patch: Partial<Omit<BuyerContactInput, "organizationId" | "actorUserId">>;
}

export async function updateBuyer(input: UpdateBuyerInput) {
  const existing = await prisma.buyer.findFirst({
    where: { id: input.buyerId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Kupac");

  const patch = input.patch;
  const nextPhone = patch.phone ?? existing.phone;
  const nextEmail = patch.email !== undefined ? patch.email : existing.email;

  const updated = await prisma.buyer.update({
    where: { id: input.buyerId },
    data: {
      firstName: patch.firstName ?? undefined,
      lastName: patch.lastName ?? undefined,
      email: patch.email !== undefined ? patch.email : undefined,
      normalizedEmail:
        patch.email !== undefined ? normalizeEmail(patch.email) : undefined,
      phone: patch.phone ?? undefined,
      normalizedPhone:
        patch.phone !== undefined
          ? normalizePhone(patch.phone) ?? patch.phone
          : undefined,
      secondaryPhone: patch.secondaryPhone !== undefined ? patch.secondaryPhone : undefined,
      preferredContactMethod: patch.preferredContactMethod ?? undefined,
      budgetMin: patch.budgetMin !== undefined ? toDecimalOrNull(patch.budgetMin) : undefined,
      budgetMax: patch.budgetMax !== undefined ? toDecimalOrNull(patch.budgetMax) : undefined,
      preferredCurrency: patch.preferredCurrency ?? undefined,
      desiredUnitTypes: patch.desiredUnitTypes ?? undefined,
      desiredRoomCounts: patch.desiredRoomCounts ?? undefined,
      desiredAreaMin:
        patch.desiredAreaMin !== undefined ? toDecimalOrNull(patch.desiredAreaMin) : undefined,
      desiredAreaMax:
        patch.desiredAreaMax !== undefined ? toDecimalOrNull(patch.desiredAreaMax) : undefined,
      notes: patch.notes !== undefined ? patch.notes : undefined,
      source: patch.source !== undefined ? patch.source : undefined,
      status: patch.status ?? undefined,
      assignedUserId: patch.assignedUserId !== undefined ? patch.assignedUserId : undefined,
    },
  });

  const statusChanged = patch.status != null && patch.status !== existing.status;
  const assignmentChanged =
    patch.assignedUserId !== undefined && patch.assignedUserId !== existing.assignedUserId;

  await recordAudit({
    action: assignmentChanged ? "buyer.assigned" : "buyer.updated",
    entityType: "Buyer",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: {
      status: existing.status,
      assignedUserId: existing.assignedUserId,
      email: existing.email,
      phone: existing.phone,
    },
    newValues: {
      status: updated.status,
      assignedUserId: updated.assignedUserId,
      email: updated.email,
      phone: updated.phone,
      statusChanged,
    },
  });

  return { updated, contactChanged: nextPhone !== existing.phone || nextEmail !== existing.email };
}

export async function archiveBuyer(input: {
  organizationId: string;
  actorUserId: string;
  buyerId: string;
}) {
  const existing = await prisma.buyer.findFirst({
    where: { id: input.buyerId, organizationId: input.organizationId },
    select: { id: true, archivedAt: true },
  });
  if (!existing) throw DomainErrors.notFound("Kupac");
  if (existing.archivedAt) {
    throw DomainErrors.invalidState("Kupac je već arhiviran.");
  }
  await prisma.buyer.update({
    where: { id: input.buyerId },
    data: { archivedAt: new Date(), status: "ARCHIVED" },
  });
  await recordAudit({
    action: "buyer.archived",
    entityType: "Buyer",
    entityId: input.buyerId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
}
