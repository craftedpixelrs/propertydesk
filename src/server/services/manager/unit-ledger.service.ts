import "server-only";
import type {
  BillingPaymentMethod,
  DuesChargeStatus,
  MaintenanceStatus,
  ManagedUnitType,
} from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import {
  EXPENSE_FUNDS,
  addKindTotals,
  allocateCashToBreakdown,
  emptyFundTotals,
  emptyKindTotals,
  kindsToFunds,
  type ExpenseFund,
} from "@/server/services/manager/fund-allocation";

/**
 * Building-level and per-unit finance picture.
 *
 * Uplate are non-reversed `DuesPayment` rows (cash actually received).
 * Dug is the open charge remainder plus `DuesAdjustment` (a positive
 * adjustment increases what the unit owes; a negative one is a credit).
 * Isplate on a unit are `BuildingExpense` rows whose ticket is that unit.
 * Expenses without a unit stay as common-area payouts.
 */

const OPEN_TICKET: MaintenanceStatus[] = ["OPEN", "TRIAGED", "IN_PROGRESS", "AWAITING_PARTS"];

export interface UnitFinanceRow {
  unitId: string;
  code: string;
  type: ManagedUnitType;
  archived: boolean;
  owner: string | null;
  billed: string;
  paid: string;
  adjustments: string;
  debt: string;
  worksTotal: number;
  worksOpen: number;
  spentOnUnit: string;
}

export interface FundPictureRow {
  fund: ExpenseFund;
  inflow: string;
  spent: string;
  balance: string;
}

export interface BuildingFinancePicture {
  billed: string;
  cashIn: string;
  adjustments: string;
  debt: string;
  credit: string;
  cashOut: string;
  cashBalance: string;
  commonSpent: string;
  commonWorks: number;
  funds: FundPictureRow[];
  units: UnitFinanceRow[];
}

export interface UnitChargePayment {
  id: string;
  amount: string;
  paidAt: Date;
  method: BillingPaymentMethod;
  reference: string | null;
  reversed: boolean;
  notes: string | null;
}

export interface UnitChargeRow {
  id: string;
  periodYear: number;
  periodMonth: number;
  dueDate: Date;
  status: DuesChargeStatus;
  totalAmount: string;
  paidAmount: string;
  outstanding: string;
  reference: string | null;
  payments: UnitChargePayment[];
}

export interface UnitWorkRow {
  id: string;
  code: string;
  title: string;
  status: MaintenanceStatus;
  supplierName: string | null;
  actualCost: string | null;
  expenses: Array<{
    id: string;
    description: string;
    amount: string;
    fund: ExpenseFund;
    spentAt: Date;
  }>;
}

export interface UnitAdjustmentRow {
  id: string;
  amount: string;
  reason: string;
  effectiveDate: Date;
}

export interface UnitFinanceCard {
  unitId: string;
  code: string;
  type: ManagedUnitType;
  floor: number | null;
  area: string;
  share: string;
  entranceCode: string | null;
  archived: boolean;
  owner: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  billed: string;
  paid: string;
  adjustments: string;
  debt: string;
  spentOnUnit: string;
  charges: UnitChargeRow[];
  works: UnitWorkRow[];
  adjustmentRows: UnitAdjustmentRow[];
}

interface PersonBits {
  legalName: string | null;
  firstName: string | null;
  lastName: string | null;
  email?: string | null;
  phone?: string | null;
}

function personName(person: PersonBits | null | undefined): string | null {
  if (!person) return null;
  if (person.legalName) return person.legalName;
  const joined = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return joined || null;
}

function chargeOutstanding(total: Decimal, paid: Decimal, status: string): Decimal {
  if (status === "WRITTEN_OFF") return new Decimal(0);
  const gap = total.minus(paid);
  return gap.gt(0) ? gap : new Decimal(0);
}

function money(value: Decimal): string {
  return value.toFixed(2);
}

