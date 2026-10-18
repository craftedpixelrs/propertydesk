import type { Locale } from "@/lib/i18n";

interface Problem {
  problem: string;
  solution: string;
}

export interface HubCopy {
  metaTitle: string;
  description: string;
  title: string;
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  problemsTitle: string;
  problemsSubtitle: string;
  problems: Problem[];
  localEyebrow: string;
  citiesTitle: string;
  citiesBody: string;
  card: (lokativ: string) => string;
  listName: (lokativ: string) => string;
  serviceType: string;
  country: string;
}

export interface CityChrome {
  hubTitle: string;
  metaTitle: (lokativ: string) => string;
  description: (lokativ: string) => string;
  eyebrow: (name: string) => string;
  title: (lokativ: string) => string;
  problemsTitle: (lokativ: string) => string;
  problemsSubtitle: string;
  problems: Problem[];
  districtsBody: (genitiv: string) => string;
  faqTitle: (name: string) => string;
  neighborsTitle: (genitiv: string) => string;
  neighborLabel: (lokativ: string) => string;
  serviceType: string;
  country: string;
}

const HUB_SR: HubCopy = {
  metaTitle: "Softver za prodaju novogradnje u Srbiji",
  description:
    "Softver za prodaju novogradnje za investitore i agencije: cenovnik, rezervacija, IPS QR kapara, ugovor i provizija. Beograd, Novi Sad, Niš i 7 gradova.",
  title: "Softver za prodaju novogradnje",
  eyebrow: "Softver za prodaju novogradnje",
  heroTitle: "Softver za prodaju novogradnje u celoj Srbiji",
  heroSubtitle:
    "Jedan sistem za investitore i agencije: cenovnik, zalihe, rezervacija stana sa IPS QR kaparom, ugovor iz šablona, plan otplate, uplate i provizije - od Beograda i Novog Sada do Zlatibora i Kopaonika.",
  problemsTitle: "Isti problemi, bez obzira na grad",
  problemsSubtitle:
    "Prodaja novogradnje u Srbiji ima isti oblik, bilo da gradite u Vračaru ili u Nišu. Softver mora da razume lokalni tok: IPS QR, EUR cene, SEF, i agencije koje su navikle na Viber.",
  problems: [
    {
      problem:
        "Prodajete novogradnju u više gradova i svaki grad ima svoj Excel - niko ne zna ko ima najnoviju verziju.",
      solution:
        "Jedan nalog, više projekata, svaki grad i lokacija jasno obeleženi; cenovnik je deljen samo onima koje Vi dopustite.",
    },
    {
      problem:
        "Agencije iz Beograda rezervišu stan koji je agencija iz Novog Sada upravo prodala - niko ne vidi istu listu.",
      solution:
        "Real-time status po jedinici: čim bilo ko rezerviše ili proda, status se zaključava i vide ga svi partneri odjednom.",
    },
    {
      problem:
        "Kupci iz drugog grada ne mogu u Vašu kancelariju da uplate kaparu - prodaja se raspada na papirologiji.",
      solution:
        "Javni link projekta sa IPS QR kodom - kupac rezerviše i uplaćuje online iz svoje banke, bez dolaska u kancelariju.",
    },
    {
      problem:
        "Različiti gradovi, različite agencije, različita pravila provizije - obračun provizija traje danima.",
      solution:
        "Pravila provizije po projektu i jedinici, snapshot u trenutku ugovora, portal za agenciju sa statusom isplate - automatski.",
    },
  ],
  localEyebrow: "Lokalno",
  citiesTitle: "Softver za prodaju novogradnje po gradovima",
  citiesBody:
    "Pogledajte stranicu za Vaš grad - svaka ima opis lokalnog tržišta, listu opština ili karakterističnih naselja i česta pitanja koja čujemo baš od investitora iz tog grada.",
  card: (lokativ) => `Softver za prodaju novogradnje ${lokativ}`,
  listName: (lokativ) => `Softver za prodaju novogradnje ${lokativ}`,
  serviceType: "Softver za prodaju novogradnje",
  country: "Srbija",
};

const HUB_EN: HubCopy = {
  metaTitle: "New-build sales software in Serbia",
  description:
    "New-build sales software for investors and agencies: price list, reservation, IPS QR deposit, contract and commission. Belgrade, Novi Sad, Niš and 7 cities.",
  title: "New-build sales software",
  eyebrow: "New-build sales software",
  heroTitle: "New-build sales software across Serbia",
  heroSubtitle:
    "One system for investors and agencies: price list, stock, apartment reservation with an IPS QR deposit, a contract from a template, a payment plan, payments and commissions — from Belgrade and Novi Sad to Zlatibor and Kopaonik.",
  problemsTitle: "The same problems, whichever city you build in",
  problemsSubtitle:
    "Selling new-build in Serbia looks the same in Vračar and in Niš. The software has to understand the local flow: IPS QR, EUR prices, SEF, and agencies that are used to Viber.",
  problems: [
    {
      problem:
        "You sell new-build in several cities and each city has its own Excel file. Nobody knows who has the latest version.",
      solution:
        "One account, several projects, every city and location labelled. The price list is shared only with the people you allow.",
    },
    {
      problem:
        "An agency in Belgrade reserves an apartment that an agency in Novi Sad has just sold. Nobody is looking at the same list.",
      solution:
        "Live status per unit. The moment anyone reserves or sells, the status locks and every partner sees it at once.",
    },
    {
      problem:
        "A buyer in another city cannot come to your office to pay the deposit, and the sale falls apart in paperwork.",
      solution:
        "A public project link with an IPS QR code. The buyer reserves and pays online from their own bank, without a visit.",
    },
    {
      problem:
        "Different cities, different agencies, different commission rules. Working out commissions takes days.",
      solution:
        "Commission rules per project and unit, a snapshot at the moment of the contract, and an agency portal with payout status — automatically.",
    },
  ],
  localEyebrow: "Local",
  citiesTitle: "New-build sales software by city",
  citiesBody:
    "Open the page for your city. Each one describes the local market, lists municipalities or characteristic neighbourhoods, and answers the questions we hear from investors there.",
  card: (lokativ) => `New-build sales software ${lokativ}`,
  listName: (lokativ) => `New-build sales software ${lokativ}`,
  serviceType: "New-build sales software",
  country: "Serbia",
};

