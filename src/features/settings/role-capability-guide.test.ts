import { describe, expect, it } from "vitest";

import { defaultAllowsPermission } from "@/server/services/permissions/role-overrides.service";
import { buildRoleCapabilityGuide } from "./role-capability-guide";

describe("buildRoleCapabilityGuide", () => {
  it("gives investor owner member management and sales agent only lead manage", () => {
    const guide = buildRoleCapabilityGuide("INVESTOR", (role, perm) =>
      defaultAllowsPermission(role, perm),
    );
    const members = guide.sections
      .flatMap((s) => s.rows)
      .find((r) => r.id === "members");
    expect(members?.cells.INVESTOR_OWNER).toBe("yes");
    expect(members?.cells.SALES_AGENT).toBe("no");

    const leads = guide.sections
      .flatMap((s) => s.rows)
      .find((r) => r.id === "leads");
    expect(leads?.cells.SALES_AGENT).toBe("yes");
    expect(leads?.cells.FINANCE).toBe("no");
    expect(leads?.cells.INVESTOR_VIEWER).toBe("read");
  });

  it("gives agency owner member management and viewer read-only leads", () => {
    const guide = buildRoleCapabilityGuide("AGENCY", (role, perm) =>
      defaultAllowsPermission(role, perm),
    );
    const members = guide.sections
      .flatMap((s) => s.rows)
      .find((r) => r.id === "members");
    expect(members?.cells.AGENCY_OWNER).toBe("yes");
    expect(members?.cells.AGENCY_AGENT).toBe("no");

    const leads = guide.sections
      .flatMap((s) => s.rows)
      .find((r) => r.id === "leads");
    expect(leads?.cells.AGENCY_AGENT).toBe("yes");
    expect(leads?.cells.AGENCY_VIEWER).toBe("read");
  });
});
