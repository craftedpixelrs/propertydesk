import type { Metadata } from "next";
import { FileSpreadsheet } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";

const META = {
  slug: "alternative-excelu",
  title: "Alternativa Excelu za prodaju novogradnje",
  description:
    "Ako Vaš prodajni tim još uvek vodi projekte u Excel tabelama, ovo je Vaš prvi korak dalje. PropertyDesk uvozi Vaš postojeći Excel i pretvara ga u kolaborativan sistem sa istorijom, pravima pristupa i real-time statusima jedinica.",
};

export const metadata: Metadata = buildLandingMetadata(META);

const PAIRS = [
  {
    problem:
      "Excel se otvara u više verzija - kolega prepisuje ćeliju bez znanja da ste Vi već upisali novi status.",
    solution:
      "Jedna baza podataka, svako radi u istom trenutku, sa audit tragom ko je i kada promenio šta.",
  },
  {
    problem:
      "Formule pucaju - jedan pogrešan copy-paste briše polovinu izračuna cena.",
    solution:
      "Poslovna pravila su ugrađena u sistem, ne u formule - ne mogu se slučajno obrisati.",
  },
  {
    problem:
      "Nema koncepta prava pristupa - ceo tim vidi sve, ili niko ne vidi ništa.",
    solution:
      "Uloge (direktor, prodavac, agent, kontrolor) sa preciznim pravima po projektu i akciji.",
  },
  {
    problem:
      "Excel ne šalje podsetnike - dospele rate ostaju neprijavljene mesecima.",
    solution:
      "Automatski email podsetnici za kupce i notifikacije za prodajni tim - bez ručnog praćenja kalendara.",
  },
  {
    problem:
      "Prelazak na novi alat obično znači ručno ukucavanje 1.000+ jedinica.",
    solution:
      "Besplatan uvoz Vaše prve Excel tabele - mi radimo mapiranje, vi samo pošaljete fajl.",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Alternativa Excelu"
        icon={FileSpreadsheet}
        title="Iz Excela u sistem koji ne puca kad tim raste"
        subtitle="PropertyDesk uvozi Vaše postojeće cenovnike i liste jedinica, dodaje slojeve prava pristupa, istorije i notifikacija - i daje Vam sistem u kojem svaki član tima vidi tačno ono što treba, u realnom vremenu."
      />
      <ProblemSolutionGrid
        title="5 razloga zbog kojih Excel počinje da Vas usporava"
        subtitle="Excel je odličan za pojedinca. Za tim od 5 ljudi koji istovremeno vode 300 jedinica - postaje uzrok grešaka. Ovo su najčešće tačke bola."
        items={PAIRS}
      />
      <CtaPanel
        title="Pošaljite nam Vašu Excel tabelu - postavimo Vam sistem besplatno"
        subtitle="Prijave do 15.08.2026. dobijaju besplatan uvoz prve Excel tabele i besplatno podešavanje jednog projekta. Prvih 30 dana korišćenja bez plaćanja."
      />
      <LandingJsonLd {...META} />
    </>
  );
}
