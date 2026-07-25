import { CalendarClock, Percent, Lock } from "lucide-react";

/**
 * Compact "why sign up now" strip between hero and features.
 *
 * The three cards mirror the exact wording of the early-bird offer
 * (`Prvih 30 dana besplatno. Nakon toga 50% popusta na naredna tri
 * meseca.`) so the visitor sees the pricing story before the pricing
 * table itself. The dedicated `EarlyBirdBonuses` section below breaks
 * down the accompanying non-price perks (Excel import, project setup,
 * onboarding, priority support, locked-in price).
 */
export function OfferBanner() {
  const items = [
    {
      icon: CalendarClock,
      title: "Prvih 30 dana besplatno",
      body:
        "Kompletan pristup svim funkcijama plana bez obaveze plaćanja - test na Vašim projektima i podacima.",
    },
    {
      icon: Percent,
      title: "50% popusta na naredna 3 meseca",
      body:
        "Nakon isteka trial-a, sledeća tri meseca plaćate polovinu cene odabranog plana. Popust se aktivira automatski.",
    },
    {
      icon: Lock,
      title: "Zaključana cena 12 meseci",
      body:
        "Cena Vašeg paketa se ne menja godinu dana - nema iznenađenja i poskupljenja u prvoj godini korišćenja.",
    },
  ];

  return (
    <section
      aria-labelledby="offer-title"
      className="border-y border-[var(--color-border)] bg-[var(--color-surface-muted)]"
    >
      <div className="container-app py-10 sm:py-14">
        <h2 id="offer-title" className="sr-only">
          Šta dobijate prijavom za rani pristup
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div
                key={it.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="text-base font-semibold text-[var(--color-foreground)]">
                    {it.title}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                  {it.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
