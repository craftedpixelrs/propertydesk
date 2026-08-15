"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/formatters/date";

const KIND_LABEL: Record<string, string> = {
  CALL: "Poziv",
  EMAIL: "Email",
  MEETING: "Sastanak",
  NOTE: "Beleška",
  STAGE_CHANGE: "Promena faze",
  ASSIGNMENT: "Dodela",
  CONVERSION: "Konverzija",
  SYSTEM: "Sistem",
};

const KIND_TONE: Record<
  string,
  "neutral" | "brand" | "info" | "success" | "warning"
> = {
  CALL: "brand",
  EMAIL: "info",
  MEETING: "info",
  NOTE: "neutral",
  STAGE_CHANGE: "warning",
  ASSIGNMENT: "warning",
  CONVERSION: "success",
  SYSTEM: "neutral",
};

export interface ActivityItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  occurredAt: string;
  actor: { id: string; name: string; email: string } | null;
}

interface Props {
  leadId: string;
  items: ActivityItem[];
  canCreate: boolean;
}

export function LeadActivityPanel({ leadId, items, canCreate }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<"CALL" | "EMAIL" | "MEETING" | "NOTE">(
    "NOTE",
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setErr("Naslov je obavezan.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await apiClient.post(
        `/platform/property-desk/leads/${leadId}/activities`,
        {
          kind,
          title: title.trim(),
          body: body.trim() || null,
        },
      );
      setTitle("");
      setBody("");
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Timeline aktivnosti</h3>
          <span className="text-xs text-[var(--color-foreground-muted)]">
            {items.length} zapisa
          </span>
        </div>

        {canCreate ? (
          <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3">
            {err ? (
              <div className="text-xs text-[var(--color-danger)]" role="alert">
                {err}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as typeof kind)
                }
                className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              >
                <option value="NOTE">Beleška</option>
                <option value="CALL">Poziv</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">Sastanak</option>
              </select>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Naslov (npr. Poziv u 14h, klijent razmišlja)"
                className="h-9 flex-1 min-w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy}
              />
              <Button
                type="button"
                size="sm"
                onClick={submit}
                disabled={busy || !title.trim()}
                loading={busy}
              >
                Dodaj
              </Button>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Detalji (opciono)"
              className="min-h-16 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs"
              disabled={busy}
            />
          </div>
        ) : null}

        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Još nema aktivnosti. Prvi zapis se automatski unosi kada lead
            pristigne sa landing forme ili se ručno kreira.
          </p>
        ) : (
          <ol className="relative border-l border-[var(--color-border)]">
            {items.map((item, i) => (
              <li
                key={item.id}
                className={`relative pl-6 ${i > 0 ? "mt-4" : ""}`}
              >
                <span
                  aria-hidden
                  className="absolute left-[-6px] top-1.5 size-3 rounded-full bg-[var(--color-brand-500)] ring-4 ring-[var(--color-surface)]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={KIND_TONE[item.kind] ?? "neutral"}>
                    {KIND_LABEL[item.kind] ?? item.kind}
                  </Badge>
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                {item.body ? (
                  <div className="mt-1 whitespace-pre-line text-sm text-[var(--color-foreground-muted)]">
                    {item.body}
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-[var(--color-foreground-subtle)]">
                  {formatDateTime(new Date(item.occurredAt))}
                  {item.actor ? ` · ${item.actor.name}` : ""}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return "Došlo je do greške.";
}
