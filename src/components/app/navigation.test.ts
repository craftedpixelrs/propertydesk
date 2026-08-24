import { describe, expect, it } from "vitest";

import { filterNavigation, navigation } from "./navigation";
import { organizationRoles } from "@/server/permissions/roles";
import {
  permissionStatement,
  toPermissionRequest,
  type PermissionString,
} from "@/server/permissions/access-control";

/**
 * These tests are the single source of truth for what each role sees in the
 * sidebar / bottom nav. If you change a role in `roles.ts` or a permission on
 * a nav item in `navigation.ts`, update the expected sets below intentionally
 * — do not just relax the assertion.
 */

const ALL_PERMISSIONS: PermissionString[] = (() => {
  const list: string[] = [];
  for (const [resource, actions] of Object.entries(permissionStatement)) {
    for (const action of actions) list.push(`${resource}.${action}`);
  }
  return list as PermissionString[];
})();

function computeOrgPermissions(roleKey: keyof typeof organizationRoles): Set<PermissionString> {
  const roleDef = organizationRoles[roleKey] as unknown as {
    authorize: (
      req: Record<string, string[]>,
      connector?: "AND" | "OR",
    ) => { success: boolean };
  };
  const out = new Set<PermissionString>();
  for (const perm of ALL_PERMISSIONS) {
    if (perm.startsWith("platform.")) continue;
    if (roleDef.authorize(toPermissionRequest(perm))?.success) out.add(perm);
  }
  return out;
}

function keysFor(input: {
  organizationType: "INVESTOR" | "AGENCY" | null;
  permissions: Set<PermissionString>;
  isSuperAdmin: boolean;
  hasPropertyDeskAccess?: boolean;
}): string[] {
  return filterNavigation(navigation, {
    organizationType: input.organizationType,
    hasPermission: (p) => input.permissions.has(p),
    isSuperAdmin: input.isSuperAdmin,
    hasPropertyDeskAccess: input.hasPropertyDeskAccess ?? input.isSuperAdmin,
  }).map((i) => i.key);
}

