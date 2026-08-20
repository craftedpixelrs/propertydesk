import { describe, expect, it } from "vitest";

import { agencyNameFromEmail, slugifyAgencyName } from "./name";

describe("slugifyAgencyName", () => {
  it("turns a Serbian name into a url slug", () => {
    expect(slugifyAgencyName("Top Nekretnine")).toBe("top-nekretnine");
  });

  it("falls back when the name has no latin letters", () => {
    expect(slugifyAgencyName("!!!")).toBe("agencija");
  });
});

describe("agencyNameFromEmail", () => {
  it("uses the local part of the email", () => {
    expect(agencyNameFromEmail("office@topnekretnine.rs")).toBe("office");
  });
});
