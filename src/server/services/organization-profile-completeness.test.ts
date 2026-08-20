import { describe, expect, it } from "vitest";

import {
  isAgencyProfileComplete,
  isInvestorProfileComplete,
  missingAgencyProfileFields,
  missingInvestorProfileFields,
  normalizeWebsite,
} from "./organization-profile-completeness";

const complete = {
  displayName: "Gradnja Plus",
  legalName: "Gradnja Plus d.o.o.",
  taxNumber: "123456789",
  registrationNumber: "12345678",
  address: "Knez Mihailova 1",
  city: "Beograd",
  postalCode: "11000",
  phone: "+381111111",
  email: "office@example.rs",
  website: "https://example.rs",
};

describe("investor profile completeness", () => {
  it("treats a missing profile as incomplete", () => {
    expect(isInvestorProfileComplete(null)).toBe(false);
    expect(missingInvestorProfileFields(null)).toContain("taxNumber");
  });

  it("accepts a fully filled profile", () => {
    expect(isInvestorProfileComplete(complete)).toBe(true);
    expect(missingInvestorProfileFields(complete)).toEqual([]);
  });

  it("flags blank optional-looking fields (PIB, website, …)", () => {
    expect(
      missingInvestorProfileFields({
        ...complete,
        taxNumber: "  ",
        website: null,
        phone: "",
      }),
    ).toEqual(["taxNumber", "phone", "website"]);
  });
});

describe("agency profile completeness", () => {
  it("requires every field except website", () => {
    expect(isAgencyProfileComplete(complete)).toBe(true);
    expect(missingAgencyProfileFields({ ...complete, website: null })).toEqual(
      [],
    );
    expect(
      missingAgencyProfileFields({
        ...complete,
        taxNumber: "",
        postalCode: null,
        website: null,
      }),
    ).toEqual(["taxNumber", "postalCode"]);
  });
});

describe("normalizeWebsite", () => {
  it("returns null for empty values", () => {
    expect(normalizeWebsite("")).toBeNull();
    expect(normalizeWebsite(null)).toBeNull();
  });

  it("prefixes https when the protocol is missing", () => {
    expect(normalizeWebsite("www.gradnja.rs")).toBe("https://www.gradnja.rs");
    expect(normalizeWebsite("https://gradnja.rs")).toBe("https://gradnja.rs");
  });
});