const CITY_SR: CityChrome = {
  hubTitle: "Softver za prodaju novogradnje",
  metaTitle: (lokativ) => `Softver za prodaju novogradnje ${lokativ}`,
  description: (lokativ) =>
    `Softver za prodaju novogradnje ${lokativ}: cenovnik, rezervacija, IPS QR kapara, ugovor i provizija agencije. Jedna platforma za investitore.`,
  eyebrow: (name) => `Softver za prodaju novogradnje · ${name}`,
  title: (lokativ) => `Softver za prodaju novogradnje ${lokativ}`,
  problemsTitle: (lokativ) => `Kako PropertyDesk pomaže investitorima ${lokativ}`,
  problemsSubtitle:
    "Isti problemi, isti sistem - bez obzira na to kako se zovu Vaše opštine i naselja.",
  problems: [
    {
      problem:
        "Cenovnik u Excelu se grana - tim u kancelariji i tim na gradilištu rade u različitim verzijama.",
      solution:
        "Jedan cenovnik po projektu, jedna istina za ceo tim, sa trag izmena ko je i kada menjao cenu.",
    },
    {
      problem:
        "Agencija rezerviše stan preko Vibera - druga agencija prodaje isti stan drugom kupcu.",
      solution:
        "Jedna aktivna rezervacija po jedinici, status zaključan za sve agencije u realnom vremenu.",
    },
    {
      problem:
        "Kupac traži kaparu preko e-bankinga, Vi mu dajete poziv na broj mejlom - uplata ne stigne pola nedelje.",
      solution:
        "IPS QR na javnom linku jedinice - kupac skenira iz svoje banke i uplaćuje kaparu u par sekundi.",
    },
    {
      problem:
        "Ne znate ko je kome agent, provizije se kasnije dogovaraju iz glave, uvek jedan ispadne nezadovoljan.",
      solution:
        "Pravila provizije unapred po projektu i jedinici, snapshot u trenutku ugovora, portal za agenciju sa statusom isplate.",
    },
  ],
  districtsBody: (genitiv) =>
    `PropertyDesk ne pravi razliku između lokacija - sistem radi isto u svim delovima ${genitiv}. Dole su delovi grada u kojima danas vidimo najviše aktivne novogradnje.`,
  faqTitle: (name) => `Česta pitanja - ${name}`,
  neighborsTitle: (genitiv) => `Drugi gradovi u blizini ${genitiv}`,
  neighborLabel: (lokativ) => `Softver za prodaju novogradnje ${lokativ}`,
  serviceType: "Softver za prodaju novogradnje",
  country: "Srbija",
};

const CITY_EN: CityChrome = {
  hubTitle: "New-build sales software",
  metaTitle: (lokativ) => `New-build sales software ${lokativ}`,
  description: (lokativ) =>
    `New-build sales software ${lokativ}: price list, reservation, IPS QR deposit, contract and agency commission on one platform.`,
  eyebrow: (name) => `New-build sales software · ${name}`,
  title: (lokativ) => `New-build sales software ${lokativ}`,
  problemsTitle: (lokativ) => `How PropertyDesk helps investors ${lokativ}`,
  problemsSubtitle:
    "The same problems, the same system — whatever your municipalities and neighbourhoods are called.",
  problems: [
    {
      problem:
        "The Excel price list forks. The office and the site team work in different versions.",
      solution:
        "One price list per project, one truth for the whole team, with a trail of who changed a price and when.",
    },
    {
      problem: "One agency reserves an apartment on Viber. Another sells the same apartment.",
      solution: "One active reservation per unit. The status locks for every agency in real time.",
    },
    {
      problem:
        "The buyer wants to pay the deposit in their banking app. You email a reference number, and the money does not arrive for half a week.",
      solution:
        "An IPS QR on the public unit link. The buyer scans it in their bank and pays the deposit in seconds.",
    },
    {
      problem:
        "You do not know who represents whom. Commissions are agreed later from memory, and someone is always unhappy.",
      solution:
        "Commission rules set in advance per project and unit, a snapshot when the contract is signed, and an agency portal with payout status.",
    },
  ],
  districtsBody: (genitiv) =>
    `PropertyDesk does not treat locations differently. The system works the same across ${genitiv}. Below are the parts of the city where we see the most active new-build today.`,
  faqTitle: (name) => `Common questions — ${name}`,
  neighborsTitle: (genitiv) => `Other places near ${genitiv}`,
  neighborLabel: (lokativ) => `New-build sales software ${lokativ}`,
  serviceType: "New-build sales software",
  country: "Serbia",
};

export function hubCopy(locale: Locale): HubCopy {
  return locale === "en" ? HUB_EN : HUB_SR;
}

export function cityChrome(locale: Locale): CityChrome {
  return locale === "en" ? CITY_EN : CITY_SR;
}
