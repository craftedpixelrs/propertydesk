import { describe, expect, it } from "vitest";

import { defaultAllowsPermission } from "@/server/services/permissions/role-overrides.service";
import { buildRoleCapabilityGuide } from "./role-capability-guide";

describe("buildRoleCapabilityGuide", () => {
  it("gives investor owner member management and sales agent only lead manage", () => {
    const guide = buildRoleCapabilityGuide("INVESTOR", (role, perm) =>
      defaultAllowsPermission(role, perm),
    );
    const members = guide.sections.flatMap((s) => s.rows).find((r) => r.id === "members");
    expect(members?.cells.INVESTOR_OWNER).toBe("yes");
    expect(members?.cells.SALES_AGENT).toBe("no");

    const leads = guide.sections.flatMap((s) => s.rows).find((r) => r.id === "leads");
    expect(leads?.cells.SALES_AGENT).toBe("yes");
    expect(leads?.cells.FINANCE).toBe("no");
    expect(leads?.cells.INVESTOR_VIEWER).toBe("read");
  });

  it("gives agency owner member management and viewer read-only leads", () => {
    const guide = buildRoleCapabilityGuide("AGENCY", (role, perm) =>
      defaultAllowsPermission(role, perm),
    );
    const members = guide.sections.flatMap((s) => s.rows).find((r) => r.id === "members");
    expect(members?.cells.AGENCY_OWNER).toBe("yes");
    expect(members?.cells.AGENCY_AGENT).toBe("no");

    const leads = guide.sections.flatMap((s) => s.rows).find((r) => r.id === "leads");
    expect(leads?.cells.AGENCY_AGENT).toBe("yes");
    expect(leads?.cells.AGENCY_VIEWER).toBe("read");
  });

  it("lists manager permissions per role instead of one frozen row", () => {
    const guide = buildRoleCapabilityGuide("MANAGER", (role, perm) =>
      defaultAllowsPermission(role, perm),
    );
    const row = (id: string) => guide.sections.flatMap((s) => s.rows).find((r) => r.id === id);

    expect(row("dues-writeoff")?.cells.MANAGER_OWNER).toBe("yes");
    expect(row("dues-writeoff")?.cells.MANAGER_ADMIN).toBe("no");
    expect(row("dues-writeoff")?.cells.MANAGER_ACCOUNTANT).toBe("no");

    expect(row("tickets")?.cells.MANAGER_TECHNICIAN).toBe("yes");
    expect(row("dues")?.cells.MANAGER_TECHNICIAN).toBe("no");
    expect(row("assemblies")?.cells.MANAGER_TECHNICIAN).toBe("no");

    expect(row("buildings")?.cells.MANAGER_VIEWER).toBe("read");
    expect(row("assembly-vote")?.cells.MANAGER_VIEWER).toBe("no");
    expect(row("assembly-minutes")?.cells.MANAGER_OWNER).toBe("yes");
    expect(row("audit")?.cells.MANAGER_OWNER).toBe("yes");
    expect(row("audit")?.cells.MANAGER_ADMIN).toBe("no");
  });
});
