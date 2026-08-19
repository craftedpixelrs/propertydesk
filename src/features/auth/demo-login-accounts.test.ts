import { describe, expect, it } from "vitest";

import { DEMO_LOGIN_ACCOUNTS } from "./demo-login-accounts";

describe("demo login accounts", () => {
  it("lists tenant roles and never the super-admin", () => {
    const emails = DEMO_LOGIN_ACCOUNTS.map((a) => a.email);
    expect(emails).toContain("vlasnik@gradnjaplus.test");
    expect(emails).toContain("agent@topnekretnine.test");
    expect(emails.some((email) => email.includes("admin@") || email.includes("super"))).toBe(
      false,
    );
    expect(DEMO_LOGIN_ACCOUNTS.some((a) => String(a.roleKey).includes("SUPER_ADMIN"))).toBe(
      false,
    );
  });
});
