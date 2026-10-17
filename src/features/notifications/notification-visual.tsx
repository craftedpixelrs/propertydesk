import {
  Banknote,
  Bell,
  Building2,
  CalendarClock,
  Coins,
  FileText,
  Handshake,
  ListTodo,
  Receipt,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/** Icon and tint for a notification category. Colors follow the theme tokens. */
export function notificationGlyph(category: string | null | undefined): {
  Icon: LucideIcon;
  tile: string;
} {
  switch (category) {
    case "RESERVATION":
      return {
        Icon: CalendarClock,
        tile: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
      };
    case "PAYMENT":
      return {
        Icon: Banknote,
        tile: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
      };
    case "SALE":
      return {
        Icon: Handshake,
        tile: "bg-[var(--color-violet-bg)] text-[var(--color-violet-fg)]",
      };
    case "AGENCY":
      return {
        Icon: Building2,
        tile: "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]",
      };
    case "COMMISSION":
      return {
        Icon: Coins,
        tile: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
      };
    case "TASK":
      return {
        Icon: ListTodo,
        tile: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
      };
    case "BUYER":
      return {
        Icon: UserRound,
        tile: "bg-[var(--color-violet-bg)] text-[var(--color-violet-fg)]",
      };
    case "DOCUMENT":
      return {
        Icon: FileText,
        tile: "bg-[var(--color-surface-inset)] text-[var(--color-foreground-muted)]",
      };
    case "BILLING":
      return {
        Icon: Receipt,
        tile: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
      };
    default:
      return {
        Icon: Bell,
        tile: "bg-[var(--color-surface-inset)] text-[var(--color-foreground-muted)]",
      };
  }
}
