import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { FeatureGrid } from "@/features/marketing/feature-grid";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";

const META = {
  slug: "prodaja-novogradnje",
  title: "Softver za prodaju novogradnje u Srbiji",
  description:
    "Prodaja stanova u fazi izgradnje uključuje projekte, cenovnike, rezervacije, ugovore, planove otplate i provizije agencija. PropertyDesk povezuje sve učesnike - investitora, prodajni tim, agencije, kupce - u jednom sistemu na srpskom.",
};

export const metadata: Metadata = buildLandingMetadata(META);

const PAIRS = [
  {
    problem:
      "Prodaja u fazi izgradnje traje mesecima ili godinama - podaci se razbacaju po više alata.",
    solution:
      "Jedan sistem koji prati kupca od prve rezervacije do poslednje rate - sa vremenskom linijom svakog događaja.",
  },
  {
    problem:
      "Predugovor, ugovor, aneksi i storniranje - svaki dokument u zasebnom folderu na disku.",
    solution:
      "Centralno skladište dokumenata vezano za konkretnu prodaju, sa audit tragom svake promene.",
  },
  {
    problem:
      "Različiti planovi otplate za različite kupce - lako se pogreši u ratama i valuti.",
    solution:
      "Prilagođeni planovi rata sa validacijom, konverzija EUR/RSD, IPS QR kod i SEF integracija.",
  },
  {
    problem:
      "Uplate iz banke stižu na različite načine - teško ih je uparivati sa ratama.",
    solution:
      "Automatska FIFO alokacija na najstarije otvorene rate, ručna realokacija po potrebi.",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Prodaja novogradnje"
        icon={LayoutGrid}
        title="Kompletan operativni sistem za prodaju stanova u novogradnji"
        subtitle="Od projekta i cenovnika, preko rezervacija i ugovora, do uplata i provizija - PropertyDesk pokriva ceo tok prodaje novogradnje u Srbiji. Sve na srpskom, sa IPS QR i SEF integracijom."
      />
      <ProblemSolutionGrid
        title="Zašto Excel i Google Sheets ne rade za novogradnju"
        subtitle="Prodaja u fazi izgradnje ima kompleksne, vremenski razvučene tokove koje generički alati ne razumeju. PropertyDesk je pravljen za tačno taj scenario."
        items={PAIRS}
      />
      <FeatureGrid />
      <CtaPanel />
      <LandingJsonLd {...META} />
    </>
  );
}
