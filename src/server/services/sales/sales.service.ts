import "server-only";
import { Prisma, type SaleStatus } from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { changeUnitStatus } from "@/server/services/units.service";
import { toDecimal } from "@/lib/formatters/money";
import { logger } from "@/server/logger";
import { snapshotCommissionForSaleTx } from "@/server/services/commissions/snapshot";
import { computeSaleTax } from "@/server/services/sales/tax.service";
import type { SaleTaxPayer, SaleVatMode } from "@prisma/client";

/**
 * SaleService — the transaction-critical core of Phase 5.
 *
 * Invariants:
 *   - At most ONE non-canceled sale per unit. Enforced at THREE layers:
 *     (1) a Postgres partial unique index `sale_unit_active_uniq` (Phase 3
 *     migration), (2) an explicit precheck inside the create transaction, and
 *     (3) allowed-status transitions.
 *   - Discount math is Decimal-safe. `finalPrice` is always derived from
 *     `listPrice` and `discountValue` inside this module — callers never
 *     compute money in JavaScript number space.
 *   - Every state change writes a `SaleStatusHistory` row, moves the unit
 *     through `changeUnitStatus` when appropriate, and bumps `version`.
 *   - When the sale reaches CONTRACTED, a `Commission` row is snapshotted
 *     from the currently-applicable `AgencyCommissionRule`. The snapshot is
 *     immutable — later rule changes never affect existing sales.
 *   - Conversion of a reservation transitions BOTH entities in a single
 *     transaction: `Reservation` → CONVERTED, `Sale` created.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

const ACTIVE_SALE_STATUSES: SaleStatus[] = [
  "DRAFT",
  "PRE_CONTRACT",
  "CONTRACTED",
  "PAYMENT_IN_PROGRESS",
  "PAID",
  "HANDED_OVER",
];

const ALLOWED_SALE_TRANSITIONS: Record<SaleStatus, SaleStatus[]> = {
  DRAFT: ["PRE_CONTRACT", "CONTRACTED", "CANCELED"],
  PRE_CONTRACT: ["CONTRACTED", "CANCELED"],
  CONTRACTED: ["PAYMENT_IN_PROGRESS", "PAID", "CANCELED"],
  PAYMENT_IN_PROGRESS: ["PAID", "CANCELED"],
  PAID: ["HANDED_OVER"],
  HANDED_OVER: [],
  CANCELED: [],
};

export interface CreateSaleInput {
  organizationId: string;
  actorUserId: string;
  unitId: string;
  buyerId: string;
  reservationId?: string | null;
  responsibleUserId?: string | null;
  listPrice: number | string;
  discountType?: "PERCENTAGE" | "FIXED" | null;
  discountValue?: number | string | null;
  currency?: string;
  depositAmount?: number | string | null;
  notes?: string | null;
  agencyOrganizationId?: string | null;
  agencyAgentUserId?: string | null;
  sourceType?: "INTERNAL" | "AGENCY";
}

export interface CreateFromReservationInput {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
  responsibleUserId?: string | null;
  listPrice: number | string;
  discountType?: "PERCENTAGE" | "FIXED" | null;
  discountValue?: number | string | null;
  currency?: string;
  depositAmount?: number | string | null;
  notes?: string | null;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function isPrismaUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Compute `finalPrice` from list + discount using Decimal arithmetic.
 * Never let plain-number math touch money.
 */
export function computeFinalPrice(
  listPrice: number | string | Decimal,
  discountType: "PERCENTAGE" | "FIXED" | null | undefined,
  discountValue: number | string | Decimal | null | undefined,
): Decimal {
  const list = toDecimal(listPrice);
  if (!discountType || discountValue == null) {
    return list.toDecimalPlaces(2);
  }
  const disc = toDecimal(discountValue);
  if (discountType === "PERCENTAGE") {
    if (disc.lt(0) || disc.gt(100)) {
      throw DomainErrors.badRequest("Popust u procentima mora biti između 0 i 100.");
    }
    const factor = new Decimal(1).minus(disc.dividedBy(100));
    return list.times(factor).toDecimalPlaces(2);
  }
  if (disc.lt(0)) {
    throw DomainErrors.badRequest("Fiksni popust ne može biti negativan.");
  }
  const result = list.minus(disc);
  if (result.lt(0)) {
    throw DomainErrors.badRequest("Popust je veći od cene.");
  }
  return result.toDecimalPlaces(2);
}

