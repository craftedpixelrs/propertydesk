import type { Metadata } from "next";
import { Wallet } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";

const META = {
  slug: "rezervacije-i-uplate",
  title: "Rezervacije i uplate za novogradnju",
  description:
    "Jedna aktivna rezervacija po jedinici, automatski istek, konverzija u prodaju u par klikova. Uplate se FIFO alociraju na najstarije otvorene rate uz podršku za EUR/RSD, IPS QR i SEF - bez ručnog uparivanja bankovnih izvoda.",
};

export const metadata: Metadata = buildLandingMetadata(META);

const PAIRS = [
  {
    problem:
      "Rezervacije se dogovaraju preko Vibera - ne znate ko je prvi rezervisao istu jedinicu.",
    solution:
      "Sistem forsira jednu aktivnu rezervaciju po jedinici - dupla rezervacija je fizički nemoguća.",
  },
  {
    problem:
      "Zaboravite da rezervacija ističe - stan je 'blokiran' mesec dana bez akcije.",
    solution:
      "Automatski istek rezervacije + email podsetnici pre isteka - tim vidi realno slobodne jedinice.",
  },
  {
    problem:
      "Uplate stižu u različitim valutama i preko različitih računa - ručno uparivanje traje danima.",
    solution:
      "FIFO alokacija na otvorene rate, konverzija EUR/RSD po dnevnom kursu, uvoz bankovnih izvoda.",
  },
  {
    problem:
      "Jedna uplata se deli na više prodaja (ili jedan kupac ima više stanova) - kako to rasporediti?",
    solution:
      "Deljenje uplate na više prodaja, ručna realokacija, potpuna transparentnost istorije uplate.",
  },
  {
    problem:
      "Za srpske kupce potreban je IPS QR i pošiljka SEF - a strane platforme to ne podržavaju.",
    solution:
      "Ugrađen IPS QR na profakturama i integracija sa Sistemom elektronskih faktura (SEF).",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Rezervacije i uplate"
        icon={Wallet}
        title="Rezervacije bez duplih zaključavanja, uplate bez ručnog uparivanja"
        subtitle="PropertyDesk štiti tok od prve rezervacije do poslednje rate - jasan status svake jedinice, automatska alokacija uplata, srpski standardi (EUR/RSD, IPS QR, SEF) iz kutije."
      />
      <ProblemSolutionGrid
        title="Gde se najčešće gubi novac u prodaji novogradnje"
        subtitle="Rezervacije koje se zaborave, uplate koje se ne poklope, kupci koji zakasne bez podsetnika - svaki od ovih scenarija je meseca prihoda."
        items={PAIRS}
      />
      <CtaPanel />
      <LandingJsonLd {...META} />
    </>
  );
}
