import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Bot,
  FileSignature,
  Network,
  SearchCheck,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * Compact "what's next" section.
 *
 * Kept short on purpose: PropertyDesk 1.0 already covers the full sales
 * flow, so we don't want to burn conversion attention on features that
 * the buyer can't use today. Each card is one icon + short name + one
 * sentence + ETA badge.
 */
interface RoadmapItem {
  icon: LucideIcon;
  title: string;
  description: string;
  eta: string;
}

const ROADMAP: RoadmapItem[] = [
  {
    icon: Blocks,
    title: "WordPress plugin",
    description:
      "Auto-sync projekata, jedinica i cena sa sajtom - bez ručnog održavanja.",
    eta: "Q4 2026",
  },
  {
    icon: Bot,
    title: "AI asistent za sajtove",
    description:
      "Chat widget kao jedan <script> tag - odgovara na pitanja o Vašim jedinicama 24/7.",
    eta: "Q1 2027",
  },
  {
    icon: SearchCheck,
    title: "Automatska kvalifikacija upita",
    description:
      "AI čita zahtev kupca i predlaže 3 najbolje jedinice iz Vašeg inventara.",
    eta: "Q1 2027",
  },
  {
    icon: Zap,
    title: "Integracije za lead-ove",
    description:
      "Meta i Google forme, WhatsApp / Viber inbox, email drip - sve u istom pipeline-u.",
    eta: "Q2 2027",
  },
  {
    icon: FileSignature,
    title: "Elektronski potpis",
    description:
      "Predugovori i ugovori online, sa vremenskim žigom i pravnom snagom u Srbiji.",
    eta: "Q2 2027",
  },
  {
    icon: Network,
    title: "Marketplace investitor - agencija",
    description:
      "Otvoreni katalog projekata dostupan verifikovanoj mreži partnerskih agencija.",
    eta: "Q3 2027",
  },
];

export function Roadmap() {
  return (
    <section
      id="uskoro"
      aria-labelledby="roadmap-title"
      className="scroll-mt-20 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]"
    >
      <div className="container-app py-14 sm:py-16">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            Šta dolazi sledeće
          </div>
          <h2
            id="roadmap-title"
            className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Roadmap posle lansiranja
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            PropertyDesk 1.0 već pokriva ceo prodajni tok od projekta do
            provizije. Ovo su naredni koraci - rani pretplatnici ih dobijaju
            čim budu dostupni, bez doplate.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  >
                    <Icon className="size-4" />
                  </span>
                  <Badge tone="neutral" className="uppercase tracking-wide">
                    {item.eta}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-foreground)]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                    {item.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
