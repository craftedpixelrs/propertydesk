import type { Metadata } from "next";

import { APP_NAME, MARKETING_URL, LAUNCH_DATE_ISO } from "@/lib/constants/app";
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
import { FAQ_ITEMS } from "@/features/marketing/content";

/**
 * Landing metadata overrides the root `title` so the home page shows the
 * full marketing headline in the browser tab and in shared previews.
 * All other tags (openGraph, twitter, robots) inherit from root layout.
 */
export const metadata: Metadata = {
  title: {
    // `absolute` bypasses the root `template: "%s · PropertyDesk"` so the
    // landing tab shows the full marketing headline without a trailing
    // "· PropertyDesk" duplicate.
    absolute: `${APP_NAME} - Softver za prodaju novogradnje | Investitori i agencije`,
  },
  description:
    "Softver za investitore u nekretnine i partnerske agencije: projekti, kupci, rezervacije, prodaje, planovi otplate, uplate, provizije, dokumenti i izveštaji. IPS QR, SEF, EUR/RSD. Lansiranje 15.08.2026 - prijavite se za rani pristup: 30 dana besplatno + 50% na naredna 3 meseca.",
  alternates: {
    canonical: "/",
  },
};

export default function LandingPage() {
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
        email: "marko.banovic@craftedpixel.rs",
        telephone: "+381-65-43-63-142",
        availableLanguage: ["Serbian"],
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "sr-Latn",
    url: MARKETING_URL,
    description:
      "Multi-tenant SaaS platforma za investitore u nekretnine i partnerske agencije. Projekti, jedinice, kupci, rezervacije, prodaje, planovi otplate, uplate, provizije, dokumenti i izveštaji - sa IPS QR i SEF integracijom.",
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
    mainEntity: FAQ_ITEMS.map((item) => ({
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
        // JSON-LD is inert data, not executable; safe to inline.
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
