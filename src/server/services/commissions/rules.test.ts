import { describe, expect, it } from "vitest";
import type { AgencyCommissionRule } from "@prisma/client";
import Decimal from "decimal.js";

import { resolveCommissionRule } from "./rules";

/**
 * Precedence resolver tests.
 *
 * The resolver is pure so we drive it with plain fixtures — no DB or ORM
 * dependencies. Every tier of the hierarchy has its own case, plus a
 * validity-window test that must skip rules outside their window.
 */

function makeRule(partial: Partial<AgencyCommissionRule> & { id: string }): AgencyCommissionRule {
  const now = new Date("2026-06-01T00:00:00.000Z");
  return {
    id: partial.id,
    investorOrganizationId: "inv-1",
    agencyConnectionId: partial.agencyConnectionId ?? null,
    projectId: partial.projectId ?? null,
    unitId: partial.unitId ?? null,
    calculationType: partial.calculationType ?? "PERCENTAGE",
    rate: partial.rate ?? new Decimal(3),
    fixedAmount: partial.fixedAmount ?? null,
    currency: partial.currency ?? "EUR",
    validFrom: partial.validFrom ?? null,
    validTo: partial.validTo ?? null,
    internalNote: partial.internalNote ?? null,
    agencyVisibleNote: partial.agencyVisibleNote ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  } as AgencyCommissionRule;
}

describe("resolveCommissionRule", () => {
  const ctx = { agencyConnectionId: "conn-1", projectId: "proj-1", unitId: "unit-1" };

  it("picks the unit+agency rule when one exists", () => {
    const unitAgency = makeRule({
      id: "r-unit",
      agencyConnectionId: "conn-1",
      projectId: "proj-1",
      unitId: "unit-1",
    });
    const projectAgency = makeRule({
      id: "r-proj-agency",
      agencyConnectionId: "conn-1",
      projectId: "proj-1",
    });
    const connectionDefault = makeRule({ id: "r-conn", agencyConnectionId: "conn-1" });
    const projectDefault = makeRule({ id: "r-proj", projectId: "proj-1" });

    const winner = resolveCommissionRule(
      [projectDefault, connectionDefault, projectAgency, unitAgency],
      ctx,
    );
    expect(winner?.rule.id).toBe("r-unit");
    expect(winner?.tier).toBe("UNIT_AGENCY");
  });

  it("falls back to project+agency when no unit rule matches", () => {
    const projectAgency = makeRule({
      id: "r-proj-agency",
      agencyConnectionId: "conn-1",
      projectId: "proj-1",
    });
    const connectionDefault = makeRule({ id: "r-conn", agencyConnectionId: "conn-1" });
    const winner = resolveCommissionRule([connectionDefault, projectAgency], ctx);
    expect(winner?.rule.id).toBe("r-proj-agency");
    expect(winner?.tier).toBe("PROJECT_AGENCY");
  });

  it("falls back to the connection default when the project has no matching rule", () => {
    const connectionDefault = makeRule({ id: "r-conn", agencyConnectionId: "conn-1" });
    const projectDefault = makeRule({ id: "r-proj", projectId: "proj-1" });
    const winner = resolveCommissionRule([projectDefault, connectionDefault], ctx);
    expect(winner?.rule.id).toBe("r-conn");
    expect(winner?.tier).toBe("CONNECTION_DEFAULT");
  });

  it("falls back to the project default when no agency-specific rule matches", () => {
    const projectDefault = makeRule({ id: "r-proj", projectId: "proj-1" });
    const winner = resolveCommissionRule([projectDefault], ctx);
    expect(winner?.rule.id).toBe("r-proj");
    expect(winner?.tier).toBe("PROJECT_DEFAULT");
  });

  it("returns null when no rule matches", () => {
    const winner = resolveCommissionRule([], ctx);
    expect(winner).toBeNull();
  });

  it("skips rules outside their validity window", () => {
    const at = new Date("2026-06-01T00:00:00.000Z");
    const expired = makeRule({
      id: "r-expired",
      agencyConnectionId: "conn-1",
      projectId: "proj-1",
      unitId: "unit-1",
      validTo: new Date("2026-01-01T00:00:00.000Z"),
    });
    const active = makeRule({
      id: "r-active",
      agencyConnectionId: "conn-1",
      projectId: "proj-1",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
    });
    const winner = resolveCommissionRule([expired, active], { ...ctx, at });
    expect(winner?.rule.id).toBe("r-active");
  });

  it("prefers the newer rule within the same tier", () => {
    const older = makeRule({
      id: "r-old",
      agencyConnectionId: "conn-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const newer = makeRule({
      id: "r-new",
      agencyConnectionId: "conn-1",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
    });
    const winner = resolveCommissionRule([older, newer], ctx);
    expect(winner?.rule.id).toBe("r-new");
  });
});
