import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { APP_NAME, APP_LOCALE, APP_URL } from "@/lib/constants/app";
import { Providers } from "@/components/app/providers";
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

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} - Operativni sistem za prodaju novogradnje`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "PropertyDesk je multi-tenant SaaS platforma za investitore u nekretnine i partnerske agencije. Projekti, jedinice, kupci, rezervacije, prodaje, plan otplate, uplate, provizije, dokumenti i izveštaji - sve na srpskom, sa IPS QR i SEF integracijom.",
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
  keywords: [
    "PropertyDesk",
    "softver za investitore u nekretnine",
    "CRM za nekretnine",
    "prodaja novogradnje",
    "upravljanje projektima nekretnina",
    "rezervacije stanova",
    "plan otplate",
    "provizije agencija",
    "IPS QR",
    "SEF",
    "sistem elektronskih faktura",
    "e-fakture",
    "Srbija",
  ],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: APP_LOCALE,
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} - Operativni sistem za prodaju novogradnje`,
    description:
      "Multi-tenant platforma za investitore i partnerske agencije. Od projekta i zaliha, preko rezervacija i ugovora, do uplata i provizija - sve na srpskom.",
    // OG image is auto-attached from `(marketing)/opengraph-image.tsx`
    // for the landing route via Next's file-convention metadata.
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} - Operativni sistem za prodaju novogradnje`,
    description:
      "Multi-tenant platforma za investitore i partnerske agencije. Sve na srpskom, sa IPS QR i SEF integracijom.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang={APP_LOCALE}
      suppressHydrationWarning
      className={inter.variable}
    >
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Preskoči na sadržaj
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
