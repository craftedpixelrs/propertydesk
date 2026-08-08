import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/features/marketing/content";
import { cn } from "@/lib/utils";

/**
 * Public pricing teaser. Mirrors the actual paid plans from the platform
 * seed (Starter €49 / Growth €149 / Scale €399, monthly) plus an obvious
 * early-bird note wired to the lead form.
 */
export function PricingTeaser() {
  return (
    <section
      id="cenovnik"
      aria-labelledby="pricing-title"
      className="scroll-mt-20 border-t border-[var(--color-border)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            Cenovnik
          </div>
          <h2
            id="pricing-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Jednostavno, transparentno, bez skrivenih troškova
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            Sve cene su na mesečnom nivou. Kvartalno, polugodišnje i godišnje
            plaćanje takođe je dostupno u aplikaciji. Bez obavezujućih ugovora
            - otkazivanje jednim klikom.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-700)]">
            <Sparkles aria-hidden className="size-4" />
            Rani pristup: 30 dana besplatno + 50% na naredna 3 meseca (za
            prijave do 15.08.2026.)
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl border bg-[var(--color-surface)] p-6 shadow-sm",
                plan.featured
                  ? "border-[var(--color-brand-600)] ring-2 ring-[var(--color-brand-600)]/20"
                  : "border-[var(--color-border)]",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                {plan.featured ? (
                  <Badge tone="brand">Najpopularnije</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                {plan.description}
              </p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-[var(--color-foreground-muted)]">
                  {plan.suffix}
                </span>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5">
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 flex-none text-[var(--color-success)]"
                    />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                <Button
                  asChild
                  size="md"
                  variant={plan.featured ? "primary" : "outline"}
                  className="w-full"
                >
                  <a href="#zakazivanje">Zakažite 25-minutni demo</a>
                </Button>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-foreground-subtle)]">
          Prvih 30 dana besplatno. Nakon toga 50% popusta na naredna tri meseca.
          Zaključana cena paketa 12 meseci.
        </p>
      </div>
    </section>
  );
}
