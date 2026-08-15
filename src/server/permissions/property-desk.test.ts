import { beforeEach, describe, expect, it } from "vitest";

/**
 * Property Desk (Sloj C) authorization tests.
 *
 * These verify two things that the whole PD RBAC layer depends on:
 *   1. `defaultAllowsPermission` correctly reflects the compile-time
 *      defaults defined in `roles.ts` for SETTER / CLOSER / OPERATIONS /
 *      MANAGER (and SUPER_ADMIN).
 *   2. `isPermittedWithOverrides` flips effective permissions in both
 *      directions when the override map contains an entry.
 *
 * These two primitives are the entire authorization surface for the
 * `pd_*` resources; guard-layer helpers (`hasPdPermission`,
 * `requirePdPermission`) delegate to them, so keeping them honest
 * protects the rest of the stack.
 */

import {
  defaultAllowsPermission,
  isPermittedWithOverrides,
  ALL_ROLE_NAMES,
} from "@/server/services/permissions/role-overrides.service";
import type { PermissionString } from "@/server/permissions/access-control";

const cacheKey = (role: string, permission: string) => `${role}::${permission}`;

describe("Property Desk role defaults (from roles.ts)", () => {
  it("registers all four PD roles in ALL_ROLE_NAMES", () => {
    for (const role of ["SETTER", "CLOSER", "OPERATIONS", "MANAGER"]) {
      expect(ALL_ROLE_NAMES).toContain(role);
    }
  });

  it("SETTER can create leads and update stage/details but cannot convert or reassign", () => {
    expect(defaultAllowsPermission("SETTER", "pd_lead.create")).toBe(true);
    expect(defaultAllowsPermission("SETTER", "pd_lead.update_stage")).toBe(true);
    expect(defaultAllowsPermission("SETTER", "pd_lead.update_details")).toBe(true);
    expect(defaultAllowsPermission("SETTER", "pd_lead.update_classification")).toBe(true);
    expect(defaultAllowsPermission("SETTER", "pd_lead.view_own")).toBe(true);
    expect(defaultAllowsPermission("SETTER", "pd_lead.convert")).toBe(false);
    expect(defaultAllowsPermission("SETTER", "pd_lead.reassign")).toBe(false);
    expect(defaultAllowsPermission("SETTER", "pd_lead.view_team")).toBe(false);
    expect(defaultAllowsPermission("SETTER", "pd_lead.bulk")).toBe(false);
    expect(defaultAllowsPermission("SETTER", "pd_lead.reopen")).toBe(false);
  });

  it("CLOSER inherits Setter capabilities and adds convert", () => {
    expect(defaultAllowsPermission("CLOSER", "pd_lead.create")).toBe(true);
    expect(defaultAllowsPermission("CLOSER", "pd_lead.update_stage")).toBe(true);
    expect(defaultAllowsPermission("CLOSER", "pd_lead.convert")).toBe(true);
    expect(defaultAllowsPermission("CLOSER", "pd_lead.reassign")).toBe(false);
    expect(defaultAllowsPermission("CLOSER", "pd_lead.view_team")).toBe(false);
    expect(defaultAllowsPermission("CLOSER", "pd_lead.bulk")).toBe(false);
  });

  it("OPERATIONS can convert (L3 onboarding) but cannot create leads", () => {
    expect(defaultAllowsPermission("OPERATIONS", "pd_lead.update_stage")).toBe(true);
    expect(defaultAllowsPermission("OPERATIONS", "pd_lead.update_details")).toBe(true);
    expect(defaultAllowsPermission("OPERATIONS", "pd_lead_task.complete")).toBe(true);
    expect(defaultAllowsPermission("OPERATIONS", "pd_lead.convert")).toBe(true);
    expect(defaultAllowsPermission("OPERATIONS", "pd_lead.create")).toBe(false);
    expect(defaultAllowsPermission("OPERATIONS", "pd_lead.reassign")).toBe(false);
  });

  it("MANAGER can view the whole team pipeline, reassign, bulk and convert", () => {
    expect(defaultAllowsPermission("MANAGER", "pd_lead.view_team")).toBe(true);
    expect(defaultAllowsPermission("MANAGER", "pd_lead.reassign")).toBe(true);
    expect(defaultAllowsPermission("MANAGER", "pd_lead.bulk")).toBe(true);
    expect(defaultAllowsPermission("MANAGER", "pd_lead.convert")).toBe(true);
    expect(defaultAllowsPermission("MANAGER", "pd_lead.reopen")).toBe(true);
    expect(defaultAllowsPermission("MANAGER", "pd_lead.update_classification")).toBe(true);
    expect(defaultAllowsPermission("MANAGER", "pd_lead_task.assign")).toBe(true);
    // But NOT team membership management — that is SUPER_ADMIN only.
    expect(defaultAllowsPermission("MANAGER", "pd_team.add_member")).toBe(false);
    expect(defaultAllowsPermission("MANAGER", "pd_team.manage_role")).toBe(false);
    expect(defaultAllowsPermission("MANAGER", "pd_team.manage_scope")).toBe(false);
    expect(defaultAllowsPermission("MANAGER", "pd_team.disable")).toBe(false);
  });

  it("reopen defaults to MANAGER + SUPER_ADMIN only", () => {
    expect(defaultAllowsPermission("MANAGER", "pd_lead.reopen")).toBe(true);
    expect(defaultAllowsPermission("SUPER_ADMIN", "pd_lead.reopen")).toBe(true);
    expect(defaultAllowsPermission("SETTER", "pd_lead.reopen")).toBe(false);
    expect(defaultAllowsPermission("CLOSER", "pd_lead.reopen")).toBe(false);
    expect(defaultAllowsPermission("OPERATIONS", "pd_lead.reopen")).toBe(false);
  });

  it("update_classification defaults to every PD role", () => {
    for (const role of ["SETTER", "CLOSER", "OPERATIONS", "MANAGER"] as const) {
      expect(defaultAllowsPermission(role, "pd_lead.update_classification")).toBe(true);
    }
  });

  it("every PD role can read the pipeline report by default", () => {
    for (const role of ["SETTER", "CLOSER", "OPERATIONS", "MANAGER"] as const) {
      expect(defaultAllowsPermission(role, "pd_report.pipeline")).toBe(true);
    }
  });

  it("SUPER_ADMIN receives every pd_* permission by default", () => {
    const pdPerms: PermissionString[] = [
      "pd_team.view",
      "pd_team.add_member",
      "pd_team.manage_role",
      "pd_team.manage_scope",
      "pd_team.disable",
      "pd_lead.view_own",
      "pd_lead.view_team",
      "pd_lead.create",
      "pd_lead.reassign",
      "pd_lead.update_stage",
      "pd_lead.update_details",
      "pd_lead.update_classification",
      "pd_lead.reopen",
      "pd_lead.convert",
      "pd_lead.bulk",
      "pd_lead_activity.read",
      "pd_lead_activity.create",
      "pd_lead_task.read",
      "pd_lead_task.create",
      "pd_lead_task.assign",
      "pd_lead_task.complete",
      "pd_report.pipeline",
    ];
    for (const p of pdPerms) {
      expect(defaultAllowsPermission("SUPER_ADMIN", p)).toBe(true);
    }
  });

  it("tenant Member roles do not receive pd_* permissions by default", () => {
    for (const role of ["SALES_MANAGER", "AGENCY_AGENT", "INVESTOR_VIEWER"] as const) {
      expect(defaultAllowsPermission(role, "pd_lead.view_own")).toBe(false);
      expect(defaultAllowsPermission(role, "pd_lead.convert")).toBe(false);
      expect(defaultAllowsPermission(role, "pd_team.view")).toBe(false);
    }
  });
});

