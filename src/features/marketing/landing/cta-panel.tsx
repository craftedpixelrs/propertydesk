import { ArrowRight, CalendarCheck2, PhoneCall } from "lucide-react";

interface CtaPanelProps {
  title?: string;
  subtitle?: string;
  primaryHref?: string;
  primaryLabel?: string;
}

/**
 * Solo call-to-action panel rendered at the bottom of every topic
 * landing page. Single goal: book a 25-minute demo.
 *
 * Uses raw `<a>` tags with explicit color classes instead of the
 * shared `<Button>` component because Tailwind v4 `tailwind-merge`
 * cannot reliably deduplicate arbitrary-value overrides against the
 * button's built-in `text-white` primary variant, which was causing
 * the "invisible label on white button" bug on the dark-gradient
 * background.
 */
export function CtaPanel({
  title = "Videli ste šta radi. Vidimo se na demo pozivu?",
  subtitle = "Prvih 30 dana besplatno. Nakon toga 50% popusta na naredna tri meseca. Zaključana cena paketa 12 meseci - za sve prijave do 15.08.2026.",
  primaryHref = "/demo#zakazivanje",
  primaryLabel = "Zakažite 25-minutni demo",
}: CtaPanelProps) {
  return (
    <section
      aria-labelledby="cta-panel-title"
      className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-brand-700)] text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-[var(--color-brand-600)] via-[var(--color-brand-700)] to-[var(--color-brand-900)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-0 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl"
      />
      <div className="container-app relative z-10 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span
            aria-hidden
            className="inline-grid h-14 w-14 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm"
          >
            <CalendarCheck2 className="size-6" />
          </span>
          <h2
            id="cta-panel-title"
            className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90">
            {subtitle}
          </p>
          <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
            <a
              href={primaryHref}
              style={{ color: "#1e40af" }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-base font-semibold shadow-lg shadow-black/10 transition hover:bg-neutral-100 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800"
            >
              {primaryLabel}
              <ArrowRight aria-hidden className="size-4" />
            </a>
            <a
              href="tel:+381654363142"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/40 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800"
            >
              <PhoneCall aria-hidden className="size-4" />
              <span className="sm:hidden">Pozovite nas</span>
              <span className="hidden sm:inline">Pozovite nas: +381 65 43 63 142</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
