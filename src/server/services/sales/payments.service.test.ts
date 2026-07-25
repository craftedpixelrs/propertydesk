import { beforeEach, describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";

/**
 * Payment service tests.
 *
 * The service invariants exercised here:
 *   - No overpayment past sale.finalPrice.
 *   - No overpayment past a single installment.
 *   - Reversal never deletes; it flips flags and re-runs propagation.
 *   - Reversal requires a reason.
 */

const prismaMock = vi.hoisted(() => ({
  sale: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  payment: {
    aggregate: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  paymentInstallment: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  paymentPlan: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  saleStatusHistory: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/services/units.service", () => ({
  changeUnitStatus: vi.fn(),
}));

import { recordPayment, reversePayment } from "./payments.service";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn(prismaMock),
  );
  prismaMock.paymentInstallment.findMany.mockResolvedValue([]);
  prismaMock.paymentPlan.findUnique.mockResolvedValue({ id: "plan-1", status: "ACTIVE" });
});

function stubSale(finalPrice: string, status: string = "CONTRACTED") {
  prismaMock.sale.findFirst.mockResolvedValue({
    id: "sale-1",
    currency: "EUR",
    status,
    finalPrice: new Decimal(finalPrice),
    unitId: "unit-1",
  });
  prismaMock.sale.findUnique.mockResolvedValue({
    finalPrice: new Decimal(finalPrice),
  });
}

describe("recordPayment overpayment prevention", () => {
  it("blocks a payment that would exceed the sale's total price", async () => {
    stubSale("100000.00");
    prismaMock.payment.aggregate.mockResolvedValue({ _sum: { amount: new Decimal("100000") } });
    await expect(
      recordPayment({
        organizationId: "org",
        actorUserId: "user",
        saleId: "sale-1",
        amount: "1",
        paymentDate: new Date().toISOString(),
        paymentMethod: "BANK_TRANSFER",
      }),
    ).rejects.toThrow(/prekoračila ukupnu cenu prodaje/i);
  });

  it("blocks a payment that would exceed a target installment's amount", async () => {
    stubSale("100000.00");
    prismaMock.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: new Decimal("0") } });
    prismaMock.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: new Decimal("40000") } });
    prismaMock.paymentInstallment.findUnique.mockResolvedValueOnce({
      amount: new Decimal("50000"),
      paymentPlan: { saleId: "sale-1" },
    });
    await expect(
      recordPayment({
        organizationId: "org",
        actorUserId: "user",
        saleId: "sale-1",
        installmentId: "inst-1",
        amount: "15000",
        paymentDate: new Date().toISOString(),
        paymentMethod: "BANK_TRANSFER",
      }),
    ).rejects.toThrow(/prekoračila iznos rate/i);
  });

  it("rejects a non-positive amount without consulting the DB", async () => {
    await expect(
      recordPayment({
        organizationId: "org",
        actorUserId: "user",
        saleId: "sale-1",
        amount: "0",
        paymentDate: new Date().toISOString(),
        paymentMethod: "BANK_TRANSFER",
      }),
    ).rejects.toThrow(/veći od nule/i);
    expect(prismaMock.sale.findFirst).not.toHaveBeenCalled();
  });
});

describe("reversePayment integrity", () => {
  it("requires a reason", async () => {
    await expect(
      reversePayment({
        organizationId: "org",
        actorUserId: "user",
        paymentId: "p-1",
        reason: "  ",
      }),
    ).rejects.toThrow(/Razlog storniranja/i);
  });

  it("marks the payment reversed without deleting it and refuses double-reverse", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce({
      id: "p-1",
      saleId: "sale-1",
      installmentId: null,
      amount: new Decimal("1000"),
      reversedAt: null,
    });
    prismaMock.payment.update.mockResolvedValueOnce({
      id: "p-1",
      saleId: "sale-1",
      amount: new Decimal("1000"),
      reversedAt: new Date(),
    });
    prismaMock.sale.findFirst.mockResolvedValue({
      id: "sale-1",
      status: "PAID",
      finalPrice: new Decimal("1000"),
      unitId: "unit-1",
    });
    prismaMock.payment.aggregate.mockResolvedValue({ _sum: { amount: new Decimal("0") } });
    await reversePayment({
      organizationId: "org",
      actorUserId: "user",
      paymentId: "p-1",
      reason: "Duplo evidentirano",
    });
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reversedByUserId: "user",
          reversalReason: "Duplo evidentirano",
        }),
      }),
    );

    // Second call sees `reversedAt` set and must refuse.
    prismaMock.payment.findFirst.mockResolvedValueOnce({
      id: "p-1",
      saleId: "sale-1",
      installmentId: null,
      amount: new Decimal("1000"),
      reversedAt: new Date(),
    });
    await expect(
      reversePayment({
        organizationId: "org",
        actorUserId: "user",
        paymentId: "p-1",
        reason: "Ponovno",
      }),
    ).rejects.toThrow(/već stornirana/i);
  });
});
