import { describe, expect, it } from "vitest";
import { pickReminderStage } from "./service";

const schedule = [
  { offsetDays: -3, templateKey: "reminder.pre_due", channel: "both" as const },
  { offsetDays: 0, templateKey: "reminder.due_day", channel: "both" as const },
  { offsetDays: 3, templateKey: "reminder.post_due", channel: "both" as const },
  { offsetDays: 7, templateKey: "reminder.final_notice", channel: "both" as const },
];

function daysAgo(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * 24 * 60 * 60 * 1000);
}

describe("pickReminderStage", () => {
  const due = new Date("2026-07-10T00:00:00.000Z");

  it("returns null when the schedule window hasn't started yet", () => {
    const now = daysAgo(due, 10);
    expect(pickReminderStage(due, now, schedule)).toBeNull();
  });

  it("picks pre_due when 3 days before due date", () => {
    const now = daysAgo(due, 3);
    const stage = pickReminderStage(due, now, schedule);
    expect(stage?.templateKey).toBe("reminder.pre_due");
  });

  it("picks due_day on the exact due date", () => {
    const stage = pickReminderStage(due, due, schedule);
    expect(stage?.templateKey).toBe("reminder.due_day");
  });

  it("picks post_due at day 3 after due", () => {
    const now = new Date(due.getTime() + 3 * 24 * 60 * 60 * 1000);
    const stage = pickReminderStage(due, now, schedule);
    expect(stage?.templateKey).toBe("reminder.post_due");
  });

  it("clamps to final_notice for very overdue invoices", () => {
    const now = new Date(due.getTime() + 60 * 24 * 60 * 60 * 1000);
    const stage = pickReminderStage(due, now, schedule);
    expect(stage?.templateKey).toBe("reminder.final_notice");
  });

  it("handles unsorted schedule input", () => {
    const shuffled = [schedule[3], schedule[0], schedule[2], schedule[1]] as typeof schedule;
    const stage = pickReminderStage(due, due, shuffled);
    expect(stage?.templateKey).toBe("reminder.due_day");
  });
});
