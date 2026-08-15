import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Marketing leads service — pipeline invariants that the whole Property
 * Desk CRM depends on:
 *
 *   1. `createMarketingLead` refuses a duplicate email and embeds the
 *      existing lead's id in the CONFLICT message so the UI can offer a
 *      deep-link. The client-side `extractExistingLeadId` regex depends
 *      on this exact wording — do NOT change it lightly.
 *   2. `bulkUpdateMarketingLeads` skips (does not update) any id that the
 *      caller cannot see through their PD scope, reports it in
 *      `skipped`, and never writes to those rows.
 *   3. Bulk operations still require the underlying per-action permission
 *      (assign → pd_lead.reassign, stage/lost → pd_lead.update_stage).
 *
 * Everything is mocked at the prisma boundary; the service is otherwise
 * pure so this covers the important logic without touching the DB.
 */

const prismaMock = vi.hoisted(() => ({
  marketingLead: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  marketingLeadActivity: {
    create: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
}));

const permissionMock = vi.hoisted(() => ({
  hasPdPermission: vi.fn(),
  canViewMarketingLead: vi.fn(),
  canWriteLead: vi.fn(),
  buildMarketingLeadScopeFilter: vi.fn(),
}));

const platformMock = vi.hoisted(() => ({
  createOrganizationByPlatformAdmin: vi.fn(),
  createPlatformUser: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/permissions/property-desk", () => permissionMock);
vi.mock("@/server/services/property-desk/marketing-lead-activities.service", () => ({
  recordSystemActivity: vi.fn(),
}));
vi.mock("@/server/services/platform.service", () => platformMock);

import {
  createMarketingLead,
  bulkUpdateMarketingLeads,
  updateMarketingLead,
  convertMarketingLead,
  provisionMarketingLead,
} from "./marketing-leads.service";
import type { PropertyDeskAccessContext } from "@/server/permissions/property-desk";

const superAdminCtx: PropertyDeskAccessContext = {
  session: {
    user: { id: "sa-user", role: "SUPER_ADMIN" },
    session: { id: "sess-1" },
  } as never,
  isSuperAdmin: true,
  teamMember: null,
};

function memberCtx(overrides: Partial<{
  userId: string;
  teamRole: "SETTER" | "CLOSER" | "OPERATIONS" | "MANAGER";
}> = {}): PropertyDeskAccessContext {
  return {
    session: {
      user: { id: overrides.userId ?? "u1", role: "user" },
      session: { id: "sess-2" },
    } as never,
    isSuperAdmin: false,
    teamMember: {
      id: "tm-1",
      userId: overrides.userId ?? "u1",
      teamRole: overrides.teamRole ?? "SETTER",
      leadScope: "OWN",
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults: SUPER_ADMIN paths grant everything, tenant-scoped paths deny.
  permissionMock.hasPdPermission.mockResolvedValue(true);
  permissionMock.canViewMarketingLead.mockResolvedValue(true);
  permissionMock.canWriteLead.mockResolvedValue(true);
  permissionMock.buildMarketingLeadScopeFilter.mockResolvedValue({});
  prismaMock.marketingLead.create.mockImplementation(async ({ data }) => ({
    id: "new-lead-1",
    email: data.email,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    phone: data.phone ?? null,
    audience: data.audience ?? "OTHER",
    city: data.city ?? null,
    note: data.note ?? null,
    source: data.source ?? null,
    assignedToUserId: data.assignedToUserId ?? null,
    stage: data.stage ?? "NEW",
    level: data.level ?? "SOURCING",
    previousLevel: null,
    levelEnteredAt: new Date(),
    priority: data.priority ?? "NORMAL",
    temperature: data.temperature ?? "COLD",
    timelineHorizon: data.timelineHorizon ?? "UNDECIDED",
    budgetTier: data.budgetTier ?? "UNKNOWN",
    leadScore: data.leadScore ?? 0,
    lostReason: null,
    convertedOrganizationId: null,
    convertedAt: null,
    consent: false,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    referrer: null,
    landingPath: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  prismaMock.marketingLead.update.mockImplementation(async ({ where, data }) => ({
    id: where.id,
    stage: data.stage ?? "NEW",
    level: data.level ?? "SOURCING",
    previousLevel: data.previousLevel ?? null,
    levelEnteredAt: data.levelEnteredAt ?? new Date(),
    assignedToUserId:
      data.assignedTo?.connect?.id ??
      (data.assignedTo?.disconnect ? null : undefined),
    lostReason: data.lostReason ?? null,
    priority: data.priority ?? "NORMAL",
    temperature: data.temperature ?? "COLD",
    timelineHorizon: data.timelineHorizon ?? "UNDECIDED",
    leadScore: data.leadScore ?? 0,
  }));
});

// ---------------------------------------------------------------------------
// createMarketingLead — duplicate detection
// ---------------------------------------------------------------------------

describe("createMarketingLead — duplicate email", () => {
  it("throws CONFLICT with the existing id embedded when the email is already in the pipeline", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      id: "lead-existing-42",
      email: "ana@primer.rs",
    });

    let caught: { code: string; message: string } | null = null;
    try {
      await createMarketingLead(
        superAdminCtx,
        { email: "ana@primer.rs" },
        "sa-user",
      );
    } catch (err) {
      caught = err as { code: string; message: string };
    }

    expect(caught?.code).toBe("CONFLICT");
    // The client extracts the id via /\(id=([^)]+)\)/ — keep this contract.
    expect(caught?.message).toMatch(/\(id=lead-existing-42\)/);
    expect(prismaMock.marketingLead.create).not.toHaveBeenCalled();
  });

  it("normalizes email to lowercase before looking up duplicates", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce(null);

    await createMarketingLead(
      superAdminCtx,
      { email: "  Ana@Primer.RS  " },
      "sa-user",
    );

    expect(prismaMock.marketingLead.findUnique).toHaveBeenCalledWith({
      where: { email: "ana@primer.rs" },
    });
    expect(prismaMock.marketingLead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "ana@primer.rs" }),
      }),
    );
  });

  it("refuses to create when the caller lacks pd_lead.create", async () => {
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm !== "pd_lead.create";
    });

    await expect(
      createMarketingLead(memberCtx(), { email: "ana@primer.rs" }, "u1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(prismaMock.marketingLead.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.marketingLead.create).not.toHaveBeenCalled();
  });

  it("auto-assigns the creating team member when no assignee is specified", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce(null);

    await createMarketingLead(
      memberCtx({ userId: "member-9" }),
      { email: "novi@primer.rs" },
      "member-9",
    );

    expect(prismaMock.marketingLead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assignedToUserId: "member-9" }),
      }),
    );
  });

  it("requires pd_lead.reassign when the caller assigns to someone else", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce(null);
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm === "pd_lead.create"; // no reassign
    });

    await expect(
      createMarketingLead(
        memberCtx({ userId: "member-9" }),
        { email: "n@primer.rs", assignedToUserId: "member-42" },
        "member-9",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(prismaMock.marketingLead.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// bulkUpdateMarketingLeads — scope safety and permission gates
// ---------------------------------------------------------------------------

describe("bulkUpdateMarketingLeads — scope + permission gates", () => {
  it("skips ids that fall outside the caller's scope filter and updates the rest", async () => {
    // Caller asked to update 3 ids but their scope filter only exposes 2.
    prismaMock.marketingLead.findMany.mockResolvedValueOnce([
      { id: "l1", stage: "NEW", level: "SOURCING", previousLevel: null, levelEnteredAt: new Date(), assignedToUserId: null },
      { id: "l2", stage: "NEW", level: "SOURCING", previousLevel: null, levelEnteredAt: new Date(), assignedToUserId: null },
    ]);
    permissionMock.buildMarketingLeadScopeFilter.mockResolvedValueOnce({
      assignedToUserId: "u1",
    });

    const result = await bulkUpdateMarketingLeads(
      memberCtx({ teamRole: "MANAGER" }),
      {
        ids: ["l1", "l2", "l3-out-of-scope"],
        action: { kind: "stage", stage: "CONTACTED" },
      },
      "u1",
    );

    expect(result).toEqual({ updated: 2, skipped: 1 });
    // Only the visible ids reached the update() call.
    const updatedIds = prismaMock.marketingLead.update.mock.calls.map(
      ([arg]) => arg.where.id,
    );
    expect(updatedIds.sort()).toEqual(["l1", "l2"]);
    expect(updatedIds).not.toContain("l3-out-of-scope");
  });

  it("counts a row as skipped when the new value matches the existing one", async () => {
    prismaMock.marketingLead.findMany.mockResolvedValueOnce([
      { id: "l1", stage: "CONTACTED", level: "SOURCING", previousLevel: null, levelEnteredAt: new Date(), assignedToUserId: null },
    ]);

    const result = await bulkUpdateMarketingLeads(
      memberCtx({ teamRole: "MANAGER" }),
      { ids: ["l1"], action: { kind: "stage", stage: "CONTACTED" } },
      "u1",
    );

    // Same stage → no update issued, `updated` remains 0.
    expect(result.updated).toBe(0);
    expect(prismaMock.marketingLead.update).not.toHaveBeenCalled();
  });

  it("rejects assign bulk actions when the caller lacks pd_lead.reassign", async () => {
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm === "pd_lead.bulk"; // no reassign
    });

    await expect(
      bulkUpdateMarketingLeads(
        memberCtx({ teamRole: "MANAGER" }),
        { ids: ["l1"], action: { kind: "assign", assignedToUserId: "u2" } },
        "u1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(prismaMock.marketingLead.findMany).not.toHaveBeenCalled();
    expect(prismaMock.marketingLead.update).not.toHaveBeenCalled();
  });

  it("rejects stage bulk actions when the caller lacks pd_lead.update_stage", async () => {
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm === "pd_lead.bulk"; // no update_stage
    });

    await expect(
      bulkUpdateMarketingLeads(
        memberCtx({ teamRole: "MANAGER" }),
        { ids: ["l1"], action: { kind: "stage", stage: "QUALIFIED" } },
        "u1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(prismaMock.marketingLead.update).not.toHaveBeenCalled();
  });

  it("rejects any bulk action when the caller lacks pd_lead.bulk entirely", async () => {
    permissionMock.hasPdPermission.mockResolvedValue(false);

    await expect(
      bulkUpdateMarketingLeads(
        memberCtx({ teamRole: "SETTER" }),
        { ids: ["l1"], action: { kind: "stage", stage: "QUALIFIED" } },
        "u1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns early with 0/0 when the selection is empty", async () => {
    const result = await bulkUpdateMarketingLeads(
      superAdminCtx,
      { ids: [], action: { kind: "stage", stage: "QUALIFIED" } },
      "sa-user",
    );

    expect(result).toEqual({ updated: 0, skipped: 0 });
    expect(prismaMock.marketingLead.findMany).not.toHaveBeenCalled();
  });

  it("refuses bulk operations larger than 200 leads", async () => {
    const ids = Array.from({ length: 201 }, (_, i) => `l${i}`);

    await expect(
      bulkUpdateMarketingLeads(
        superAdminCtx,
        { ids, action: { kind: "stage", stage: "QUALIFIED" } },
        "sa-user",
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("skips non-forward stage transitions in bulk when caller lacks pd_lead.reopen", async () => {
    // SETTER has update_stage + bulk but NOT reopen. Bulk tries DEMO → NEW
    // (non-forward) which must be skipped rather than executed.
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm === "pd_lead.bulk" || perm === "pd_lead.update_stage";
    });
    prismaMock.marketingLead.findMany.mockResolvedValueOnce([
      {
        id: "l1",
        stage: "DEMO",
        level: "CLOSING",
        previousLevel: null,
        levelEnteredAt: new Date(),
        assignedToUserId: null,
      },
    ]);

    const result = await bulkUpdateMarketingLeads(
      memberCtx({ teamRole: "MANAGER" }),
      { ids: ["l1"], action: { kind: "stage", stage: "NEW" } },
      "u1",
    );

    expect(result).toEqual({ updated: 0, skipped: 1 });
    expect(prismaMock.marketingLead.update).not.toHaveBeenCalled();
  });

  it("bulk stage change to next level auto-unassigns and records SYSTEM activity", async () => {
    prismaMock.marketingLead.findMany.mockResolvedValueOnce([
      {
        id: "l1",
        stage: "QUALIFIED",
        level: "SOURCING",
        previousLevel: null,
        levelEnteredAt: new Date(),
        assignedToUserId: "u1",
      },
    ]);

    const result = await bulkUpdateMarketingLeads(
      memberCtx({ teamRole: "MANAGER" }),
      { ids: ["l1"], action: { kind: "stage", stage: "DEMO" } },
      "u1",
    );

    expect(result.updated).toBe(1);
    const call = prismaMock.marketingLead.update.mock.calls[0]?.[0];
    expect(call?.data.level).toBe("CLOSING");
    // Auto-unassign kicks in because the level changed.
    expect(call?.data.assignedTo).toEqual({ disconnect: true });
  });
});

// ---------------------------------------------------------------------------
// updateMarketingLead — forward-only, reopen, auto-unassign, classification
// ---------------------------------------------------------------------------

const baseLead: Record<string, unknown> = {
  id: "lead-1",
  email: "x@primer.rs",
  stage: "QUALIFIED",
  level: "SOURCING",
  previousLevel: null,
  levelEnteredAt: new Date(),
  audience: "OTHER",
  assignedToUserId: "u1",
  firstName: null,
  lastName: null,
  phone: null,
  city: null,
  note: null,
  lostReason: null,
  convertedOrganizationId: null,
  convertedAt: null,
  source: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmTerm: null,
  utmContent: null,
  consent: false,
  projectCount: null,
  priority: "NORMAL",
  temperature: "COLD",
  timelineHorizon: "UNDECIDED",
  budgetTier: "UNKNOWN",
  budgetCurrency: "EUR",
  companyName: null,
  companyWebsite: null,
  companySize: null,
  decisionMakerName: null,
  decisionMakerTitle: null,
  preferredContact: null,
  bestContactHour: null,
  preferredLanguage: "sr",
  competitor: null,
  painPoint: null,
  country: "RS",
  region: null,
  leadScore: 0,
  nextFollowUpAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("updateMarketingLead — forward-only pipeline", () => {
  it("allows a forward transition (QUALIFIED → DEMO) without pd_lead.reopen", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      stage: "QUALIFIED",
      level: "SOURCING",
    });
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm !== "pd_lead.reopen";
    });

    await updateMarketingLead(
      memberCtx({ teamRole: "SETTER" }),
      "lead-1",
      { stage: "DEMO" },
      "u1",
    );

    const call = prismaMock.marketingLead.update.mock.calls[0]?.[0];
    expect(call?.data.stage).toBe("DEMO");
    // Level crossed SOURCING → CLOSING → auto-unassign kicks in.
    expect(call?.data.level).toBe("CLOSING");
    expect(call?.data.assignedTo).toEqual({ disconnect: true });
  });

  it("rejects non-forward transition when caller lacks pd_lead.reopen", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      stage: "DEMO",
      level: "CLOSING",
    });
    // Allow everything except reopen.
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm !== "pd_lead.reopen";
    });

    await expect(
      updateMarketingLead(
        memberCtx({ teamRole: "SETTER" }),
        "lead-1",
        { stage: "QUALIFIED" },
        "u1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(prismaMock.marketingLead.update).not.toHaveBeenCalled();
  });

  it("requires a reopenReason when performing a non-forward transition", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      stage: "DEMO",
      level: "CLOSING",
    });

    await expect(
      updateMarketingLead(
        memberCtx({ teamRole: "MANAGER" }),
        "lead-1",
        { stage: "QUALIFIED" }, // no reopenReason
        "u1",
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(prismaMock.marketingLead.update).not.toHaveBeenCalled();
  });

  it("MANAGER with reopenReason can move a lead back", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      stage: "DEMO",
      level: "CLOSING",
    });

    await updateMarketingLead(
      memberCtx({ teamRole: "MANAGER" }),
      "lead-1",
      { stage: "QUALIFIED", reopenReason: "Vraćeno zbog nedostatka informacija" },
      "u1",
    );

    const call = prismaMock.marketingLead.update.mock.calls[0]?.[0];
    expect(call?.data.stage).toBe("QUALIFIED");
    // Level crossed CLOSING → SOURCING → auto-unassign (previousLevel = CLOSING).
    expect(call?.data.level).toBe("SOURCING");
    expect(call?.data.previousLevel).toBe("CLOSING");
  });

  it("auto-unassign only fires when stage change crosses level", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      stage: "NEW",
      level: "SOURCING",
      assignedToUserId: "u1",
    });

    await updateMarketingLead(
      memberCtx({ teamRole: "SETTER" }),
      "lead-1",
      { stage: "CONTACTED" }, // still SOURCING → no unassign
      "u1",
    );

    const call = prismaMock.marketingLead.update.mock.calls[0]?.[0];
    expect(call?.data.stage).toBe("CONTACTED");
    expect(call?.data.level).toBeUndefined(); // no level change written
    expect(call?.data.assignedTo).toBeUndefined();
  });

  it("update_classification alone does not require update_details", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
    });
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm === "pd_lead.update_classification";
    });

    await updateMarketingLead(
      memberCtx({ teamRole: "SETTER" }),
      "lead-1",
      { priority: "HIGH", temperature: "HOT" },
      "u1",
    );

    const call = prismaMock.marketingLead.update.mock.calls[0]?.[0];
    expect(call?.data.priority).toBe("HIGH");
    expect(call?.data.temperature).toBe("HOT");
    // QUALIFIED (+15) + HOT (+15)
    expect(call?.data.leadScore).toBe(30);
  });

  it("rejects classification changes when caller lacks pd_lead.update_classification", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({ ...baseLead });
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm !== "pd_lead.update_classification";
    });

    await expect(
      updateMarketingLead(
        memberCtx({ teamRole: "OPERATIONS" }),
        "lead-1",
        { priority: "URGENT" },
        "u1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses writes when the lead has moved to a level outside the caller's coverage", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      level: "CLOSING",
    });
    // SETTER covers SOURCING only; canWriteLead denies.
    permissionMock.canWriteLead.mockResolvedValueOnce(false);

    await expect(
      updateMarketingLead(
        memberCtx({ teamRole: "SETTER" }),
        "lead-1",
        { note: "kasno" },
        "u1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(prismaMock.marketingLead.update).not.toHaveBeenCalled();
  });

  it("allows a CLOSER to self-claim an unassigned lead without pd_lead.reassign", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      stage: "DEMO",
      level: "CLOSING",
      assignedToUserId: null,
    });
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm !== "pd_lead.reassign";
    });

    await updateMarketingLead(
      memberCtx({ teamRole: "CLOSER", userId: "closer-1" }),
      "lead-1",
      { assignedToUserId: "closer-1" },
      "closer-1",
    );

    const call = prismaMock.marketingLead.update.mock.calls[0]?.[0];
    expect(call?.data.assignedTo).toEqual({ connect: { id: "closer-1" } });
  });

  it("rejects taking someone else's lead without pd_lead.reassign", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      assignedToUserId: "other-user",
    });
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm !== "pd_lead.reassign";
    });

    await expect(
      updateMarketingLead(
        memberCtx({ teamRole: "CLOSER", userId: "closer-1" }),
        "lead-1",
        { assignedToUserId: "closer-1" },
        "closer-1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(prismaMock.marketingLead.update).not.toHaveBeenCalled();
  });

  it("rejects assigning an unassigned lead to someone else without pd_lead.reassign", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      assignedToUserId: null,
    });
    permissionMock.hasPdPermission.mockImplementation(async (_ctx, perm) => {
      return perm !== "pd_lead.reassign";
    });

    await expect(
      updateMarketingLead(
        memberCtx({ teamRole: "CLOSER", userId: "closer-1" }),
        "lead-1",
        { assignedToUserId: "other-user" },
        "closer-1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("locks audience once it is INVESTOR or AGENCY", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      audience: "INVESTOR",
    });

    await expect(
      updateMarketingLead(
        memberCtx({ teamRole: "SETTER" }),
        "lead-1",
        { audience: "AGENCY" },
        "u1",
      ),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(prismaMock.marketingLead.update).not.toHaveBeenCalled();
  });

  it("allows setting audience from OTHER to INVESTOR", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      audience: "OTHER",
    });

    await updateMarketingLead(
      memberCtx({ teamRole: "SETTER" }),
      "lead-1",
      { audience: "INVESTOR" },
      "u1",
    );

    const call = prismaMock.marketingLead.update.mock.calls[0]?.[0];
    expect(call?.data.audience).toBe("INVESTOR");
  });
});

