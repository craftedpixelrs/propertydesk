import "server-only";
import {
  Prisma,
  type DuesTariffKind,
  type DuesTariffBasis,
  type ManagedUnitType,
} from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertBuildingBelongsToOrg } from "@/server/services/manager/buildings.service";
import { deterministicModel97, formatModel97 } from "@/lib/payments/model97";

/**
 * Faza 11 — Dues (zajedničke takse) service for building managers.
 *
 * Pipeline:
 *   1. operator defines `DuesTariff` records (per building, per fund kind)
 *   2. monthly cron `manager.generate-dues` creates `DuesCharge` rows for
 *      every active unit × every effective tariff, aggregated per unit
 *   3. operator (or incoming bank statement) records `DuesPayment` → charge
 *      status transitions through OPEN → PARTIALLY_PAID → PAID
 *   4. debtors list / reminders use `outstandingAmount = total - paid`
 *
 * Decimals: amounts are stored as `Decimal(14, 2)` for money and
 * `Decimal(14, 4)` for tariff rates (because per-m² rates can get long).
 */

// ---------------------------------------------------------------------------
// Tariffs
// ---------------------------------------------------------------------------

export interface CreateDuesTariffInput {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  name: string;
  kind: DuesTariffKind;
  basis: DuesTariffBasis;
  amount: string | number;
  currency?: string;
  unitTypeFilter?: ManagedUnitType | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  notes?: string | null;
}

export async function createDuesTariff(input: CreateDuesTariffInput) {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);
  const row = await prisma.duesTariff.create({
    data: {
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      name: input.name.trim(),
      kind: input.kind,
      basis: input.basis,
      amount: new Decimal(input.amount).toFixed(4),
      currency: input.currency ?? "RSD",
      unitTypeFilter: input.unitTypeFilter ?? null,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      active: true,
      notes: input.notes?.trim() || null,
    },
  });

  await recordAudit({
    action: "manager.tariff_created",
    entityType: "DuesTariff",
    entityId: row.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { name: row.name, kind: row.kind, amount: row.amount.toString() },
  });

  return row;
}

