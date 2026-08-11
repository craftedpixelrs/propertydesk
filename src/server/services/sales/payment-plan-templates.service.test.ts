import { beforeEach, describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";

/**
 * Coverage for the template CRUD + apply + installment-append surface.
 *
 * Focus areas:
 *   - `assertItems` percentage-sum tolerance (must equal 100 within 0.001).
 *   - `resolveDueDates` returns nulls when the anchor is missing.
 *   - `applyTemplateToDraft` computes amounts from finalPrice and absorbs
 *     rounding into the last row.
 *   - `addInstallmentToExistingPlan` bumps sequenceNumber and reactivates
 *     a COMPLETED plan.
 */

const prismaMock = vi.hoisted(() => ({
  paymentPlanTemplate: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  paymentPlanTemplateItem: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  project: { findFirst: vi.fn() },
  sale: { findFirst: vi.fn() },
  paymentInstallment: {
    aggregate: vi.fn(),
    create: vi.fn(),
  },
  paymentPlan: {
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));

import {
  addInstallmentToExistingPlan,
  applyTemplateToDraft,
  createTemplate,
  resolveDueDates,
} from "./payment-plan-templates.service";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock),
  );
});

describe("resolveDueDates", () => {
  it("resolves CONTRACT anchor with positive offset", () => {
    const contract = new Date("2027-01-15T00:00:00Z");
    const out = resolveDueDates({
      items: [
        {
          sequenceNumber: 1,
          label: "Kapara",
          percentage: 10,
          dueDateAnchor: "CONTRACT",
          offsetDays: 30,
        },
      ],
      contractDate: contract,
    });
    expect(out[0]!.dueDate?.toISOString()).toBe("2027-02-14T00:00:00.000Z");
  });

  it("returns null when the anchor is not defined on the sale", () => {
    const out = resolveDueDates({
      items: [
        {
          sequenceNumber: 1,
          label: "Primopredaja",
          percentage: 90,
          dueDateAnchor: "HANDOVER",
          offsetDays: 0,
        },
      ],
      contractDate: new Date("2027-01-15T00:00:00Z"),
      plannedHandoverDate: null,
    });
    expect(out[0]!.dueDate).toBeNull();
  });

  it("CUSTOM_OFFSET anchors off today with the given offset", () => {
    const today = new Date("2027-05-10T00:00:00Z");
    const out = resolveDueDates({
      items: [
        {
          sequenceNumber: 1,
          label: "R1",
          percentage: 100,
          dueDateAnchor: "CUSTOM_OFFSET",
          offsetDays: 7,
        },
      ],
      today,
    });
    expect(out[0]!.dueDate?.toISOString()).toBe("2027-05-17T00:00:00.000Z");
  });
});

describe("createTemplate — assertItems", () => {
  it("rejects when percentages do not sum to 100", async () => {
    await expect(
      createTemplate({
        organizationId: "org",
        actorUserId: "user",
        name: "Bad",
        items: [
          {
            label: "A",
            percentage: 40,
            dueDateAnchor: "CONTRACT",
            offsetDays: 0,
          },
          {
            label: "B",
            percentage: 50,
            dueDateAnchor: "HANDOVER",
            offsetDays: 0,
          },
        ],
      }),
    ).rejects.toThrow(/100/);
  });

  it("accepts sums within the 0.001 tolerance", async () => {
    prismaMock.paymentPlanTemplate.create.mockResolvedValue({
      id: "tmpl-1",
      name: "OK",
      projectId: null,
      isDefault: false,
      items: [],
    });
    await createTemplate({
      organizationId: "org",
      actorUserId: "user",
      name: "OK",
      items: [
        {
          label: "A",
          percentage: "33.333",
          dueDateAnchor: "CONTRACT",
          offsetDays: 0,
        },
        {
          label: "B",
          percentage: "33.333",
          dueDateAnchor: "CONTRACT",
          offsetDays: 30,
        },
        {
          label: "C",
          percentage: "33.334",
          dueDateAnchor: "HANDOVER",
          offsetDays: 0,
        },
      ],
    });
    expect(prismaMock.paymentPlanTemplate.create).toHaveBeenCalledOnce();
  });

  it("rejects an empty items list", async () => {
    await expect(
      createTemplate({
        organizationId: "org",
        actorUserId: "user",
        name: "Empty",
        items: [],
      }),
    ).rejects.toThrow(/bar jednu/);
  });
});

