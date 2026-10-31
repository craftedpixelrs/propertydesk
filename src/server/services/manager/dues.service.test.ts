import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Faza 11 unit tests for dues service — write-off, bank-statement import
 * (model-97 matching) and reminders. Prisma + email + audit are mocked so
 * these tests run without a database.
 */

type AsyncFn = (...args: unknown[]) => Promise<unknown>;

const prismaMock = vi.hoisted(() => {
  const duesCharge = {
    findFirst: vi.fn<AsyncFn>(),
    update: vi.fn<AsyncFn>(),
    findMany: vi.fn<AsyncFn>(),
  };
  const duesPayment = {
    findFirst: vi.fn<AsyncFn>(),
    create: vi.fn<AsyncFn>(),
    update: vi.fn<AsyncFn>(),
  };
  const duesReminderLog = {
    findMany: vi.fn<AsyncFn>(),
    create: vi.fn<AsyncFn>(),
  };
  const duesAdjustment = {
    groupBy: vi.fn<AsyncFn>(),
    create: vi.fn<AsyncFn>(),
  };
  const managedUnit = {
    findMany: vi.fn<AsyncFn>(),
    findFirst: vi.fn<AsyncFn>(),
  };
  return {
    duesCharge,
    duesPayment,
    duesReminderLog,
    duesAdjustment,
    managedUnit,
    $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({ duesCharge, duesPayment, duesReminderLog }),
    ),
  };
});

const emailMock = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

const auditMock = vi.hoisted(() => ({
  recordAudit: vi.fn(),
}));

const assertBuildingBelongsToOrgMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: auditMock.recordAudit }));
vi.mock("@/server/auth/email", () => ({ sendEmail: emailMock.sendEmail }));
vi.mock("@/server/http/app-origin", () => ({ appOrigin: () => "https://example.test" }));
vi.mock("@/server/services/manager/buildings.service", () => ({
  assertBuildingBelongsToOrg: assertBuildingBelongsToOrgMock,
}));

import {
  createDuesAdjustment,
  importDuesBankStatement,
  listDebtors,
  sendDuesReminders,
  writeOffDuesCharge,
} from "./dues.service";

beforeEach(() => {
  vi.clearAllMocks();
  assertBuildingBelongsToOrgMock.mockResolvedValue(undefined);
  prismaMock.duesPayment.findFirst.mockResolvedValue(null);
  prismaMock.duesPayment.create.mockResolvedValue({
    id: "pay-new",
    amount: "0.00",
  });
  prismaMock.duesCharge.update.mockResolvedValue({
    id: "ch-upd",
    status: "PAID",
  });
  prismaMock.duesCharge.findMany.mockResolvedValue([]);
  prismaMock.duesReminderLog.findMany.mockResolvedValue([]);
  prismaMock.duesReminderLog.create.mockResolvedValue({ id: "log-1" });
  prismaMock.duesAdjustment.groupBy.mockResolvedValue([]);
  prismaMock.managedUnit.findMany.mockResolvedValue([]);
});

describe("writeOffDuesCharge", () => {
  it("marks an open charge as WRITTEN_OFF and records audit", async () => {
    prismaMock.duesCharge.findFirst.mockResolvedValueOnce({
      id: "ch-1",
      organizationId: "org-1",
      status: "OPEN",
    });
    prismaMock.duesCharge.update.mockResolvedValueOnce({
      id: "ch-1",
      status: "WRITTEN_OFF",
    });

    const out = await writeOffDuesCharge({
      organizationId: "org-1",
      actorUserId: "user-1",
      chargeId: "ch-1",
      reason: "Nenaplativo – vlasnik nedostupan",
    });

    expect(out.status).toBe("WRITTEN_OFF");
    expect(prismaMock.duesCharge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ch-1" },
        data: expect.objectContaining({ status: "WRITTEN_OFF" }),
      }),
    );
    expect(auditMock.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "manager.dues_charge_written_off",
        entityType: "DuesCharge",
        entityId: "ch-1",
        metadata: { reason: "Nenaplativo – vlasnik nedostupan" },
      }),
    );
  });

  it("refuses to write off a charge that is already written off", async () => {
    prismaMock.duesCharge.findFirst.mockResolvedValueOnce({
      id: "ch-1",
      organizationId: "org-1",
      status: "WRITTEN_OFF",
    });
    await expect(
      writeOffDuesCharge({
        organizationId: "org-1",
        actorUserId: "user-1",
        chargeId: "ch-1",
        reason: "Već otpisano",
      }),
    ).rejects.toThrow();
    expect(prismaMock.duesCharge.update).not.toHaveBeenCalled();
  });

  it("requires a non-empty reason", async () => {
    prismaMock.duesCharge.findFirst.mockResolvedValueOnce({
      id: "ch-1",
      organizationId: "org-1",
      status: "OPEN",
    });
    await expect(
      writeOffDuesCharge({
        organizationId: "org-1",
        actorUserId: "user-1",
        chargeId: "ch-1",
        reason: "   ",
      }),
    ).rejects.toThrow();
  });

  it("rejects an unknown charge id", async () => {
    prismaMock.duesCharge.findFirst.mockResolvedValueOnce(null);
    await expect(
      writeOffDuesCharge({
        organizationId: "org-1",
        actorUserId: "user-1",
        chargeId: "nope",
        reason: "x",
      }),
    ).rejects.toThrow();
  });
});