export async function loadBuildingFinancePicture(input: {
  organizationId: string;
  buildingId: string;
}): Promise<BuildingFinancePicture> {
  const [units, charges, expenses, tickets, adjustments] = await Promise.all([
    prisma.managedUnit.findMany({
      where: { organizationId: input.organizationId, buildingId: input.buildingId },
      select: {
        id: true,
        code: true,
        type: true,
        archivedAt: true,
        ownerships: {
          where: { endedAt: null, isPrimary: true },
          take: 1,
          select: {
            person: { select: { legalName: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.duesCharge.findMany({
      where: { organizationId: input.organizationId, buildingId: input.buildingId },
      select: {
        unitId: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        breakdown: true,
        payments: {
          where: { reversed: false },
          select: { amount: true },
        },
      },
    }),
    prisma.buildingExpense.findMany({
      where: { organizationId: input.organizationId, buildingId: input.buildingId },
      select: {
        amount: true,
        fund: true,
        ticket: { select: { unitId: true } },
      },
    }),
    prisma.maintenanceTicket.findMany({
      where: { organizationId: input.organizationId, buildingId: input.buildingId },
      select: { unitId: true, status: true },
    }),
    prisma.duesAdjustment.findMany({
      where: { organizationId: input.organizationId },
      select: { unitId: true, amount: true },
    }),
  ]);

  const unitIds = new Set(units.map((unit) => unit.id));
  const acc = new Map<
    string,
    {
      billed: Decimal;
      paid: Decimal;
      debt: Decimal;
      adjustments: Decimal;
      worksTotal: number;
      worksOpen: number;
      spent: Decimal;
    }
  >();
  const ensure = (unitId: string) => {
    let row = acc.get(unitId);
    if (!row) {
      row = {
        billed: new Decimal(0),
        paid: new Decimal(0),
        debt: new Decimal(0),
        adjustments: new Decimal(0),
        worksTotal: 0,
        worksOpen: 0,
        spent: new Decimal(0),
      };
      acc.set(unitId, row);
    }
    return row;
  };

  let billed = new Decimal(0);
  let cashIn = new Decimal(0);
  const kindIn = emptyKindTotals();

  for (const charge of charges) {
    const total = new Decimal(charge.totalAmount.toString());
    const paidOnCharge = new Decimal(charge.paidAmount.toString());
    const cash = charge.payments.reduce(
      (sum, payment) => sum.plus(new Decimal(payment.amount.toString())),
      new Decimal(0),
    );
    billed = billed.plus(total);
    cashIn = cashIn.plus(cash);
    addKindTotals(kindIn, allocateCashToBreakdown(cash, charge.breakdown));
    const row = ensure(charge.unitId);
    row.billed = row.billed.plus(total);
    row.paid = row.paid.plus(cash);
    row.debt = row.debt.plus(chargeOutstanding(total, paidOnCharge, charge.status));
  }

  let adjustmentTotal = new Decimal(0);
  for (const adjustment of adjustments) {
    if (!unitIds.has(adjustment.unitId)) continue;
    const amount = new Decimal(adjustment.amount.toString());
    adjustmentTotal = adjustmentTotal.plus(amount);
    const row = ensure(adjustment.unitId);
    row.adjustments = row.adjustments.plus(amount);
    row.debt = row.debt.plus(amount);
  }

  const spentByFund = emptyFundTotals();
  let cashOut = new Decimal(0);
  let commonSpent = new Decimal(0);
  for (const expense of expenses) {
    const amount = new Decimal(expense.amount.toString());
    cashOut = cashOut.plus(amount);
    if (expense.fund in spentByFund) {
      spentByFund[expense.fund] = spentByFund[expense.fund].plus(amount);
    }
    const unitId = expense.ticket?.unitId;
    if (unitId && unitIds.has(unitId)) {
      ensure(unitId).spent = ensure(unitId).spent.plus(amount);
    } else {
      commonSpent = commonSpent.plus(amount);
    }
  }

  let commonWorks = 0;
  for (const ticket of tickets) {
    if (!ticket.unitId || !unitIds.has(ticket.unitId)) {
      commonWorks += 1;
      continue;
    }
    const row = ensure(ticket.unitId);
    row.worksTotal += 1;
    if (OPEN_TICKET.includes(ticket.status)) row.worksOpen += 1;
  }

  const inflowByFund = kindsToFunds(kindIn);
  const funds: FundPictureRow[] = EXPENSE_FUNDS.map((fund) => {
    const inflow = inflowByFund[fund];
    const spent = spentByFund[fund];
    return {
      fund,
      inflow: money(inflow),
      spent: money(spent),
      balance: money(inflow.minus(spent)),
    };
  });

  let debt = new Decimal(0);
  let credit = new Decimal(0);
  const rows: UnitFinanceRow[] = [];
  for (const unit of units) {
    const row = acc.get(unit.id);
    const hasActivity =
      row != null &&
      (row.billed.gt(0) ||
        row.paid.gt(0) ||
        !row.adjustments.eq(0) ||
        row.worksTotal > 0 ||
        row.spent.gt(0));
    if (unit.archivedAt && !hasActivity) continue;
    const debtValue = row?.debt ?? new Decimal(0);
    if (debtValue.gt(0)) debt = debt.plus(debtValue);
    if (debtValue.lt(0)) credit = credit.plus(debtValue.abs());
    rows.push({
      unitId: unit.id,
      code: unit.code,
      type: unit.type,
      archived: unit.archivedAt != null,
      owner: personName(unit.ownerships[0]?.person),
      billed: money(row?.billed ?? new Decimal(0)),
      paid: money(row?.paid ?? new Decimal(0)),
      adjustments: money(row?.adjustments ?? new Decimal(0)),
      debt: money(debtValue),
      worksTotal: row?.worksTotal ?? 0,
      worksOpen: row?.worksOpen ?? 0,
      spentOnUnit: money(row?.spent ?? new Decimal(0)),
    });
  }

  return {
    billed: money(billed),
    cashIn: money(cashIn),
    adjustments: money(adjustmentTotal),
    debt: money(debt),
    credit: money(credit),
    cashOut: money(cashOut),
    cashBalance: money(cashIn.minus(cashOut)),
    commonSpent: money(commonSpent),
    commonWorks,
    funds,
    units: rows,
  };
}

export async function loadUnitFinanceCard(input: {
  organizationId: string;
  buildingId: string;
  unitId: string;
}): Promise<UnitFinanceCard> {
  const unit = await prisma.managedUnit.findFirst({
    where: {
      id: input.unitId,
      organizationId: input.organizationId,
      buildingId: input.buildingId,
    },
    select: {
      id: true,
      code: true,
      type: true,
      floor: true,
      totalArea: true,
      participationShare: true,
      archivedAt: true,
      entrance: { select: { code: true } },
      ownerships: {
        where: { endedAt: null },
        orderBy: [{ isPrimary: "desc" }, { startedAt: "asc" }],
        take: 1,
        select: {
          person: {
            select: {
              legalName: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });
  if (!unit) throw DomainErrors.notFound("Posebni deo");

  const [charges, tickets, adjustmentRows] = await Promise.all([
    prisma.duesCharge.findMany({
      where: { organizationId: input.organizationId, unitId: unit.id },
      select: {
        id: true,
        periodYear: true,
        periodMonth: true,
        dueDate: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        reference: true,
        payments: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
            method: true,
            reference: true,
            reversed: true,
            notes: true,
          },
          orderBy: { paidAt: "desc" },
        },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    }),
    prisma.maintenanceTicket.findMany({
      where: { organizationId: input.organizationId, unitId: unit.id },
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        actualCost: true,
        supplier: { select: { name: true } },
        expenses: {
          select: {
            id: true,
            description: true,
            amount: true,
            fund: true,
            spentAt: true,
          },
          orderBy: { spentAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.duesAdjustment.findMany({
      where: { organizationId: input.organizationId, unitId: unit.id },
      select: { id: true, amount: true, reason: true, effectiveDate: true },
      orderBy: { effectiveDate: "desc" },
    }),
  ]);

  let billed = new Decimal(0);
  let paid = new Decimal(0);
  let debt = new Decimal(0);
  const chargeRows: UnitChargeRow[] = charges.map((charge) => {
    const total = new Decimal(charge.totalAmount.toString());
    const paidOnCharge = new Decimal(charge.paidAmount.toString());
    const cash = charge.payments
      .filter((payment) => !payment.reversed)
      .reduce((sum, payment) => sum.plus(new Decimal(payment.amount.toString())), new Decimal(0));
    const outstanding = chargeOutstanding(total, paidOnCharge, charge.status);
    billed = billed.plus(total);
    paid = paid.plus(cash);
    debt = debt.plus(outstanding);
    return {
      id: charge.id,
      periodYear: charge.periodYear,
      periodMonth: charge.periodMonth,
      dueDate: charge.dueDate,
      status: charge.status,
      totalAmount: money(total),
      paidAmount: money(paidOnCharge),
      outstanding: money(outstanding),
      reference: charge.reference,
      payments: charge.payments.map((payment) => ({
        id: payment.id,
        amount: new Decimal(payment.amount.toString()).toFixed(2),
        paidAt: payment.paidAt,
        method: payment.method,
        reference: payment.reference,
        reversed: payment.reversed,
        notes: payment.notes,
      })),
    };
  });

  let adjustments = new Decimal(0);
  for (const adjustment of adjustmentRows) {
    const amount = new Decimal(adjustment.amount.toString());
    adjustments = adjustments.plus(amount);
    debt = debt.plus(amount);
  }

  let spentOnUnit = new Decimal(0);
  const works: UnitWorkRow[] = tickets.map((ticket) => {
    for (const expense of ticket.expenses) {
      spentOnUnit = spentOnUnit.plus(new Decimal(expense.amount.toString()));
    }
    return {
      id: ticket.id,
      code: ticket.code,
      title: ticket.title,
      status: ticket.status,
      supplierName: ticket.supplier?.name ?? null,
      actualCost: ticket.actualCost ? new Decimal(ticket.actualCost.toString()).toFixed(2) : null,
      expenses: ticket.expenses.map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: new Decimal(expense.amount.toString()).toFixed(2),
        fund: expense.fund,
        spentAt: expense.spentAt,
      })),
    };
  });

  const owner = unit.ownerships[0]?.person ?? null;
  return {
    unitId: unit.id,
    code: unit.code,
    type: unit.type,
    floor: unit.floor,
    area: new Decimal(unit.totalArea.toString()).toFixed(2),
    share: new Decimal(unit.participationShare.toString()).toFixed(4),
    entranceCode: unit.entrance?.code ?? null,
    archived: unit.archivedAt != null,
    owner: personName(owner),
    ownerEmail: owner?.email ?? null,
    ownerPhone: owner?.phone ?? null,
    billed: money(billed),
    paid: money(paid),
    adjustments: money(adjustments),
    debt: money(debt),
    spentOnUnit: money(spentOnUnit),
    charges: chargeRows,
    works,
    adjustmentRows: adjustmentRows.map((row) => ({
      id: row.id,
      amount: new Decimal(row.amount.toString()).toFixed(2),
      reason: row.reason,
      effectiveDate: row.effectiveDate,
    })),
  };
}