describe("applyTemplateToDraft", () => {
  it("materialises rows and absorbs rounding into the last row", async () => {
    prismaMock.paymentPlanTemplate.findFirst.mockResolvedValue({
      id: "tmpl-1",
      name: "10/40/50",
      organizationId: "org",
      items: [
        {
          sequenceNumber: 1,
          label: "Kapara",
          percentage: new Decimal("33.333"),
          dueDateAnchor: "CONTRACT",
          offsetDays: 0,
        },
        {
          sequenceNumber: 2,
          label: "Sredina",
          percentage: new Decimal("33.333"),
          dueDateAnchor: "CONTRACT",
          offsetDays: 30,
        },
        {
          sequenceNumber: 3,
          label: "Ostatak",
          percentage: new Decimal("33.334"),
          dueDateAnchor: "HANDOVER",
          offsetDays: -10,
        },
      ],
    });
    prismaMock.sale.findFirst.mockResolvedValue({
      id: "sale-1",
      finalPrice: new Decimal("100000.00"),
      currency: "EUR",
      contractDate: new Date("2027-01-01T00:00:00Z"),
      plannedHandoverDate: new Date("2028-01-01T00:00:00Z"),
    });

    const draft = await applyTemplateToDraft({
      organizationId: "org",
      saleId: "sale-1",
      templateId: "tmpl-1",
    });

    const total = draft.rows
      .reduce<Decimal>((acc, r) => acc.plus(new Decimal(r.amount)), new Decimal(0))
      .toString();
    expect(total).toBe("100000");
    // 3 rows, all with resolved dates.
    expect(draft.rows).toHaveLength(3);
    expect(draft.rows.every((r) => r.dueDate !== null)).toBe(true);
  });

  it("passes null dueDate through when HANDOVER is missing on the sale", async () => {
    prismaMock.paymentPlanTemplate.findFirst.mockResolvedValue({
      id: "tmpl-1",
      name: "Test",
      organizationId: "org",
      items: [
        {
          sequenceNumber: 1,
          label: "Primopredaja",
          percentage: new Decimal("100"),
          dueDateAnchor: "HANDOVER",
          offsetDays: 0,
        },
      ],
    });
    prismaMock.sale.findFirst.mockResolvedValue({
      id: "sale-1",
      finalPrice: new Decimal("50000.00"),
      currency: "EUR",
      contractDate: null,
      plannedHandoverDate: null,
    });

    const draft = await applyTemplateToDraft({
      organizationId: "org",
      saleId: "sale-1",
      templateId: "tmpl-1",
    });
    expect(draft.rows[0]!.dueDate).toBeNull();
  });
});

describe("addInstallmentToExistingPlan", () => {
  it("bumps sequenceNumber and leaves an ACTIVE plan alone", async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: "sale-1",
      finalPrice: new Decimal("100000"),
      paymentPlan: { id: "plan-1", status: "ACTIVE" },
    });
    prismaMock.paymentInstallment.aggregate.mockResolvedValue({
      _max: { sequenceNumber: 3 },
    });
    prismaMock.paymentInstallment.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "inst-4",
        amount: new Decimal(String(data.amount)),
        dueDate: new Date(String(data.dueDate)),
        name: String(data.name),
        ...data,
      }),
    );

    await addInstallmentToExistingPlan({
      organizationId: "org",
      actorUserId: "u",
      saleId: "sale-1",
      label: "Vanredna",
      amount: "5000",
      dueDate: "2027-06-01",
    });

    const arg = prismaMock.paymentInstallment.create.mock.calls[0]![0] as {
      data: { sequenceNumber: number };
    };
    expect(arg.data.sequenceNumber).toBe(4);
    expect(prismaMock.paymentPlan.update).not.toHaveBeenCalled();
  });

  it("flips a COMPLETED plan back to ACTIVE when a new row is appended", async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: "sale-1",
      finalPrice: new Decimal("100000"),
      paymentPlan: { id: "plan-1", status: "COMPLETED" },
    });
    prismaMock.paymentInstallment.aggregate.mockResolvedValue({
      _max: { sequenceNumber: 5 },
    });
    prismaMock.paymentInstallment.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "inst-6",
        amount: new Decimal(String(data.amount)),
        dueDate: new Date(String(data.dueDate)),
        name: String(data.name),
        ...data,
      }),
    );

    await addInstallmentToExistingPlan({
      organizationId: "org",
      actorUserId: "u",
      saleId: "sale-1",
      label: "Naknadna",
      amount: "1000",
      dueDate: "2027-07-01",
    });

    expect(prismaMock.paymentPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: { status: "ACTIVE" },
    });
  });

  it("refuses to add to a CANCELED plan", async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: "sale-1",
      finalPrice: new Decimal("100000"),
      paymentPlan: { id: "plan-1", status: "CANCELED" },
    });
    await expect(
      addInstallmentToExistingPlan({
        organizationId: "org",
        actorUserId: "u",
        saleId: "sale-1",
        label: "Naknadna",
        amount: "1000",
        dueDate: "2027-07-01",
      }),
    ).rejects.toThrow(/otkazan plan/i);
  });

  it("refuses when the sale has no plan at all", async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: "sale-1",
      finalPrice: new Decimal("100000"),
      paymentPlan: null,
    });
    await expect(
      addInstallmentToExistingPlan({
        organizationId: "org",
        actorUserId: "u",
        saleId: "sale-1",
        label: "Naknadna",
        amount: "1000",
        dueDate: "2027-07-01",
      }),
    ).rejects.toThrow(/aktivan plan/i);
  });

  it("rejects a non-positive amount", async () => {
    await expect(
      addInstallmentToExistingPlan({
        organizationId: "org",
        actorUserId: "u",
        saleId: "sale-1",
        label: "Nula",
        amount: "0",
        dueDate: "2027-07-01",
      }),
    ).rejects.toThrow(/pozitivan/i);
  });
});
