import { describe, expect, it } from "vitest";

import {
  publicReferralPath,
  referralCodeFromUrl,
  sanitizeReferralCode,
} from "./referral";

describe("sanitizeReferralCode", () => {
  it("keeps a normal 8-char code", () => {
    expect(sanitizeReferralCode("PRV2WS4Q")).toBe("PRV2WS4Q");
  });

  it("strips junk and caps length", () => {
    expect(sanitizeReferralCode(" ab!cd ")).toBe("abcd");
    expect(sanitizeReferralCode("A".repeat(40))).toBe("A".repeat(32));
  });

  it("returns null for empty input", () => {
    expect(sanitizeReferralCode("")).toBeNull();
    expect(sanitizeReferralCode("!!!")).toBeNull();
    expect(sanitizeReferralCode(null)).toBeNull();
  });
});

describe("referralCodeFromUrl", () => {
  it("prefers the query string", () => {
    expect(referralCodeFromUrl("/p/r/AAAA1111", "PRV2WS4Q")).toBe("PRV2WS4Q");
  });

  it("reads the catalog path when there is no query", () => {
    expect(referralCodeFromUrl("/p/r/PRV2WS4Q", null)).toBe("PRV2WS4Q");
    expect(referralCodeFromUrl("/p/r/PRV2WS4Q/", null)).toBe("PRV2WS4Q");
  });

  it("ignores other paths", () => {
    expect(referralCodeFromUrl("/sign-in", null)).toBeNull();
    expect(referralCodeFromUrl("/p/projekat/foo", null)).toBeNull();
  });
});

describe("publicReferralPath", () => {
  it("builds the buyer catalog URL", () => {
    expect(publicReferralPath("PRV2WS4Q")).toBe("/p/r/PRV2WS4Q");
  });
});
