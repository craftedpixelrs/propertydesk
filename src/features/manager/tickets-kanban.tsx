"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { MaintenancePriority, MaintenanceStatus } from "@prisma/client";

import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { useOpenTicket } from "@/features/manager/ticket-drawer";

const STATUS_ORDER: MaintenanceStatus[] = [
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "AWAITING_PARTS",
  "COMPLETED",
  "CANCELED",
];

const STATUS_TONE: Record<MaintenanceStatus, string> = {
  OPEN: "border-amber-300 bg-amber-50",
  TRIAGED: "border-sky-300 bg-sky-50",
  IN_PROGRESS: "border-indigo-300 bg-indigo-50",
  AWAITING_PARTS: "border-purple-300 bg-purple-50",
  COMPLETED: "border-emerald-300 bg-emerald-50",
  CANCELED: "border-neutral-300 bg-neutral-50",
};

const PRIORITY_TONE: Record<MaintenancePriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  NORMAL: "bg-sky-100 text-sky-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

export interface KanbanTicket {
  id: string;
  code: string;
  title: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  buildingName: string;
  unitCode: string | null;
}

/**
 * Faza 11 — board view for `/zgrade/kvarovi?view=board`. Columns are the
 * canonical status pipeline. Drag-and-drop is HTML5 native (no extra deps)
 * and only triggers a PATCH when the destination status differs. On
 * success we `router.refresh()` so the server page re-reads the ticket
 * (and the audit entry is already written).
 */
export function TicketsKanban({
  tickets,
  activeId,
}: {
  tickets: KanbanTicket[];
  activeId?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const openTicket = useOpenTicket();
  const dragged = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: tickets.filter((t) => t.status === status),
  }));

  async function moveTicket(id: string, nextStatus: MaintenanceStatus) {
    const current = tickets.find((x) => x.id === id);
    if (!current || current.status === nextStatus) return;
    setError(null);
    try {
      await apiClient.patch(`/manager/tickets/${id}`, { status: nextStatus });
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri izmeni statusa.");
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p>
      ) : null}
      <div className="grid gap-3 overflow-x-auto md:grid-cols-3 xl:grid-cols-6">
        {grouped.map((col) => (
          <div
            key={col.status}
            className={`min-h-[200px] rounded-md border p-2 ${STATUS_TONE[col.status]}`}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) {
                void moveTicket(dragId, col.status);
                setDragId(null);
              }
            }}
          >
            <div className="mb-2 flex items-center justify-between text-xs font-semibold tracking-wide uppercase">
              <span>{t(`manager.tickets.status.${col.status}` as const)}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px]">
                {col.items.length}
              </span>
            </div>
            {col.items.length === 0 ? (
              <p className="text-xs text-[var(--color-foreground-muted)]">
                {t("manager.ticket.kanbanEmpty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {col.items.map((ticket) => (
                  <li
                    key={ticket.id}
                    draggable
                    onDragStart={() => {
                      dragged.current = true;
                      setDragId(ticket.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      window.setTimeout(() => {
                        dragged.current = false;
                      }, 0);
                    }}
                    onClick={() => {
                      if (dragged.current) {
                        dragged.current = false;
                        return;
                      }
                      openTicket(ticket.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openTicket(ticket.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`cursor-grab rounded border bg-[var(--color-surface)] p-2 shadow-sm transition active:cursor-grabbing ${
                      activeId === ticket.id
                        ? "border-[var(--color-brand-700)]"
                        : "border-[var(--color-border)]"
                    } ${isPending && dragId === ticket.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs text-[var(--color-brand-700)]">
                        {ticket.code}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_TONE[ticket.priority]}`}
                      >
                        {t(`manager.tickets.priority.${ticket.priority}` as const)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium">{ticket.title}</div>
                    <div className="mt-1 text-[11px] text-[var(--color-foreground-muted)]">
                      {ticket.buildingName}
                      {ticket.unitCode ? ` · ${ticket.unitCode}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
