import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/app/providers";
import { APP_LOCALE, APP_NAME, MARKETING_URL } from "@/lib/constants/app";
import { htmlLang, t, type Locale } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { NOINDEX_ROBOTS } from "@/lib/seo/policy";
import "./globals.css";

/**
 * Self-hosted Inter via `next/font/google`. This is CSP-safe: Next writes
 * the woff2 files under `_next/static` (served from `'self'`), so the
 * strict `font-src 'self' data:` policy in [next.config.ts](next.config.ts)
 * still allows the fonts to load. We restrict weights to the ones the UI
 * actually uses to keep the payload lean.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans-loaded",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

function ogLocale(locale: Locale): string {
  return locale === "en" ? "en_GB" : APP_LOCALE;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const title = t("marketing.site.title", { name: APP_NAME }, locale);
  const description = t("marketing.site.description", undefined, locale);
  return {
    metadataBase: new URL(MARKETING_URL),
    title: {
      default: title,
      template: `%s · ${APP_NAME}`,
    },
    description,
    applicationName: APP_NAME,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: APP_NAME,
    },
    formatDetection: {
      telephone: false,
    },
    keywords: t("marketing.site.keywords", undefined, locale).split(","),
    authors: [{ name: APP_NAME }],
    creator: APP_NAME,
    publisher: APP_NAME,
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: APP_NAME,
      title,
      description: t("marketing.site.ogDescription", undefined, locale),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: t("marketing.site.twitterDescription", undefined, locale),
    },
    // Default: do not index. Marketing layout opts back in on the apex
    // only. App hosts (my. / demo. / staging.) stay noindex.
    robots: NOINDEX_ROBOTS,
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await resolveRequestLocale();
  return (
    <html
      lang={htmlLang(locale)}
      suppressHydrationWarning
      className={inter.variable}
    >
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
            {t("common.skipToContent", undefined, locale)}
        </a>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
