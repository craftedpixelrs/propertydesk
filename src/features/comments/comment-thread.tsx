"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/formatters";
import type { CommentDto } from "@/server/services/comments/comments.service";

/**
 * Wire format for a mention in the comment body:
 *
 *   @[Display Name](userId)
 *
 * Authors compose the mention through the autocomplete widget; the
 * server extracts and verifies the ids at write time. The rendered
 * view rehydrates this into a highlighted span.
 */
const MENTION_TOKEN_RE = /@\[([^\]]+)\]\(([a-zA-Z0-9]+)\)/g;

interface Mentionable {
  id: string;
  name: string;
  email: string;
}

interface Props {
  entityType: "Buyer" | "Sale";
  entityId: string;
  currentUserId: string;
}

export function CommentThread({ entityType, entityId, currentUserId }: Props) {
  const [items, setItems] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mentionables, setMentionables] = useState<Mentionable[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const data = await apiClient.get<{ items: CommentDto[] }>("/comments", {
          query: { entityType, entityId },
        });
        if (!alive) return;
        setItems(data.items);
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Greška pri učitavanju komentara.",
        );
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [entityType, entityId]);

  useEffect(() => {
    let alive = true;
    apiClient
      .get<{ items: Mentionable[] }>("/comments/mentionables")
      .then((data) => {
        if (alive) setMentionables(data.items);
      })
      .catch(() => {
        // Autocomplete is a nice-to-have; failure just falls back to plain text.
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(body: string): Promise<void> {
    const created = await apiClient.post<CommentDto>("/comments", {
      entityType,
      entityId,
      body,
    });
    setItems((prev) => [...prev, created]);
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.delete<{ ok: boolean }>(`/comments/${id}`);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Greška pri brisanju.",
      );
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Učitavanje…
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Još uvek nema komentara. Budite prvi.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-[var(--color-border)] bg-white p-3 text-sm"
            >
              <div className="flex items-center justify-between text-xs text-[var(--color-foreground-muted)]">
                <span>
                  <strong className="text-[var(--color-foreground)]">
                    {c.author.name}
                  </strong>{" "}
                  · {formatDateTime(c.createdAt)}
                </span>
                {c.author.id === currentUserId ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-[var(--color-foreground-muted)] hover:text-red-600"
                  >
                    Obriši
                  </button>
                ) : null}
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words">
                <RenderedBody body={c.body} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <ComposeForm mentionables={mentionables} onSubmit={handleSubmit} />
    </div>
  );
}

function RenderedBody({ body }: { body: string }) {
  const parts = useMemo(() => splitMentions(body), [body]);
  return (
    <>
      {parts.map((part, i) =>
        part.kind === "mention" ? (
          <span
            key={i}
            className="rounded bg-[var(--color-brand-50)] px-1 font-medium text-[var(--color-brand-700)]"
          >
            @{part.name}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

type BodyPart =
  | { kind: "text"; text: string }
  | { kind: "mention"; name: string; userId: string };

function splitMentions(body: string): BodyPart[] {
  const parts: BodyPart[] = [];
  let last = 0;
  const regex = new RegExp(MENTION_TOKEN_RE);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) != null) {
    if (match.index > last) {
      parts.push({ kind: "text", text: body.slice(last, match.index) });
    }
    parts.push({ kind: "mention", name: match[1]!, userId: match[2]! });
    last = match.index + match[0].length;
  }
  if (last < body.length) parts.push({ kind: "text", text: body.slice(last) });
  return parts;
}

interface ComposeProps {
  mentionables: Mentionable[];
  onSubmit: (body: string) => Promise<void>;
}

function ComposeForm({ mentionables, onSubmit }: ComposeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggest, setSuggest] = useState<{
    open: boolean;
    query: string;
    tokenStart: number;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!suggest?.open) return [];
    const q = suggest.query.toLowerCase();
    return mentionables
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [mentionables, suggest]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setValue(next);
    const caret = e.target.selectionStart;
    // Scan back to find the current `@…` token, if any.
    let i = caret - 1;
    while (i >= 0) {
      const ch = next.charAt(i);
      if (ch === "@") {
        setSuggest({ open: true, query: next.slice(i + 1, caret), tokenStart: i });
        return;
      }
      if (/[\s\n]/.test(ch)) break;
      i -= 1;
    }
    setSuggest(null);
  }

  function pickMention(m: Mentionable) {
    if (!suggest) return;
    const before = value.slice(0, suggest.tokenStart);
    const caret = textareaRef.current?.selectionStart ?? value.length;
    const after = value.slice(caret);
    const token = `@[${m.name}](${m.id}) `;
    const next = `${before}${token}${after}`;
    setValue(next);
    setSuggest(null);
    // Restore caret past the inserted token.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = before.length + token.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  async function submit() {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(value.trim());
      setValue("");
      setSuggest(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Greška pri slanju.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {error}
        </div>
      ) : null}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          placeholder="Dodaj komentar… koristite @ za spomen"
          rows={3}
          className="w-full rounded-md border border-[var(--color-border)] bg-white p-2 text-sm outline-none focus:border-[var(--color-brand-500)]"
        />
        {suggest?.open && filtered.length > 0 ? (
          <div className="absolute left-2 top-full z-20 mt-1 w-64 overflow-hidden rounded-md border border-[var(--color-border)] bg-white shadow-lg">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickMention(m);
                }}
                className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-[var(--color-brand-50)]"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-[var(--color-foreground-muted)]">
                  {m.email}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={busy || !value.trim()}
        >
          {busy ? "Šaljem…" : "Pošalji"}
        </Button>
      </div>
    </div>
  );
}
