import { beforeEach, describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";

/**
 * Payment-plan validation tests.
 *
 * We exercise the three plan templates (MANUAL / PERCENTAGE / EQUAL) through
 * `createPaymentPlan` with a mocked prisma. The focus is on
 *   - installment-total validation (Decimal tolerance),
 *   - percentage-sum enforcement,
 *   - rounding-remainder absorption on EQUAL/PERCENTAGE plans,
 *   - refusal to build a plan when one already exists.
 */

const prismaMock = vi.hoisted(() => ({
  sale: { findFirst: vi.fn() },
  paymentPlan: { create: vi.fn() },
  paymentInstallment: { createMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));

import { createPaymentPlan } from "./payment-plans.service";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn(prismaMock),
  );
  prismaMock.paymentPlan.create.mockImplementation(async ({ data }: { data: unknown }) => ({
    id: "plan-1",
    installments: [],
    ...(data as Record<string, unknown>),
  }));
  prismaMock.paymentInstallment.createMany.mockResolvedValue({ count: 0 });
});

function stubActiveSale(finalPrice: string, hasPlan = false) {
  prismaMock.sale.findFirst.mockResolvedValueOnce({
    id: "sale-1",
    status: "DRAFT",
    finalPrice: new Decimal(finalPrice),
    currency: "EUR",
    paymentPlan: hasPlan ? { id: "existing", status: "ACTIVE" } : null,
  });
}

describe("createPaymentPlan", () => {
  it("MANUAL: accepts installments whose sum equals the final price", async () => {
    stubActiveSale("100000.00");
    await createPaymentPlan({
      organizationId: "org",
      actorUserId: "user",
      saleId: "sale-1",
      planName: "Test",
      template: "MANUAL",
      manual: [
        { name: "R1", amount: "40000", dueDate: "2027-01-01" },
        { name: "R2", amount: "60000", dueDate: "2027-06-01" },
      ],
    });
    expect(prismaMock.paymentInstallment.createMany).toHaveBeenCalledOnce();
    const call = prismaMock.paymentInstallment.createMany.mock.calls[0]![0] as {
      data: Array<{ amount: string }>;
    };
    expect(call.data).toHaveLength(2);
    expect(call.data[0]!.amount).toBe("40000");
    expect(call.data[1]!.amount).toBe("60000");
  });

  it("MANUAL: rejects when the sum drifts beyond the 0.01 tolerance", async () => {
    stubActiveSale("100000.00");
    await expect(
      createPaymentPlan({
        organizationId: "org",
        actorUserId: "user",
        saleId: "sale-1",
        planName: "Test",
        template: "MANUAL",
        manual: [
          { name: "R1", amount: "40000", dueDate: "2027-01-01" },
          { name: "R2", amount: "59999", dueDate: "2027-06-01" },
        ],
      }),
    ).rejects.toThrow(/ne odgovara ceni prodaje/i);
  });

  it("PERCENTAGE: requires 100% total and absorbs rounding into the last row", async () => {
    stubActiveSale("100000.00");
    await createPaymentPlan({
      organizationId: "org",
      actorUserId: "user",
      saleId: "sale-1",
      planName: "Test",
      template: "PERCENTAGE",
      percentage: [
        { name: "A", percentage: "33.333", dueDate: "2027-01-01" },
        { name: "B", percentage: "33.333", dueDate: "2027-02-01" },
        { name: "C", percentage: "33.334", dueDate: "2027-03-01" },
      ],
    });
    const call = prismaMock.paymentInstallment.createMany.mock.calls[0]![0] as {
      data: Array<{ amount: string }>;
    };
    const total = call.data
      .reduce((acc, r) => acc.plus(r.amount), new Decimal(0))
      .toString();
    expect(total).toBe("100000");
  });

  it("PERCENTAGE: rejects when the sum is not 100%", async () => {
    stubActiveSale("100000.00");
    await expect(
      createPaymentPlan({
        organizationId: "org",
        actorUserId: "user",
        saleId: "sale-1",
        planName: "Test",
        template: "PERCENTAGE",
        percentage: [{ name: "A", percentage: "80", dueDate: "2027-01-01" }],
      }),
    ).rejects.toThrow(/mora biti 100%/i);
  });

  it("EQUAL: distributes the final price evenly with cent-level exactness", async () => {
    stubActiveSale("100000.00");
    await createPaymentPlan({
      organizationId: "org",
      actorUserId: "user",
      saleId: "sale-1",
      planName: "Test",
      template: "EQUAL",
      equal: { installments: 3, firstDueDate: "2027-01-01" },
    });
    const call = prismaMock.paymentInstallment.createMany.mock.calls[0]![0] as {
      data: Array<{ amount: string }>;
    };
    const total = call.data
      .reduce((acc, r) => acc.plus(r.amount), new Decimal(0))
      .toString();
    expect(total).toBe("100000");
    expect(call.data).toHaveLength(3);
  });

  it("refuses to create a plan when the sale already has an active one", async () => {
    stubActiveSale("100000.00", true);
    await expect(
      createPaymentPlan({
        organizationId: "org",
        actorUserId: "user",
        saleId: "sale-1",
        planName: "Test",
        template: "EQUAL",
        equal: { installments: 3, firstDueDate: "2027-01-01" },
      }),
    ).rejects.toThrow(/aktivan plan plaćanja/i);
  });
});
