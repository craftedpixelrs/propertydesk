import "server-only";

import { prisma } from "@/server/db/prisma";

/**
 * Calendar service — joins four time-stamped sources into a single
 * event stream:
 *
 *   1. `Reservation.expiresAt` — reservation hold deadline.
 *   2. `PaymentInstallment.dueDate` — planned installment due dates.
 *   3. `Task.dueAt`               — CRM follow-up deadlines.
 *   4. `Sale.plannedHandoverDate` — planned unit hand-over.
 *
 * Each source is queried independently with a narrow `where` clause so
 * the caller can drop entire types (e.g. hide tasks) without paying
 * their query cost.
 */

export type CalendarEventType =
  | "reservation-expiry"
  | "payment-due"
  | "task"
  | "sale-handover";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  /** ISO 8601 UTC — the client renders in local time. */
  date: string;
  title: string;
  subtitle?: string;
  href?: string;
  /** Optional metadata for coloring (e.g. task priority). */
  meta?: Record<string, string | number | boolean | null>;
}

export interface LoadCalendarEventsInput {
  organizationId: string;
  from: Date;
  to: Date;
  types?: CalendarEventType[];
}

export async function loadCalendarEvents(
  input: LoadCalendarEventsInput,
): Promise<CalendarEvent[]> {
  const { organizationId, from, to } = input;
  const enabled = (t: CalendarEventType) =>
    !input.types || input.types.includes(t);

  const [reservations, installments, tasks, sales] = await Promise.all([
    enabled("reservation-expiry")
      ? prisma.reservation.findMany({
          where: {
            organizationId,
            expiresAt: { gte: from, lte: to },
            status: { in: ["REQUESTED", "APPROVED"] },
          },
          select: {
            id: true,
            expiresAt: true,
            status: true,
            unit: { select: { code: true } },
            buyer: { select: { firstName: true, lastName: true } },
          },
        })
      : Promise.resolve([]),
    enabled("payment-due")
      ? prisma.paymentInstallment.findMany({
          where: {
            paymentPlan: { organizationId },
            dueDate: { gte: from, lte: to },
          },
          select: {
            id: true,
            dueDate: true,
            name: true,
            amount: true,
            status: true,
            paymentPlan: {
              select: {
                currency: true,
                sale: {
                  select: {
                    id: true,
                    unit: { select: { code: true } },
                    buyer: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    enabled("task")
      ? prisma.task.findMany({
          where: {
            organizationId,
            dueAt: { gte: from, lte: to },
            status: { notIn: ["COMPLETED", "CANCELED"] },
          },
          select: {
            id: true,
            dueAt: true,
            title: true,
            priority: true,
            assignedUser: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    enabled("sale-handover")
      ? prisma.sale.findMany({
          where: {
            organizationId,
            plannedHandoverDate: { gte: from, lte: to },
            status: { in: ["CONTRACTED", "PAYMENT_IN_PROGRESS", "PAID"] },
          },
          select: {
            id: true,
            plannedHandoverDate: true,
            unit: { select: { code: true } },
            buyer: { select: { firstName: true, lastName: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const events: CalendarEvent[] = [];

  for (const r of reservations) {
    if (!r.expiresAt) continue;
    events.push({
      id: `res:${r.id}`,
      type: "reservation-expiry",
      date: r.expiresAt.toISOString(),
      title: r.unit?.code ?? "—",
      subtitle: r.buyer
        ? `${r.buyer.firstName} ${r.buyer.lastName}`
        : undefined,
      href: `/rezervacije/${r.id}`,
      meta: { status: r.status, unitCode: r.unit?.code ?? "—" },
    });
  }

  for (const inst of installments) {
    const sale = inst.paymentPlan?.sale;
    events.push({
      id: `inst:${inst.id}`,
      type: "payment-due",
      date: inst.dueDate.toISOString(),
      title: inst.name,
      subtitle: sale
        ? `${sale.unit?.code ?? "—"}${
            sale.buyer ? ` · ${sale.buyer.firstName} ${sale.buyer.lastName}` : ""
          }`
        : undefined,
      href: sale ? `/prodaje/${sale.id}` : undefined,
      meta: {
        amount: inst.amount.toString(),
        currency: inst.paymentPlan?.currency ?? null,
        status: inst.status,
      },
    });
  }

  for (const task of tasks) {
    events.push({
      id: `task:${task.id}`,
      type: "task",
      date: task.dueAt.toISOString(),
      title: task.title,
      subtitle: task.assignedUser?.name ?? undefined,
      href: `/zadaci`,
      meta: { priority: task.priority },
    });
  }

  for (const sale of sales) {
    if (!sale.plannedHandoverDate) continue;
    events.push({
      id: `handover:${sale.id}`,
      type: "sale-handover",
      date: sale.plannedHandoverDate.toISOString(),
      title: sale.unit?.code ?? "—",
      subtitle: sale.buyer
        ? `${sale.buyer.firstName} ${sale.buyer.lastName}`
        : undefined,
      href: `/prodaje/${sale.id}`,
      meta: { unitCode: sale.unit?.code ?? "—" },
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
