"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

interface SearchHit {
  entity: "project" | "unit" | "buyer" | "organization" | "user" | "lead";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

/**
 * Provider that owns the palette's open/close state and hotkey binding.
 *
 * The hotkey is `Ctrl+K` on Windows/Linux and `Cmd+K` on macOS. We
 * intercept the browser default (which would open the URL bar in some
 * browsers) only when the palette can actually be opened.
 */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKey(evt: KeyboardEvent) {
      // Bare Escape when the dialog is closed shouldn't be swallowed.
      if (evt.key !== "k") return;
      if (!(evt.metaKey || evt.ctrlKey)) return;
      evt.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const value = useMemo(
    () => ({ open, setOpen, toggle }),
    [open, toggle],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteDialog open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  }
  return ctx;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CommandPaletteDialog({ open, onOpenChange }: DialogProps) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the query each time the palette opens so returning to it
  // does not surprise the user with a stale query and its stale hits.
  useEffect(() => {
    if (!open) return;
    setQ("");
    setHits([]);
    setError(null);
  }, [open]);

  // Debounce input by 200 ms and race-guard the fetch: only apply
  // the most recent response, so quick typing doesn't flicker between
  // partial matches.
  const requestSeq = useRef(0);
  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const seq = ++requestSeq.current;
    const handle = setTimeout(() => {
      apiClient
        .get<{ hits: SearchHit[] }>("/search", { query: { q: query } })
        .then((data) => {
          if (seq !== requestSeq.current) return;
          setHits(data.hits);
          setError(null);
        })
        .catch((err: unknown) => {
          if (seq !== requestSeq.current) return;
          const message =
            err instanceof ApiClientError
              ? err.message
              : t("ui.search.failed");
          setError(message);
          setHits([]);
        })
        .finally(() => {
          if (seq !== requestSeq.current) return;
          setLoading(false);
        });
    }, 200);
    return () => clearTimeout(handle);
  }, [q, open, t]);

  const grouped = useMemo(() => groupHits(hits, t), [hits, t]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogTitle className="sr-only">
          {t("ui.search.title")}
        </DialogTitle>
        <Command
          label={t("ui.search.globalLabel")}
          shouldFilter={false}
          className="flex flex-col"
        >
          <div className="border-b border-[var(--color-border)] px-4">
            <Command.Input
              value={q}
              onValueChange={setQ}
              placeholder={t("ui.search.placeholder")}
              autoFocus
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-foreground-muted)]"
            />
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {error ? (
              <div className="px-3 py-4 text-sm text-red-700">{error}</div>
            ) : null}
            {loading && hits.length === 0 ? (
              <div className="px-3 py-4 text-sm text-[var(--color-foreground-muted)]">
                {t("ui.search.searching")}
              </div>
            ) : null}
            <Command.Empty className="px-3 py-6 text-sm text-[var(--color-foreground-muted)]">
              {q.trim().length < 2
                ? t("ui.search.emptyHint")
                : t("empty.noResults")}
            </Command.Empty>
            {grouped.map((group) => (
              <Command.Group
                key={group.entity}
                heading={
                  <span className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
                    {group.label}
                  </span>
                }
              >
                {group.items.map((hit) => (
                  <Command.Item
                    key={`${hit.entity}:${hit.id}`}
                    value={`${hit.title} ${hit.subtitle ?? ""} ${hit.id}`}
                    onSelect={() => go(hit.href)}
                    className="flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-[var(--color-brand-50)]"
                  >
                    <span className="font-medium text-[var(--color-foreground)]">
                      {hit.title}
                    </span>
                    {hit.subtitle ? (
                      <span className="text-xs text-[var(--color-foreground-muted)]">
                        {hit.subtitle}
                      </span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <footer className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-foreground-muted)]">
            <span>{t("ui.search.enterToOpen")}</span>
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px]">
              Ctrl/⌘ + K
            </kbd>
          </footer>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

interface HitGroup {
  entity: SearchHit["entity"];
  label: string;
  items: SearchHit[];
}

const GROUP_LABEL_KEYS: Record<SearchHit["entity"], TranslationKey> = {
  project: "ui.search.entity.project",
  unit: "ui.search.entity.unit",
  buyer: "ui.search.entity.buyer",
  organization: "ui.search.entity.organization",
  user: "ui.search.entity.user",
  lead: "ui.search.entity.lead",
};

const GROUP_ORDER: SearchHit["entity"][] = [
  "project",
  "unit",
  "buyer",
  "organization",
  "user",
  "lead",
];

function groupHits(
  hits: SearchHit[],
  translate: (key: TranslationKey) => string,
): HitGroup[] {
  const buckets = new Map<SearchHit["entity"], SearchHit[]>();
  for (const hit of hits) {
    const list = buckets.get(hit.entity) ?? [];
    list.push(hit);
    buckets.set(hit.entity, list);
  }
  const groups: HitGroup[] = [];
  for (const entity of GROUP_ORDER) {
    const items = buckets.get(entity);
    if (!items || items.length === 0) continue;
    groups.push({
      entity,
      label: translate(GROUP_LABEL_KEYS[entity]),
      items,
    });
  }
  return groups;
}
