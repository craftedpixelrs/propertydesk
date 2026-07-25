import {
  CalendarClock,
  Percent,
  FileSpreadsheet,
  Wrench,
  Users,
  LifeBuoy,
  Lock,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface Bonus {
  icon: LucideIcon;
  title: string;
  body: string;
  highlight?: boolean;
}

const BONUSES: Bonus[] = [
  {
    icon: CalendarClock,
    title: "Prvih 30 dana besplatno",
    body: "Kompletan pristup planu bez obaveze plaćanja, na Vašim realnim podacima.",
    highlight: true,
  },
  {
    icon: Percent,
    title: "50% popusta na naredna 3 meseca",
    body: "Polovina cene odabranog paketa u tri meseca nakon isteka trial-a.",
    highlight: true,
  },
  {
    icon: FileSpreadsheet,
    title: "Besplatan uvoz prve Excel tabele",
    body: "Vaš postojeći cenovnik / lista jedinica ubaci se u sistem umesto Vas.",
  },
  {
    icon: Wrench,
    title: "Besplatno podešavanje jednog projekta",
    body: "Zajedno modelujemo strukturu Vašeg projekta (objekti, ulazi, spratovi, jedinice).",
  },
  {
    icon: Users,
    title: "Onboarding za ceo tim",
    body: "60-minutna sesija u kojoj Vaš prodajni tim prolazi kroz sistem sa nama.",
  },
  {
    icon: LifeBuoy,
    title: "Prioritetna podrška",
    body: "Odgovor na Vaše prijave u okviru istog radnog dana - direktna komunikacija sa timom.",
  },
  {
    icon: Lock,
    title: "Zaključana cena paketa 12 meseci",
    body: "Cena se ne menja godinu dana - bez poskupljenja u toku prve godine korišćenja.",
  },
];

/**
 * Standalone "sve što dobijate ako se prijavite do 15.08." section.
 *
 * The order matches the exact bullet list from the product brief and
 * the two headline items (30 days free + 50% off 3 months) carry a
 * `highlight` flag so they render with a stronger visual weight than
 * the operational perks.
 */
export function EarlyBirdBonuses() {
  return (
    <section
      id="rana-ponuda"
      aria-labelledby="bonuses-title"
      className="scroll-mt-20 border-t border-[var(--color-border)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            <Badge tone="success" className="uppercase tracking-wide">
              Rani pristup
            </Badge>
            <span>Sve prijave do 15.08.2026.</span>
          </div>
          <h2
            id="bonuses-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Šta tačno dobijate prijavom pre lansiranja
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            <strong className="font-semibold text-[var(--color-foreground)]">
              Prvih 30 dana besplatno. Nakon toga 50% popusta na naredna tri
              meseca.
            </strong>{" "}
            Uz to, dobijate paket bonusa koji Vam skida ceo teret prvog
            postavljanja i uvođenja tima u sistem - bez dodatne naplate.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BONUSES.map((b) => {
            const Icon = b.icon;
            return (
              <article
                key={b.title}
                className={
                  b.highlight
                    ? "rounded-xl border-2 border-[var(--color-brand-600)] bg-[var(--color-brand-50)] p-5 shadow-sm"
                    : "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={
                      b.highlight
                        ? "grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--color-brand-600)] text-white"
                        : "grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[var(--color-foreground)]">
                      {b.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                      {b.body}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-[var(--color-foreground-subtle)]">
          Rana ponuda važi za sve koji zakažu demo ili se prijave putem forme
          do 15.08.2026. Nakon lansiranja standardni cenovnik.
        </p>
      </div>
    </section>
  );
}
