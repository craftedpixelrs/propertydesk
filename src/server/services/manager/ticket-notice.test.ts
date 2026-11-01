import { describe, expect, it } from "vitest";

import { ticketNoticeOriginKey, ticketNoticeTitle } from "./ticket-notice";

describe("ticket notice identity", () => {
  it("keeps opened and closed keys stable and gives each status its own key", () => {
    expect(ticketNoticeOriginKey("t1", "opened")).toBe("ticket:t1:opened");
    expect(ticketNoticeOriginKey("t1", "closed")).toBe("ticket:t1:closed");
    expect(ticketNoticeOriginKey("t1", "TRIAGED")).toBe("ticket:t1:status:TRIAGED");
    expect(ticketNoticeOriginKey("t1", "IN_PROGRESS")).toBe("ticket:t1:status:IN_PROGRESS");
  });

  it("names an in-progress notice after the new status", () => {
    expect(ticketNoticeTitle({ phase: "TRIAGED", status: "TRIAGED", title: "Pokvaren lift" })).toBe(
      "Prihvaćeno: Pokvaren lift",
    );
    expect(
      ticketNoticeTitle({ phase: "closed", status: "COMPLETED", title: "Pokvaren lift" }),
    ).toBe("Kvar je završen: Pokvaren lift");
    expect(ticketNoticeTitle({ phase: "closed", status: "CANCELED", title: "Pokvaren lift" })).toBe(
      "Prijava je otkazana: Pokvaren lift",
    );
  });
});
