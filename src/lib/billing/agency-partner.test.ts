import { describe, expect, it } from "vitest";

import { applyAgencyOrgDefaults, isAgencyPartnerPlan } from "./agency-partner";

describe("applyAgencyOrgDefaults", () => {
  it("forces the partner plan, ACTIVE status, and no trial", () => {
    expect(
      applyAgencyOrgDefaults({
        type: "AGENCY",
        planCode: "starter",
        status: "TRIAL",
        trialDays: 30,
      }),
    ).toEqual({
      type: "AGENCY",
      planCode: "partner",
      status: "ACTIVE",
      trialDays: 0,
    });
  });

  it("keeps an explicit suspend/close", () => {
    expect(
      applyAgencyOrgDefaults({
        type: "AGENCY",
        planCode: "growth",
        status: "SUSPENDED",
        trialDays: 14,
      }).status,
    ).toBe("SUSPENDED");
  });

  it("leaves investors unchanged", () => {
    const input = {
      type: "INVESTOR" as const,
      planCode: "starter",
      status: "TRIAL" as const,
      trialDays: 30,
    };
    expect(applyAgencyOrgDefaults(input)).toEqual(input);
  });
});

describe("isAgencyPartnerPlan", () => {
  it("matches partner", () => {
    expect(isAgencyPartnerPlan("partner")).toBe(true);
    expect(isAgencyPartnerPlan("starter")).toBe(false);
  });
});
