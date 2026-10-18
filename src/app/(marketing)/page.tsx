import type { Metadata } from "next";

import { APP_NAME, COMPANY, MARKETING_URL, LAUNCH_DATE_ISO } from "@/lib/constants/app";
import { JsonLd } from "@/lib/seo/json-ld";
import { Hero } from "@/features/marketing/hero";
import { OfferBanner } from "@/features/marketing/offer-banner";
import { SalesCompare } from "@/features/marketing/sales-compare";
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
import { BlogTeaser } from "@/features/marketing/blog/blog-teaser";
import { RelatedLinks } from "@/features/marketing/landing/related-links";
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
      canonical: `${MARKETING_URL}/`,
      languages: {
        "sr-Latn": `${MARKETING_URL}/`,
        "x-default": `${MARKETING_URL}/`,
      },
    },
    openGraph: {
      title: t("marketing.landing.metaHomeTitle", { name: APP_NAME }),
      description: t("marketing.landing.metaHomeDescription"),
      url: `${MARKETING_URL}/`,
      type: "website",
      siteName: APP_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: t("marketing.landing.metaHomeTitle", { name: APP_NAME }),
      description: t("marketing.landing.metaHomeDescription"),
    },
  };
}

export default async function LandingPage() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const faqs = faqItems(t);

  const orgId = `${MARKETING_URL}/#organization`;
  // Google's rich-results validator wants an `AggregateOffer` on
  // SoftwareApplication (rather than a bare `offers` array of Offers),
  // with explicit lowPrice/highPrice/offerCount. Keeping the per-plan
  // Offers as `offers` inside the AggregateOffer makes it both pass
  // validation and still describe each plan.
  const planOffer = (name: string, price: string) => ({
    "@type": "Offer",
    name,
    price,
    priceCurrency: "EUR",
    availability: "https://schema.org/PreOrder",
    availabilityStarts: LAUNCH_DATE_ISO,
    url: `${MARKETING_URL}/#cenovnik`,
    seller: { "@id": orgId },
  });

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId,
    name: APP_NAME,
    url: `${MARKETING_URL}/`,
    logo: `${MARKETING_URL}/icons/icon-512.png`,
    email: COMPANY.email,
    telephone: COMPANY.phoneTel,
    areaServed: "RS",
    sameAs: [COMPANY.operatorUrl],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: COMPANY.email,
        telephone: COMPANY.phoneTel,
        areaServed: "RS",
        availableLanguage: ["Serbian", "English"],
      },
    ],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${MARKETING_URL}/#website`,
    name: APP_NAME,
    url: `${MARKETING_URL}/`,
    inLanguage: htmlLang(locale),
    publisher: { "@id": orgId },
    description: t("marketing.landing.metaHomeDescription"),
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real estate CRM",
    operatingSystem: "Web",
    inLanguage: htmlLang(locale),
    url: `${MARKETING_URL}/`,
    description: t("marketing.landing.softwareDescription"),
    publisher: { "@id": orgId },
    // Google rich-results validator prefers `AggregateOffer` on
    // SoftwareApplication with explicit price range and offerCount.
    // Individual plan offers live under `offers` inside it.
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: "49",
      highPrice: "399",
      offerCount: 3,
      availability: "https://schema.org/PreOrder",
      availabilityStarts: LAUNCH_DATE_ISO,
      url: `${MARKETING_URL}/#cenovnik`,
      offers: [planOffer("Starter", "49"), planOffer("Growth", "149"), planOffer("Scale", "399")],
    },
  };

  // Normalise answer text for FAQPage structured data. Google's rich-results
  // validator rejects schema that contains unresolved template placeholders
  // (`{{var}}`) or raw HTML; both would leak directly into the Question
  // schema otherwise. We also collapse whitespace runs for safety.
  const faqAnswerText = (raw: string) =>
    raw
      .replace(/\{\{[^}]+\}\}/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${MARKETING_URL}/#faq`,
    inLanguage: htmlLang(locale),
    mainEntity: faqs.map((item, idx) => ({
      "@type": "Question",
      "@id": `${MARKETING_URL}/#faq-q${idx + 1}`,
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faqAnswerText(item.answer),
      },
    })),
  };

  return (
    <>
      <Hero />
      <OfferBanner />
      <SalesCompare />
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
      <BlogTeaser />
      <RelatedLinks
        title={t("marketing.anchors.related")}
        items={[
          {
            href: "/softver-za-prodaju-novogradnje",
            label: t("marketing.anchors.software"),
          },
          { href: "/prodaja-novogradnje", label: t("marketing.anchors.newBuild") },
          { href: "/crm-za-investitore", label: t("marketing.anchors.crm") },
          { href: "/alternative-excelu", label: t("marketing.anchors.excel") },
          { href: "/rezervacije-i-uplate", label: t("marketing.anchors.reservation") },
          { href: "/provizije-agencija", label: t("marketing.anchors.commission") },
          { href: "/za-investitore", label: t("marketing.anchors.investors") },
          { href: "/za-agencije", label: t("marketing.anchors.agencies") },
        ]}
      />
      <Faq />

      <JsonLd data={orgJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={softwareJsonLd} />
      <JsonLd data={faqJsonLd} />
    </>
  );
}
