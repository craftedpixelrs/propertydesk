import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";

const META = {
  slug: "provizije-agencija",
  title: "Automatske provizije agencija za nekretnine",
  description:
    "Pravila po projektu, jedinici i agenciji. Snapshot iznosa provizije u trenutku ugovora - bez kasnijih izmena i nesporazuma. Jasan tok od izračunavanja do isplate, sa portalom za svaku partnersku agenciju.",
};

export const metadata: Metadata = buildLandingMetadata(META);

const PAIRS = [
  {
    problem:
      "Različiti procenti provizije po projektu, agenciji ili tipu jedinice - ručno računanje ne skalira.",
    solution:
      "Pravila su definisana u sistemu: po projektu, jedinici i konkretnoj agenciji. Sistem računa iznos automatski.",
  },
  {
    problem:
      "Investitor kasnije menja proviziju - agencija se buni. Sud, tužba, prekid saradnje.",
    solution:
      "Snapshot iznosa provizije se zaključava u trenutku ugovora. Kasnije izmene pravila ne utiču na već ugovorene prodaje.",
  },
  {
    problem:
      "Isplata kasni jer se čeka Excel od finansija, verifikacija od direktora, ponovna verifikacija od agencije.",
    solution:
      "Portal agencije prikazuje realan status svake stavke - ugovorena, aktivna, dospela za isplatu, isplaćena.",
  },
  {
    problem:
      "Agencija ne vidi kada je kupac uplatio - ne zna kada da očekuje proviziju.",
    solution:
      "Agencija vidi status uplata svojih prodaja u realnom vremenu - bez pozivanja investitora.",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Provizije agencija"
        icon={BadgeCheck}
        title="Provizije koje se same računaju i same isplaćuju"
        subtitle="Definišete pravila jednom - PropertyDesk primenjuje ih na svaku novu prodaju, čuva snapshot u trenutku ugovora i vodi agenciju kroz jasan tok od izračunavanja do isplate. Bez tabela i bez trvenja."
      />
      <ProblemSolutionGrid
        title="4 klasična problema koja gube saradnje sa agencijama"
        subtitle="Ako ste ikad imali neispravnu isplatu provizije ili spor sa agencijom, verovatno je uzrok bio jedan od ovih. PropertyDesk uklanja sve četiri."
        items={PAIRS}
      />
      <CtaPanel />
      <LandingJsonLd {...META} />
    </>
  );
}