describe("importDuesBankStatement", () => {
  it("matches a payment by trailing 12 digits of the reference", async () => {
    // 1st findFirst = statement match in importDuesBankStatement
    // 2nd findFirst = recordDuesPayment re-fetching the charge
    const charge = {
      id: "charge-A",
      organizationId: "org-1",
      reference: "123456789012",
      status: "OPEN",
      currency: "RSD",
      totalAmount: "1500.00",
      paidAmount: "0.00",
    };
    prismaMock.duesCharge.findFirst.mockResolvedValueOnce(charge).mockResolvedValueOnce(charge);
    prismaMock.duesPayment.create.mockResolvedValueOnce({
      id: "pay-1",
      amount: "1500.00",
    });

    const result = await importDuesBankStatement({
      organizationId: "org-1",
      actorUserId: "user-1",
      rows: [
        {
          transactionDate: new Date("2026-07-01"),
          amount: "1500.00",
          reference: "97 80-123456789012",
          externalId: "tx-1",
        },
      ],
    });

    expect(result.matched).toBe(1);
    expect(result.unmatched).toBe(0);
    expect(result.duplicates).toBe(0);
    expect(result.totalRows).toBe(1);
    expect(result.details[0]).toEqual(
      expect.objectContaining({
        status: "matched",
        reference: "123456789012",
        chargeId: "charge-A",
      }),
    );
    expect(prismaMock.duesPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          chargeId: "charge-A",
          amount: "1500.00",
          method: "BANK_TRANSFER",
          reference: "123456789012",
          bankTransactionId: "tx-1",
        }),
      }),
    );
  });

  it("marks a row as unmatched when the reference has fewer than 12 digits", async () => {
    const result = await importDuesBankStatement({
      organizationId: "org-1",
      actorUserId: "user-1",
      rows: [
        {
          transactionDate: new Date("2026-07-01"),
          amount: "900.00",
          reference: "97 00-123",
        },
      ],
    });
    expect(result.matched).toBe(0);
    expect(result.unmatched).toBe(1);
    expect(result.details[0]?.status).toBe("unmatched");
    expect(prismaMock.duesPayment.create).not.toHaveBeenCalled();
  });

  it("marks a row as unmatched when no open charge exists for the compact reference", async () => {
    prismaMock.duesCharge.findFirst.mockResolvedValueOnce(null);
    const result = await importDuesBankStatement({
      organizationId: "org-1",
      actorUserId: "user-1",
      rows: [
        {
          transactionDate: new Date("2026-07-01"),
          amount: "1000",
          reference: "97 00-999999999999",
        },
      ],
    });
    expect(result.matched).toBe(0);
    expect(result.unmatched).toBe(1);
    expect(prismaMock.duesPayment.create).not.toHaveBeenCalled();
  });

  it("detects duplicates by externalId and skips them", async () => {
    prismaMock.duesPayment.findFirst.mockResolvedValueOnce({
      id: "pay-existing",
      chargeId: "charge-A",
    });
    const result = await importDuesBankStatement({
      organizationId: "org-1",
      actorUserId: "user-1",
      rows: [
        {
          transactionDate: new Date("2026-07-01"),
          amount: "1500.00",
          reference: "97 80-123456789012",
          externalId: "tx-dup",
        },
      ],
    });
    expect(result.matched).toBe(0);
    expect(result.duplicates).toBe(1);
    expect(result.details[0]?.status).toBe("duplicate");
    expect(prismaMock.duesPayment.create).not.toHaveBeenCalled();
  });

  it("rejects non-positive amounts", async () => {
    const result = await importDuesBankStatement({
      organizationId: "org-1",
      actorUserId: "user-1",
      rows: [
        {
          transactionDate: new Date("2026-07-01"),
          amount: "0.00",
          reference: "97 00-123456789012",
        },
      ],
    });
    expect(result.unmatched).toBe(1);
    expect(result.details[0]?.reason).toMatch(/pozitivan/i);
  });

  it("records an audit entry with the summary", async () => {
    const charge = {
      id: "charge-A",
      organizationId: "org-1",
      reference: "123456789012",
      status: "PARTIALLY_PAID",
      currency: "RSD",
      totalAmount: "500.00",
      paidAmount: "0.00",
    };
    prismaMock.duesCharge.findFirst.mockResolvedValueOnce(charge).mockResolvedValueOnce(charge);
    prismaMock.duesPayment.create.mockResolvedValueOnce({
      id: "pay-2",
      amount: "500.00",
    });
    await importDuesBankStatement({
      organizationId: "org-1",
      actorUserId: "user-1",
      buildingId: "b-1",
      rows: [
        {
          transactionDate: new Date("2026-07-01"),
          amount: "500.00",
          reference: "123456789012",
        },
      ],
    });
    expect(auditMock.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "manager.dues_bank_statement_imported",
        entityType: "ManagedBuilding",
        entityId: "b-1",
      }),
    );
  });
});

