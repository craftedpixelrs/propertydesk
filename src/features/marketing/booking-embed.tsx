"use client";

import { CalendarCheck2, PhoneCall, Video, Mail, ExternalLink, ArrowRight } from "lucide-react";

import { GOOGLE_APPOINTMENT_URL } from "@/lib/constants/app";
import { marketingCta } from "@/features/marketing/marketing-cta";
import { SectionHeading } from "@/features/marketing/ui";
import { useT } from "@/components/app/i18n-provider";

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
  title,
  subtitle,
  hideFeatures = false,
}: BookingEmbedProps) {
  const t = useT();
  const resolvedTitle = title ?? t("marketing.booking.title");
  const resolvedSubtitle = subtitle ?? t("marketing.booking.subtitle");
  const url = GOOGLE_APPOINTMENT_URL.trim();
  const hasUrl = url.length > 0;
  const isEmbeddable = hasUrl && isEmbeddableSchedulesUrl(url);

  return (
    <section id={anchorId} aria-labelledby={`${anchorId}-title`} className="scroll-mt-20">
      <div className="container-app py-20 sm:py-28">
        <SectionHeading
          id={`${anchorId}-title`}
          eyebrow={t("marketing.booking.eyebrow")}
          title={resolvedTitle}
          subtitle={resolvedSubtitle}
        />

        <div className="border-line mt-10 overflow-hidden rounded-3xl border bg-white shadow-[0_40px_80px_-50px_rgba(10,27,61,0.45)]">
          {isEmbeddable ? (
            <iframe
              src={url}
              title={t("marketing.booking.iframeTitle")}
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
          <ul className="border-line bg-line text-mute mt-4 grid gap-px overflow-hidden rounded-2xl border text-sm sm:grid-cols-2 lg:grid-cols-4">
            <FeatureLi icon={CalendarCheck2}>{t("marketing.booking.liveSlots")}</FeatureLi>
            <FeatureLi icon={Mail}>{t("marketing.booking.emailConfirm")}</FeatureLi>
            <FeatureLi icon={Video}>{t("marketing.booking.videoLink")}</FeatureLi>
            <FeatureLi icon={PhoneCall}>
              {t("marketing.booking.orCall")}{" "}
              <a className="text-ink font-semibold hover:underline" href="tel:+381654363142">
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
function BookingShareLinkCard({ url, size }: { url: string; size: "hero" | "compact" }) {
  const t = useT();
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-5 overflow-hidden px-6 py-16 text-center sm:px-10 ${HEIGHT_CLASS[size]}`}
    >
      <div aria-hidden className="pd-grid pd-fade-radial pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(11,154,162,0.18),transparent)]"
      />
      <span
        aria-hidden
        className="bg-ink text-tide-300 relative z-10 grid size-16 place-items-center rounded-2xl"
      >
        <CalendarCheck2 className="size-7" />
      </span>
      <div className="relative z-10 max-w-lg">
        <h3 className="text-ink text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
          {t("marketing.booking.shareTitle")}
        </h3>
        <p className="text-mute mt-3 text-sm leading-relaxed sm:text-base">
          {t("marketing.booking.shareBody")}
        </p>
      </div>
      <div className="relative z-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={marketingCta("ink", "lg")}
        >
          <CalendarCheck2 aria-hidden className="size-4" />
          {t("marketing.booking.openCalendar")}
          <ArrowRight aria-hidden className="size-4" />
        </a>
        <a href="tel:+381654363142" className={marketingCta("outline", "lg")}>
          <PhoneCall aria-hidden className="size-4" />
          {t("marketing.common.callUs")}
        </a>
      </div>
      <p className="text-faint relative z-10 mt-1 flex items-center gap-1.5 font-mono text-[11px] tracking-wide">
        <ExternalLink aria-hidden className="size-3" />
        {t("marketing.booking.newTab")}
      </p>
    </div>
  );
}

function BookingFallback({ size }: { size: "hero" | "compact" }) {
  const t = useT();
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 px-6 py-16 text-center ${HEIGHT_CLASS[size]}`}
    >
      <span
        aria-hidden
        className="bg-ink text-tide-300 grid size-14 place-items-center rounded-2xl"
      >
        <CalendarCheck2 className="size-6" />
      </span>
      <div className="max-w-md">
        <h3 className="text-ink text-xl font-bold tracking-[-0.025em]">
          {t("marketing.booking.fallbackTitle")}
        </h3>
        <p className="text-mute mt-2 text-sm leading-relaxed">
          {t("marketing.booking.fallbackBody")}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href="#prijava" className={marketingCta("ink", "md")}>
          {t("marketing.booking.leaveContact")}
        </a>
        <a href="tel:+381654363142" className={marketingCta("outline", "md")}>
          <PhoneCall aria-hidden className="size-4" />
          {t("marketing.common.callUs")}
        </a>
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
    <li className="flex items-start gap-2.5 bg-white p-4">
      <Icon aria-hidden className="text-tide-700 mt-0.5 size-4 flex-none" strokeWidth={1.75} />
      <span>{children}</span>
    </li>
  );
}