describe("isPermittedWithOverrides", () => {
  let overrides: Map<string, boolean>;

  beforeEach(() => {
    overrides = new Map<string, boolean>();
  });

  it("returns compile-time default when no override exists", () => {
    expect(isPermittedWithOverrides("SETTER", "pd_lead.create", overrides)).toBe(true);
    expect(isPermittedWithOverrides("SETTER", "pd_lead.convert", overrides)).toBe(false);
  });

  it("grants a permission that the default denies", () => {
    // Give SETTER the ability to convert — the common case when Setters
    // and Closers are the same person on a small team.
    overrides.set(cacheKey("SETTER", "pd_lead.convert"), true);
    expect(isPermittedWithOverrides("SETTER", "pd_lead.convert", overrides)).toBe(true);
    // Unrelated permissions must not be affected.
    expect(isPermittedWithOverrides("SETTER", "pd_lead.reassign", overrides)).toBe(false);
  });

  it("revokes a permission that the default grants", () => {
    overrides.set(cacheKey("MANAGER", "pd_lead.view_team"), false);
    expect(isPermittedWithOverrides("MANAGER", "pd_lead.view_team", overrides)).toBe(false);
    // Other MANAGER permissions unaffected.
    expect(isPermittedWithOverrides("MANAGER", "pd_lead.bulk", overrides)).toBe(true);
  });

  it("scopes overrides to a specific role", () => {
    overrides.set(cacheKey("SETTER", "pd_lead.convert"), true);
    expect(isPermittedWithOverrides("SETTER", "pd_lead.convert", overrides)).toBe(true);
    expect(isPermittedWithOverrides("CLOSER", "pd_lead.convert", overrides)).toBe(true);
    expect(isPermittedWithOverrides("OPERATIONS", "pd_lead.convert", overrides)).toBe(true);
  });

  it("false override takes precedence over a true default", () => {
    // Explicit revoke wins even if the role would normally have it.
    overrides.set(cacheKey("CLOSER", "pd_lead.convert"), false);
    expect(defaultAllowsPermission("CLOSER", "pd_lead.convert")).toBe(true);
    expect(isPermittedWithOverrides("CLOSER", "pd_lead.convert", overrides)).toBe(false);
  });

  it("SUPER_ADMIN can grant reopen to CLOSER via override", () => {
    overrides.set(cacheKey("CLOSER", "pd_lead.reopen"), true);
    expect(defaultAllowsPermission("CLOSER", "pd_lead.reopen")).toBe(false);
    expect(isPermittedWithOverrides("CLOSER", "pd_lead.reopen", overrides)).toBe(true);
  });

  it("SUPER_ADMIN can revoke update_classification for OPERATIONS via override", () => {
    overrides.set(cacheKey("OPERATIONS", "pd_lead.update_classification"), false);
    expect(defaultAllowsPermission("OPERATIONS", "pd_lead.update_classification")).toBe(true);
    expect(
      isPermittedWithOverrides("OPERATIONS", "pd_lead.update_classification", overrides),
    ).toBe(false);
  });

  it("unknown role never grants any permission", () => {
    expect(
      isPermittedWithOverrides(
        "GHOST_ROLE" as unknown as Parameters<typeof isPermittedWithOverrides>[0],
        "pd_lead.view_own",
        overrides,
      ),
    ).toBe(false);
  });
});
