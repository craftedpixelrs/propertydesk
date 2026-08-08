"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

/**
 * Generic Kanban board.
 *
 * The board is deliberately dumb: it renders columns of cards and asks
 * the caller to answer three questions per drop:
 *
 *  1. is `from → to` an allowed FSM transition for this card?
 *  2. what should we do when the user drops there — call an endpoint,
 *     open a dialog, redirect somewhere?
 *  3. how should each card be rendered?
 *
 * The reservation and sale boards both wire the same generic UI onto
 * different state machines and endpoints, so keeping the transition
 * logic outside the DnD widget is important — the FSMs live in the
 * server services and re-encoding them here would just create a second
 * source of truth.
 */

export interface BoardCard {
  id: string;
  status: string;
  version?: number;
}

export interface BoardColumn<C extends BoardCard> {
  status: string;
  title: string;
  hint?: string;
  total: number;
  cards: C[];
  /** Column is displayed but drop is refused (e.g. `PAYMENT_IN_PROGRESS`). */
  readOnly?: boolean;
}

export type DropResult =
  | { kind: "call"; path: string; body?: Record<string, unknown> }
  | { kind: "redirect"; href: string }
  | { kind: "reject"; reason?: string };

export interface KanbanBoardProps<C extends BoardCard> {
  columns: BoardColumn<C>[];
  renderCard: (card: C) => React.ReactNode;
  cardHref?: (card: C) => string;
  canDrag: boolean;
  /** Return `null` to forbid the move; otherwise describe how to execute it. */
  planMove: (card: C, toStatus: string) => DropResult | null;
  /** Column headline color per status (tailwind background classes). */
  columnTone?: Record<string, string>;
}

export function KanbanBoard<C extends BoardCard>({
  columns,
  renderCard,
  cardHref,
  canDrag,
  planMove,
  columnTone,
}: KanbanBoardProps<C>) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cardById = useMemo(() => {
    const m = new Map<string, C>();
    for (const col of columns) for (const c of col.cards) m.set(c.id, c);
    return m;
  }, [columns]);

  // Slightly larger activation distance so tapping a card link on
  // touch devices doesn't accidentally start a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeCard = activeId ? cardById.get(activeId) ?? null : null;

  function onDragStart(evt: DragStartEvent) {
    if (!canDrag) return;
    setActiveId(String(evt.active.id));
    setError(null);
  }

  async function onDragEnd(evt: DragEndEvent) {
    setActiveId(null);
    if (!canDrag) return;
    const overId = evt.over?.id;
    if (!overId) return;
    const card = cardById.get(String(evt.active.id));
    if (!card) return;
    const toStatus = String(overId);
    if (card.status === toStatus) return;
    const plan = planMove(card, toStatus);
    if (!plan || plan.kind === "reject") {
      setError(plan?.reason ?? "Ovaj prelaz nije dozvoljen.");
      return;
    }
    if (plan.kind === "redirect") {
      router.push(plan.href);
      return;
    }
    setPending(card.id);
    try {
      const res = await fetch(`/api/v1${plan.path}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(plan.body ?? {}),
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(body?.error?.message ?? "Greška pri promeni statusa.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Greška u komunikaciji sa serverom.");
    } finally {
      setPending(null);
    }
  }

  const dragging = activeCard
    ? {
        card: activeCard,
        allowed: new Set(
          columns
            .filter((c) => {
              if (c.readOnly) return false;
              const plan = planMove(activeCard, c.status);
              return plan !== null && plan.kind !== "reject";
            })
            .map((c) => c.status),
        ),
      }
    : null;

  return (
    <div className="space-y-3">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
          {columns.map((col) => (
            <Column
              key={col.status}
              column={col}
              canDrag={canDrag}
              renderCard={renderCard}
              cardHref={cardHref}
              pendingId={pending}
              tone={columnTone?.[col.status]}
              dragState={
                dragging
                  ? {
                      allowed: dragging.allowed.has(col.status),
                      isSource: dragging.card.status === col.status,
                    }
                  : null
              }
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="w-72 cursor-grabbing rounded-md border border-[var(--color-brand-500)] bg-white p-2 shadow-lg">
              {renderCard(activeCard)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface ColumnProps<C extends BoardCard> {
  column: BoardColumn<C>;
  canDrag: boolean;
  renderCard: (card: C) => React.ReactNode;
  cardHref?: (card: C) => string;
  pendingId: string | null;
  tone?: string;
  dragState: { allowed: boolean; isSource: boolean } | null;
}

function Column<C extends BoardCard>({
  column,
  canDrag,
  renderCard,
  cardHref,
  pendingId,
  tone,
  dragState,
}: ColumnProps<C>) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status,
    disabled: column.readOnly,
  });
  const dim =
    dragState && !dragState.isSource && (!dragState.allowed || column.readOnly);
  const highlight = isOver && dragState?.allowed && !column.readOnly;
  return (
    <div
      ref={setNodeRef}
      className={[
        "flex w-72 shrink-0 snap-start flex-col rounded-md border bg-[var(--color-surface)]",
        highlight
          ? "border-[var(--color-brand-500)] ring-2 ring-[var(--color-brand-500)]/40"
          : "border-[var(--color-border)]",
        dim ? "opacity-40" : "",
      ].join(" ")}
    >
      <header
        className={`flex items-center justify-between rounded-t-md border-b border-[var(--color-border)] px-3 py-2 text-xs font-medium ${
          tone ?? "bg-[var(--color-surface-inset)]"
        }`}
      >
        <span>{column.title}</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-foreground-muted)]">
          {column.total}
        </span>
      </header>
      {column.hint ? (
        <p className="border-b border-[var(--color-border)] px-3 py-1 text-[11px] text-[var(--color-foreground-muted)]">
          {column.hint}
        </p>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-2">
        {column.cards.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--color-foreground-muted)]">
            Prazno
          </p>
        ) : (
          column.cards.map((card) => (
            <DraggableCard
              key={card.id}
              card={card}
              disabled={!canDrag || column.readOnly || pendingId === card.id}
              busy={pendingId === card.id}
              href={cardHref?.(card)}
            >
              {renderCard(card)}
            </DraggableCard>
          ))
        )}
        {column.cards.length < column.total ? (
          <p className="pt-1 text-center text-[10px] text-[var(--color-foreground-muted)]">
            {column.cards.length}/{column.total}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface DraggableCardProps {
  card: BoardCard;
  disabled: boolean;
  busy: boolean;
  href?: string;
  children: React.ReactNode;
}

function DraggableCard({
  card,
  disabled,
  busy,
  href,
  children,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled,
  });
  const inner = (
    <div
      className={`rounded-md border border-[var(--color-border)] bg-white p-2 text-sm shadow-sm ${
        isDragging ? "opacity-40" : ""
      } ${busy ? "animate-pulse" : ""}`}
    >
      {children}
    </div>
  );
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
      aria-disabled={disabled || undefined}
    >
      {href ? (
        <Link href={href} onClick={(e) => (isDragging ? e.preventDefault() : undefined)}>
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}