export async function updateDuesTariff(input: {
  organizationId: string;
  actorUserId: string;
  tariffId: string;
  patch: Partial<Omit<CreateDuesTariffInput, "organizationId" | "actorUserId" | "buildingId">>;
  active?: boolean;
}) {
  const existing = await prisma.duesTariff.findFirst({
    where: { id: input.tariffId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Tarifa nije pronađena.");

  const data: Prisma.DuesTariffUpdateInput = {};
  if (input.patch.name !== undefined) data.name = input.patch.name.trim();
  if (input.patch.kind !== undefined) data.kind = input.patch.kind;
  if (input.patch.basis !== undefined) data.basis = input.patch.basis;
  if (input.patch.amount !== undefined) data.amount = new Decimal(input.patch.amount).toFixed(4);
  if (input.patch.currency !== undefined) data.currency = input.patch.currency;
  if (input.patch.unitTypeFilter !== undefined)
    data.unitTypeFilter = input.patch.unitTypeFilter ?? null;
  if (input.patch.effectiveFrom !== undefined) data.effectiveFrom = input.patch.effectiveFrom;
  if (input.patch.effectiveTo !== undefined) data.effectiveTo = input.patch.effectiveTo ?? null;
  if (input.patch.notes !== undefined) data.notes = input.patch.notes?.trim() || null;
  if (input.active !== undefined) data.active = input.active;

  const updated = await prisma.duesTariff.update({
    where: { id: input.tariffId },
    data,
  });

  await recordAudit({
    action: "manager.tariff_updated",
    entityType: "DuesTariff",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: existing,
    newValues: updated,
  });
  return updated;
}

export async function listDuesTariffs(organizationId: string, buildingId: string) {
  await assertBuildingBelongsToOrg(organizationId, buildingId);
  return prisma.duesTariff.findMany({
    where: { organizationId, buildingId },
    orderBy: [{ active: "desc" }, { effectiveFrom: "desc" }, { kind: "asc" }],
  });
}

// ---------------------------------------------------------------------------
// Charge generation (monthly cron + manual trigger)
// ---------------------------------------------------------------------------

export interface GenerateDuesForBuildingInput {
  organizationId: string;
  actorUserId: string | null;
  buildingId: string;
  periodYear: number;
  periodMonth: number; // 1-12
  dueDay?: number; // defaults to 15th of the period month
}

export interface GenerateDuesResult {
  created: number;
  skipped: number;
  totalAmount: string;
}

/**
 * Generate a batch of `DuesCharge` rows for one building and one period
 * (year/month). Idempotent: existing (unit, period) rows are skipped —
 * charges are *not* overwritten. This matches operator expectations:
 * once a charge is issued and printed on an uplatnica, it must stay
 * exactly as it was (regenerating would void the paper trail).
 *
 * The breakdown is a JSON object keyed by tariff kind (CURRENT_MAINTENANCE,
 * INVESTMENT_FUND, …) so the finance tab can render per-fund amounts and
 * aggregate reports in Phase 9 can sum per-fund totals.
 */
export async function generateDuesForBuilding(
  input: GenerateDuesForBuildingInput,
): Promise<GenerateDuesResult> {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);
  const dueDay = Math.min(28, Math.max(1, input.dueDay ?? 15));
  const dueDate = new Date(Date.UTC(input.periodYear, input.periodMonth - 1, dueDay));

  // Load the active tariffs that cover this period.
  const periodStart = new Date(Date.UTC(input.periodYear, input.periodMonth - 1, 1));
  const periodEnd = new Date(Date.UTC(input.periodYear, input.periodMonth, 0, 23, 59, 59));
  const tariffs = await prisma.duesTariff.findMany({
    where: {
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      active: true,
      effectiveFrom: { lte: periodEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
    },
  });
  if (tariffs.length === 0) {
    return { created: 0, skipped: 0, totalAmount: "0.00" };
  }

  const units = await prisma.managedUnit.findMany({
    where: {
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      archivedAt: null,
    },
    select: {
      id: true,
      type: true,
      totalArea: true,
      participationShare: true,
    },
  });
  if (units.length === 0) {
    return { created: 0, skipped: 0, totalAmount: "0.00" };
  }

  // Preload existing charges so we don't duplicate.
  const existing = await prisma.duesCharge.findMany({
    where: {
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
    },
    select: { unitId: true },
  });
  const alreadyCharged = new Set(existing.map((e) => e.unitId));

  let created = 0;
  let skipped = 0;
  const totalRunning = new Decimal(0);

  await prisma.$transaction(async (tx) => {
    for (const unit of units) {
      if (alreadyCharged.has(unit.id)) {
        skipped += 1;
        continue;
      }

      const breakdown: Record<string, string> = {};
      let unitTotal = new Decimal(0);

      for (const tariff of tariffs) {
        if (tariff.unitTypeFilter && tariff.unitTypeFilter !== unit.type) continue;
        const base = new Decimal(tariff.amount.toString());
        const amount =
          tariff.basis === "PER_SQUARE_METER"
            ? base.mul(new Decimal(unit.totalArea.toString()))
            : base;
        unitTotal = unitTotal.plus(amount);
        const prev = new Decimal(breakdown[tariff.kind] ?? "0");
        breakdown[tariff.kind] = prev.plus(amount).toFixed(2);
      }

      if (unitTotal.lte(0)) {
        skipped += 1;
        continue;
      }

      const charge = await tx.duesCharge.create({
        data: {
          organizationId: input.organizationId,
          buildingId: input.buildingId,
          unitId: unit.id,
          periodYear: input.periodYear,
          periodMonth: input.periodMonth,
          dueDate,
          totalAmount: unitTotal.toFixed(2),
          currency: tariffs[0]?.currency ?? "RSD",
          status: "OPEN",
          breakdown,
        },
      });

      // Deterministic model-97 reference from the auto cuid — guarantees
      // a stable `97 CC-XXXXXXXXXXXX` for reprints and bank matching.
      // We take the last 12 numeric digits of a numeric hash of the id.
      const numericKey = numericHash(charge.id);
      const ref = deterministicModel97(numericKey);
      await tx.duesCharge.update({
        where: { id: charge.id },
        data: { reference: ref.compact },
      });

      created += 1;
      totalRunning.plus(unitTotal);
    }
  });

  await recordAudit({
    action: "manager.dues_generated",
    entityType: "ManagedBuilding",
    entityId: input.buildingId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? undefined,
    newValues: {
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      created,
      skipped,
    },
  });

  return { created, skipped, totalAmount: totalRunning.toFixed(2) };
}

/**
 * Generate dues for the "current" calendar month across every active
 * MANAGER organization. Invoked by the `manager.generate-dues` cron on
 * the 1st of each month.
 */
export async function generateMonthlyDuesForAllOrganizations(options?: {
  periodYear?: number;
  periodMonth?: number;
}): Promise<{ processed: number; created: number; errors: number }> {
  const now = new Date();
  const year = options?.periodYear ?? now.getUTCFullYear();
  const month = options?.periodMonth ?? now.getUTCMonth() + 1;

  // Find every active MANAGER org (not restricted, not suspended).
  const orgs = await prisma.organization.findMany({
    where: {
      profile: {
        type: "MANAGER",
        status: { in: ["ACTIVE", "TRIAL"] },
      },
    },
    select: { id: true },
  });

  let processed = 0;
  let created = 0;
  let errors = 0;

  for (const org of orgs) {
    const buildings = await prisma.managedBuilding.findMany({
      where: { organizationId: org.id, archivedAt: null },
      select: { id: true },
    });
    for (const b of buildings) {
      try {
        const r = await generateDuesForBuilding({
          organizationId: org.id,
          actorUserId: null,
          buildingId: b.id,
          periodYear: year,
          periodMonth: month,
        });
        processed += 1;
        created += r.created;
      } catch (e) {
        errors += 1;
      }
    }
  }

  return { processed, created, errors };
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface RecordDuesPaymentInput {
  organizationId: string;
  actorUserId: string;
  chargeId: string;
  amount: string | number;
  paidAt?: Date;
  method?: "BANK_TRANSFER" | "CARD" | "OTHER";
  reference?: string | null;
  bankTransactionId?: string | null;
  notes?: string | null;
}

export async function recordDuesPayment(input: RecordDuesPaymentInput) {
  const charge = await prisma.duesCharge.findFirst({
    where: { id: input.chargeId, organizationId: input.organizationId },
  });
  if (!charge) throw DomainErrors.notFound("Zaduženje nije pronađeno.");
  if (charge.status === "WRITTEN_OFF") {
    throw DomainErrors.conflict("Zaduženje je otpisano, uplata nije moguća.");
  }
  const amount = new Decimal(input.amount);
  if (amount.lte(0)) {
    throw DomainErrors.badRequest("Iznos uplate mora biti pozitivan.");
  }

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.duesPayment.create({
      data: {
        organizationId: input.organizationId,
        chargeId: charge.id,
        amount: amount.toFixed(2),
        currency: charge.currency,
        paidAt: input.paidAt ?? new Date(),
        method: input.method ?? "BANK_TRANSFER",
        reference: input.reference ?? null,
        bankTransactionId: input.bankTransactionId ?? null,
        recordedByUserId: input.actorUserId,
        notes: input.notes?.trim() || null,
      },
    });

    const newPaid = new Decimal(charge.paidAmount.toString()).plus(amount);
    const total = new Decimal(charge.totalAmount.toString());
    const status: "OPEN" | "PARTIALLY_PAID" | "PAID" = newPaid.gte(total)
      ? "PAID"
      : newPaid.gt(0)
        ? "PARTIALLY_PAID"
        : "OPEN";
    await tx.duesCharge.update({
      where: { id: charge.id },
      data: { paidAmount: newPaid.toFixed(2), status },
    });
    return p;
  });

  await recordAudit({
    action: "manager.dues_payment_recorded",
    entityType: "DuesCharge",
    entityId: charge.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { paymentId: payment.id, amount: payment.amount.toString() },
  });

  return payment;
}

export async function reverseDuesPayment(input: {
  organizationId: string;
  actorUserId: string;
  paymentId: string;
  reason: string;
}) {
  const payment = await prisma.duesPayment.findFirst({
    where: { id: input.paymentId, organizationId: input.organizationId },
    include: { charge: true },
  });
  if (!payment) throw DomainErrors.notFound("Uplata nije pronađena.");
  if (payment.reversed) {
    throw DomainErrors.conflict("Uplata je već stornirana.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.duesPayment.update({
      where: { id: payment.id },
      data: {
        reversed: true,
        reversedAt: new Date(),
        reversalReason: input.reason.trim(),
      },
    });
    const newPaid = new Decimal(payment.charge.paidAmount.toString()).minus(
      new Decimal(payment.amount.toString()),
    );
    const total = new Decimal(payment.charge.totalAmount.toString());
    const status: "OPEN" | "PARTIALLY_PAID" | "PAID" = newPaid.gte(total)
      ? "PAID"
      : newPaid.gt(0)
        ? "PARTIALLY_PAID"
        : "OPEN";
    await tx.duesCharge.update({
      where: { id: payment.chargeId },
      data: {
        paidAmount: newPaid.lt(0) ? "0.00" : newPaid.toFixed(2),
        status,
      },
    });
  });

  await recordAudit({
    action: "manager.dues_payment_reversed",
    entityType: "DuesPayment",
    entityId: payment.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    metadata: { reason: input.reason },
  });
}

