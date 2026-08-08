import { describe, expect, it } from "vitest";
import { renderInvoiceNumber } from "./numbering.service";

describe("renderInvoiceNumber", () => {
  const ctx = { year: 2026, month: 7, seq: 42, orgCode: "propertydesk" };

  it("substitutes {YYYY}, {YY}, {MM}, {SEQ}", () => {
    expect(renderInvoiceNumber("PD-{YYYY}-{MM}-{SEQ}", ctx)).toBe("PD-2026-07-42");
    expect(renderInvoiceNumber("PD-{YY}-{SEQ}", ctx)).toBe("PD-26-42");
  });

  it("pads {SEQ:N} with leading zeros", () => {
    expect(renderInvoiceNumber("{SEQ:6}", ctx)).toBe("000042");
    expect(renderInvoiceNumber("{SEQ:2}", { ...ctx, seq: 3 })).toBe("03");
    expect(renderInvoiceNumber("{SEQ:2}", { ...ctx, seq: 1234 })).toBe("1234");
  });

  it("sanitizes org code to A-Z0-9 and truncates to 8 chars", () => {
    expect(renderInvoiceNumber("{ORG}", ctx)).toBe("PROPERTY");
    expect(renderInvoiceNumber("{ORG}", { ...ctx, orgCode: "Živ-Grad d.o.o." })).toBe("ZIVGRADD");
    expect(renderInvoiceNumber("{ORG}", { ...ctx, orgCode: null })).toBe("");
  });

  it("leaves unknown tokens empty rather than erroring", () => {
    expect(renderInvoiceNumber("{FOO}-{SEQ:3}", ctx)).toBe("-042");
  });

  it("handles month zero-padding when month is single digit", () => {
    expect(renderInvoiceNumber("{MM}", { ...ctx, month: 1 })).toBe("01");
    expect(renderInvoiceNumber("{MM}", { ...ctx, month: 12 })).toBe("12");
  });
});
