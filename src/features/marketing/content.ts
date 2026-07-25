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
      "Zvanično lansiranje je 15.08.2026. Do tada je otvorena rana prijava - svi koji se prijave putem forme na ovoj stranici dobijaju obaveštenje pre javnog puštanja.",
  },
  {
    question: "Kako funkcioniše rana ponuda za prijave do 15.08.2026.?",
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
    question: "Mogu li otkazati pretplatu u bilo kom trenutku?",
    answer:
      "Da. Pretplata se otkazuje jednim klikom iz aplikacije, bez ugovorne obaveze. Vaši podaci ostaju dostupni za izvoz još 30 dana nakon otkazivanja.",
  },
  {
    question: "Kako se čuvaju podaci?",
    answer:
      "Svi podaci se čuvaju u EU regionu, uz enkripciju u tranzitu i u mirovanju. Svaka izmena je evidentirana u trajnom audit dnevniku. Pristup podacima je striktno ograničen po organizaciji (multi-tenant izolacija) i po ulozi korisnika.",
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
    | "bell";
}

export const FEATURES: FeatureItem[] = [
  {
    icon: "building",
    title: "Projekti i zalihe",
    description:
      "Kompletna hijerarhija: objekat → ulaz → sprat → jedinica. Statusi, cene, istorija promena, uvoz iz Excel-a i izvoz cenovnika.",
  },
  {
    icon: "contact",
    title: "CRM za kupce",
    description:
      "Fizička i pravna lica, stranci. Detekcija duplikata, izvor lead-a, aktivnosti i zadaci, spajanje profila, GDPR anonimizacija.",
  },
  {
    icon: "badge-check",
    title: "Rezervacije",
    description:
      "Jedna aktivna rezervacija po jedinici, automatski istek i podsetnici, konverzija u prodaju u par klikova.",
  },
  {
    icon: "handshake",
    title: "Prodaje i plan otplate",
    description:
      "Ugovaranje, predugovori, prilagođeni planovi rata sa validacijom, storniranje sa audit tragom.",
  },
  {
    icon: "wallet",
    title: "Uplate sa FIFO alokacijom",
    description:
      "Automatska raspodela na najstarije otvorene rate, ručna realokacija, deljenje jedne uplate na više prodaja.",
  },
  {
    icon: "layout-grid",
    title: "Provizije agencija",
    description:
      "Pravila po projektu, jedinici i konekciji. Snapshot iznosa u trenutku ugovora, jasan tok od izračunavanja do isplate.",
  },
  {
    icon: "file-text",
    title: "Dokumenti i PDF",
    description:
      "Centralno skladište vezano za projekat, jedinicu, kupca ili prodaju. Ponude, cenovnici i ugovori u PDF-u - sa Vašim logotipom.",
  },
  {
    icon: "bar-chart",
    title: "Izveštaji",
    description:
      "Prodaje, zalihe, uplate, kupci, agencije - sa filterima po projektu, valuti i periodu. Izvoz u CSV/XLSX.",
  },
  {
    icon: "bell",
    title: "Automatizacija i podsetnici",
    description:
      "Automatski zadaci, email podsetnici za dospele rate, obaveštenja u aplikaciji i preko emaila - bez ručnog praćenja.",
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
