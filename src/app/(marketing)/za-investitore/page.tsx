import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { FeatureGrid } from "@/features/marketing/feature-grid";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";

const META = {
  slug: "za-investitore",
  title: "Softver za investitore u novogradnju",
  description:
    "PropertyDesk je operativni sistem za investitore u novogradnju - projekti, jedinice, rezervacije, prodaje, uplate i provizije agencija na jednom mestu. Zamenite Excel i Viber grupe jasnim tokom, u realnom vremenu.",
};

export const metadata: Metadata = buildLandingMetadata(META);

const PAIRS = [
  {
    problem:
      "Cenovnici u Excelu se granaju u više verzija - niko u timu ne zna koja je aktuelna.",
    solution:
      "Jedan cenovnik po projektu, jedna istina za ceo tim, sa istorijom svih promena cena.",
  },
  {
    problem:
      "Agencije rezervišu jedinice preko Vibera - dešava se dupla rezervacija istog stana.",
    solution:
      "Jedna aktivna rezervacija po jedinici, automatski istek, real-time status vidljiv svim agencijama.",
  },
  {
    problem:
      "Provizije agencija se ručno računaju u svakoj tabeli, sa različitim pravilima po projektu.",
    solution:
      "Pravila po projektu, jedinici i agenciji, sa snapshot iznosom u trenutku ugovora - bez kasnijih nesporazuma.",
  },
  {
    problem:
      "Uplate se ne poklapaju sa ratama; nemate uvid ko duguje, ko je platio i koliko je zakasnio.",
    solution:
      "Automatska FIFO alokacija uplata na otvorene rate, jasan prikaz salda po kupcu i podsetnici za dospele rate.",
  },
  {
    problem:
      "Izveštaji za direktora se rade ručno svakog meseca; podaci su uvek zastareli.",
    solution:
      "Izveštaji prodaja, zaliha i uplata sa filterima po projektu i periodu - izvoz u CSV/XLSX jednim klikom.",
  },
  {
    problem:
      "Kupci gube dokumente (ponuda, predugovor, ugovor); slanje mailom je haotično.",
    solution:
      "Centralno skladište dokumenata vezano za projekat, jedinicu, kupca ili prodaju - sa Vašim brendom.",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Za investitore"
        icon={Building2}
        title="Vodite više projekata bez Excela, Vibera i haosa"
        subtitle="PropertyDesk je centralni sistem za investitore koji istovremeno prodaju direktno i preko partnerskih agencija. Projekti, jedinice, rezervacije, prodaje, uplate, provizije - jedna platforma, sve pod kontrolom."
      />
      <ProblemSolutionGrid
        title="6 stvari koje investitori žele da reše sa softverom"
        subtitle="Ovo su najčešći problemi koje čujemo od investitora sa 50 do 1.000 jedinica pod prodajom. Svaki od njih PropertyDesk rešava direktno, iz kutije."
        items={PAIRS}
      />
      <FeatureGrid />
      <CtaPanel />
      <LandingJsonLd {...META} />
    </>
  );
}
