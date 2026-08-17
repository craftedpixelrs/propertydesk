import type { Metadata } from "next";

import { LegalArticle } from "@/features/marketing/legal/legal-article";
import { getLegalDoc } from "@/features/marketing/legal/copy";
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
    slug: "privatnost",
    title: t("marketing.legal.privacyTitle"),
    description: t("marketing.legal.privacyDescription"),
    locale,
  });
}

export default async function PrivacyPage() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const doc = getLegalDoc("privacy", locale);

  return (
    <>
      <LegalArticle doc={doc} />
      <LandingJsonLd
        slug="privatnost"
        title={t("marketing.legal.privacyTitle")}
        description={t("marketing.legal.privacyDescription")}
        locale={locale}
        breadcrumb={t("marketing.nav.privacy")}
      />
    </>
  );
}