// ---------------------------------------------------------------------------
// Debtors / reporting
// ---------------------------------------------------------------------------

export interface DebtorRow {
  unitId: string;
  unitCode: string;
  buildingId: string;
  buildingName: string;
  outstanding: string;
  oldestDueDate: Date | null;
  primaryOwner: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

/**
 * Return the list of units with outstanding debt. The amount is the sum
 * of `(totalAmount - paidAmount)` over all open or partially-paid charges.
 * Results are ordered by outstanding amount desc (biggest debtor first).
 */
export async function listDebtors(input: {
  organizationId: string;
  buildingId?: string;
  minOutstanding?: string | number;
}): Promise<DebtorRow[]> {
  const rows = await prisma.duesCharge.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.buildingId ? { buildingId: input.buildingId } : {}),
      status: { in: ["OPEN", "PARTIALLY_PAID"] },
    },
    select: {
      unitId: true,
      buildingId: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
      unit: {
        select: {
          id: true,
          code: true,
          ownerships: {
            where: { endedAt: null, isPrimary: true },
            take: 1,
            select: {
              person: {
                select: {
                  firstName: true,
                  lastName: true,
                  legalName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
      building: { select: { id: true, name: true } },
    },
  });

  const byUnit = new Map<string, DebtorRow>();
  for (const r of rows) {
    const outstanding = new Decimal(r.totalAmount.toString()).minus(
      new Decimal(r.paidAmount.toString()),
    );
    if (outstanding.lte(0)) continue;
    const existing = byUnit.get(r.unitId);
    if (existing) {
      existing.outstanding = new Decimal(existing.outstanding).plus(outstanding).toFixed(2);
      if (!existing.oldestDueDate || r.dueDate < existing.oldestDueDate) {
        existing.oldestDueDate = r.dueDate;
      }
      continue;
    }
    const owner = r.unit.ownerships[0]?.person ?? null;
    byUnit.set(r.unitId, {
      unitId: r.unitId,
      unitCode: r.unit.code,
      buildingId: r.buildingId,
      buildingName: r.building.name,
      outstanding: outstanding.toFixed(2),
      oldestDueDate: r.dueDate,
      primaryOwner: owner
        ? (owner.legalName ?? ([owner.firstName, owner.lastName].filter(Boolean).join(" ") || null))
        : null,
      contactEmail: owner?.email ?? null,
      contactPhone: owner?.phone ?? null,
    });
  }

  const min = input.minOutstanding ? new Decimal(input.minOutstanding) : new Decimal(0);
  return Array.from(byUnit.values())
    .filter((r) => new Decimal(r.outstanding).gte(min))
    .sort((a, b) => new Decimal(b.outstanding).comparedTo(new Decimal(a.outstanding)));
}

/**
 * Compute the `97 CC-XXXXXXXXXXXX` reference for a single charge.
 * Used when rendering the uplatnica PDF and when matching bank statements.
 */
export function duesChargeReference(charge: { reference: string | null }): string | null {
  if (!charge.reference) return null;
  return formatModel97(charge.reference);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Collapse a cuid (base36 string) into a 12-digit numeric string.
 * We do NOT need cryptographic strength — only "stable per id".
 */
function numericHash(id: string): string {
  let acc = 0n;
  for (let i = 0; i < id.length; i += 1) {
    acc = (acc * 131n + BigInt(id.charCodeAt(i))) % 1_000_000_000_000n;
  }
  return acc.toString().padStart(12, "0");
}
