import type { Metadata } from "next";
import { CalendarCheck2 } from "lucide-react";

import { BookingEmbed } from "@/features/marketing/booking-embed";
import { ProductVideo } from "@/features/marketing/product-video";
import { PageHero } from "@/features/marketing/landing/page-hero";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";

const META = {
  slug: "demo",
  title: "Zakažite 25-minutni demo",
  description:
    "Personalizovan demo PropertyDesk-a - 25 minuta na Vašim primerima, direktno iz kalendara. Bez čekanja, bez obaveze, sa video pozivom i email potvrdom. Ako Vam se dopadne - aktiviramo 30 dana besplatnog trial-a.",
};

export const metadata: Metadata = buildLandingMetadata(META);

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Zakažite demo"
        icon={CalendarCheck2}
        title="25 minuta uživo. Vaši primeri. Bez slajdova."
        subtitle="Odaberite termin ispod. Dobijate potvrdu i podsetnik e-mailom, sa linkom za video poziv. Ako nakon demoa odlučite da probate PropertyDesk - aktiviramo 30 dana besplatnog trial-a."
        primaryCta={{ label: "Skroluj do kalendara", href: "#zakazivanje" }}
        secondaryCta={{
          label: "Pogledajte demo od 3 minuta",
          href: "#video",
        }}
        footnote="Ili nas pozovite direktno: +381 65 43 63 142"
      />
      <BookingEmbed
        size="hero"
        title="Izaberite termin koji Vam odgovara"
        subtitle="Standardni demo traje 25 minuta putem video poziva. Podsetnik dobijate e-mailom sa linkom za sastanak. Ako Vam ne odgovara video poziv, uvek Vas možemo pozvati telefonom."
      />
      <ProductVideo />
      <LandingJsonLd {...META} />
    </>
  );
}
