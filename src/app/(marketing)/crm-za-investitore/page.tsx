import type { Metadata } from "next";
import { Contact } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";

const META = {
  slug: "crm-za-investitore",
  title: "CRM za investitore u novogradnju",
  description:
    "HubSpot, Pipedrive i Salesforce nisu pravljeni za prodaju novogradnje. PropertyDesk je namenski CRM za investitore - povezuje kupca sa konkretnom jedinicom, ratom, ugovorom i agencijom - bez pretvaranja stanova u 'deal-ove'.",
};

export const metadata: Metadata = buildLandingMetadata(META);

const PAIRS = [
  {
    problem:
      "Generički CRM (HubSpot, Pipedrive) tretira stan kao apstraktan 'deal' bez veze sa jedinicom u projektu.",
    solution:
      "Kupac je vezan za konkretnu jedinicu, plan otplate, ugovor i agenciju - jedan klik do cele istorije.",
  },
  {
    problem:
      "Nema koncepta rezervacije, storniranja ili aneksa - morate to sami da modelujete kroz custom polja.",
    solution:
      "Rezervacije, storniranja, aneksi i planovi rata su ugrađeni tokovi - ne prilagođavate CRM njima.",
  },
  {
    problem:
      "Automatizacije rade na apstraktne 'stage-ove', ne na realne događaje (istek rezervacije, dospele rate).",
    solution:
      "Automatski podsetnici za dospele rate, istek rezervacije, obavezne dokumente - iz kutije.",
  },
  {
    problem:
      "Partnerske agencije nemaju svoj portal - morate im slati Excel svakog dana.",
    solution:
      "Svaka agencija ima svoj login sa pravima videti samo ono što joj Vi dopustite - stanovi, cene, provizije.",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="CRM za novogradnju"
        icon={Contact}
        title="CRM koji razume da prodajete stanove, ne 'deal-ove'"
        subtitle="PropertyDesk je namenski CRM za investitore - modeluje projekat, jedinicu, kupca, rezervaciju i prodaju kao prvorazredne entitete. Bez custom polja, bez izmišljanja tokova, bez integratora."
      />
      <ProblemSolutionGrid
        title="Zašto generički CRM ne radi za investitore u novogradnju"
        subtitle="Ako ste probali HubSpot, Pipedrive ili Salesforce, prepoznajete ove probleme. PropertyDesk polazi od domene novogradnje - CRM je jedan sloj u sistemu, ne cela priča."
        items={PAIRS}
      />
      <CtaPanel />
      <LandingJsonLd {...META} />
    </>
  );
}