async function assertNoActiveSale(
  tx: Prisma.TransactionClient,
  unitId: string,
): Promise<void> {
  const active = await tx.sale.findFirst({
    where: { unitId, status: { not: "CANCELED" } },
    select: { id: true },
  });
  if (active) {
    throw DomainErrors.conflict("Ova jedinica već ima aktivnu prodaju.");
  }
}

// -----------------------------------------------------------------------------
// List / read
// -----------------------------------------------------------------------------

export interface ListSalesInput {
  organizationId: string;
  page: number;
  pageSize: number;
  status?: SaleStatus[];
  projectId?: string;
  buyerId?: string;
  unitId?: string;
}

export async function listSales(input: ListSalesInput) {
  const where: Prisma.SaleWhereInput = {
    organizationId: input.organizationId,
    ...(input.status?.length ? { status: { in: input.status } } : {}),
    ...(input.projectId ? { projectId: input.projectId } : {}),
    ...(input.buyerId ? { buyerId: input.buyerId } : {}),
    ...(input.unitId ? { unitId: input.unitId } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        unit: { select: { id: true, code: true } },
        project: { select: { id: true, name: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        responsibleUser: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { items: rows, total };
}

export interface SaleBoardCard {
  id: string;
  status: SaleStatus;
  version: number;
  unitCode: string;
  projectName: string;
  buyerName: string;
  finalPrice: string;
  currency: string;
  contractDate: Date | null;
  createdAt: Date;
}

export interface SaleBoardColumn {
  status: SaleStatus;
  total: number;
  cards: SaleBoardCard[];
}

/**
 * Board-shaped listing for the Kanban view. One bucket per SaleStatus,
 * each capped so a big tenant doesn't stream thousands of rows at once.
 * `PAYMENT_IN_PROGRESS` is derived from payments — the column is still
 * populated for visibility but the UI marks it as read-only.
 */
export async function listSalesBoard(input: {
  organizationId: string;
  projectId?: string;
  perColumnLimit?: number;
}): Promise<SaleBoardColumn[]> {
  const per = Math.min(Math.max(input.perColumnLimit ?? 50, 1), 200);
  const baseWhere: Prisma.SaleWhereInput = {
    organizationId: input.organizationId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
  };
  const statuses: SaleStatus[] = [
    "DRAFT",
    "PRE_CONTRACT",
    "CONTRACTED",
    "PAYMENT_IN_PROGRESS",
    "PAID",
    "HANDED_OVER",
    "CANCELED",
  ];

  const [totalsByStatus, rows] = await Promise.all([
    prisma.sale.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    Promise.all(
      statuses.map((status) =>
        prisma.sale.findMany({
          where: { ...baseWhere, status },
          orderBy: { createdAt: "desc" },
          take: per,
          include: {
            unit: { select: { code: true } },
            project: { select: { name: true } },
            buyer: { select: { firstName: true, lastName: true } },
          },
        }),
      ),
    ),
  ]);
  const totals = new Map(totalsByStatus.map((r) => [r.status, r._count._all] as const));

  return statuses.map((status, i) => ({
    status,
    total: totals.get(status) ?? 0,
    cards: rows[i]!.map((r) => ({
      id: r.id,
      status: r.status,
      version: r.version,
      unitCode: r.unit?.code ?? "—",
      projectName: r.project?.name ?? "—",
      buyerName: r.buyer ? `${r.buyer.firstName} ${r.buyer.lastName}` : "—",
      finalPrice: r.finalPrice.toString(),
      currency: r.currency,
      contractDate: r.contractDate,
      createdAt: r.createdAt,
    })),
  }));
}

export async function getSaleById(organizationId: string, saleId: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, organizationId },
    include: {
      unit: { select: { id: true, code: true, status: true } },
      project: { select: { id: true, name: true } },
      buyer: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
      reservation: { select: { id: true, status: true } },
      responsibleUser: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, name: true } },
      paymentPlan: { include: { installments: { orderBy: { sequenceNumber: "asc" } } } },
      payments: { orderBy: { paymentDate: "desc" } },
      commission: true,
      statusHistory: {
        orderBy: { changedAt: "desc" },
        include: { changedByUser: { select: { id: true, name: true } } },
      },
    },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  return sale;
}

// -----------------------------------------------------------------------------
// Create
// -----------------------------------------------------------------------------

export async function createSale(input: CreateSaleInput) {
  const finalPrice = computeFinalPrice(
    input.listPrice,
    input.discountType,
    input.discountValue,
  );
  const listPriceDecimal = toDecimal(input.listPrice).toDecimalPlaces(2);
  const currency = input.currency ?? "EUR";

  const sale = await prisma
    .$transaction(async (tx) => {
      // Row-lock the unit; this serialises parallel sale attempts on the same
      // unit (belt-and-suspenders with the DB-level partial unique index).
      await tx.$queryRaw`SELECT id FROM "unit" WHERE id = ${input.unitId} AND "organizationId" = ${input.organizationId} FOR UPDATE`;

      const unit = await tx.unit.findFirst({
        where: {
          id: input.unitId,
          organizationId: input.organizationId,
          archivedAt: null,
        },
        select: { id: true, projectId: true, status: true },
      });
      if (!unit) throw DomainErrors.notFound("Jedinica");
      if (unit.status === "SOLD") {
        throw DomainErrors.invalidState(
          "Jedinica je već prodata — nemoguće kreirati novu prodaju.",
        );
      }

      const buyer = await tx.buyer.findFirst({
        where: { id: input.buyerId, organizationId: input.organizationId },
        select: { id: true },
      });
      if (!buyer) throw DomainErrors.notFound("Kupac");

      let reservation: {
        id: string;
        status: string;
        agencyOrganizationId: string | null;
        agencyAgentUserId: string | null;
        sourceType: string;
      } | null = null;
      if (input.reservationId) {
        reservation = await tx.reservation.findFirst({
          where: {
            id: input.reservationId,
            organizationId: input.organizationId,
            unitId: input.unitId,
          },
          select: {
            id: true,
            status: true,
            agencyOrganizationId: true,
            agencyAgentUserId: true,
            sourceType: true,
          },
        });
        if (!reservation) throw DomainErrors.notFound("Rezervacija");
        if (reservation.status !== "APPROVED") {
          throw DomainErrors.invalidState(
            "Rezervacija mora biti odobrena pre kreiranja prodaje.",
          );
        }
      }

      await assertNoActiveSale(tx, input.unitId);

      const created = await tx.sale.create({
        data: {
          organizationId: input.organizationId,
          projectId: unit.projectId,
          unitId: input.unitId,
          buyerId: input.buyerId,
          reservationId: input.reservationId ?? null,
          sourceType:
            (input.sourceType as "INTERNAL" | "AGENCY" | undefined) ??
            (reservation?.sourceType as "INTERNAL" | "AGENCY" | undefined) ??
            "INTERNAL",
          agencyOrganizationId:
            input.agencyOrganizationId ?? reservation?.agencyOrganizationId ?? null,
          agencyAgentUserId:
            input.agencyAgentUserId ?? reservation?.agencyAgentUserId ?? null,
          responsibleUserId: input.responsibleUserId ?? input.actorUserId,
          status: "DRAFT",
          listPrice: listPriceDecimal.toString(),
          discountType: input.discountType ?? null,
          discountValue:
            input.discountValue != null
              ? toDecimal(input.discountValue).toDecimalPlaces(2).toString()
              : null,
          finalPrice: finalPrice.toString(),
          currency,
          depositAmount:
            input.depositAmount != null
              ? toDecimal(input.depositAmount).toDecimalPlaces(2).toString()
              : null,
          notes: input.notes ?? null,
          createdByUserId: input.actorUserId,
        },
      });

      await tx.saleStatusHistory.create({
        data: {
          organizationId: input.organizationId,
          saleId: created.id,
          previousStatus: "DRAFT",
          newStatus: "DRAFT",
          reason: "Prodaja kreirana",
          changedByUserId: input.actorUserId,
        },
      });

      return created;
    })
    .catch((err) => {
      if (isPrismaUniqueViolation(err)) {
        throw DomainErrors.conflict("Ova jedinica već ima aktivnu prodaju.");
      }
      throw err;
    });

  await recordAudit({
    action: "sale.created",
    entityType: "Sale",
    entityId: sale.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      unitId: sale.unitId,
      buyerId: sale.buyerId,
      finalPrice: sale.finalPrice.toString(),
      currency: sale.currency,
    },
  });

  return sale;
}

