import { describe, expect, it } from "vitest";

import { buildTaskViewWhere, type ListTasksInput } from "./tasks.service";

const base: ListTasksInput = {
  organizationId: "org-1",
  currentUserId: "user-1",
  view: "mine",
  page: 1,
  pageSize: 20,
};

describe("buildTaskViewWhere", () => {
  it("scopes mine/today/overdue/upcoming to the current user and open statuses", () => {
    const mine = buildTaskViewWhere({ ...base, view: "mine" });
    expect(mine.assignedUserId).toBe("user-1");
    expect(mine.status).toEqual({ in: ["OPEN", "IN_PROGRESS"] });

    const overdue = buildTaskViewWhere({ ...base, view: "overdue" });
    expect(overdue.assignedUserId).toBe("user-1");
    expect(overdue.dueAt).toEqual(
      expect.objectContaining({ lt: expect.any(Date) }),
    );
  });

  it("lists the current user's completed tasks", () => {
    const where = buildTaskViewWhere({ ...base, view: "completed" });
    expect(where).toMatchObject({
      organizationId: "org-1",
      assignedUserId: "user-1",
      status: "COMPLETED",
    });
  });

  it("does not leak the team roster without includeTeam", () => {
    const hidden = buildTaskViewWhere({ ...base, view: "team" });
    expect(hidden.assignedUserId).toBe("user-1");

    const team = buildTaskViewWhere({ ...base, view: "team", includeTeam: true });
    expect(team.assignedUserId).toBeUndefined();
    expect(team.status).toEqual({ in: ["OPEN", "IN_PROGRESS"] });
    expect(team.organizationId).toBe("org-1");
  });

  it("keeps buyer filter when set", () => {
    const where = buildTaskViewWhere({
      ...base,
      view: "completed",
      buyerId: "buyer-1",
    });
    expect(where.buyerId).toBe("buyer-1");
  });
});
