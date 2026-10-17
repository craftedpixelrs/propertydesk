"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Share2, Trash2, Eye, Link as LinkIcon, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/app/i18n-provider";
import { intlLocale } from "@/lib/i18n";

interface ShareLinkRow {
  id: string;
  token: string;
  showPrice: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  forBuyerId: string | null;
  forBuyerName: string | null;
  publicUrl: string;
}

interface BuyerHit {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

type DurationChoice = "7" | "14" | "30" | "90" | "custom" | "none";

export function UnitSharePanel({
  unitId,
  initialLinks,
  canManage,
}: {
  unitId: string;
  initialLinks: ShareLinkRow[];
  canManage: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [links, setLinks] = React.useState<ShareLinkRow[]>(initialLinks);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [showPrice, setShowPrice] = React.useState(true);
  const [buyerQuery, setBuyerQuery] = React.useState("");
  const [buyerId, setBuyerId] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<BuyerHit[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false);
  const [duration, setDuration] = React.useState<DurationChoice>("30");
  const [customDays, setCustomDays] = React.useState("45");
  const [showRevoked, setShowRevoked] = React.useState(false);

  const signature = initialLinks
    .map((l) => `${l.id}:${l.revokedAt ?? ""}:${l.viewCount}:${l.forBuyerName ?? ""}`)
    .join("|");
  React.useEffect(() => {
    setLinks(initialLinks);
    // signature is the stable snapshot of the server list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  React.useEffect(() => {
    const q = buyerQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/buyers?q=${encodeURIComponent(q)}&pageSize=8`);
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const payload = (await res.json()) as { data?: BuyerHit[] };
        setSuggestions(Array.isArray(payload.data) ? payload.data : []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [buyerQuery]);

  const originAwareUrl = (relative: string) => {
    if (typeof window === "undefined") return relative;
    return `${window.location.origin}${relative}`;
  };

  function expiresInDays(): number | null {
    if (duration === "none") return null;
    if (duration === "custom") {
      const n = Number.parseInt(customDays, 10);
      if (!Number.isFinite(n) || n < 1 || n > 365) return Number.NaN;
      return n;
    }
    return Number(duration);
  }

  async function createLink() {
    const name = buyerQuery.trim();
    if (name.length < 2) {
      setError(t("inventory.share.buyerRequired"));
      return;
    }
    const days = expiresInDays();
    if (Number.isNaN(days)) {
      setError(t("inventory.share.durationInvalid"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/units/${unitId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          showPrice,
          forBuyerName: name,
          forBuyerId: buyerId,
          expiresInDays: days,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          (payload?.error?.message as string | undefined) ?? t("inventory.share.createFailed"),
        );
      }
      const created = (await res.json()) as { data: ShareLinkRow };
      setLinks((prev) => [created.data, ...prev]);
      setBuyerQuery("");
      setBuyerId(null);
      setSuggestions([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm(t("inventory.share.revokeConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/share-links/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(t("inventory.share.revokeFailed"));
      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, revokedAt: new Date().toISOString() } : l)),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
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

  function formatWhen(iso: string) {
    return new Date(iso).toLocaleString(intlLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const revokedCount = links.filter((l) => l.revokedAt).length;
  const visible = showRevoked ? links : links.filter((l) => !l.revokedAt);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t("inventory.share.title")}</h3>
          {revokedCount > 0 ? (
            <div className="flex items-center gap-2">
              {!showRevoked ? (
                <span className="text-xs text-[var(--color-foreground-muted)]">
                  {t("inventory.share.hiddenRevoked", { count: revokedCount })}
                </span>
              ) : null}
              <button
                type="button"
                role="switch"
                aria-checked={showRevoked}
                aria-label={t("inventory.share.showRevoked")}
                onClick={() => setShowRevoked((on) => !on)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  showRevoked ? "bg-[var(--color-brand-600)]" : "bg-neutral-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                    showRevoked ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-xs">{t("inventory.share.showRevoked")}</span>
            </div>
          ) : null}
        </div>

        {canManage ? (
          <div className="space-y-3 rounded-md border border-dashed border-[var(--color-border)] p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="relative block text-sm">
                <span className="mb-1 block text-xs text-[var(--color-foreground-muted)]">
                  {t("inventory.share.buyer")}
                </span>
                <input
                  value={buyerQuery}
                  onChange={(e) => {
                    setBuyerQuery(e.target.value);
                    setBuyerId(null);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setSuggestionsOpen(false), 150);
                  }}
                  placeholder={t("inventory.share.buyerPlaceholder")}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
                  autoComplete="off"
                />
                {suggestionsOpen && suggestions.length > 0 ? (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-[var(--color-border)] bg-white py-1 shadow-md">
                    {suggestions.map((buyer) => {
                      const name = `${buyer.firstName} ${buyer.lastName}`.trim();
                      return (
                        <li key={buyer.id}>
                          <button
                            type="button"
                            className="flex w-full flex-col px-2 py-1.5 text-left text-sm hover:bg-neutral-50"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setBuyerQuery(name);
                              setBuyerId(buyer.id);
                              setSuggestionsOpen(false);
                            }}
                          >
                            <span>{name}</span>
                            {buyer.phone ? (
                              <span className="text-xs text-[var(--color-foreground-muted)]">
                                {buyer.phone}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-[var(--color-foreground-muted)]">
                  {t("inventory.share.duration")}
                </span>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as DurationChoice)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
                >
                  <option value="7">{t("inventory.share.durationDays", { count: 7 })}</option>
                  <option value="14">{t("inventory.share.durationDays", { count: 14 })}</option>
                  <option value="30">{t("inventory.share.durationDays", { count: 30 })}</option>
                  <option value="90">{t("inventory.share.durationDays", { count: 90 })}</option>
                  <option value="custom">{t("inventory.share.durationCustom")}</option>
                  <option value="none">{t("inventory.share.durationNone")}</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {duration === "custom" ? (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {t("inventory.share.durationCustomLabel")}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="h-9 w-20 rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
                  />
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                />
                {t("inventory.share.showPrice")}
              </label>
              <Button size="sm" loading={busy} onClick={createLink} className="ml-auto">
                <Share2 className="mr-1 size-4" /> {t("inventory.share.create")}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {links.length === 0 ? (
          <div className="text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.share.empty")}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.share.emptyActive")}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {visible.map((link) => {
              const revoked = Boolean(link.revokedAt);
              const expired = link.expiresAt && new Date(link.expiresAt) < new Date();
              const active = !revoked && !expired;
              return (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{link.forBuyerName ?? "—"}</div>
                    <a
                      href={link.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-sm text-[var(--color-brand-700)] hover:underline"
                    >
                      <LinkIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{link.publicUrl}</span>
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-foreground-muted)]">
                      <span>
                        {t("inventory.share.created", { date: formatWhen(link.createdAt) })}
                      </span>
                      <span>
                        {link.expiresAt
                          ? t("inventory.share.expires", { date: formatWhen(link.expiresAt) })
                          : t("inventory.share.durationNone")}
                      </span>
                      {link.revokedAt ? (
                        <span>
                          {t("inventory.share.revokedAt", { date: formatWhen(link.revokedAt) })}
                        </span>
                      ) : null}
                      {link.lastViewedAt ? (
                        <span>
                          {t("inventory.share.lastViewed", { date: formatWhen(link.lastViewedAt) })}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" /> {link.viewCount}
                      </span>
                      {revoked ? (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-red-700 uppercase">
                          {t("inventory.share.revoked")}
                        </span>
                      ) : expired ? (
                        <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-neutral-700 uppercase">
                          {t("inventory.share.expired")}
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-emerald-700 uppercase">
                          {t("inventory.share.active")}
                        </span>
                      )}
                      {!link.showPrice ? (
                        <span className="text-[var(--color-foreground-subtle)]">
                          {t("inventory.share.noPrice")}
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
                        <Check className="size-4" />
                      ) : (
                        t("inventory.share.copy")
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
