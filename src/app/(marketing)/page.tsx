import type { Metadata } from "next";

import { APP_NAME, COMPANY, MARKETING_URL, LAUNCH_DATE_ISO } from "@/lib/constants/app";
import { Hero } from "@/features/marketing/hero";
import { ProductVideo } from "@/features/marketing/product-video";
import { OfferBanner } from "@/features/marketing/offer-banner";
import { FeatureGrid } from "@/features/marketing/feature-grid";
import { SocialProof } from "@/features/marketing/social-proof";
import { Personas } from "@/features/marketing/personas";
import { SerbiaSection } from "@/features/marketing/serbia-section";
import { DemoTraining } from "@/features/marketing/demo-training";
import { BookingEmbed } from "@/features/marketing/booking-embed";
import { EarlyBirdBonuses } from "@/features/marketing/early-bird-bonuses";
import { Roadmap } from "@/features/marketing/roadmap";
import { PricingTeaser } from "@/features/marketing/pricing-teaser";
import { LeadForm } from "@/features/marketing/lead-form";
import { Faq } from "@/features/marketing/faq";
import { faqItems } from "@/features/marketing/faq-items";
import { createT, htmlLang } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return {
    title: {
      absolute: t("marketing.landing.metaHomeTitle", { name: APP_NAME }),
    },
    description: t("marketing.landing.metaHomeDescription"),
    alternates: {
      canonical: "/",
    },
  };
}

export default async function LandingPage() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const faqs = faqItems(t);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: MARKETING_URL,
    logo: `${MARKETING_URL}/icons/icon-512.png`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: COMPANY.email,
        telephone: COMPANY.phoneTel,
        availableLanguage: locale === "en" ? ["English", "Serbian"] : ["Serbian"],
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: htmlLang(locale),
    url: MARKETING_URL,
    description: t("marketing.landing.softwareDescription"),
    softwareVersion: "1.0",
    datePublished: LAUNCH_DATE_ISO,
    offers: [
      {
        "@type": "Offer",
        name: "Starter",
        price: "49",
        priceCurrency: "EUR",
        category: "monthly subscription",
      },
      {
        "@type": "Offer",
        name: "Growth",
        price: "149",
        priceCurrency: "EUR",
        category: "monthly subscription",
      },
      {
        "@type": "Offer",
        name: "Scale",
        price: "399",
        priceCurrency: "EUR",
        category: "monthly subscription",
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <Hero />
      <ProductVideo />
      <OfferBanner />
      <FeatureGrid />
      <SocialProof />
      <Personas />
      <SerbiaSection />
      <DemoTraining />
      <BookingEmbed />
      <EarlyBirdBonuses />
      <PricingTeaser />
      <Roadmap />
      <LeadForm />
      <Faq />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
