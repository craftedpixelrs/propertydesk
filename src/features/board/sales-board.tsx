"use client";

import type { SaleStatus } from "@prisma/client";

import {
  type BoardColumn,
  type DropResult,
  KanbanBoard,
} from "@/features/board/kanban-board";
import { formatDate, formatMoney } from "@/lib/formatters";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/constants/app";
import type { SaleBoardCard } from "@/server/services/sales/sales.service";

function displayMoney(amount: string, currency: string): string {
  if (SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)) {
    return formatMoney(amount, currency as SupportedCurrency);
  }
  return `${amount} ${currency}`;
}

const STATUS_LABELS: Record<SaleStatus, string> = {
  DRAFT: "Nacrt",
  PRE_CONTRACT: "Predugovor",
  CONTRACTED: "Ugovor potpisan",
  PAYMENT_IN_PROGRESS: "Uplate u toku",
  PAID: "Uplaćeno",
  HANDED_OVER: "Primopredaja",
  CANCELED: "Otkazano",
};

const COLUMN_ORDER: SaleStatus[] = [
  "DRAFT",
  "PRE_CONTRACT",
  "CONTRACTED",
  "PAYMENT_IN_PROGRESS",
  "PAID",
  "HANDED_OVER",
  "CANCELED",
];

const TONE: Record<SaleStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-700",
  PRE_CONTRACT: "bg-sky-100 text-sky-700",
  CONTRACTED: "bg-indigo-100 text-indigo-700",
  PAYMENT_IN_PROGRESS: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  HANDED_OVER: "bg-emerald-200 text-emerald-800",
  CANCELED: "bg-rose-100 text-rose-700",
};

// Mirror of `ALLOWED_SALE_TRANSITIONS` in sales.service. `PAYMENT_IN_PROGRESS`
// is intentionally not a drop target: it is derived from payments, so no
// column can be dragged into it manually.
const ALLOWED: Record<SaleStatus, SaleStatus[]> = {
  DRAFT: ["PRE_CONTRACT", "CONTRACTED", "CANCELED"],
  PRE_CONTRACT: ["CONTRACTED", "CANCELED"],
  CONTRACTED: ["PAID", "CANCELED"],
  PAYMENT_IN_PROGRESS: ["PAID", "CANCELED"],
  PAID: ["HANDED_OVER"],
  HANDED_OVER: [],
  CANCELED: [],
};

interface Props {
  columns: {
    status: SaleStatus;
    total: number;
    cards: (Omit<SaleBoardCard, "createdAt" | "contractDate"> & {
      createdAt: string;
      contractDate: string | null;
    })[];
  }[];
  canManage: boolean;
}

export function SalesBoard({ columns, canManage }: Props) {
  const byStatus = new Map(columns.map((c) => [c.status, c] as const));
  const board: BoardColumn<
    SaleBoardCard & { createdAt: string; contractDate: string | null }
  >[] = COLUMN_ORDER.map((status) => {
    const col = byStatus.get(status);
    return {
      status,
      title: STATUS_LABELS[status],
      total: col?.total ?? 0,
      cards: (col?.cards ?? []) as (SaleBoardCard & {
        createdAt: string;
        contractDate: string | null;
      })[],
      readOnly: status === "PAYMENT_IN_PROGRESS",
      hint:
        status === "PAYMENT_IN_PROGRESS"
          ? "Automatska kolona — račna se iz uplata."
          : undefined,
    };
  });

  return (
    <KanbanBoard
      columns={board}
      canDrag={canManage}
      columnTone={TONE}
      cardHref={(c) => `/prodaje/${c.id}`}
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
          <div className="text-xs font-medium">
            {displayMoney(c.finalPrice, c.currency)}
          </div>
          {c.contractDate ? (
            <div className="text-[10px] text-[var(--color-foreground-muted)]">
              Ugovor {formatDate(c.contractDate)}
            </div>
          ) : null}
        </div>
      )}
      planMove={(card, to): DropResult | null => {
        const from = card.status as SaleStatus;
        const target = to as SaleStatus;
        if (!ALLOWED[from].includes(target)) return null;
        const body: Record<string, unknown> = { expectedVersion: card.version };
        if (target === "CANCELED") {
          return {
            kind: "call",
            path: `/sales/${card.id}/cancel`,
            body: { ...body, reason: "Otkazano sa table" },
          };
        }
        return {
          kind: "call",
          path: `/sales/${card.id}/status`,
          body: { ...body, target },
        };
      }}
    />
  );
}
