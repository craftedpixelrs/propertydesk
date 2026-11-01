import type { MaintenanceStatus } from "@prisma/client";

/** `opened` and `closed` stay stable so an existing notice is not published twice. */
export type TicketNoticePhase = "opened" | "closed" | MaintenanceStatus;

export function ticketNoticeOriginKey(ticketId: string, phase: TicketNoticePhase): string {
  if (phase === "opened") return `ticket:${ticketId}:opened`;
  if (phase === "closed") return `ticket:${ticketId}:closed`;
  return `ticket:${ticketId}:status:${phase}`;
}

export function ticketStatusLabel(status: MaintenanceStatus): string {
  switch (status) {
    case "OPEN":
      return "Otvoreno";
    case "TRIAGED":
      return "Prihvaćeno";
    case "IN_PROGRESS":
      return "U radu";
    case "AWAITING_PARTS":
      return "Čeka delove";
    case "COMPLETED":
      return "Završeno";
    case "CANCELED":
      return "Otkazano";
    default:
      return status;
  }
}

export function ticketNoticeTitle(input: {
  phase: TicketNoticePhase;
  status: MaintenanceStatus;
  title: string;
}): string {
  if (input.phase === "opened") return `Prijavljen kvar: ${input.title}`;
  if (input.phase === "closed") {
    const label = input.status === "CANCELED" ? "Prijava je otkazana" : "Kvar je završen";
    return `${label}: ${input.title}`;
  }
  return `${ticketStatusLabel(input.phase)}: ${input.title}`;
}
