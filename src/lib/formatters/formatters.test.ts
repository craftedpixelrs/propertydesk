import { describe, expect, it } from "vitest";
import { formatMoney, sumMoney, toDecimal } from "./money";
import { formatDate, formatDateTime } from "./date";
import { formatInteger, formatNumber } from "./number";

describe("money formatter", () => {
  it("formats EUR with Serbian grouping and comma decimal", () => {
    const out = formatMoney("1234567.5", "EUR");
    expect(out).toContain("EUR");
    // Non-breaking space is standard in sr-Latn Intl output; check the
    // number portion by stripping non-digits and the trailing decimal comma.
    expect(out.replace(/\s/g, "")).toMatch(/1\.234\.567,50EUR/);
  });

  it("formats RSD", () => {
    const out = formatMoney(1000, "RSD");
    expect(out).toContain("RSD");
  });

  it("sums money values without rounding error", () => {
    const total = sumMoney([toDecimal("0.1"), toDecimal("0.2"), toDecimal("0.3")]);
    expect(total.toString()).toBe("0.6");
  });

  it("rejects unsupported currencies", () => {
    // @ts-expect-error - intentionally invalid
    expect(() => formatMoney(1, "USD")).toThrow();
  });
});

describe("date formatter", () => {
  it("formats a Date in Europe/Belgrade with trailing dot", () => {
    const d = new Date("2026-01-31T22:15:00Z");
    expect(formatDate(d)).toBe("31.01.2026.");
  });

  it("formats a date+time in Europe/Belgrade", () => {
    const d = new Date("2026-06-15T09:07:00Z");
    // June is CEST (+02); 09:07Z -> 11:07 local.
    expect(formatDateTime(d)).toBe("15.06.2026. 11:07");
  });
});

describe("number formatter", () => {
  it("formats integers with dot grouping", () => {
    expect(formatInteger(1234567)).toMatch(/1\.234\.567/);
  });

  it("formats decimals with comma", () => {
    expect(formatNumber(1234.56)).toMatch(/1\.234,56|1234,56/);
  });
});
