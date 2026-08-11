/**
 * Shared marketing copy constants.
 *
 * Keeping the FAQ and feature lists here (rather than inline in each JSX
 * component) lets us reuse the exact same text in two places:
 *   - the visible section on the page,
 *   - the JSON-LD structured-data block for SEO (FAQPage, ItemList, etc.).
 *
 * Only edit in one place → both surfaces stay in sync.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Kada se lansira PropertyDesk?",
    answer:
      "Zvanično lansiranje je 01.09.2026. Do tada je otvorena rana prijava - svi koji se prijave putem forme na ovoj stranici dobijaju obaveštenje pre javnog puštanja.",
  },
  {
    question: "Kako funkcioniše rana ponuda za prijave do 01.09.2026.?",
    answer:
      "Prvih 30 dana besplatno. Nakon toga 50% popusta na naredna tri meseca. Uz to: besplatan uvoz prve Excel tabele, besplatno podešavanje jednog projekta, onboarding za tim, prioritetna podrška i zaključana cena paketa 12 meseci - bez poskupljenja u toku prve godine.",
  },
  {
    question: "Kako izgleda demo i koliko traje?",
    answer:
      "Personalizovan demo traje 20-30 minuta (video poziv, direktno zakazivanje iz kalendara na sajtu, bez čekanja). Ako nakon toga odlučite da probate PropertyDesk, dobijate 30 dana besplatnog trial-a. Onboarding za tim (60 min) zakazuje se nakon aktivacije trial naloga - kroz konkretne primere iz Vašeg poslovanja.",
  },
  {
    question: "Da li je platforma na srpskom jeziku?",
    answer:
      "Da. Ceo interfejs, poruke, PDF izlazi i email obaveštenja su na srpskom (latinično pismo). Ugrađena je podrška za EUR i RSD, srpski format datuma, IPS QR kod na fakturama i integracija sa Sistemom elektronskih faktura (SEF).",
  },
  {
    question: "Za koga je PropertyDesk?",
    answer:
      "Za investitore koji prodaju novogradnju (stanove, garaže, poslovne prostore) direktno ili preko partnerskih agencija, i za same agencije koje sarađuju sa investitorima. Svaka strana dobija svoj portal sa jasno definisanim pravima.",
  },
  {
    question: "Kako radi online rezervacija sa kaparom?",
    answer:
      "Svaka jedinica dobija javni share link (bez logina). Kupac otvori link, popuni ime / prezime / email / telefon i iznos kapare i dobija ispravan IPS QR kod za plaćanje. Vi kao investitor u '/rezervacije/zahtevi' vidite listu novih zahteva, potvrđujete prijem kapare kada legne na račun - i zahtev se konvertuje u pravu rezervaciju sa 48h hold-om.",
  },
  {
    question: "Da li mogu da generišem ugovor i predugovor iz sistema?",
    answer:
      "Da. U 'Administracija → Šabloni ugovora' čuvate HTML šablon sa placeholder-ima ({{buyer.fullName}}, {{buyer.jmbg}}, {{sale.finalPrice}}, {{plan.installments}}, {{tax.mode}}, {{investor.pib}}). Na svakoj prodaji izaberete šablon i generišete PDF za par sekundi - sa punim audit tragom (poslato, potpisano).",
  },
  {
    question: "Da li podržavate PDV režim za novogradnju (10%) i sekundarno tržište (2.5%)?",
    answer:
      "Da. Na svakoj prodaji birate režim (NEW_BUILD_10 / SECONDARY_MARKET_2_5 / NONE) i platforma automatski računa iznos poreza od ugovorene cene. Podatak se propagira u PDF ugovor i u izveštaje.",
  },
  {
    question: "Mogu li otkazati pretplatu u bilo kom trenutku?",
    answer:
      "Da. Pretplata se otkazuje jednim klikom iz aplikacije, bez ugovorne obaveze. Vaši podaci ostaju dostupni za izvoz još 30 dana nakon otkazivanja.",
  },
  {
    question: "Kako se čuvaju podaci?",
    answer:
      "Svi podaci se čuvaju u EU regionu, uz enkripciju u tranzitu i u mirovanju. Svaka izmena je evidentirana u trajnom audit dnevniku. Pristup podacima je striktno ograničen po organizaciji (multi-tenant izolacija) i po ulozi korisnika. Backup baze se verifikuje sedmično automatski - operateri dobijaju email upozorenje već na drugi uzastopni fail.",
  },
];

export interface FeatureItem {
  title: string;
  description: string;
  /** Lucide icon name - resolved in the component to keep this file server-safe. */
  icon:
    | "building"
    | "layout-grid"
    | "contact"
    | "badge-check"
    | "handshake"
    | "wallet"
    | "receipt"
    | "file-text"
    | "bar-chart"
    | "bell"
    | "file-signature"
    | "qr-code"
    | "trending-up"
    | "globe"
    | "gift";
}