// -----------------------------------------------------------------------------
// Create from reservation (atomic conversion)
// -----------------------------------------------------------------------------

export async function createSaleFromReservation(input: CreateFromReservationInput) {
  const finalPrice = computeFinalPrice(
    input.listPrice,
    input.discountType,
    input.discountValue,
  );
  const listPriceDecimal = toDecimal(input.listPrice).toDecimalPlaces(2);

  const { sale } = await prisma
    .$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: {
          id: input.reservationId,
          organizationId: input.organizationId,
        },
        select: {
          id: true,
          unitId: true,
          buyerId: true,
          projectId: true,
          status: true,
          version: true,
          currency: true,
          sourceType: true,
          agencyOrganizationId: true,
          agencyAgentUserId: true,
        },
      });
      if (!reservation) throw DomainErrors.notFound("Rezervacija");
      if (reservation.status !== "APPROVED") {
        throw DomainErrors.invalidState(
          "Rezervacija mora biti odobrena pre konverzije u prodaju.",
        );
      }

      // Row-lock the unit — same pattern as `createReservation` / `createSale`.
      await tx.$queryRaw`SELECT id FROM "unit" WHERE id = ${reservation.unitId} AND "organizationId" = ${input.organizationId} FOR UPDATE`;

      await assertNoActiveSale(tx, reservation.unitId);

      const created = await tx.sale.create({
        data: {
          organizationId: input.organizationId,
          projectId: reservation.projectId,
          unitId: reservation.unitId,
          buyerId: reservation.buyerId,
          reservationId: reservation.id,
          sourceType: reservation.sourceType,
          agencyOrganizationId: reservation.agencyOrganizationId,
          agencyAgentUserId: reservation.agencyAgentUserId,
          responsibleUserId: input.responsibleUserId ?? input.actorUserId,
          status: "DRAFT",
          listPrice: listPriceDecimal.toString(),
          discountType: input.discountType ?? null,
          discountValue:
            input.discountValue != null
              ? toDecimal(input.discountValue).toDecimalPlaces(2).toString()
              : null,
          finalPrice: finalPrice.toString(),
          currency: input.currency ?? reservation.currency,
          depositAmount:
            input.depositAmount != null
              ? toDecimal(input.depositAmount).toDecimalPlaces(2).toString()
              : null,
          notes: input.notes ?? null,
          createdByUserId: input.actorUserId,
        },
      });

      await tx.saleStatusHistory.create({
        data: {
          organizationId: input.organizationId,
          saleId: created.id,
          previousStatus: "DRAFT",
          newStatus: "DRAFT",
          reason: "Prodaja kreirana iz rezervacije",
          changedByUserId: input.actorUserId,
        },
      });

      // Flip the reservation to CONVERTED atomically. The reservation's
      // partial unique index (Phase 3) frees the unit slot for future
      // reservations once we do so, so this transition MUST happen inside
      // the same tx as the sale.create above.
      await tx.reservation.update({
        where: { id: reservation.id, version: reservation.version },
        data: {
          status: "CONVERTED",
          convertedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await tx.reservationStatusHistory.create({
        data: {
          organizationId: input.organizationId,
          reservationId: reservation.id,
          previousStatus: reservation.status as "APPROVED",
          newStatus: "CONVERTED",
          reason: "Konverzija u prodaju",
          changedByUserId: input.actorUserId,
        },
      });

      return { sale: created };
    })
    .catch((err) => {
      if (isPrismaUniqueViolation(err)) {
        throw DomainErrors.conflict("Ova jedinica već ima aktivnu prodaju.");
      }
      throw err;
    });

  await recordAudit({
    action: "sale.created",
    entityType: "Sale",
    entityId: sale.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { reservationId: input.reservationId },
  });
  await recordAudit({
    action: "reservation.converted",
    entityType: "Reservation",
    entityId: input.reservationId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });

  return sale;
}