/**
 * sendDuesReminders uses listDebtors internally, which runs its own
 * prisma query and aggregates charges by unit. We seed `duesCharge.findMany`
 * so the real aggregation produces the debtors our scenario expects.
 */
describe("sendDuesReminders", () => {
  function debtor(unitId: string, email: string | null, totalAmount: string, paidAmount: string) {
    return {
      unitId,
      buildingId: "b-1",
      dueDate: new Date("2026-05-10"),
      totalAmount,
      paidAmount,
      unit: {
        id: unitId,
        code: `Stan ${unitId}`,
        ownerships: [
          {
            person: {
              firstName: null,
              lastName: null,
              legalName: null,
              email,
              phone: null,
            },
          },
        ],
      },
      building: { id: "b-1", name: "Zgrada A" },
    };
  }

  it("sends one email per unique debtor email", async () => {
    prismaMock.duesCharge.findMany.mockResolvedValueOnce([
      debtor("u-1", "ana@example.test", "4200.00", "0.00"),
      debtor("u-2", "ana@example.test", "1200.00", "0.00"),
      debtor("u-3", "petar@example.test", "900.00", "0.00"),
    ]);
    emailMock.sendEmail.mockResolvedValue(undefined);

    const result = await sendDuesReminders({
      organizationId: "org-1",
      actorUserId: "user-1",
    });

    expect(result.totalDebtors).toBe(3);
    expect(result.sent).toBe(2);
    expect(result.skipped).toBe(1);
    expect(emailMock.sendEmail).toHaveBeenCalledTimes(2);
  });

  it("skips rows without a valid email", async () => {
    prismaMock.duesCharge.findMany.mockResolvedValueOnce([
      debtor("u-1", null, "100.00", "0.00"),
      debtor("u-2", "not-an-email", "100.00", "0.00"),
    ]);
    const result = await sendDuesReminders({
      organizationId: "org-1",
      actorUserId: "user-1",
    });
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(2);
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });

  it("counts an email failure as skipped and keeps going", async () => {
    prismaMock.duesCharge.findMany.mockResolvedValueOnce([
      debtor("u-1", "fails@example.test", "100.00", "0.00"),
      debtor("u-2", "works@example.test", "250.00", "0.00"),
    ]);
    emailMock.sendEmail
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockResolvedValueOnce(undefined);
    const result = await sendDuesReminders({
      organizationId: "org-1",
      actorUserId: "user-1",
    });
    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it("records an audit entry with the counts", async () => {
    prismaMock.duesCharge.findMany.mockResolvedValueOnce([]);
    await sendDuesReminders({
      organizationId: "org-1",
      actorUserId: "user-1",
      buildingId: "b-1",
    });
    expect(auditMock.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "manager.dues_reminders_sent",
        entityId: "b-1",
      }),
    );
  });

  it("writes a DuesReminderLog row for every email actually sent", async () => {
    prismaMock.duesCharge.findMany.mockResolvedValueOnce([
      debtor("u-1", "a@example.test", "500.00", "0.00"),
      debtor("u-2", "b@example.test", "750.00", "0.00"),
    ]);
    emailMock.sendEmail.mockResolvedValue(undefined);
    await sendDuesReminders({ organizationId: "org-1", actorUserId: "user-1" });
    expect(prismaMock.duesReminderLog.create).toHaveBeenCalledTimes(2);
    const firstCall = prismaMock.duesReminderLog.create.mock.calls[0]?.[0] as {
      data: { unitId: string; recipientEmail: string; outstanding: string };
    };
    // listDebtors sorts by outstanding DESC, so u-2 (750) is logged first.
    expect(firstCall.data).toMatchObject({
      unitId: "u-2",
      recipientEmail: "b@example.test",
      outstanding: "750.00",
    });
  });

  it("skips a unit that was reminded within the cooldown window", async () => {
    prismaMock.duesCharge.findMany.mockResolvedValueOnce([
      debtor("u-1", "ana@example.test", "500.00", "0.00"),
      debtor("u-2", "petar@example.test", "900.00", "0.00"),
    ]);
    // u-1 was reminded a day ago → inside the default 7-day cooldown.
    prismaMock.duesReminderLog.findMany.mockResolvedValueOnce([
      { unitId: "u-1", sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    ]);
    emailMock.sendEmail.mockResolvedValue(undefined);
    const result = await sendDuesReminders({
      organizationId: "org-1",
      actorUserId: "user-1",
    });
    expect(result.dedupedSkipped).toBe(1);
    expect(result.sent).toBe(1);
    // Only u-2 should get an email + log.
    expect(emailMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(prismaMock.duesReminderLog.create).toHaveBeenCalledTimes(1);
  });

  it("cooldownDays=0 disables the dedupe guard", async () => {
    prismaMock.duesCharge.findMany.mockResolvedValueOnce([
      debtor("u-1", "ana@example.test", "500.00", "0.00"),
    ]);
    prismaMock.duesReminderLog.findMany.mockResolvedValue([{ unitId: "u-1", sentAt: new Date() }]);
    emailMock.sendEmail.mockResolvedValue(undefined);
    const result = await sendDuesReminders({
      organizationId: "org-1",
      actorUserId: "user-1",
      cooldownDays: 0,
    });
    expect(result.dedupedSkipped).toBe(0);
    expect(result.sent).toBe(1);
    // With cooldown=0 we skip the pre-fetch entirely.
    expect(prismaMock.duesReminderLog.findMany).not.toHaveBeenCalled();
  });
});

describe("listDebtors adjustments", () => {
  it("adds a positive adjustment on top of open charges", async () => {
    prismaMock.duesCharge.findMany.mockResolvedValueOnce([
      {
        unitId: "u-1",
        buildingId: "b-1",
        dueDate: new Date("2026-05-10"),
        totalAmount: "100.00",
        paidAmount: "0.00",
        unit: {
          id: "u-1",
          code: "Stan 1",
          ownerships: [
            {
              person: {
                firstName: "Ana",
                lastName: "Anić",
                legalName: null,
                email: "ana@example.test",
                phone: null,
              },
            },
          ],
        },
        building: { id: "b-1", name: "Zgrada" },
      },
    ]);
    prismaMock.duesAdjustment.groupBy.mockResolvedValueOnce([
      { unitId: "u-1", _sum: { amount: { toString: () => "25.50" } } },
    ]);

    const rows = await listDebtors({ organizationId: "org-1" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.outstanding).toBe("125.50");
  });

  it("drops a debtor whose credit wipes the open balance", async () => {
    prismaMock.duesCharge.findMany.mockResolvedValueOnce([
      {
        unitId: "u-1",
        buildingId: "b-1",
        dueDate: new Date("2026-05-10"),
        totalAmount: "100.00",
        paidAmount: "40.00",
        unit: {
          id: "u-1",
          code: "Stan 1",
          ownerships: [],
        },
        building: { id: "b-1", name: "Zgrada" },
      },
    ]);
    prismaMock.duesAdjustment.groupBy.mockResolvedValueOnce([
      { unitId: "u-1", _sum: { amount: { toString: () => "-60.00" } } },
    ]);

    const rows = await listDebtors({ organizationId: "org-1" });
    expect(rows).toHaveLength(0);
  });
});

describe("createDuesAdjustment", () => {
  it("rejects a zero amount and records a non-zero correction", async () => {
    await expect(
      createDuesAdjustment({
        organizationId: "org-1",
        actorUserId: "user-1",
        unitId: "u-1",
        amount: "0",
        reason: "Prazno",
      }),
    ).rejects.toThrow(/nula/);

    prismaMock.managedUnit.findFirst.mockResolvedValueOnce({
      id: "u-1",
      buildingId: "b-1",
      code: "Stan 1",
    });
    prismaMock.duesAdjustment.create.mockResolvedValueOnce({ id: "adj-1" });

    const row = await createDuesAdjustment({
      organizationId: "org-1",
      actorUserId: "user-1",
      unitId: "u-1",
      amount: "-15.5",
      reason: "Avans iz prethodne godine",
    });
    expect(row.id).toBe("adj-1");
    expect(prismaMock.duesAdjustment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unitId: "u-1",
          amount: "-15.50",
          reason: "Avans iz prethodne godine",
        }),
      }),
    );
    expect(auditMock.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "manager.dues_adjustment_created", entityId: "adj-1" }),
    );
  });
});
