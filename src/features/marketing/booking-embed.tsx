import { CalendarCheck2, PhoneCall, Video, Mail, ExternalLink, ArrowRight } from "lucide-react";

import { GOOGLE_APPOINTMENT_URL } from "@/lib/constants/app";
import { Button } from "@/components/ui/button";

/**
 * Google exposes appointment schedules in two flavors:
 *   1. Share link: `https://calendar.app.google/XXXXXX` - short URL that
 *      redirects to a full booking page. CANNOT be iframed (X-Frame-Options
 *      DENY on the redirect target).
 *   2. Embed link: `https://calendar.google.com/calendar/appointments/schedules/AcZssZ...`
 *      copied from the "Copy embed" button. CAN be iframed.
 *
 * We detect the two so users can paste either and get the best experience:
 * a real inline iframe when possible, or a large "open in new tab" card
 * otherwise (still a single click to book).
 */
function isEmbeddableSchedulesUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === "calendar.google.com" &&
      u.pathname.startsWith("/calendar/appointments/schedules/")
    );
  } catch {
    return false;
  }
}

interface BookingEmbedProps {
  /**
   * Visual size of the embed frame. `hero` renders taller (min 720px)
   * for the `/demo` route, `compact` (min 560px) for inline sections on
   * the main landing.
   */
  size?: "hero" | "compact";
  /** Override the anchor id used by the CTAs elsewhere on the page. */
  anchorId?: string;
  /** Optional heading rendered above the iframe. */
  title?: string;
  /** Optional subtitle rendered below the heading. */
  subtitle?: string;
  /** Hide the small feature strip below the iframe. */
  hideFeatures?: boolean;
}

const HEIGHT_CLASS = {
  hero: "min-h-[720px]",
  compact: "min-h-[560px]",
} as const;

/**
 * Google Calendar Appointment Schedules iframe embed.
 *
 * Behavior:
 *   - When `NEXT_PUBLIC_GOOGLE_APPOINTMENT_URL` is a valid URL: renders
 *     an iframe with correct sandbox / referrerpolicy attributes and a
 *     "Zakazivanje termina" title for screen readers.
 *   - When the env variable is empty (typical local dev before the
 *     Workspace Appointment Schedule is provisioned): renders a soft
 *     fallback with primary CTA to the lead form + "call me" phone
 *     link, so no visitor ever sees a broken iframe.
 *
 * Rendered as a server component - the iframe url is a public value,
 * there is no client state.
 */