// -----------------------------------------------------------------------------
// Transitions
// -----------------------------------------------------------------------------

async function transitionSale(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  target: SaleStatus;
  expectedVersion?: number;
  reason?: string | null;
  unitStatus?: "RESERVED" | "CONTRACTED" | "SOLD" | "AVAILABLE";
  applyDates?: (now: Date) => Prisma.SaleUpdateInput;
  afterMutation?: (tx: Prisma.TransactionClient) => Promise<void>;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findFirst({
      where: { id: input.saleId, organizationId: input.organizationId },
      select: {
        id: true,
        status: true,
        version: true,
        unitId: true,
        contractDate: true,
      },
    });
    if (!existing) throw DomainErrors.notFound("Prodaja");
    if (existing.status === input.target) {
      return { id: existing.id, status: existing.status, alreadyInState: true };
    }
    if (
      input.expectedVersion != null &&
      existing.version !== input.expectedVersion
    ) {
      throw DomainErrors.optimisticLock();
    }
    const allowed = ALLOWED_SALE_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(input.target)) {
      throw DomainErrors.invalidState(
        `Prelaz prodaje iz "${existing.status}" u "${input.target}" nije dozvoljen.`,
      );
    }

    const now = new Date();
    await tx.sale.update({
      where: { id: existing.id },
      data: {
        status: input.target,
        version: { increment: 1 },
        ...(input.applyDates ? input.applyDates(now) : {}),
      },
    });

    await tx.saleStatusHistory.create({
      data: {
        organizationId: input.organizationId,
        saleId: existing.id,
        previousStatus: existing.status,
        newStatus: input.target,
        reason: input.reason ?? null,
        changedByUserId: input.actorUserId,
      },
    });

    if (input.unitStatus) {
      await changeUnitStatus({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        unitId: existing.unitId,
        newStatus: input.unitStatus,
        reason: `Prodaja: ${input.target}`,
        tx,
        allowOverride: input.unitStatus === "AVAILABLE",
      });
    }

    if (input.afterMutation) {
      await input.afterMutation(tx);
    }

    return { id: existing.id, status: input.target, alreadyInState: false };
  });
}

