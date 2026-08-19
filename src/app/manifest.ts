import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { publicEnv } from "@/lib/env";
import { hostFromHeaders, isMarketingHost } from "@/lib/seo/hosts";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const name = publicEnv.NEXT_PUBLIC_APP_NAME;
  const marketing = isMarketingHost(hostFromHeaders(await headers()));
  return {
    name,
    short_name: name,
    description: "Operativna platforma za investitore u nekretnine.",
    start_url: marketing ? "/" : "/sign-in",
    display: "standalone",
    orientation: "portrait",
    lang: publicEnv.NEXT_PUBLIC_APP_LOCALE,
    dir: "ltr",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
