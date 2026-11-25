import { describe, expect, it } from "vitest";

import { ticketNoticeOriginKey, ticketNoticeTitle, ticketStatusLabel } from "./ticket-notice";

describe("ticket notice identity", () => {
  it("keeps opened and closed keys stable and gives each status its own key", () => {
    expect(ticketNoticeOriginKey("t1", "opened")).toBe("ticket:t1:opened");
    expect(ticketNoticeOriginKey("t1", "closed")).toBe("ticket:t1:closed");
    expect(ticketNoticeOriginKey("t1", "TRIAGED")).toBe("ticket:t1:status:TRIAGED");
    expect(ticketNoticeOriginKey("t1", "IN_PROGRESS")).toBe("ticket:t1:status:IN_PROGRESS");
  });

  it("uses the same status words the ticket board shows", () => {
    expect(ticketStatusLabel("OPEN")).toBe("Prijavljeno");
    expect(ticketStatusLabel("TRIAGED")).toBe("Trijaža");
    expect(ticketStatusLabel("IN_PROGRESS")).toBe("U toku");
    expect(ticketStatusLabel("AWAITING_PARTS")).toBe("Čeka delove");
    expect(ticketStatusLabel("COMPLETED")).toBe("Završeno");
    expect(ticketStatusLabel("CANCELED")).toBe("Otkazano");
  });

  it("names an in-progress notice after the new status", () => {
    expect(ticketNoticeTitle({ phase: "TRIAGED", status: "TRIAGED", title: "Pokvaren lift" })).toBe(
      "Trijaža: Pokvaren lift",
    );
    expect(
      ticketNoticeTitle({ phase: "closed", status: "COMPLETED", title: "Pokvaren lift" }),
    ).toBe("Kvar je završen: Pokvaren lift");
    expect(ticketNoticeTitle({ phase: "closed", status: "CANCELED", title: "Pokvaren lift" })).toBe(
      "Prijava je otkazana: Pokvaren lift",
    );
  });
});
