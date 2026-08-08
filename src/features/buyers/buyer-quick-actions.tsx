"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  StickyNote,
  ClipboardList,
  CalendarClock,
  BadgeCheck,
  MessageCircle,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { normalizePhone } from "@/lib/normalize";

type Panel = "note" | "task" | "viewing" | "reservation" | null;

interface AvailableUnit {
  id: string;
  code: string;
  project: { name: string } | null;
}

export function BuyerQuickActions({
  buyerId,
  phone,
  email,
  canManage,
  canReserve,
}: {
  buyerId: string;
  phone: string;
  email: string | null;
  canManage: boolean;
  canReserve: boolean;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [viewingWhen, setViewingWhen] = useState("");
  const [viewingNote, setViewingNote] = useState("");
  const [units, setUnits] = useState<AvailableUnit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [resNote, setResNote] = useState("");

  useEffect(() => {
    if (panel !== "reservation" || units.length > 0) return;
    apiClient
      .get<AvailableUnit[]>("/units", { query: { status: "AVAILABLE", pageSize: 100 } })
      .then(setUnits)
      .catch(() => setUnits([]));
  }, [panel, units.length]);

  function reset() {
    setPanel(null);
    setError(null);
    setNote("");
    setTaskTitle("");
    setTaskDue("");
    setViewingWhen("");
    setViewingNote("");
    setUnitId("");
    setResNote("");
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ActionButton icon={<Phone className="size-4" />} label="Pozovi" href={`tel:${phone}`} />
          <ActionButton
            icon={<Mail className="size-4" />}
            label="Email"
            href={email ? `mailto:${email}` : undefined}
            disabled={!email}
          />
          {(() => {
            const normalized = normalizePhone(phone);
            const digits = normalized ? normalized.replace(/^\+/, "") : null;
            const waHref = digits ? `https://wa.me/${digits}` : undefined;
            const viberHref = normalized
              ? `viber://chat?number=${encodeURIComponent(normalized)}`
              : undefined;
            return (
              <>
                <ActionButton
                  icon={<MessageCircle className="size-4" />}
                  label="WhatsApp"
                  href={waHref}
                  disabled={!waHref}
                  external
                />
                <ActionButton
                  icon={<Send className="size-4" />}
                  label="Viber"
                  href={viberHref}
                  disabled={!viberHref}
                />
              </>
            );
          })()}
          {canManage ? (
            <>
              <ActionButton
                icon={<StickyNote className="size-4" />}
                label="Beleška"
                onClick={() => setPanel(panel === "note" ? null : "note")}
              />
              <ActionButton
                icon={<ClipboardList className="size-4" />}
                label="Zadatak"
                onClick={() => setPanel(panel === "task" ? null : "task")}
              />
              <ActionButton
                icon={<CalendarClock className="size-4" />}
                label="Razgledanje"
                onClick={() => setPanel(panel === "viewing" ? null : "viewing")}
              />
            </>
          ) : null}
          {canReserve ? (
            <ActionButton
              icon={<BadgeCheck className="size-4" />}
              label="Rezervacija"
              onClick={() => setPanel(panel === "reservation" ? null : "reservation")}
            />
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {panel === "note" ? (
          <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Sadržaj beleške…"
              className="min-h-20 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                loading={busy}
                disabled={!note.trim()}
                onClick={() =>
                  run(async () => {
                    await apiClient.post(`/buyers/${buyerId}/activities`, {
                      type: "NOTE",
                      description: note.trim(),
                    });
                  })
                }
              >
                Sačuvaj belešku
              </Button>
            </div>
          </div>
        ) : null}

        {panel === "task" ? (
          <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Naslov zadatka"
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            />
            <input
              type="datetime-local"
              value={taskDue}
              onChange={(e) => setTaskDue(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                loading={busy}
                disabled={!taskTitle.trim() || !taskDue}
                onClick={() =>
                  run(async () => {
                    await apiClient.post("/tasks", {
                      title: taskTitle.trim(),
                      buyerId,
                      dueAt: new Date(taskDue).toISOString(),
                    });
                  })
                }
              >
                Kreiraj zadatak
              </Button>
            </div>
          </div>
        ) : null}

        {panel === "viewing" ? (
          <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
            <input
              type="datetime-local"
              value={viewingWhen}
              onChange={(e) => setViewingWhen(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            />
            <input
              value={viewingNote}
              onChange={(e) => setViewingNote(e.target.value)}
              placeholder="Napomena (lokacija, jedinica…)"
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                loading={busy}
                disabled={!viewingWhen}
                onClick={() =>
                  run(async () => {
                    const when = new Date(viewingWhen);
                    await apiClient.post(`/buyers/${buyerId}/activities`, {
                      type: "VIEWING",
                      description: `Zakazano razgledanje za ${when.toLocaleString("sr-Latn-RS")}. ${viewingNote}`.trim(),
                      occurredAt: when.toISOString(),
                    });
                  })
                }
              >
                Zakaži razgledanje
              </Button>
            </div>
          </div>
        ) : null}

        {panel === "reservation" ? (
          <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            >
              <option value="">— izaberite dostupnu jedinicu —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} {u.project ? `· ${u.project.name}` : ""}
                </option>
              ))}
            </select>
            <input
              value={resNote}
              onChange={(e) => setResNote(e.target.value)}
              placeholder="Napomena (opciono)"
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                loading={busy}
                disabled={!unitId}
                onClick={() =>
                  run(async () => {
                    const reservation = await apiClient.post<{ id: string }>("/reservations", {
                      unitId,
                      buyerId,
                      notes: resNote || undefined,
                    });
                    router.push(`/rezervacije/${reservation.id}`);
                  })
                }
              >
                Kreiraj rezervaciju
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActionButton({
  icon,
  label,
  href,
  onClick,
  disabled,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** When true, open in a new tab (used for wa.me links). */
  external?: boolean;
}) {
  const className =
    "flex flex-col items-center justify-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-3 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-inset)] disabled:opacity-40";
  if (href && !disabled) {
    return (
      <a
        href={href}
        className={className}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {icon}
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {icon}
      {label}
    </button>
  );
}
