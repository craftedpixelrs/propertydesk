import type { Metadata } from "next";
import { Handshake } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";

const META = {
  slug: "za-agencije",
  title: "PropertyDesk za agencije za nekretnine",
  description:
    "Real-time pristup inventaru investitora, rezervacije u par klikova, automatske provizije i portal sa Vašim brendom. PropertyDesk daje agencijama za nekretnine sve što treba za prodaju novogradnje - bez čekanja na email potvrde investitora.",
};

export const metadata: Metadata = buildLandingMetadata(META);

const PAIRS = [
  {
    problem:
      "Nemate uvid u aktuelan cenovnik investitora - klijentu prodajete stan koji je već rezervisan.",
    solution:
      "Real-time katalog jedinica sa aktuelnim statusom (slobodno, rezervisano, prodato) direktno iz investitorovog PropertyDesk-a.",
  },
  {
    problem:
      "Rezervacija zahteva mail investitoru pa čekanje potvrde satima ili danima.",
    solution:
      "Rezervišete jedinicu jednim klikom - status se odmah zaključava, investitor dobija notifikaciju. Kupac može i sam da rezerviše preko javnog linka i plati kaparu skeniranjem IPS QR-a.",
  },
  {
    problem:
      "Kupac se izgubi između investitora i tri agencije - niko ne zna ko ga je 'doveo'.",
    solution:
      "Svaka agencija dobija svoj referral kod (link + QR za marketing). Svaki online zahtev sa Vašim kodom se automatski atribuira Vama, sa vidljivim referral prihodom u izveštaju.",
  },
  {
    problem:
      "Provizija se dogovara mailom, računa u Excelu, isplaćuje sa zakašnjenjem.",
    solution:
      "Pravila provizije unapred definisana po projektu i jedinici; iznos se zaključava u trenutku ugovora.",
  },
  {
    problem:
      "Ne vidite kada je klijent uplatio ratu - ne znate kada da očekujete proviziju.",
    solution:
      "Transparentan tok od prodaje do isplate provizije - vidite status svake stavke uživo.",
  },
  {
    problem:
      "Kupci Vas zovu da pitaju za dostupnost - a Vi morate da zovete investitora da proverite.",
    solution:
      "Direktan pristup katalogu - odgovarate klijentu u realnom vremenu i zakazujete termin obilaska. Javni sajt projekta možete deliti kupcu jednim linkom.",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Za agencije"
        icon={Handshake}
        title="Prodajte novogradnju iz kataloga koji je uvek ažuran"
        subtitle="PropertyDesk povezuje Vašu agenciju sa investitorima sa kojima sarađujete - vidite realne jedinice, statuse i cene, rezervišete jednim klikom i pratite proviziju od prodaje do isplate."
      />
      <ProblemSolutionGrid
        title="Zašto se agencije bore sa novogradnjom"
        subtitle="Ako radite sa više investitora, verovatno svakom danu izgubite sat na provere dostupnosti i cenovnika. PropertyDesk uklanja to vreme."
        items={PAIRS}
      />
      <CtaPanel
        title="Sledeći put kada Vas kupac pita za slobodne stanove - odgovorite odmah."
        subtitle="Priključite se pilot programu za agencije. Prvih 30 dana besplatno, sa aktivnim inventarom Vaših investitora - bez integracija na Vašoj strani."
      />
      <LandingJsonLd {...META} />
    </>
  );
}