export async function markPreContract(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  expectedVersion?: number;
}) {
  const result = await transitionSale({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    saleId: input.saleId,
    target: "PRE_CONTRACT",
    expectedVersion: input.expectedVersion,
    reason: "Predugovor",
    applyDates: (now) => ({ preContractDate: now }),
  });
  if (!result.alreadyInState) {
    await recordAudit({
      action: "sale.status_changed",
      entityType: "Sale",
      entityId: input.saleId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      newValues: { status: "PRE_CONTRACT" },
    });
  }
  return result;
}

export async function contractSale(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  expectedVersion?: number;
}) {
  const result = await transitionSale({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    saleId: input.saleId,
    target: "CONTRACTED",
    expectedVersion: input.expectedVersion,
    reason: "Potpisan ugovor",
    unitStatus: "CONTRACTED",
    applyDates: (now) => ({ contractDate: now }),
    afterMutation: async (tx) => {
      try {
        await snapshotCommissionForSaleTx({
          tx,
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          saleId: input.saleId,
        });
      } catch (err) {
        // Never fail the CONTRACTED transition if commission snapshotting
        // itself fails (e.g. rate table not yet configured). Log for the
        // investor to resolve later.
        logger.error("commission.snapshot_failed", {
          saleId: input.saleId,
          error: (err as Error)?.message,
        });
      }
    },
  });
  if (!result.alreadyInState) {
    await recordAudit({
      action: "sale.status_changed",
      entityType: "Sale",
      entityId: input.saleId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      newValues: { status: "CONTRACTED" },
    });
  }
  return result;
}