describe("convertMarketingLead", () => {
  it("auto-unassigns when the lead crosses into OPERATIONS", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      stage: "PROPOSAL",
      level: "CLOSING",
      convertedOrganizationId: null,
    });
    prismaMock.organization.findUnique.mockResolvedValueOnce({
      id: "org-1",
      name: "Gradnja",
    });

    await convertMarketingLead(
      memberCtx({ teamRole: "CLOSER" }),
      "lead-1",
      "org-1",
      "u1",
    );

    const call = prismaMock.marketingLead.update.mock.calls[0]?.[0];
    expect(call?.data.stage).toBe("WON");
    expect(call?.data.level).toBe("OPERATIONS");
    expect(call?.data.assignedTo).toEqual({ disconnect: true });
  });

  it("keeps the assignee when the lead is already in L3", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      stage: "WON",
      level: "OPERATIONS",
      convertedOrganizationId: null,
    });
    prismaMock.organization.findUnique.mockResolvedValueOnce({
      id: "org-1",
      name: "Gradnja",
    });

    await convertMarketingLead(
      memberCtx({ teamRole: "OPERATIONS" }),
      "lead-1",
      "org-1",
      "u1",
    );

    const call = prismaMock.marketingLead.update.mock.calls[0]?.[0];
    expect(call?.data.assignedTo).toBeUndefined();
  });
});

