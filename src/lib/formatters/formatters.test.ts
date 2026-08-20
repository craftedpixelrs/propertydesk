import { describe, expect, it } from "vitest";
import { formatMoney, sumMoney, toDecimal } from "./money";
import {
  formatDate,
  formatDateTime,
  formatDateInputValue,
  parseDateInputValue,
  formatDateTimeInputValue,
  parseDateTimeInputValue,
} from "./date";
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

  it("formats English display as MM/dd/yyyy", () => {
    const d = new Date("2026-01-31T22:15:00Z");
    expect(formatDate(d, undefined, "en")).toBe("01/31/2026");
  });

  it("converts the same ISO date between input locales", () => {
    expect(formatDateInputValue("2026-08-20", "sr-Latn")).toBe("20.08.2026");
    expect(formatDateInputValue("2026-08-20", "en")).toBe("08/20/2026");
    expect(parseDateInputValue("20.08.2026", "sr-Latn")).toBe("2026-08-20");
    expect(parseDateInputValue("08/20/2026", "en")).toBe("2026-08-20");
    expect(parseDateInputValue("2026-08-20", "en")).toBe("2026-08-20");
  });

  it("reads 01/02/2026 as February in Serbian and January in English", () => {
    expect(parseDateInputValue("01.02.2026", "sr-Latn")).toBe("2026-02-01");
    expect(parseDateInputValue("01/02/2026", "en")).toBe("2026-01-02");
  });

  it("parses datetime input in both locales", () => {
    expect(formatDateTimeInputValue("2026-08-20T14:30", "sr-Latn")).toBe(
      "20.08.2026 14:30",
    );
    expect(formatDateTimeInputValue("2026-08-20T14:30", "en")).toBe(
      "08/20/2026 14:30",
    );
    expect(parseDateTimeInputValue("20.08.2026 14:30", "sr-Latn")).toBe(
      "2026-08-20T14:30",
    );
    expect(parseDateTimeInputValue("08/20/2026 14:30", "en")).toBe(
      "2026-08-20T14:30",
    );
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