export function BookingEmbed({
  size = "compact",
  anchorId = "zakazivanje",
  title = "Zakažite 25-minutni demo",
  subtitle = "Izaberite termin koji Vam odgovara. Dobijate potvrdu i podsetnik e-mailom, sa linkom za video poziv.",
  hideFeatures = false,
}: BookingEmbedProps) {
  const url = GOOGLE_APPOINTMENT_URL.trim();
  const hasUrl = url.length > 0;
  const isEmbeddable = hasUrl && isEmbeddableSchedulesUrl(url);

  return (
    <section
      id={anchorId}
      aria-labelledby={`${anchorId}-title`}
      className="scroll-mt-20"
    >
      <div className="container-app py-14 sm:py-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            <CalendarCheck2 aria-hidden className="size-3.5" />
            Direktno zakazivanje
          </div>
          <h2
            id={`${anchorId}-title`}
            className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {subtitle}
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          {isEmbeddable ? (
            <iframe
              src={url}
              title="Zakazivanje demo termina"
              className={`block w-full ${HEIGHT_CLASS[size]}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allow="fullscreen"
            />
          ) : hasUrl ? (
            <BookingShareLinkCard url={url} size={size} />
          ) : (
            <BookingFallback size={size} />
          )}
        </div>

        {!hideFeatures ? (
          <ul className="mt-6 grid gap-3 text-sm text-[var(--color-foreground-muted)] sm:grid-cols-2 lg:grid-cols-4">
            <FeatureLi icon={CalendarCheck2}>
              Termini u realnom vremenu
            </FeatureLi>
            <FeatureLi icon={Mail}>Potvrda i podsetnik na email</FeatureLi>
            <FeatureLi icon={Video}>Link za video poziv u pozivnici</FeatureLi>
            <FeatureLi icon={PhoneCall}>
              Ili nas pozovite:{" "}
              <a
                className="font-medium text-[var(--color-foreground)] hover:underline"
                href="tel:+381654363142"
              >
                +381 65 43 63 142
              </a>
            </FeatureLi>
          </ul>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Rendered when the configured URL is a Google share link
 * (`calendar.app.google/...`) which cannot be iframed. Presents a
 * prominent "Zakažite termin" card that opens Google Calendar in a
 * new tab - still a single click, and the user completes booking on
 * Google directly (with all the confirmation email + video call
 * bells and whistles).
 */
function BookingShareLinkCard({
  url,
  size,
}: {
  url: string;
  size: "hero" | "compact";
}) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-5 overflow-hidden px-6 py-16 text-center sm:px-10 ${HEIGHT_CLASS[size]}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-[var(--color-brand-50)] via-white to-[var(--color-brand-50)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-0 h-56 w-[32rem] -translate-x-1/2 rounded-full bg-[var(--color-brand-200)]/50 blur-3xl"
      />
      <span
        aria-hidden
        className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-[var(--color-brand-600)] text-white shadow-lg shadow-[var(--color-brand-700)]/20"
      >
        <CalendarCheck2 className="size-7" />
      </span>
      <div className="relative z-10 max-w-lg">
        <h3 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
          Izaberite termin u Google kalendaru
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)] sm:text-base">
          Otvara se službena stranica za zakazivanje sa realnim slobodnim
          terminima. Dobijate potvrdu i podsetnik na email, sa Google Meet
          linkom za video poziv.
        </p>
      </div>
      <div className="relative z-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#ffffff" }}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--color-brand-600)] px-6 text-base font-semibold shadow-lg shadow-[var(--color-brand-700)]/20 transition hover:bg-[var(--color-brand-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-600)] focus-visible:ring-offset-2"
        >
          <CalendarCheck2 aria-hidden className="size-4" />
          Otvori kalendar i zakaži
          <ArrowRight aria-hidden className="size-4" />
        </a>
        <a
          href="tel:+381654363142"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-white px-6 text-base font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-brand-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-600)] focus-visible:ring-offset-2"
        >
          <PhoneCall aria-hidden className="size-4" />
          Pozovite nas
        </a>
      </div>
      <p className="relative z-10 mt-1 flex items-center gap-1.5 text-xs text-[var(--color-foreground-subtle)]">
        <ExternalLink aria-hidden className="size-3" />
        Otvara se u novom tabu (calendar.app.google)
      </p>
    </div>
  );
}

function BookingFallback({ size }: { size: "hero" | "compact" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 px-6 py-16 text-center ${HEIGHT_CLASS[size]}`}
    >
      <span
        aria-hidden
        className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
      >
        <CalendarCheck2 className="size-6" />
      </span>
      <div className="max-w-md">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
          Direktno zakazivanje uskoro
        </h3>
        <p className="mt-2 text-sm text-[var(--color-foreground-muted)]">
          Kalendar zakazivanja je u procesu aktivacije. Do tada, ostavite
          kontakt putem forme i javljamo se sa slobodnim terminima u toku
          istog radnog dana.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild size="md">
          <a href="#prijava">Ostavite kontakt</a>
        </Button>
        <Button asChild size="md" variant="outline">
          <a href="tel:+381654363142" className="gap-2">
            <PhoneCall aria-hidden className="size-4" />
            Pozovite nas
          </a>
        </Button>
      </div>
    </div>
  );
}

function FeatureLi({
  icon: Icon,
  children,
}: {
  icon: typeof CalendarCheck2;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <Icon aria-hidden className="mt-0.5 size-4 text-[var(--color-brand-700)]" />
      <span>{children}</span>
    </li>
  );
}