describe("sidebar navigation matrix", () => {
  it("SUPER_ADMIN without active org sees only platform-admin (dashboard would just redirect here)", () => {
    const keys = keysFor({
      organizationType: null,
      permissions: new Set(ALL_PERMISSIONS),
      isSuperAdmin: true,
    });
    expect(keys.sort()).toEqual(["platform-admin"].sort());
    expect(keys).not.toContain("dashboard");
    expect(keys).not.toContain("property-desk");
  });

  describe("Property Desk team (no tenant, no SUPER_ADMIN)", () => {
    it("PD-only user sees only property-desk (no dashboard/settings redirects)", () => {
      const keys = keysFor({
        organizationType: null,
        permissions: new Set<PermissionString>(),
        isSuperAdmin: false,
        hasPropertyDeskAccess: true,
      });
      expect(keys).toEqual(["property-desk"]);
    });

    it("PD member inside a tenant still sees the Property Desk sidebar item", () => {
      const keys = keysFor({
        organizationType: "INVESTOR",
        permissions: computeOrgPermissions("INVESTOR_OWNER"),
        isSuperAdmin: false,
        hasPropertyDeskAccess: true,
      });
      expect(keys).toContain("property-desk");
      expect(keys).not.toContain("platform-admin");
    });

    it("SUPER_ADMIN never sees a duplicate Property Desk sidebar item", () => {
      const keys = keysFor({
        organizationType: "INVESTOR",
        permissions: new Set(ALL_PERMISSIONS),
        isSuperAdmin: true,
        hasPropertyDeskAccess: true,
      });
      expect(keys).toContain("platform-admin");
      expect(keys).not.toContain("property-desk");
    });

    it("regular user without PD access never sees property-desk", () => {
      const keys = keysFor({
        organizationType: "INVESTOR",
        permissions: computeOrgPermissions("INVESTOR_OWNER"),
        isSuperAdmin: false,
        hasPropertyDeskAccess: false,
      });
      expect(keys).not.toContain("property-desk");
    });
  });

  it("SUPER_ADMIN acting inside an INVESTOR org sees investor items + platform-admin", () => {
    const keys = keysFor({
      organizationType: "INVESTOR",
      permissions: new Set(ALL_PERMISSIONS),
      isSuperAdmin: true,
    });
    expect(keys).not.toContain("dashboard");
    expect(keys).toContain("platform-admin");
    expect(keys).not.toContain("property-desk");
    expect(keys).toContain("projects");
    expect(keys).toContain("sales");
    expect(keys).toContain("agencies");
    expect(keys).toContain("agency-registrations");
    expect(keys).not.toContain("offer");
    expect(keys).not.toContain("my-buyers");
  });

  it("SUPER_ADMIN acting inside an AGENCY org sees agency items + platform-admin", () => {
    const keys = keysFor({
      organizationType: "AGENCY",
      permissions: new Set(ALL_PERMISSIONS),
      isSuperAdmin: true,
    });
    expect(keys).not.toContain("dashboard");
    expect(keys).toContain("platform-admin");
    expect(keys).not.toContain("property-desk");
    expect(keys).toContain("offer");
    expect(keys).toContain("my-buyers");
    expect(keys).toContain("connections");
    expect(keys).not.toContain("projects");
    expect(keys).not.toContain("sales");
    expect(keys).not.toContain("payments");
    expect(keys).not.toContain("agencies");
  });

  describe("INVESTOR roles", () => {
    it("INVESTOR_OWNER sees the full investor sidebar", () => {
      const keys = keysFor({
        organizationType: "INVESTOR",
        permissions: computeOrgPermissions("INVESTOR_OWNER"),
        isSuperAdmin: false,
      });
      expect(keys.sort()).toEqual(
        [
          "dashboard",
          "projects",
          "inventory",
          "customers",
          "tasks",
          "reservations",
          "calendar",
          "sales",
          "payments",
          "agencies",
          "agency-registrations",
          "commissions",
          "documents",
          "reports",
          "settings",
        ].sort(),
      );
    });

    it("INVESTOR_ADMIN sees the full investor sidebar", () => {
      const keys = keysFor({
        organizationType: "INVESTOR",
        permissions: computeOrgPermissions("INVESTOR_ADMIN"),
        isSuperAdmin: false,
      });
      expect(keys).toContain("agencies");
      expect(keys).toContain("agency-registrations");
      expect(keys).toContain("payments");
      expect(keys).toContain("sales");
    });

    it("SALES_MANAGER sees sales but no agency-registrations (needs agency.manage)", () => {
      const keys = keysFor({
        organizationType: "INVESTOR",
        permissions: computeOrgPermissions("SALES_MANAGER"),
        isSuperAdmin: false,
      });
      expect(keys).toContain("projects");
      expect(keys).toContain("inventory");
      expect(keys).toContain("customers");
      expect(keys).toContain("tasks");
      expect(keys).toContain("reservations");
      expect(keys).toContain("sales");
      expect(keys).toContain("payments");
      expect(keys).toContain("agencies");
      expect(keys).not.toContain("agency-registrations");
      expect(keys).toContain("commissions");
      expect(keys).toContain("documents");
      expect(keys).toContain("reports");
    });

    it("SALES_AGENT is read-focused: no agency-registrations, no reports", () => {
      const keys = keysFor({
        organizationType: "INVESTOR",
        permissions: computeOrgPermissions("SALES_AGENT"),
        isSuperAdmin: false,
      });
      expect(keys).toContain("projects");
      expect(keys).toContain("customers");
      expect(keys).toContain("reservations");
      expect(keys).toContain("sales");
      expect(keys).toContain("payments");
      expect(keys).toContain("commissions");
      expect(keys).not.toContain("agency-registrations");
      expect(keys).not.toContain("reports");
    });

    it("FINANCE sees payments/commissions/reports but no leads/customers/agencies", () => {
      const keys = keysFor({
        organizationType: "INVESTOR",
        permissions: computeOrgPermissions("FINANCE"),
        isSuperAdmin: false,
      });
      expect(keys).toContain("projects");
      expect(keys).toContain("inventory");
      expect(keys).toContain("reservations");
      expect(keys).toContain("sales");
      expect(keys).toContain("payments");
      expect(keys).toContain("commissions");
      expect(keys).toContain("reports");
      expect(keys).toContain("documents");
      expect(keys).not.toContain("customers");
      expect(keys).not.toContain("tasks");
      expect(keys).not.toContain("agencies");
      expect(keys).not.toContain("agency-registrations");
    });

    it("INVESTOR_VIEWER can see everything read-only (no agency-registrations)", () => {
      const keys = keysFor({
        organizationType: "INVESTOR",
        permissions: computeOrgPermissions("INVESTOR_VIEWER"),
        isSuperAdmin: false,
      });
      expect(keys).toContain("projects");
      expect(keys).toContain("customers");
      expect(keys).toContain("reservations");
      expect(keys).toContain("sales");
      expect(keys).toContain("payments");
      expect(keys).toContain("agencies");
      expect(keys).toContain("commissions");
      expect(keys).toContain("reports");
      expect(keys).not.toContain("agency-registrations");
    });
  });

  describe("AGENCY roles", () => {
    it("AGENCY_OWNER sees the full agency sidebar", () => {
      const keys = keysFor({
        organizationType: "AGENCY",
        permissions: computeOrgPermissions("AGENCY_OWNER"),
        isSuperAdmin: false,
      });
      expect(keys.sort()).toEqual(
        [
          "dashboard",
          "offer",
          "my-buyers",
          "agency-tasks",
          "my-reservations",
          "my-commissions",
          "agents",
          "connections",
          "documents",
          "reports",
          "settings",
        ].sort(),
      );
      expect(keys).not.toContain("projects");
      expect(keys).not.toContain("inventory");
      expect(keys).not.toContain("customers");
      expect(keys).not.toContain("reservations");
      expect(keys).not.toContain("calendar");
    });

    it("AGENCY_ADMIN sees the same core agency items", () => {
      const keys = keysFor({
        organizationType: "AGENCY",
        permissions: computeOrgPermissions("AGENCY_ADMIN"),
        isSuperAdmin: false,
      });
      expect(keys).toContain("offer");
      expect(keys).toContain("my-buyers");
      expect(keys).toContain("connections");
    });

    it("AGENCY_AGENT can register buyers, sees informational connections, but not members mgmt / reports", () => {
      const keys = keysFor({
        organizationType: "AGENCY",
        permissions: computeOrgPermissions("AGENCY_AGENT"),
        isSuperAdmin: false,
      });
      expect(keys).toContain("offer");
      expect(keys).toContain("my-buyers");
      expect(keys).toContain("agency-tasks");
      expect(keys).toContain("my-reservations");
      expect(keys).toContain("my-commissions");
      // Connections is informational read — AGENT sees the list; accept/reject
      // buttons are gated in the client component itself.
      expect(keys).toContain("connections");
      // "Agenti" (members management) requires organization.members:manage.
      expect(keys).not.toContain("agents");
      expect(keys).not.toContain("reports");
      expect(keys).not.toContain("projects");
      expect(keys).not.toContain("inventory");
      expect(keys).not.toContain("customers");
      expect(keys).not.toContain("reservations");
      expect(keys).not.toContain("calendar");
    });

    it("AGENCY_VIEWER is read-only — no customer registration, no members management", () => {
      const keys = keysFor({
        organizationType: "AGENCY",
        permissions: computeOrgPermissions("AGENCY_VIEWER"),
        isSuperAdmin: false,
      });
      expect(keys).toContain("offer");
      expect(keys).toContain("connections");
      expect(keys).toContain("my-reservations");
      expect(keys).toContain("my-commissions");
      expect(keys).toContain("agency-tasks");
      expect(keys).not.toContain("agents");
      expect(keys).not.toContain("my-buyers");
    });
  });

  it("typed nav items stay hidden when there is no active organization", () => {
    const keys = keysFor({
      organizationType: null,
      permissions: computeOrgPermissions("AGENCY_AGENT"),
      isSuperAdmin: false,
    });
    expect(keys).not.toContain("projects");
    expect(keys).not.toContain("offer");
    expect(keys).not.toContain("sales");
    expect(keys).not.toContain("settings");
    expect(keys).toContain("dashboard");
  });

  it("no role ever sees platform-admin unless SUPER_ADMIN", () => {
    for (const roleKey of Object.keys(organizationRoles) as (keyof typeof organizationRoles)[]) {
      const perms = computeOrgPermissions(roleKey);
      const investor = keysFor({
        organizationType: "INVESTOR",
        permissions: perms,
        isSuperAdmin: false,
      });
      const agency = keysFor({
        organizationType: "AGENCY",
        permissions: perms,
        isSuperAdmin: false,
      });
      expect(investor).not.toContain("platform-admin");
      expect(agency).not.toContain("platform-admin");
    }
  });

  it("investor-only items never appear inside an AGENCY tenant", () => {
    for (const roleKey of Object.keys(organizationRoles) as (keyof typeof organizationRoles)[]) {
      const keys = keysFor({
        organizationType: "AGENCY",
        permissions: computeOrgPermissions(roleKey),
        isSuperAdmin: false,
      });
      expect(keys).not.toContain("sales");
      expect(keys).not.toContain("payments");
      expect(keys).not.toContain("agencies");
      expect(keys).not.toContain("agency-registrations");
      expect(keys).not.toContain("commissions");
      expect(keys).not.toContain("projects");
      expect(keys).not.toContain("inventory");
      expect(keys).not.toContain("customers");
      expect(keys).not.toContain("reservations");
      expect(keys).not.toContain("calendar");
    }
  });

  it("agency-only items never appear inside an INVESTOR tenant", () => {
    for (const roleKey of Object.keys(organizationRoles) as (keyof typeof organizationRoles)[]) {
      const keys = keysFor({
        organizationType: "INVESTOR",
        permissions: computeOrgPermissions(roleKey),
        isSuperAdmin: false,
      });
      expect(keys).not.toContain("offer");
      expect(keys).not.toContain("my-buyers");
      expect(keys).not.toContain("my-reservations");
      expect(keys).not.toContain("my-commissions");
      expect(keys).not.toContain("agents");
      expect(keys).not.toContain("connections");
      expect(keys).not.toContain("agency-tasks");
    }
  });
});
