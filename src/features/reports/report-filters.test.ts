import { describe, expect, it } from "vitest";

import { toReportFilters } from "./report-filter-params";

describe("toReportFilters", () => {
  it("parses ISO dates as local start/end of day", () => {
    const filters = toReportFilters({
      organizationId: "org-1",
      from: "2026-03-01",
      to: "2026-03-31",
    });
    expect(filters.from?.getFullYear()).toBe(2026);
    expect(filters.from?.getMonth()).toBe(2);
    expect(filters.from?.getDate()).toBe(1);
    expect(filters.from?.getHours()).toBe(0);
    expect(filters.to?.getDate()).toBe(31);
    expect(filters.to?.getHours()).toBe(23);
    expect(filters.to?.getMinutes()).toBe(59);
  });
});
