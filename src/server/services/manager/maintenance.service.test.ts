import { beforeEach, describe, expect, it, vi } from "vitest";

type AsyncFn = (...args: unknown[]) => Promise<unknown>;

const prismaMock = vi.hoisted(() => ({
  maintenanceTicket: {
    findFirst: vi.fn<AsyncFn>(),
  },
  maintenanceWorkEntry: {
    create: vi.fn<AsyncFn>(),
  },
  buildingPerson: {
    findUnique: vi.fn<AsyncFn>(),
  },
}));

const emailMock = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

const auditMock = vi.hoisted(() => ({
  recordAudit: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: auditMock.recordAudit }));
vi.mock("@/server/auth/email", () => ({ sendEmail: emailMock.sendEmail }));
vi.mock("@/server/http/app-origin", () => ({ appOrigin: () => "https://example.test" }));
vi.mock("@/server/services/manager/buildings.service", () => ({
  assertBuildingBelongsToOrg: vi.fn(),
}));
vi.mock("@/server/services/manager/members", () => ({
  listOrgMembersWithPermission: vi.fn(),
}));
vi.mock("@/server/services/notifications.service", () => ({
  notify: vi.fn(),
  notifyMany: vi.fn(),
}));

import { addMaintenanceWorkEntry } from "./maintenance.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addMaintenanceWorkEntry", () => {
  it("rejects a note that is too short", async () => {
    await expect(
      addMaintenanceWorkEntry({
        organizationId: "org-1",
        actorUserId: "user-1",
        ticketId: "t-1",
        body: "  ok ",
      }),
    ).rejects.toThrow(/nekoliko reči/);
    expect(prismaMock.maintenanceTicket.findFirst).not.toHaveBeenCalled();
  });

  it("throws when the ticket is missing", async () => {
    prismaMock.maintenanceTicket.findFirst.mockResolvedValue(null);
    await expect(
      addMaintenanceWorkEntry({
        organizationId: "org-1",
        actorUserId: "user-1",
        ticketId: "missing",
        body: "Zamenjen ventil u kuhinji.",
      }),
    ).rejects.toThrow(/Kvar/);
  });

  it("stores an internal note without emailing the resident", async () => {
    prismaMock.maintenanceTicket.findFirst.mockResolvedValue({
      id: "t-1",
      code: "BLD-00001",
      title: "Curenje",
      reportedByPersonId: "person-1",
      building: { name: "Zgrada A" },
    });
    prismaMock.maintenanceWorkEntry.create.mockResolvedValue({ id: "e-1" });

    const entry = await addMaintenanceWorkEntry({
      organizationId: "org-1",
      actorUserId: "user-1",
      ticketId: "t-1",
      body: "Čeka se deo od dobavljača.",
      visibleToResident: false,
    });

    expect(entry.id).toBe("e-1");
    expect(prismaMock.maintenanceWorkEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        visibleToResident: false,
        createdByUserId: "user-1",
        body: "Čeka se deo od dobavljača.",
      }),
    });
    expect(auditMock.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "manager.ticket_work_logged" }),
    );
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });

  it("emails the reporter when the entry is visible", async () => {
    prismaMock.maintenanceTicket.findFirst.mockResolvedValue({
      id: "t-1",
      code: "BLD-00001",
      title: "Curenje",
      reportedByPersonId: "person-1",
      building: { name: "Zgrada A" },
    });
    prismaMock.maintenanceWorkEntry.create.mockResolvedValue({ id: "e-2" });
    prismaMock.buildingPerson.findUnique.mockResolvedValue({
      email: "stanar@example.test",
      firstName: "Ana",
    });

    await addMaintenanceWorkEntry({
      organizationId: "org-1",
      actorUserId: "user-1",
      ticketId: "t-1",
      body: "Ventil zamenjen, provera pritiska urađena.",
    });

    expect(emailMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "stanar@example.test",
        text: expect.stringContaining("/stanar/kvarovi/t-1"),
      }),
    );
  });
});