export async function markSalePaid(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  expectedVersion?: number;
}) {
  const result = await transitionSale({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    saleId: input.saleId,
    target: "PAID",
    expectedVersion: input.expectedVersion,
    reason: "Prodaja u potpunosti plaćena",
    unitStatus: "SOLD",
  });
  if (!result.alreadyInState) {
    await recordAudit({
      action: "sale.status_changed",
      entityType: "Sale",
      entityId: input.saleId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      newValues: { status: "PAID" },
    });
  }
  return result;
}

export async function handOverSale(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  expectedVersion?: number;
}) {
  const result = await transitionSale({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    saleId: input.saleId,
    target: "HANDED_OVER",
    expectedVersion: input.expectedVersion,
    reason: "Primopredaja izvršena",
    applyDates: (now) => ({ actualHandoverDate: now }),
  });
  if (!result.alreadyInState) {
    await recordAudit({
      action: "sale.status_changed",
      entityType: "Sale",
      entityId: input.saleId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      newValues: { status: "HANDED_OVER" },
    });
  }
  return result;
}

export async function cancelSale(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  reason: string;
  expectedVersion?: number;
}) {
  if (!input.reason || !input.reason.trim()) {
    throw DomainErrors.badRequest("Razlog otkazivanja je obavezan.");
  }
  const result = await transitionSale({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    saleId: input.saleId,
    target: "CANCELED",
    expectedVersion: input.expectedVersion,
    reason: input.reason,
    unitStatus: "AVAILABLE",
  });
  if (!result.alreadyInState) {
    await recordAudit({
      action: "sale.canceled",
      entityType: "Sale",
      entityId: input.saleId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      newValues: { reason: input.reason },
    });
  }
  return result;
}

// -----------------------------------------------------------------------------
// Sale <-> plan/payment status propagation.
// Invoked by PaymentService after each mutation. Runs in the same tx.
// -----------------------------------------------------------------------------

/**
 * Recompute a sale's status based on the aggregate payments recorded so far.
 * Only transitions between CONTRACTED / PAYMENT_IN_PROGRESS / PAID — the
 * other statuses (DRAFT, CANCELED, HANDED_OVER) are set explicitly elsewhere
 * and must not be overridden by payment accounting.
 */
