"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";
import { publicReferralPath } from "@/lib/referral";

interface ReferralCardData {
  connectionId: string;
  investorName: string;
  investorLogoUrl: string | null;
  referralCode: string;
}

interface Props {
  cards: ReferralCardData[];
  baseUrl: string;
}

export function ReferralCards({ cards: initialCards, baseUrl }: Props) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function rotate(connectionId: string) {
    setBusyId(connectionId);
    try {
      const result = await apiClient.post<{ referralCode: string }>(
        "/agency/referral/rotate",
        { connectionId },
      );
      setCards((prev) =>
        prev.map((c) =>
          c.connectionId === connectionId
            ? { ...c, referralCode: result.referralCode }
            : c,
        ),
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        window.alert(err.message);
      }
    } finally {
      setBusyId(null);
    }
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((c) => (
        <ReferralCard
          key={c.connectionId}
          card={c}
          baseUrl={baseUrl}
          busy={busyId === c.connectionId}
          onRotate={() => rotate(c.connectionId)}
        />
      ))}
    </div>
  );
}

function ReferralCard({
  card,
  baseUrl,
  busy,
  onRotate,
}: {
  card: ReferralCardData;
  baseUrl: string;
  busy: boolean;
  onRotate: () => void;
}) {
  const t = useT();
  const url = `${baseUrl}${publicReferralPath(card.referralCode)}`;
  const qrSrc = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`,
    [url],
  );
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.alert(t("partners.referral.copyManual", { url }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {card.investorLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.investorLogoUrl}
              alt={card.investorName}
              className="h-8 w-8 rounded object-contain"
            />
          ) : null}
          <div>
            <CardTitle className="text-base">{card.investorName}</CardTitle>
            <p className="text-xs text-[var(--color-foreground-muted)]">
              {t("partners.referral.code")} <code className="font-mono">{card.referralCode}</code>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[auto,1fr] gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={t("partners.referral.qrAlt", { code: card.referralCode })}
            width={140}
            height={140}
            className="rounded-md border border-[var(--color-border)] bg-white"
          />
          <div className="space-y-2 text-xs">
            <p className="text-[var(--color-foreground-muted)]">
              {t("partners.referral.shareHint")}
            </p>
            <div className="break-all rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-2 font-mono text-[10px]">
              {url}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={copyLink}>
            {copied ? t("partners.referral.copied") : t("partners.referral.copyLink")}
          </Button>
          <Button size="sm" variant="outline" onClick={onRotate} loading={busy}>
            {t("partners.referral.rotate")}
          </Button>
          <a
            href={qrSrc}
            download={`referral-${card.referralCode}.png`}
            className="inline-flex h-8 items-center rounded-md border border-[var(--color-border)] px-3 text-xs font-medium hover:bg-[var(--color-surface-muted)]"
          >
            {t("partners.referral.downloadQr")}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
