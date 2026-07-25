import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

/**
 * ReservationService tests focus on the two correctness guarantees that are
 * easy to get wrong:
 *   1. Only ONE active reservation can exist per unit — both via the
 *      application guard and via the Postgres partial unique index (P2002).
 *   2. Expiry is idempotent — re-running the batch never double-processes.
 */

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  unit: { findFirst: vi.fn() },
  reservation: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  reservationStatusHistory: { create: vi.fn() },
  buyer: { findFirst: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  reservation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/services/units.service", () => ({ changeUnitStatus: vi.fn() }));
vi.mock("@/server/services/activities.service", () => ({ recordActivity: vi.fn() }));
vi.mock("@/server/services/notifications.service", () => ({ notify: vi.fn() }));

import {
  createReservation,
  expireDueReservations,
} from "./reservations.service";

beforeEach(() => {
  vi.clearAllMocks();
  // By default $transaction runs its callback against the shared tx mock.
  prismaMock.$transaction.mockImplementation(async (cb: (t: typeof tx) => unknown) => cb(tx));
  tx.$queryRaw.mockResolvedValue([]);
  tx.unit.findFirst.mockResolvedValue({
    id: "unit-1",
    status: "AVAILABLE",
    code: "A1",
    projectId: "proj-1",
    archivedAt: null,
  });
  tx.reservation.findFirst.mockResolvedValue(null);
  tx.buyer.findFirst.mockResolvedValue({ id: "buyer-1" });
  tx.reservation.create.mockResolvedValue({
    id: "res-1",
    unitId: "unit-1",
    buyerId: "buyer-1",
    sourceType: "INTERNAL",
  });
  tx.reservationStatusHistory.create.mockResolvedValue({});
  prismaMock.reservation.findUnique.mockResolvedValue(null);
});

const baseInput = {
  organizationId: "org-1",
  actorUserId: "user-1",
  unitId: "unit-1",
  buyerId: "buyer-1",
};

describe("createReservation — single active reservation invariant", () => {
  it("rejects when an active reservation already exists (app guard)", async () => {
    tx.reservation.findFirst.mockResolvedValue({ id: "existing" });
    await expect(createReservation(baseInput)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(tx.reservation.create).not.toHaveBeenCalled();
  });

  it("maps a Postgres unique violation (P2002) to a conflict", async () => {
    // Simulates the DB-level race: two parallel requests both pass the app
    // guard, but the partial unique index rejects the second INSERT.
    tx.reservation.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    await expect(createReservation(baseInput)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("refuses to reserve a unit that is not available", async () => {
    tx.unit.findFirst.mockResolvedValue({
      id: "unit-1",
      status: "SOLD",
      code: "A1",
      projectId: "proj-1",
      archivedAt: null,
    });
    await expect(createReservation(baseInput)).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });

  it("creates the reservation on the happy path", async () => {
    const created = await createReservation(baseInput);
    expect(created.id).toBe("res-1");
    expect(tx.reservation.create).toHaveBeenCalledTimes(1);
    expect(tx.reservationStatusHistory.create).toHaveBeenCalledTimes(1);
  });
});

describe("expireDueReservations — idempotency", () => {
  it("is a no-op when nothing is due", async () => {
    prismaMock.reservation.findMany.mockResolvedValue([]);
    const result = await expireDueReservations(new Date());
    expect(result).toEqual({ processed: 0, errors: 0 });
  });

  it("expires a due reservation exactly once", async () => {
    prismaMock.reservation.findMany.mockResolvedValue([
      { id: "res-1", organizationId: "org-1" },
    ]);
    // Owner lookup for actor attribution.
    prismaMock.reservation.findFirst.mockResolvedValue({
      assignedUserId: "user-1",
      createdByUserId: "user-1",
    });
    // Inside the transition transaction: reservation is APPROVED → EXPIRED.
    tx.reservation.findFirst.mockResolvedValue({
      id: "res-1",
      status: "APPROVED",
      version: 3,
      unitId: "unit-1",
    });
    tx.reservation.update.mockResolvedValue({});

    const result = await expireDueReservations(new Date());
    expect(result.processed).toBe(1);
    expect(result.errors).toBe(0);
    expect(tx.reservation.update).toHaveBeenCalledTimes(1);
  });

  it("does not re-process a reservation already EXPIRED (idempotent)", async () => {
    prismaMock.reservation.findMany.mockResolvedValue([
      { id: "res-1", organizationId: "org-1" },
    ]);
    prismaMock.reservation.findFirst.mockResolvedValue({
      assignedUserId: "user-1",
      createdByUserId: "user-1",
    });
    tx.reservation.findFirst.mockResolvedValue({
      id: "res-1",
      status: "EXPIRED",
      version: 4,
      unitId: "unit-1",
    });

    const result = await expireDueReservations(new Date());
    expect(result.processed).toBe(0);
    expect(tx.reservation.update).not.toHaveBeenCalled();
  });
});
