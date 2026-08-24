import { describe, expect, it } from "vitest";

import {
  formatPayeeName,
  paymentInstructionLines,
} from "./deposit-payee";

describe("paymentInstructionLines", () => {
  it("prints the agency account when the payee is an agency", () => {
    const lines = paymentInstructionLines({
      kind: "agency",
      recipientName: "Top Nekretnine d.o.o.",
      accountNumber: "160000000000654321",
      bankName: "OTP banka",
      reference: "97 34-756429988067",
      amount: "500.00",
      currency: "EUR",
    });
    expect(lines.join("\n")).toContain("Top Nekretnine d.o.o. (agencija)");
    expect(lines.join("\n")).toContain("160000000000654321");
    expect(lines.join("\n")).toContain("97 34-756429988067");
  });

  it("explains a missing account instead of inventing one", () => {
    const lines = paymentInstructionLines({
      kind: "investor",
      recipientName: "Gradnja Plus",
      accountNumber: null,
      bankName: null,
      reference: "97 11-1",
      amount: "1000",
      currency: "RSD",
    });
    expect(lines.join("\n")).toContain("nije unet");
    expect(lines.join("\n")).not.toContain("Tekući račun:");
  });
});

describe("formatPayeeName", () => {
  it("prefers the legal name", () => {
    expect(
      formatPayeeName({ legalName: "Gradnja Plus d.o.o.", displayName: "GP" }),
    ).toBe("Gradnja Plus d.o.o.");
  });
});
