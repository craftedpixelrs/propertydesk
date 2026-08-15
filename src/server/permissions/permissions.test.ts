import { describe, expect, it } from "vitest";
import {
  investorRoles,
  agencyRoles,
  organizationRoles,
  platformRoles,
  rolesForOrgType,
} from "./roles";
import { permissionStatement } from "./access-control";

describe("permission matrix", () => {
  it("declares every documented permission resource", () => {
    const resources = Object.keys(permissionStatement);
    for (const r of [
      "organization",
      "project",
      "inventory",
      "lead",
      "reservation",
      "sale",
      "payment",
      "agency",
      "commission",
      "document",
      "report",
      "audit",
      "platform",
      "billing",
    ]) {
      expect(resources).toContain(r);
    }
  });

  it("billing resource declares the required action surface", () => {
    const billing = (permissionStatement as unknown as Record<string, readonly string[]>).billing;
    expect(billing).toBeDefined();
    for (const action of [
      "read",
      "settings.manage",
      "plan.manage",
      "subscription.read",
      "subscription.manage",
      "invoice.read",
      "invoice.manage",
      "invoice.cancel",
      "payment.read",
      "payment.record",
      "payment.reverse",
      "bankstatement.import",
      "bankstatement.review",
      "sef.manage",
      "jobs.run",
      "template.manage",
      "profile.manage",
      "bankaccount.manage",
    ]) {
      expect(billing).toContain(action);
    }
  });

  it("SUPER_ADMIN can manage every billing action", () => {
    const role = platformRoles.SUPER_ADMIN as unknown as {
      authorize: (req: Record<string, string[]>) => { success: boolean };
    };
    const billing = (permissionStatement as unknown as Record<string, readonly string[]>).billing ?? [];
    expect(billing.length).toBeGreaterThan(0);
    for (const action of billing) {
      expect(role.authorize({ billing: [action] }).success).toBe(true);
    }
  });

  it("Investor and Agency owners can read their own billing state", () => {
    const owners = ["INVESTOR_OWNER", "AGENCY_OWNER"] as const;
    for (const key of owners) {
      const role = (organizationRoles as Record<string, unknown>)[key] as {
        authorize: (req: Record<string, string[]>) => { success: boolean };
      };
      expect(role.authorize({ billing: ["read"] }).success).toBe(true);
      expect(role.authorize({ billing: ["invoice.read"] }).success).toBe(true);
      expect(role.authorize({ billing: ["subscription.read"] }).success).toBe(true);
    }
  });

  it("roles that manage members can create Better Auth invitations", () => {
    const canInvite = [
      "INVESTOR_OWNER",
      "INVESTOR_ADMIN",
      "AGENCY_OWNER",
      "AGENCY_ADMIN",
    ] as const;
    const cannotInvite = ["SALES_AGENT", "AGENCY_AGENT", "INVESTOR_VIEWER"] as const;
    for (const key of canInvite) {
      const role = (organizationRoles as Record<string, unknown>)[key] as {
        authorize: (req: Record<string, string[]>) => { success: boolean };
      };
      expect(role.authorize({ invitation: ["create"] }).success).toBe(true);
      expect(role.authorize({ member: ["create"] }).success).toBe(true);
    }
    for (const key of cannotInvite) {
      const role = (organizationRoles as Record<string, unknown>)[key] as {
        authorize: (req: Record<string, string[]>) => { success: boolean };
      };
      expect(role.authorize({ invitation: ["create"] }).success).toBe(false);
    }
  });

  it("non-owner roles cannot manage global billing settings", () => {
    const cases = [
      "INVESTOR_ADMIN",
      "SALES_MANAGER",
      "SALES_AGENT",
      "FINANCE",
      "INVESTOR_VIEWER",
      "AGENCY_ADMIN",
      "AGENCY_AGENT",
      "AGENCY_VIEWER",
    ] as const;
    for (const key of cases) {
      const role = (organizationRoles as Record<string, unknown>)[key] as {
        authorize: (req: Record<string, string[]>) => { success: boolean };
      };
      expect(role.authorize({ billing: ["settings.manage"] }).success).toBe(false);
      expect(role.authorize({ billing: ["plan.manage"] }).success).toBe(false);
      expect(role.authorize({ billing: ["jobs.run"] }).success).toBe(false);
    }
  });

  it("all investor roles are exported", () => {
    expect(Object.keys(investorRoles).sort()).toEqual(
      [
        "INVESTOR_OWNER",
        "INVESTOR_ADMIN",
        "SALES_MANAGER",
        "SALES_AGENT",
        "FINANCE",
        "INVESTOR_VIEWER",
      ].sort(),
    );
  });

  it("all agency roles are exported", () => {
    expect(Object.keys(agencyRoles).sort()).toEqual(
      ["AGENCY_OWNER", "AGENCY_ADMIN", "AGENCY_AGENT", "AGENCY_VIEWER"].sort(),
    );
  });

  it("organizationRoles is the union of investor + agency", () => {
    expect(Object.keys(organizationRoles).length).toBe(
      Object.keys(investorRoles).length + Object.keys(agencyRoles).length,
    );
  });

  it("rolesForOrgType restricts roles per tenant type", () => {
    const inv = rolesForOrgType("INVESTOR");
    const ag = rolesForOrgType("AGENCY");
    expect(inv).toContain("SALES_MANAGER");
    expect(inv).not.toContain("AGENCY_AGENT");
    expect(ag).toContain("AGENCY_AGENT");
    expect(ag).not.toContain("SALES_MANAGER");
  });

  it("SUPER_ADMIN carries the grants Better Auth's admin plugin requires", () => {
    const role = platformRoles.SUPER_ADMIN as unknown as {
      authorize: (req: Record<string, string[]>) => { success: boolean };
    };
    // These are the resource/action pairs enforced by the admin plugin
    // itself (see node_modules/better-auth/.../admin/routes.mjs). Do not
    // relax them; each unlocks a distinct SUPER_ADMIN capability.
    expect(role.authorize({ user: ["impersonate"] }).success).toBe(true);
    expect(role.authorize({ user: ["ban"] }).success).toBe(true);
    expect(role.authorize({ user: ["set-role"] }).success).toBe(true);
    expect(role.authorize({ user: ["list"] }).success).toBe(true);
    expect(role.authorize({ session: ["revoke"] }).success).toBe(true);
    // Impersonating another SUPER_ADMIN must remain impossible.
    expect(role.authorize({ user: ["impersonate-admins"] }).success).toBe(false);
  });

  it("no organization role can impersonate users", () => {
    for (const role of Object.values(organizationRoles) as unknown as Array<{
      authorize: (req: Record<string, string[]>) => { success: boolean };
    }>) {
      expect(role.authorize({ user: ["impersonate"] }).success).toBe(false);
    }
  });
});
