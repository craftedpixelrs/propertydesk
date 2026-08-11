import type { LucideIcon } from "lucide-react";
import {
  Building2,
  LayoutGrid,
  Contact,
  BadgeCheck,
  Handshake,
  Wallet,
  ReceiptText,
  FileText,
  BarChart3,
  Bell,
  FileSignature,
  QrCode,
  TrendingUp,
  Globe,
  Gift,
} from "lucide-react";

import { FEATURES, type FeatureItem } from "@/features/marketing/content";

/**
 * Feature matrix grid.
 *
 * Icons live here (client-only lucide bundle) but the copy comes from
 * `content.ts` so the same list can feed the JSON-LD ItemList without
 * pulling react components into a Node route.
 */
const ICONS: Record<FeatureItem["icon"], LucideIcon> = {
  building: Building2,
  "layout-grid": LayoutGrid,
  contact: Contact,
  "badge-check": BadgeCheck,
  handshake: Handshake,
  wallet: Wallet,
  receipt: ReceiptText,
  "file-text": FileText,
  "bar-chart": BarChart3,
  bell: Bell,
  "file-signature": FileSignature,
  "qr-code": QrCode,
  "trending-up": TrendingUp,
  globe: Globe,
  gift: Gift,
};

export function FeatureGrid() {
  return (
    <section
      id="mogucnosti"
      aria-labelledby="features-title"
      className="scroll-mt-20"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            Mogućnosti
          </div>
          <h2
            id="features-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Sve što treba za prodaju novogradnje - u jednoj platformi
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-foreground-muted)]">
            Bez Excel-a, bez Viber grupa i ad-hoc dogovora. Svaki korak
            prodajnog toka - od dodavanja jedinice do isplate provizije -
            evidentiran je, kontrolisan i praćen kroz sistem.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = ICONS[f.icon];
            return (
              <article
                key={f.title}
                className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition hover:border-[var(--color-brand-200)] hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)] transition group-hover:bg-[var(--color-brand-100)]"
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[var(--color-foreground)]">
                      {f.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                      {f.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
