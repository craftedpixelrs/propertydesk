import { COMPANY, LAUNCH_DATE_LABEL } from "@/lib/constants/app";
import type { Locale } from "@/lib/i18n";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const UPDATED_SR = "17.08.2026.";
const UPDATED_EN = "17 August 2026";

const privacySr: LegalDoc = {
  title: "Politika privatnosti",
  updated: UPDATED_SR,
  intro:
    "Ova politika objašnjava koje podatke PropertyDesk prikuplja na sajtu i u aplikaciji, zašto ih koristimo i koja prava imate. Važi za posetioce propertydesk.app, osobe koje zakažu demo ili ostave prijavu, i korisnike aplikacije na my.propertydesk.app.",
  sections: [
    {
      heading: "Ko obrađuje podatke",
      paragraphs: [
        `Rukovalac je ${COMPANY.operatorName}, koji razvija i nudi proizvod ${COMPANY.productName}. Kontakt za pitanja o podacima: ${COMPANY.email}.`,
        "Ako postanete pretplatnik, Vaša organizacija je rukovalac podataka svojih kupaca (JMBG, dokumenta, ugovori). Mi smo tada obrađivač i obrađujemo te podatke samo po Vašem nalogu, u okviru usluge.",
      ],
    },
    {
      heading: "Koje podatke prikupljamo",
      paragraphs: [
        "Prijava za rani pristup: ime, prezime, email, telefon, da li ste investitor ili agencija, opciono naziv firme, grad, broj projekata i napomena, plus UTM parametri i referrer ako stignu sa linka.",
        "Zakazivanje demoa: ime, email i termin koji unesete u Google Calendar Appointment Schedules. Te podatke prima Google kao nezavisni rukovalac svog kalendara.",
        "Aplikacija (nakon aktivacije naloga): nalog, članovi tima, projekti, kupci, rezervacije, ugovori, uplate i dokumenta koje Vi unesete. To su poslovni podaci Vaše organizacije.",
        "Tehnički podaci: IP adresa, tip pregledača i osnovni server logovi potrebni za bezbednost i rad sajta. Ako prihvatite analitičke kolačiće, Google Analytics 4 prima skraćenu IP adresu, stranice koje otvorite i opšte informacije o uređaju.",
      ],
    },
    {
      heading: "Zašto ih koristimo",
      paragraphs: [
        "Da odgovorimo na prijavu i dogovorimo demo (ugovor ili mere pre zaključenja ugovora).",
        "Da pošaljemo potvrdu termina i podsetnik za demo.",
        "Da pružimo uslugu pretplatnicima (izvršenje ugovora).",
        "Da štitimo sajt od zloupotrebe (legitimni interes).",
        "Analitika sajta samo ako date saglasnost. Možete je povući u bilo kom trenutku preko linka „Kolačići“ u footeru.",
      ],
    },
    {
      heading: "Sa kim delimo podatke",
      paragraphs: [
        "Ne prodajemo podatke. Delimo ih samo sa pružaocima koji su nam potrebni da radimo:",
        "hosting i baza u EU regionu; skladište dokumenata (S3); email za potvrde i obaveštenja; Loops za listu prijava; Google Calendar za termine demoa; Google Analytics samo uz saglasnost.",
        "Svaki pružalac dobija samo ono što mu treba za tu uslugu.",
      ],
    },
    {
      heading: "Koliko dugo čuvamo",
      paragraphs: [
        "Prijave za rani pristup: dok se ne javite da ih obrišemo, ili najduže 24 meseca od poslednjeg kontakta ako ne postanete korisnik.",
        "Nalog i podaci organizacije: dok traje pretplata, plus 30 dana za izvoz nakon otkazivanja, osim ako zakon nalaže duže čuvanje (npr. računi).",
        "Server logovi: do 90 dana, osim ako istražujemo bezbednosni incident.",
      ],
    },
    {
      heading: "Vaša prava",
      paragraphs: [
        "Možete zatražiti uvid, ispravku, brisanje, ograničenje obrade ili prenos podataka, i prigovor na obradu zasnovanu na legitimnom interesu. Saglasnost za analitiku povlačite u bilo kom trenutku.",
        `Zahtev pošaljite na ${COMPANY.email}. Odgovaramo u roku od 30 dana. Imate pravo pritužbe Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti.`,
      ],
    },
    {
      heading: "Kolačići",
      paragraphs: [
        "Neophodni kolačići: jezik sajta i, kada se prijavite, sesija na my.propertydesk.app. Bez njih sajt i prijava ne rade.",
        "Analitički kolačići (Google Analytics 4) postavljamo samo ako kliknete „Prihvatam“. Ako izaberete „Samo neophodni“, analitika se ne učitava.",
        "Detalje i promenu izbora naći ćete i u banneru (link „Kolačići“ u dnu svake stranice).",
      ],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: "Privacy policy",
  updated: UPDATED_EN,
  intro:
    "This policy explains what PropertyDesk collects on the website and in the app, why we use it, and what rights you have. It applies to visitors of propertydesk.app, people who book a demo or leave an application, and users of the app on my.propertydesk.app.",
  sections: [
    {
      heading: "Who is the controller",
      paragraphs: [
        `The controller is ${COMPANY.operatorName}, which builds and offers ${COMPANY.productName}. Contact for data questions: ${COMPANY.email}.`,
        "If you become a subscriber, your organisation is the controller of its own buyer data (national ID, documents, contracts). We then act as a processor and handle that data only on your instructions, as part of the service.",
      ],
    },
    {
      heading: "What we collect",
      paragraphs: [
        "Early-access form: first name, last name, email, phone, whether you are an investor or an agency, optional company name, city, project count and note, plus UTM parameters and referrer if they arrive with the link.",
        "Demo booking: the name, email and slot you enter in Google Calendar Appointment Schedules. Google receives that data as an independent controller of its calendar.",
        "App (after an account is activated): the account, team members, projects, buyers, reservations, contracts, payments and documents you enter. Those are your organisation’s business data.",
        "Technical data: IP address, browser type and basic server logs needed for security and to run the site. If you accept analytics cookies, Google Analytics 4 receives a truncated IP, the pages you open and general device information.",
      ],
    },
    {
      heading: "Why we use it",
      paragraphs: [
        "To reply to an application and arrange a demo (contract or pre-contract steps).",
        "To send a booking confirmation and a demo reminder.",
        "To provide the service to subscribers (performance of a contract).",
        "To protect the site from abuse (legitimate interest).",
        "Site analytics only if you consent. You can withdraw that consent at any time via the “Cookies” link in the footer.",
      ],
    },
    {
      heading: "Who we share it with",
      paragraphs: [
        "We do not sell data. We share it only with providers we need in order to operate:",
        "hosting and database in the EU region; document storage (S3); email for confirmations and notices; Loops for the application list; Google Calendar for demo slots; Google Analytics only with consent.",
        "Each provider receives only what it needs for that service.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "Early-access applications: until you ask us to delete them, or at most 24 months after the last contact if you do not become a customer.",
        "Organisation account and data: for the life of the subscription, plus 30 days to export after cancellation, unless the law requires a longer hold (for example invoices).",
        "Server logs: up to 90 days, unless we are investigating a security incident.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "You may request access, correction, deletion, restriction or portability, and object to processing based on legitimate interest. You may withdraw analytics consent at any time.",
        `Send the request to ${COMPANY.email}. We reply within 30 days. You may lodge a complaint with the Commissioner for Information of Public Importance and Personal Data Protection.`,
      ],
    },
    {
      heading: "Cookies",
      paragraphs: [
        "Strictly necessary cookies: site language and, when you sign in, the session on my.propertydesk.app. The site and sign-in do not work without them.",
        "Analytics cookies (Google Analytics 4) are set only if you click “Accept”. If you choose “Necessary only”, analytics is not loaded.",
        "You can change the choice via the banner (the “Cookies” link at the bottom of every page).",
      ],
    },
  ],
};

const termsSr: LegalDoc = {
  title: "Uslovi korišćenja",
  updated: UPDATED_SR,
  intro:
    "Ovi uslovi važe za korišćenje sajta propertydesk.app, zakazivanje demoa, rani pristup i, kada se nalog aktivira, aplikaciju PropertyDesk. Ako se ne slažete, nemojte slati prijavu niti koristiti uslugu.",
  sections: [
    {
      heading: "Usluga",
      paragraphs: [
        "PropertyDesk je softver za investitore i agencije koje prodaju novogradnju: projekti, jedinice, kupci, rezervacije, ugovori, planovi otplate, uplate, provizije i izveštaji.",
        `Zvanično lansiranje je ${LAUNCH_DATE_LABEL}. Do tada je otvorena rana prijava i personalizovan demo. Samostalna registracija na sajtu još nije otvorena — nalog aktiviramo nakon demoa.`,
      ],
    },
    {
      heading: "Rani pristup, trial i cene",
      paragraphs: [
        `Prijave do ${LAUNCH_DATE_LABEL} ostvaruju 30 dana besplatnog korišćenja, zatim 50% popusta na naredna tri meseca, i zaključanu cenu izabranog paketa 12 meseci. Besplatan uvoz prve Excel tabele i podešavanje jednog projekta dogovaramo tokom onboardinga.`,
        "Cene paketa (Starter, Growth, Scale) prikazane na sajtu su mesečne pretplate u eurima, bez PDV-a ako nije drugačije navedeno. Tačan iznos i valuta na fakturi potvrđuju se pri aktivaciji.",
        "Pretplatu možete otkazati u bilo kom trenutku iz aplikacije, bez ugovorne obaveze. Podaci ostaju dostupni za izvoz još 30 dana nakon otkazivanja.",
      ],
    },
    {
      heading: "Vaše obaveze",
      paragraphs: [
        "Odgovarate za tačnost podataka koje unesete i za to da imate pravni osnov da unosite podatke kupaca (uključujući JMBG i dokumenta).",
        "Ne smete zloupotrebljavati uslugu, pokušavati neovlašćen pristup tuđim organizacijama, niti koristiti platformu za nezakonitu delatnost.",
      ],
    },
    {
      heading: "Šta usluga još ne radi automatski",
      paragraphs: [
        "IPS QR za kaparu i fakture je u upotrebi. Automatsko slanje faktura u Sistem elektronskih faktura (SEF) još nije uključeno — status e-fakture do tada pratite ručno preko SEF portala. Elektronski potpis ugovora i editor poligona na spratu su na roadmapu posle lansiranja.",
        "Sajt i FAQ ne tvrde da su te stavke već žive. Ako Vam je neka od njih uslov za kupovinu, recite nam na demou.",
      ],
    },
    {
      heading: "Odgovornost",
      paragraphs: [
        "Uslugu pružamo sa profesionalnom pažnjom, ali pre lansiranja i tokom ranog pristupa ne garantujemo neprekidan rad niti poseban SLA. Ne odgovaramo za poslovne odluke donesene na osnovu podataka u sistemu, niti za štetu koju prouzrokuje netačan unos sa Vaše strane.",
        "Maksimalna odgovornost za naknadu štete vezanu za pretplatu ograničena je na iznos koji ste nam platili u prethodna tri meseca, osim u slučaju namere ili grube nepažnje.",
      ],
    },
    {
      heading: "Pravo i sporovi",
      paragraphs: [
        "Važi pravo Republike Srbije. Sporove rešavamo sporazumno; ako to nije moguće, nadležan je sud u Beogradu.",
        `Pitanja: ${COMPANY.email}.`,
      ],
    },
  ],
};

const termsEn: LegalDoc = {
  title: "Terms of use",
  updated: UPDATED_EN,
  intro:
    "These terms apply to using propertydesk.app, booking a demo, early access and, once an account is activated, the PropertyDesk app. If you do not agree, do not submit an application or use the service.",
  sections: [
    {
      heading: "The service",
      paragraphs: [
        "PropertyDesk is software for investors and agencies selling new builds: projects, units, buyers, reservations, contracts, payment plans, payments, commissions and reports.",
        `The official launch is ${LAUNCH_DATE_LABEL}. Until then, early application and a personalised demo are open. Self-serve sign-up is not open yet — we activate an account after the demo.`,
      ],
    },
    {
      heading: "Early access, trial and pricing",
      paragraphs: [
        `Applications until ${LAUNCH_DATE_LABEL} get 30 days free, then 50% off the next three months, and a locked plan price for 12 months. A free first Excel import and setup of one project are arranged during onboarding.`,
        "Plan prices (Starter, Growth, Scale) on the site are monthly subscriptions in euros, excluding VAT unless stated otherwise. The exact amount and currency on the invoice are confirmed at activation.",
        "You may cancel at any time from the app, with no contractual lock-in. Your data stays available for export for 30 days after cancellation.",
      ],
    },
    {
      heading: "Your obligations",
      paragraphs: [
        "You are responsible for the accuracy of the data you enter and for having a legal basis to enter buyer data (including national ID and documents).",
        "You must not abuse the service, attempt unauthorised access to other organisations, or use the platform for unlawful activity.",
      ],
    },
    {
      heading: "What the service does not yet do automatically",
      paragraphs: [
        "IPS QR for deposits and invoices is in use. Automatic submission of invoices to Serbia’s electronic invoicing system (SEF) is not enabled yet — until then you track e-invoice status manually via the SEF portal. Electronic contract signing and the floor-plan polygon editor are on the post-launch roadmap.",
        "The site and FAQ do not claim those items are already live. If any of them is a purchase condition, tell us on the demo.",
      ],
    },
    {
      heading: "Liability",
      paragraphs: [
        "We provide the service with professional care, but before launch and during early access we do not guarantee uninterrupted uptime or a separate SLA. We are not liable for business decisions made on data in the system, nor for damage caused by incorrect input on your side.",
        "Maximum liability for damages related to a subscription is limited to the amount you paid us in the previous three months, except in cases of intent or gross negligence.",
      ],
    },
    {
      heading: "Law and disputes",
      paragraphs: [
        "The law of the Republic of Serbia applies. We try to settle disputes amicably; if that fails, the competent court is in Belgrade.",
        `Questions: ${COMPANY.email}.`,
      ],
    },
  ],
};

const imprintSr: LegalDoc = {
  title: "Impresum",
  updated: UPDATED_SR,
  intro:
    "Podaci o tome ko stoji iza PropertyDesk-a. PIB, matični broj i ulica sedišta biće dopunjeni na ovoj stranici čim bude završena registracija subjekta za naplatu pretplate — ne objavljujemo izmišljene brojeve.",
  sections: [
    {
      heading: "Proizvod",
      paragraphs: [
        `${COMPANY.productName} — softver za prodaju novogradnje.`,
        `Sajt: https://propertydesk.app`,
        `Aplikacija (nakon lansiranja): https://my.propertydesk.app`,
      ],
    },
    {
      heading: "Operater",
      paragraphs: [
        `${COMPANY.operatorName} razvija i nudi PropertyDesk.`,
        `Veb: ${COMPANY.operatorUrl}`,
        "Država: Republika Srbija.",
      ],
    },
    {
      heading: "Kontakt",
      paragraphs: [
        `Email: ${COMPANY.email}`,
        `Telefon: ${COMPANY.phoneDisplay}`,
        "Odgovaramo na prijave u roku od 2 radna dana.",
      ],
    },
    {
      heading: "Odgovorno lice",
      paragraphs: [
        "Marko Banović, osnivač.",
        `Za pravna i privatnost pitanja koristite ${COMPANY.email}, ne ličnu adresu.`,
      ],
    },
  ],
};

const imprintEn: LegalDoc = {
  title: "Legal notice",
  updated: UPDATED_EN,
  intro:
    "Who stands behind PropertyDesk. Tax ID, company number and a street address will be added here once the invoicing entity is registered — we do not publish invented numbers.",
  sections: [
    {
      heading: "Product",
      paragraphs: [
        `${COMPANY.productName} — software for new-build sales.`,
        `Website: https://propertydesk.app`,
        `App (after launch): https://my.propertydesk.app`,
      ],
    },
    {
      heading: "Operator",
      paragraphs: [
        `${COMPANY.operatorName} builds and offers PropertyDesk.`,
        `Web: ${COMPANY.operatorUrl}`,
        "Country: Republic of Serbia.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        `Email: ${COMPANY.email}`,
        `Phone: ${COMPANY.phoneDisplay}`,
        "We reply to applications within 2 business days.",
      ],
    },
    {
      heading: "Responsible person",
      paragraphs: [
        "Marko Banović, founder.",
        `For legal and privacy questions use ${COMPANY.email}, not a personal address.`,
      ],
    },
  ],
};

export function getLegalDoc(
  kind: "privacy" | "terms" | "imprint",
  locale: Locale,
): LegalDoc {
  const sr = { privacy: privacySr, terms: termsSr, imprint: imprintSr };
  const en = { privacy: privacyEn, terms: termsEn, imprint: imprintEn };
  return locale === "en" ? en[kind] : sr[kind];
}
