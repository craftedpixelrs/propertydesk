import type { Metadata } from "next";
import { CalendarCheck2 } from "lucide-react";

import { BookingEmbed } from "@/features/marketing/booking-embed";
import { ProductVideo } from "@/features/marketing/product-video";
import { PageHero } from "@/features/marketing/landing/page-hero";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return buildLandingMetadata({
    slug: "demo",
    title: t("marketing.pages.demo.metaTitle"),
    description: t("marketing.pages.demo.metaDescription"),
    locale,
  });
}

export default async function Page() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const meta = {
    slug: "demo",
    title: t("marketing.pages.demo.metaTitle"),
    description: t("marketing.pages.demo.metaDescription"),
    locale,
  };

  return (
    <>
      <PageHero
        eyebrow={t("marketing.pages.demo.eyebrow")}
        icon={CalendarCheck2}
        title={t("marketing.pages.demo.title")}
        subtitle={t("marketing.pages.demo.subtitle")}
        primaryCta={{ label: t("marketing.pages.demo.scrollCalendar"), href: "#zakazivanje" }}
        secondaryCta={{
          label: t("marketing.common.watchVideo"),
          href: "#video",
        }}
        footnote={t("marketing.pages.demo.footnote")}
      />
      <BookingEmbed
        size="hero"
        title={t("marketing.pages.demo.bookingTitle")}
        subtitle={t("marketing.pages.demo.bookingSubtitle")}
      />
      <ProductVideo />
      <LandingJsonLd {...meta} />
    </>
  );
}
