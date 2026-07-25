import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  const name = publicEnv.NEXT_PUBLIC_APP_NAME;
  return {
    name,
    short_name: name,
    description: "Operativna platforma za investitore u nekretnine.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    lang: publicEnv.NEXT_PUBLIC_APP_LOCALE,
    dir: "ltr",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      // Real icons should be added under public/icons/ before production.
      // Placeholder references keep the manifest well-formed for install
      // prompts on Android/iOS.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
