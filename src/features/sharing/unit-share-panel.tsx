"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Share2, Trash2, Eye, Clock, Link as LinkIcon, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ShareLinkRow {
  id: string;
  token: string;
  showPrice: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  publicUrl: string;
}

export function UnitSharePanel({
  unitId,
  initialLinks,
  canManage,
}: {
  unitId: string;
  initialLinks: ShareLinkRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [links, setLinks] = React.useState<ShareLinkRow[]>(initialLinks);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [showPrice, setShowPrice] = React.useState(true);

  const originAwareUrl = (relative: string) => {
    if (typeof window === "undefined") return relative;
    return `${window.location.origin}${relative}`;
  };

  async function createLink() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/units/${unitId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ showPrice }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          (payload?.error?.message as string | undefined) ??
            "Kreiranje linka nije uspelo.",
        );
      }
      const created = (await res.json()) as { data: ShareLinkRow };
      setLinks((prev) => [created.data, ...prev]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Došlo je do greške.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Opozvati link? Kupac koji ga otvori dobiće 404.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/share-links/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Opoziv nije uspeo.");
      setLinks((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, revokedAt: new Date().toISOString() } : l,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Došlo je do greške.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(link: ShareLinkRow) {
    try {
      await navigator.clipboard.writeText(originAwareUrl(link.publicUrl));
      setCopiedId(link.id);
      setTimeout(() => setCopiedId((current) => (current === link.id ? null : current)), 1500);
    } catch {
      // Ignore — user will see the URL beside the copy button.
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Javni linkovi za kupca</h3>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-[var(--color-border)] p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
              />
              Prikaži cenu na javnoj stranici
            </label>
            <Button
              size="sm"
              loading={busy}
              onClick={createLink}
              className="ml-auto"
            >
              <Share2 className="mr-1 size-4" /> Kreiraj link
            </Button>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {links.length === 0 ? (
          <div className="text-sm text-[var(--color-foreground-muted)]">
            Još nema deljenih linkova. Kada kreirate link, kupac može da otvori
            stranicu ponude bez logina.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {links.map((link) => {
              const revoked = Boolean(link.revokedAt);
              const expired =
                link.expiresAt && new Date(link.expiresAt) < new Date();
              const active = !revoked && !expired;
              return (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={link.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 truncate text-sm font-medium text-[var(--color-brand-700)] hover:underline"
                    >
                      <LinkIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{link.publicUrl}</span>
                    </a>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-[var(--color-foreground-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" /> {link.viewCount}
                      </span>
                      {link.lastViewedAt ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {new Date(link.lastViewedAt).toLocaleString("sr-Latn-RS")}
                        </span>
                      ) : null}
                      {revoked ? (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-700">
                          opozvan
                        </span>
                      ) : expired ? (
                        <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-700">
                          istekao
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                          aktivan
                        </span>
                      )}
                      {!link.showPrice ? (
                        <span className="text-[var(--color-foreground-subtle)]">
                          bez cene
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!active}
                      onClick={() => copyLink(link)}
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check className="size-4" />
                        </>
                      ) : (
                        "Kopiraj"
                      )}
                    </Button>
                    {canManage && active ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revoke(link.id)}
                        disabled={busy}
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