export const FEATURES: FeatureItem[] = [
  {
    icon: "building",
    title: "Projekti i zalihe",
    description:
      "Kompletna hijerarhija: objekat → ulaz → sprat → jedinica. Statusi, cene, istorija promena, uvoz iz Excel-a, klik-do-klika duplikat projekta i cenovnik u PDF-u.",
  },
  {
    icon: "contact",
    title: "CRM za kupce sa KYC-em",
    description:
      "Fizička i pravna lica, stranci. JMBG / LK / PIB, checklist dokumenata, blok na ugovor dok KYC nije potpun. Detekcija duplikata i GDPR anonimizacija.",
  },
  {
    icon: "badge-check",
    title: "Rezervacije i Kanban pipeline",
    description:
      "Jedna aktivna rezervacija po jedinici, automatski istek, Kanban tabla po fazama prodaje, konverzija u prodaju u par klikova.",
  },
  {
    icon: "qr-code",
    title: "Online rezervacija sa IPS QR kaparom",
    description:
      "Javni link za jedinicu ili ceo projekat (microsite). Kupac popuni formu, dobija ispravan IPS QR za kaparu - Vi samo potvrđujete prijem.",
  },
  {
    icon: "handshake",
    title: "Prodaje i plan otplate",
    description:
      "Ugovaranje, predugovori, prilagođeni planovi rata sa validacijom, ručno dodavanje rata, PDV režim (10% ili 2.5%), storniranje sa audit tragom.",
  },
  {
    icon: "file-signature",
    title: "Generator ugovora i predugovora",
    description:
      "Šabloni sa placeholder-ima za sve podatke prodaje - ugovor se generiše u PDF-u za par sekundi, sa statusom (poslato / potpisano) i punim audit tragom.",
  },
  {
    icon: "wallet",
    title: "Uplate sa FIFO alokacijom",
    description:
      "Automatska raspodela na najstarije otvorene rate, ručna realokacija, deljenje jedne uplate na više prodaja, uvoz bankarskih izvoda.",
  },
  {
    icon: "layout-grid",
    title: "Provizije i referral za agencije",
    description:
      "Pravila po projektu, jedinici i konekciji. Referral kod po agenciji (QR + link za marketing), snapshot iznosa u trenutku ugovora, jasan tok do isplate.",
  },
  {
    icon: "file-text",
    title: "Dokumenti, foto-galerije i floor plan",
    description:
      "Foto-galerije jedinice i projekta, floor plan sa klikabilnim jedinicama, KYC dokumenti kupca, dokumentacija po prodaji - sa deljenjem preko share linkova.",
  },
  {
    icon: "globe",
    title: "Javni sajt projekta (microsite)",
    description:
      "Uključite prekidač i projekat dobija javni sajt na Vašem slug-u sa dostupnim jedinicama, mapom i galerijom - bez potrebe za dodatnim web sajtom.",
  },
  {
    icon: "bar-chart",
    title: "Izveštaji sa grafikonima",
    description:
      "Prodaje, zalihe, uplate, kupci, agencije, marža po projektu, cash-flow projekcija 12 meseci, vreme do prodaje - sa filterima i izvozom u CSV/XLSX.",
  },
  {
    icon: "trending-up",
    title: "Cash-flow i P&L po projektu",
    description:
      "Projekcija priliva za 12 meseci, trošak zemljišta / gradnje / marketinga po projektu i neto marža - dashboard koji investitor gleda pre kave.",
  },
  {
    icon: "bell",
    title: "Automatizacija, podsetnici i @mentions",
    description:
      "Email podsetnici za dospele rate, obaveštenja u aplikaciji, komentari sa @mentions na kupcima i prodajama - bez ručnog praćenja i Viber grupa.",
  },
];

export interface PlanItem {
  name: string;
  price: string;
  suffix: string;
  description: string;
  highlights: string[];
  featured?: boolean;
}

export const PLANS: PlanItem[] = [
  {
    name: "Starter",
    price: "€49",
    suffix: "/ mesečno",
    description: "Za manje projekte i pojedinačne investitore.",
    highlights: [
      "Do 3 projekta",
      "Do 250 jedinica",
      "Do 10 članova tima",
      "Do 5 povezanih agencija",
    ],
  },
  {
    name: "Growth",
    price: "€149",
    suffix: "/ mesečno",
    description: "Za profesionalne investitore u ekspanziji.",
    featured: true,
    highlights: [
      "Do 10 projekata",
      "Do 1.000 jedinica",
      "Do 30 članova tima",
      "Do 25 povezanih agencija",
    ],
  },
  {
    name: "Scale",
    price: "€399",
    suffix: "/ mesečno",
    description: "Neograničeno za velike investitore.",
    highlights: [
      "Neograničeno projekata",
      "Neograničeno jedinica",
      "Neograničen tim",
      "Prioritetna podrška",
    ],
  },
];