export async function propagateSaleStatusFromPayments(input: {
  tx: Prisma.TransactionClient;
  organizationId: string;
  saleId: string;
  actorUserId: string;
}): Promise<void> {
  const { tx } = input;
  const sale = await tx.sale.findFirst({
    where: { id: input.saleId, organizationId: input.organizationId },
    select: {
      id: true,
      status: true,
      finalPrice: true,
      unitId: true,
    },
  });
  if (!sale) return;

  const totalActive = await tx.payment.aggregate({
    where: {
      saleId: input.saleId,
      reversedAt: null,
    },
    _sum: { amount: true },
  });
  const paid = toDecimal(totalActive._sum.amount ?? 0);
  const total = toDecimal(sale.finalPrice);

  let desired: SaleStatus = sale.status;
  if (sale.status === "CONTRACTED" || sale.status === "PAYMENT_IN_PROGRESS") {
    if (paid.gte(total)) desired = "PAID";
    else if (paid.gt(0)) desired = "PAYMENT_IN_PROGRESS";
    else desired = "CONTRACTED";
  }
  if (desired === sale.status) return;

  await tx.sale.update({
    where: { id: sale.id },
    data: { status: desired, version: { increment: 1 } },
  });
  await tx.saleStatusHistory.create({
    data: {
      organizationId: input.organizationId,
      saleId: sale.id,
      previousStatus: sale.status,
      newStatus: desired,
      reason: "Automatski status na osnovu uplata",
      changedByUserId: input.actorUserId,
    },
  });
  if (desired === "PAID") {
    await changeUnitStatus({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      unitId: sale.unitId,
      newStatus: "SOLD",
      reason: "Prodaja u potpunosti plaćena",
      tx,
    });
  }
}

// -----------------------------------------------------------------------------
// B2 — Tax settings (VAT / PPAP)
// -----------------------------------------------------------------------------

/**
 * Update the VAT / RPI configuration on a sale. If the caller omits
 * `taxAmount`, we re-derive it from `finalPrice` + `vatMode` using the pure
 * `computeSaleTax()` helper so operators cannot forget to keep it in sync.
 *
 * When `vatMode` is cleared (set to null), `taxAmount` is cleared as well —
 * "not configured" is a first-class state.
 */
export interface UpdateSaleTaxInput {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  vatMode: SaleVatMode | null;
  taxPayer?: SaleTaxPayer | null;
  taxAmount?: number | string | null;
}

export async function updateSaleTaxSettings(input: UpdateSaleTaxInput) {
  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, organizationId: input.organizationId },
    select: {
      id: true,
      finalPrice: true,
      vatMode: true,
      taxAmount: true,
      taxPayer: true,
      status: true,
    },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  if (sale.status === "CANCELED") {
    throw DomainErrors.invalidState("Otkazane prodaje se ne mogu menjati.");
  }

  let nextTaxAmount: Prisma.Decimal | null;
  if (input.vatMode == null) {
    nextTaxAmount = null;
  } else if (input.taxAmount !== undefined && input.taxAmount !== null) {
    try {
      nextTaxAmount = new Prisma.Decimal(
        input.taxAmount as Prisma.Decimal.Value,
      ).toDecimalPlaces(2);
    } catch {
      throw DomainErrors.badRequest("Iznos poreza nije validan.");
    }
    if (nextTaxAmount.isNegative()) {
      throw DomainErrors.badRequest("Iznos poreza ne sme biti negativan.");
    }
  } else {
    const computed = computeSaleTax({
      finalPrice: sale.finalPrice,
      vatMode: input.vatMode,
    });
    nextTaxAmount = computed.taxAmount;
  }

  const nextTaxPayer: SaleTaxPayer =
    input.taxPayer ?? sale.taxPayer ?? "BUYER";

  const updated = await prisma.sale.update({
    where: { id: sale.id },
    data: {
      vatMode: input.vatMode,
      taxAmount: nextTaxAmount,
      taxPayer: nextTaxPayer,
      version: { increment: 1 },
    },
    select: {
      id: true,
      vatMode: true,
      taxAmount: true,
      taxPayer: true,
      version: true,
    },
  });

  await recordAudit({
    action: "sale.tax_updated",
    entityType: "Sale",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: {
      vatMode: sale.vatMode,
      taxAmount: sale.taxAmount?.toString() ?? null,
      taxPayer: sale.taxPayer,
    },
    newValues: {
      vatMode: updated.vatMode,
      taxAmount: updated.taxAmount?.toString() ?? null,
      taxPayer: updated.taxPayer,
    },
  });

  return updated;
}

export { ACTIVE_SALE_STATUSES, ALLOWED_SALE_TRANSITIONS };
