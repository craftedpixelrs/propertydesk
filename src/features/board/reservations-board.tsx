"use client";

import type { ReservationStatus } from "@prisma/client";

import {
  type BoardColumn,
  type DropResult,
  KanbanBoard,
} from "@/features/board/kanban-board";
import { formatDate } from "@/lib/formatters";
import type { ReservationBoardCard } from "@/server/services/reservations.service";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  REQUESTED: "Na čekanju",
  APPROVED: "Odobrena",
  CONVERTED: "Pretvorena u prodaju",
  REJECTED: "Odbijena",
  EXPIRED: "Istekla",
  CANCELED: "Otkazana",
};

const COLUMN_ORDER: ReservationStatus[] = [
  "REQUESTED",
  "APPROVED",
  "CONVERTED",
  "REJECTED",
  "EXPIRED",
  "CANCELED",
];

const TONE: Record<ReservationStatus, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  CONVERTED: "bg-indigo-100 text-indigo-700",
  REJECTED: "bg-rose-100 text-rose-700",
  EXPIRED: "bg-neutral-200 text-neutral-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
};

// Mirror of `ALLOWED_RESERVATION_TRANSITIONS` in reservations.service.
// The server is still the authority; we mirror here only to *disable*
// visibly-impossible drops during a drag so the user gets feedback
// before the server would refuse.
const ALLOWED: Record<ReservationStatus, ReservationStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED", "CANCELED"],
  APPROVED: ["CONVERTED", "CANCELED"],
  REJECTED: [],
  EXPIRED: [],
  CANCELED: [],
  CONVERTED: [],
};

interface Props {
  columns: {
    status: ReservationStatus;
    total: number;
    cards: (Omit<ReservationBoardCard, "createdAt" | "expiresAt"> & {
      createdAt: string;
      expiresAt: string | null;
    })[];
  }[];
  canApprove: boolean;
  canManageSales: boolean;
}

export function ReservationsBoard({ columns, canApprove, canManageSales }: Props) {
  const byStatus = new Map(columns.map((c) => [c.status, c] as const));

  const board: BoardColumn<ReservationBoardCard & { createdAt: string; expiresAt: string | null }>[] =
    COLUMN_ORDER.map((status) => {
      const col = byStatus.get(status);
      return {
        status,
        title: STATUS_LABELS[status],
        total: col?.total ?? 0,
        cards: (col?.cards ?? []) as (ReservationBoardCard & {
          createdAt: string;
          expiresAt: string | null;
        })[],
        hint:
          status === "CONVERTED"
            ? "Prevlačenje otvara ekran za konverziju."
            : undefined,
      };
    });

  return (
    <KanbanBoard
      columns={board}
      canDrag={canApprove}
      columnTone={TONE}
      cardHref={(c) => `/rezervacije/${c.id}`}
      renderCard={(c) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[var(--color-foreground)]">
              {c.unitCode}
            </span>
            <span className="text-[10px] text-[var(--color-foreground-muted)]">
              {formatDate(c.createdAt)}
            </span>
          </div>
          <div className="text-xs text-[var(--color-foreground-muted)]">
            {c.projectName}
          </div>
          <div className="truncate text-xs">{c.buyerName}</div>
          {c.expiresAt ? (
            <div className="text-[10px] text-[var(--color-foreground-muted)]">
              Ističe {formatDate(c.expiresAt)}
            </div>
          ) : null}
        </div>
      )}
      planMove={(card, to): DropResult | null => {
        const from = card.status as ReservationStatus;
        const target = to as ReservationStatus;
        if (!ALLOWED[from].includes(target)) return null;

        if (target === "CONVERTED") {
          if (!canManageSales) {
            return { kind: "reject", reason: "Nemate dozvolu za kreiranje prodaje." };
          }
          return { kind: "redirect", href: `/prodaje/nova?reservation=${card.id}` };
        }
        const body: Record<string, unknown> = { expectedVersion: card.version };
        if (target === "APPROVED") {
          return { kind: "call", path: `/reservations/${card.id}/approve`, body };
        }
        if (target === "REJECTED") {
          return {
            kind: "call",
            path: `/reservations/${card.id}/reject`,
            body: { ...body, reason: "Odbijeno sa table" },
          };
        }
        if (target === "CANCELED") {
          return { kind: "call", path: `/reservations/${card.id}/cancel`, body };
        }
        return null;
      }}
    />
  );
}
