import { beforeEach, describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";

/**
 * Commission-snapshot tests.
 *
 * Invariants under test:
 *   - Non-agency sales do NOT get a commission row.
 *   - When one already exists, snapshotting is a no-op (immutability).
 *   - The resolved rule's rate and fixedAmount are copied verbatim into the
 *     Commission row so future rule edits cannot alter historical numbers.
 */

const prismaMock = vi.hoisted(() => ({
  sale: { findFirst: vi.fn() },
  commission: { findUnique: vi.fn(), create: vi.fn() },
  agencyConnection: { findFirst: vi.fn() },
  agencyCommissionRule: { findMany: vi.fn() },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));

import { snapshotCommissionForSale } from "./snapshot";

beforeEach(() => {
  vi.clearAllMocks();
});

function stubSale(overrides: Partial<Record<string, unknown>> = {}) {
  prismaMock.sale.findFirst.mockResolvedValue({
    id: "sale-1",
    organizationId: "inv-1",
    projectId: "proj-1",
    unitId: "unit-1",
    status: "CONTRACTED",
    finalPrice: new Decimal("100000"),
    currency: "EUR",
    agencyOrganizationId: "agency-1",
    agencyAgentUserId: "agent-1",
    ...overrides,
  });
}

describe("snapshotCommissionForSale", () => {
  it("returns null for a non-agency sale (no commission created)", async () => {
    stubSale({ agencyOrganizationId: null });
    const result = await snapshotCommissionForSale({
      organizationId: "inv-1",
      actorUserId: "user",
      saleId: "sale-1",
    });
    expect(result).toBeNull();
    expect(prismaMock.commission.create).not.toHaveBeenCalled();
  });

  it("is idempotent — never overwrites an existing commission row", async () => {
    stubSale();
    prismaMock.commission.findUnique.mockResolvedValue({
      id: "existing",
      calculatedAmount: new Decimal("999"),
    });
    const result = await snapshotCommissionForSale({
      organizationId: "inv-1",
      actorUserId: "user",
      saleId: "sale-1",
    });
    expect(result?.id).toBe("existing");
    expect(prismaMock.commission.create).not.toHaveBeenCalled();
    expect(prismaMock.agencyCommissionRule.findMany).not.toHaveBeenCalled();
  });

  it("snapshots percentage rules verbatim so later edits cannot alter it", async () => {
    stubSale();
    prismaMock.commission.findUnique.mockResolvedValue(null);
    prismaMock.agencyConnection.findFirst.mockResolvedValue({ id: "conn-1" });
    prismaMock.agencyCommissionRule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        agencyConnectionId: "conn-1",
        projectId: null,
        unitId: null,
        calculationType: "PERCENTAGE",
        rate: new Decimal("3"),
        fixedAmount: null,
        validFrom: null,
        validTo: null,
        createdAt: new Date("2026-01-01"),
        agencyVisibleNote: "3% osnovna",
      },
    ]);
    prismaMock.commission.create.mockImplementation(async ({ data }) => ({
      id: "com-new",
      ...(data as Record<string, unknown>),
    }));

    await snapshotCommissionForSale({
      organizationId: "inv-1",
      actorUserId: "user",
      saleId: "sale-1",
    });

    expect(prismaMock.commission.create).toHaveBeenCalledOnce();
    const call = prismaMock.commission.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    // 3% of 100000 = 3000 with two-decimal precision.
    expect(call.data.calculatedAmount).toBe("3000");
    expect(call.data.baseAmount).toBe("100000");
    expect(call.data.commissionRuleId).toBe("rule-1");
  });
});