describe("provisionMarketingLead", () => {
  const ownerInput = {
    name: "Ana Vlasnik",
    email: "ana@firma.rs",
    password: "PropertyDesk!2026",
  };

  it("rejects CLOSER — only Super Admin and Operations may create a tenant", async () => {
    await expect(
      provisionMarketingLead(
        memberCtx({ teamRole: "CLOSER" }),
        "lead-1",
        {
          name: "Firma",
          planCode: "trial",
          owner: ownerInput,
        },
        "u1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(platformMock.createOrganizationByPlatformAdmin).not.toHaveBeenCalled();
  });

  it("rejects when audience is still OTHER", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      stage: "WON",
      level: "OPERATIONS",
      audience: "OTHER",
      convertedOrganizationId: null,
    });

    await expect(
      provisionMarketingLead(
        memberCtx({ teamRole: "OPERATIONS" }),
        "lead-1",
        { name: "Firma", planCode: "trial", owner: ownerInput },
        "u1",
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects before the lead is in L3", async () => {
    prismaMock.marketingLead.findUnique.mockResolvedValueOnce({
      ...baseLead,
      stage: "PROPOSAL",
      level: "CLOSING",
      audience: "INVESTOR",
      convertedOrganizationId: null,
    });

    await expect(
      provisionMarketingLead(
        memberCtx({ teamRole: "OPERATIONS" }),
        "lead-1",
        { name: "Firma", planCode: "trial", owner: ownerInput },
        "u1",
      ),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("creates org + INVESTOR_OWNER and converts the lead", async () => {
    prismaMock.marketingLead.findUnique
      .mockResolvedValueOnce({
        ...baseLead,
        stage: "WON",
        level: "OPERATIONS",
        audience: "INVESTOR",
        convertedOrganizationId: null,
        companyName: "Gradnja Plus",
        email: "x@primer.rs",
      })
      .mockResolvedValueOnce({
        ...baseLead,
        stage: "WON",
        level: "OPERATIONS",
        audience: "INVESTOR",
        convertedOrganizationId: null,
      });
    prismaMock.organization.findUnique
      .mockResolvedValueOnce(null) // slug uniqueness
      .mockResolvedValueOnce({ id: "org-new", name: "Gradnja Plus" });
    platformMock.createOrganizationByPlatformAdmin.mockResolvedValueOnce({
      org: { id: "org-new", name: "Gradnja Plus", slug: "gradnja-plus" },
    });
    platformMock.createPlatformUser.mockResolvedValueOnce({
      id: "user-owner",
      email: "ana@firma.rs",
      name: "Ana Vlasnik",
    });

    const result = await provisionMarketingLead(
      superAdminCtx,
      "lead-1",
      {
        name: "Gradnja Plus",
        planCode: "growth",
        trialDays: 14,
        owner: ownerInput,
      },
      "sa-user",
    );

    expect(platformMock.createOrganizationByPlatformAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Gradnja Plus",
        type: "INVESTOR",
        planCode: "growth",
        trialDays: 14,
      }),
      "sa-user",
    );
    expect(platformMock.createPlatformUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@firma.rs",
        organizationId: "org-new",
        organizationRole: "INVESTOR_OWNER",
      }),
      "sa-user",
    );
    expect(result.organization.id).toBe("org-new");
    expect(result.owner.email).toBe("ana@firma.rs");
  });
});

