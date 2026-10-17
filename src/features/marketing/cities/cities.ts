/**
 * Lokalne SEO stranice: softver za prodaju novogradnje po gradovima.
 *
 * Ovaj modul je jedini izvor istine o kojim gradovima gađamo organsku
 * pretragu (`/softver-za-prodaju-novogradnje/[grad]`). Sitemap, hub
 * stranica i interni linkovi se grade iz ove liste - dodavanje novog
 * grada ovde automatski uključuje sve ostalo.
 *
 * Sadržaj je namerno samo na srpskom (sr-Latn): ciljamo investitore i
 * agencije iz Srbije koji kucaju "softver za prodaju novogradnje
 * {grad}" na Google-u. Google tretira skoro-identične "doorway"
 * stranice kao spam, pa svaki grad ima:
 *   - jedinstven uvodni opis lokalnog tržišta novogradnje,
 *   - svoju listu opština ili karakterističnih naselja,
 *   - 3-4 FAQ ulaza koji su specifični za taj grad,
 *   - listu susednih gradova za međusobno linkovanje.
 *
 * Namerno NE objavljujemo izmišljene brojeve (cene po m², broj
 * aktivnih gradilišta) - sve što piše mora biti neutralno i tačno,
 * jer kasnije ne želimo ispravke po stotini stranica.
 */

export interface CityFaq {
  q: string;
  a: string;
}

export interface CityInfo {
  /** URL slug: `/softver-za-prodaju-novogradnje/{slug}`. */
  slug: string;
  /** Nominativ, npr. "Beograd". */
  name: string;
  /** Lokativ sa predlogom, npr. "u Beogradu", "na Zlatiboru". */
  nameLokativ: string;
  /** Genitiv, npr. "Beograda". Za „softver za prodaju novogradnje {grad}" u meta tagu. */
  nameGenitiv: string;
  /** Da li je "grad" ili "destinacija" (planina, banja). Menja mikro-copy. */
  kind: "city" | "mountain";
  /** 2-3 rečenice o lokalnom tržištu novogradnje. Mora biti jedinstveno po gradu. */
  intro: string;
  /** Naslov za listu opština/naselja, npr. "Opštine koje pokrivamo" ili "Naselja u fokusu". */
  districtsTitle: string;
  /**
   * Opštine (za Beograd) ili karakteristična naselja/zone (za druge gradove).
   * Prikazuje se kao jednostavna lista, bez linkova.
   */
  districts: string[];
  /** 3-4 pitanja i odgovora specifična za taj grad. */
  faqs: CityFaq[];
  /** Slugovi susednih gradova za međusobno linkovanje. */
  neighbors: string[];
}

export const CITIES: CityInfo[] = [
  {
    slug: "beograd",
    name: "Beograd",
    nameLokativ: "u Beogradu",
    nameGenitiv: "Beograda",
    kind: "city",
    intro:
      "Beograd je najveće tržište novogradnje u Srbiji - od velikih bulevara Novog Beograda i Vračara do pojasa Zemuna, Voždovca i Palilule. Investitori ovde paralelno vode više zgrada u različitim fazama izgradnje i rade sa desetinama partnerskih agencija, pa su jedan ažuran cenovnik i jedna rezervacija po stanu uslov da se posao ne izgubi na duplom holdu i zastarelim Excel tabelama.",
    districtsTitle: "Opštine koje pokrivamo",
    districts: [
      "Novi Beograd",
      "Vračar",
      "Zvezdara",
      "Voždovac",
      "Zemun",
      "Palilula",
      "Čukarica",
      "Savski venac",
      "Stari grad",
      "Rakovica",
      "Surčin",
      "Mladenovac",
    ],
    faqs: [
      {
        q: "Da li PropertyDesk pokriva sve beogradske opštine?",
        a: "Da - PropertyDesk nije vezan za geografiju. Sistem radi isto bez obzira na to da li projekat gradite na Novom Beogradu, Vračaru, Voždovcu ili u Zemunu. Lokaciju projekta unosite jednom, a javni link projekta kupcima prikazuje mapu i opštinu.",
      },
      {
        q: "Radimo sa 10 agencija po projektu - može li sve to na jednom mestu?",
        a: "Može. Svaki investitor može imati neograničen broj partnerskih agencija, sa svojim pravilima provizije po projektu i po jedinici. Agencije vide samo ono što im Vi odobrite - cenovnik, slobodne jedinice, status rezervacije - i rezervišu jednim klikom, bez slanja Vibera.",
      },
      {
        q: "Kako PropertyDesk pomaže kod luks projekata na Vračaru i Dedinju?",
        a: "Za butik projekte sa malim brojem skupih jedinica važnija je prezentacija nego volumen. Dobijate javni sajt projekta sa Vašim brendom, foto-galerijom, planom etaže i brendiranim PDF ponudama - bez potrebe za dodatnim web sajtom i bez posrednika.",
      },
      {
        q: "Imamo projekat na Novom Beogradu sa 300+ stanova - da li sistem skalira?",
        a: "Da. Uvoz 300+ jedinica iz Excela radimo u par koraka i uključeno je u pilot program. Za veće portfolije postoji Growth / Scale plan sa prioritetnom podrškom, cost tracking po projektu i konsolidovanim izveštavanjem po direktoru.",
      },
    ],
    neighbors: ["novi-sad", "pancevo", "kragujevac"],
  },
  {
    slug: "novi-sad",
    name: "Novi Sad",
    nameLokativ: "u Novom Sadu",
    nameGenitiv: "Novog Sada",
    kind: "city",
    intro:
      "Novi Sad je drugo po veličini tržište novogradnje u Srbiji i raste brže od Beograda u odnosu na broj stanovnika. Lokalni investitori često vode projekte u Grbavici, Limanu, Novom naselju i Telepu paralelno sa pripremom novog gradilišta, pa su jasna evidencija rezervacija i jedna cena po jedinici ključne da se tim ne gubi u izmenama Excel fajlova.",
    districtsTitle: "Naselja u fokusu",
    districts: [
      "Grbavica",
      "Liman",
      "Novo naselje",
      "Telep",
      "Adice",
      "Detelinara",
      "Podbara",
      "Satelit",
      "Petrovaradin",
      "Sremska Kamenica",
    ],
    faqs: [
      {
        q: "Prodajemo projekte na Grbavici i Limanu paralelno - može li sve u jednoj aplikaciji?",
        a: "Može. PropertyDesk je multi-projekt platforma: svaki projekat ima svoj cenovnik, svoju listu agencija i svoj plan otplate, a konsolidovani izveštaj za direktora pokriva sve projekte odjednom - sa filterom po projektu i periodu.",
      },
      {
        q: "Novosadsko tržište je puno manjih agencija - podržava li sistem rad sa njima?",
        a: "Podržava. Agencije se registruju samostalno i Vi ih povezujete klikom. Dobijaju svoj portal, svoj referral kod, i vide samo one projekte i jedinice koje im Vi odobrite - bez potrebe da im svakodnevno šaljete nove Excel tabele.",
      },
      {
        q: "Imamo kupce iz dijaspore koji ne mogu u Novi Sad - kako da im naplatimo kaparu?",
        a: "Preko javnog linka jedinice i IPS QR koda. Kupac iz inostranstva otvara link, vidi stan, pritisne 'Rezerviši' i skenira IPS QR za kaparu iz svoje banke. Vi u '/rezervacije/zahtevi' potvrđujete prijem kad novac legne na račun.",
      },
      {
        q: "Da li PropertyDesk radi sa EUR cenama i RSD uplatama?",
        a: "Da. Cenovnik držite u EUR, kurs EUR/RSD unosite u sistem (ili uvozite iz NBS liste), a uplate u RSD se automatski preračunavaju i FIFO alociraju na otvorene rate - bez ručnog računa po svakom izvodu.",
      },
    ],
    neighbors: ["beograd", "subotica", "pancevo"],
  },
  {
    slug: "nis",
    name: "Niš",
    nameLokativ: "u Nišu",
    nameGenitiv: "Niša",
    kind: "city",
    intro:
      "Niš je najveći centar novogradnje u južnoj Srbiji, sa aktivnom gradnjom u Medijani, Pantelejskoj i Crvenokrstanskoj zoni, i rastućim brojem manjih investitora koji grade jednu po jednu zgradu. Za takve timove najveća razlika nije u cenovnoj politici, nego u tome da se jedna osoba više ne mora baviti ručnim slanjem Excela po pet agencija.",
    districtsTitle: "Zone grada",
    districts: [
      "Medijana",
      "Pantelej",
      "Crveni Krst",
      "Palilula",
      "Niška Banja",
      "Durlan",
      "Delijski Vis",
      "Centar",
    ],
    faqs: [
      {
        q: "Mala sam agencija iz Niša - mogu li da koristim PropertyDesk?",
        a: "Da. Agencije u PropertyDesk se registruju besplatno i povezuju sa investitorima na njihov poziv. Plaćaju samo investitori; za agenciju je pristup katalogu i rezervacijama bez naknade.",
      },
      {
        q: "Imamo jedan projekat od 40 stanova - da li je sistem preveliki za nas?",
        a: "Nije. Starter plan je napravljen upravo za jedan aktivan projekat - cena je ekvivalent dva sata računovodstvenog rada mesečno, a dobijate kompletan tok: cenovnik, rezervacije, ugovore, uplate i izveštaj za sopstveni uvid.",
      },
      {
        q: "Prodajemo direktno (bez agencija) - vredi li nam PropertyDesk?",
        a: "Vredi. Agencijski modul je opcioni sloj. Ako prodajete isključivo direktno, dobijate čist CRM kupaca, zaštitu od duplih rezervacija, generisanje ugovora iz šablona, plan rata, uvoz izvoda i izveštaje - bez agencija.",
      },
      {
        q: "Imamo kupce iz Niša i okoline koji žele papirni ugovor - radi li i to?",
        a: "Radi. PropertyDesk generiše PDF predugovor i ugovor iz šablona Vaše kancelarije (sa logom i uslovima), i Vi ih štampate i potpisujete klasično. E-potpis nije u obimu v1 - sve ostalo ide bez štampača.",
      },
    ],
    neighbors: ["kragujevac", "kraljevo", "beograd"],
  },
  {
    slug: "kragujevac",
    name: "Kragujevac",
    nameLokativ: "u Kragujevcu",
    nameGenitiv: "Kragujevca",
    kind: "city",
    intro:
      "Kragujevac posle nekoliko mirnih godina ponovo ima aktivnu novogradnju, posebno u Erdogliji i oko centra. Lokalni investitori često imaju jednu zgradu u prodaji i jednu u pripremi, pa im je najvažnije da u sat vremena mogu da uvezu postojeću Excel tabelu i počnu da rade bez IT podrške.",
    districtsTitle: "Zone grada",
    districts: ["Centar", "Erdoglija", "Aerodrom", "Pivara", "Stanovo", "Bresnica"],
    faqs: [
      {
        q: "Investitor smo iz Kragujevca - koliko traje postavljanje sistema?",
        a: "Osnovno podešavanje za jedan projekat traje pola dana. Ako nam pošaljete postojeći Excel cenovnik, uvoz jedinica i mapiranje polja radimo mi - Vi dobijete sistem spreman za rad bez ručnog unosa.",
      },
      {
        q: "Nemamo IT osobu - može li tim sam da ga vodi?",
        a: "Može. Interfejs je na srpskom, bez stranih termina. Rad sa cenovnikom, rezervacijama i ugovorima liči na rad sa Excelom - samo bez formula koje pucaju i bez 'ko je sada otvorio fajl'.",
      },
      {
        q: "Kako da uključimo lokalne agencije koje nikad nisu radile sa softverom?",
        a: "Pozovete ih mailom - dobijaju jednostavnu registraciju i vide samo projekte na koje ih povežete. Nema instalacije, nema ugovora o softveru sa njihove strane; koriste ga iz pregledača.",
      },
    ],
    neighbors: ["cacak", "kraljevo", "nis"],
  },
  {
    slug: "subotica",
    name: "Subotica",
    nameLokativ: "u Subotici",
    nameGenitiv: "Subotice",
    kind: "city",
    intro:
      "Subotica je rastuće tržište zbog blizine granice sa Mađarskom i interesovanja kupaca iz dijaspore. Projekti su obično manji po broju jedinica, ali su kupci često geografski udaljeni - pa su javni link projekta, foto-galerija i online rezervacija sa IPS QR kaparom alat koji direktno povećava konverziju.",
    districtsTitle: "Zone grada",
    districts: ["Centar", "Mali Radanovac", "Železnička stanica", "Novi grad", "Palić"],
    faqs: [
      {
        q: "Prodajemo stanove kupcima iz Mađarske i Austrije - kako da im naplatimo kaparu?",
        a: "Preko javnog linka projekta - kupac rezerviše stan sa svojim podacima i plaća kaparu skeniranjem IPS QR koda iz svoje banke. Za strane kupce koji nemaju IPS, u sistemu vidite SWIFT uplatu i ručno potvrđujete prijem.",
      },
      {
        q: "Da li PropertyDesk podržava dvojezičnu prezentaciju (srpski + engleski)?",
        a: "Interni rad tima je trenutno samo na srpskom (planirana je potpuna i engleska verzija). Javna ponuda projekta se može deliti sa svim informacijama (slike, plan, cena), što je za strane kupce često dovoljno. Potpuna lokalizacija engleskog je na roadmap-u.",
      },
      {
        q: "Imamo mali projekat od 15 stanova - vredi li nam PropertyDesk?",
        a: "Vredi. Starter plan je napravljen za jedan projekat ove veličine, i razlika postaje očigledna već kod prve dvostruke rezervacije ili prvog kupca koji se izgubi u mejlu. Trenutni popust: 50% na prva 3 meseca za prijave do 15.10.2026.",
      },
    ],
    neighbors: ["novi-sad", "beograd"],
  },
  {
    slug: "zlatibor",
    name: "Zlatibor",
    nameLokativ: "na Zlatiboru",
    nameGenitiv: "Zlatibora",
    kind: "mountain",
    intro:
      "Zlatibor je najaktivnije planinsko tržište novogradnje u Srbiji - od studio apartmana za izdavanje do kompletnih apart-hotela i vikend stanova. Kupci su gotovo isključivo iz drugih gradova (Beograd, Novi Sad, dijaspora), pa prodaja mora biti vođena online: javni link projekta, foto-galerija, mapa i IPS QR za kaparu bez dolaska na lice mesta.",
    districtsTitle: "Zone destinacije",
    districts: ["Centar (Kraljev trg)", "Jezero", "Čajetina", "Ribnica", "Oko Tornika", "Sloboda"],
    faqs: [
      {
        q: "Prodajemo apartmane kupcima iz Beograda i inostranstva - kako bez dolaska na Zlatibor?",
        a: "Kupac otvara javni link projekta, vidi foto-galeriju i plan etaže, rezerviše izabranu jedinicu i uplaćuje kaparu skeniranjem IPS QR koda - bez dolaska u kancelariju. Ugovor šaljete iz šablona kao PDF, a potpis dogovarate po dinamici kupca.",
      },
      {
        q: "Imamo više manjih projekata (apart-hoteli, vile) - može li sve u istom nalogu?",
        a: "Može. Svaki projekat se vodi odvojeno (sopstveni cenovnik, agencije, plan otplate), a konsolidovani izveštaj Vam daje presek svih projekata sa jednog mesta, filtriran po lokaciji i periodu.",
      },
      {
        q: "Kupci često pitaju za izdavanje posle predaje - radi li PropertyDesk i to?",
        a: "Ne u v1. PropertyDesk je fokusiran na prodaju novogradnje do primopredaje. Posle-prodajni servis (menadžment izdavanja, održavanje) nije u ovoj verziji - može biti sledeći modul, zavisno od interesovanja pilot partnera sa Zlatibora.",
      },
    ],
    neighbors: ["kopaonik", "cacak", "beograd"],
  },
  {
    slug: "kopaonik",
    name: "Kopaonik",
    nameLokativ: "na Kopaoniku",
    nameGenitiv: "Kopaonika",
    kind: "mountain",
    intro:
      "Kopaonik je najpremijum segment planinske novogradnje u Srbiji - projekti su manji, cene po m² više, a kupci očekuju foto-prezentaciju na nivou međunarodnih tržišta. PropertyDesk za ovu grupu zamenjuje potrebu za odvojenim marketing sajtom i daje jedno mesto za rezervacije, ugovore i naplatu kapare.",
    districtsTitle: "Zone destinacije",
    districts: ["Konaci", "Suvo rudište", "Brzeće", "Krčmar", "Treska"],
    faqs: [
      {
        q: "Projekti na Kopaoniku su manji ali ekskluzivni - vredi li puna platforma?",
        a: "Vredi. Male serije skupih jedinica tolerišu najmanje grešaka - svaka duplo-rezervisana jedinica ili pogrešno obračunata rata je značajan iznos. Platforma za butik projekte košta manje od jedne izgubljene prodaje.",
      },
      {
        q: "Kupci su često iz inostranstva - podržava li sistem njihove potrebe?",
        a: "Da - javni link projekta sa foto-galerijom, mapa, EUR cenovnik i IPS QR za kaparu rade iz pregledača bez instalacije i bez posetovanja kancelarije. Za SWIFT uplate potvrđujete prijem ručno u sistemu.",
      },
      {
        q: "Prodajemo preko ekskluzivne agencije - kako da ona dobije uvid u sve?",
        a: "Povežete agenciju sa projektom i dodelite joj 'Ekskluzivni partner' nivo pristupa. Vidi sve jedinice, sve rezervacije i sve statuse plaćanja u realnom vremenu, bez potrebe za Vašim izvoznim izveštajima.",
      },
    ],
    neighbors: ["zlatibor", "kraljevo", "beograd"],
  },
  {
    slug: "cacak",
    name: "Čačak",
    nameLokativ: "u Čačku",
    nameGenitiv: "Čačka",
    kind: "city",
    intro:
      "Čačak je centar srednje Srbije sa stabilnim brojem lokalnih investitora koji grade po jednu zgradu ili manje stambeno-poslovne komplekse. Takvi projekti ne zahtevaju Enterprise sistem - zahtevaju da jedan tim od 2-3 osobe može sve da pokrije bez IT podrške, bez licenci po korisniku i bez meseci implementacije.",
    districtsTitle: "Zone grada",
    districts: ["Centar", "Alvadžinica", "Ljubić", "Trbušani", "Industrijska zona"],
    faqs: [
      {
        q: "Jedan smo investitor sa jednim projektom - koji plan nam treba?",
        a: "Starter plan - pokriva jedan aktivan projekat, kompletan tok od cenovnika do uplata i tim do 5 korisnika. Ne postoji dodatna cena po korisniku ni po jedinici.",
      },
      {
        q: "Imamo prodaju i gradnju u istoj firmi - može li sistem da pokrije i troškove?",
        a: "Delimično. PropertyDesk prati prodajnu stranu i vodi evidenciju troškova po projektu (zemljište, gradnja, marketing, ostalo) za potrebe marže i P&L. Nije zamena za računovodstveni softver - povezuje se sa njim preko izvoza.",
      },
      {
        q: "Kupci iz Čačka često žele kredit - kako sistem pomaže?",
        a: "Za svaku prodaju generišete potvrdu o rezervaciji i plan otplate u PDF-u sa Vašim brendom - što kupac predaje banci. Direktna integracija sa bankama (potvrde ka servisu banke) nije u v1, ali papirologija je spremna u par klikova.",
      },
    ],
    neighbors: ["kraljevo", "kragujevac", "zlatibor"],
  },
  {
    slug: "pancevo",
    name: "Pančevo",
    nameLokativ: "u Pančevu",
    nameGenitiv: "Pančeva",
    kind: "city",
    intro:
      "Pančevo je deo šireg beogradskog pojasa sa svojom nezavisnom scenom investitora - često su to firme koje grade i u Beogradu i u Pančevu paralelno. Za njih je važno da sistem razlikuje projekte po lokaciji, cenama i agencijama bez potrebe da se vode dva naloga.",
    districtsTitle: "Zone grada",
    districts: ["Centar", "Tesla", "Strelište", "Kotež", "Vojlovica", "Kudeljarac"],
    faqs: [
      {
        q: "Prodajemo paralelno u Beogradu i Pančevu - može li jedan nalog?",
        a: "Može. U jednom nalogu vodite više projekata, bez obzira na lokaciju. Svaki projekat ima svoje agencije, svoje cene i svoj plan otplate, a izveštaji se filtriraju po projektu, gradu ili periodu.",
      },
      {
        q: "Imamo kupce koji žele plaćanje u ratama - kako sistem to vodi?",
        a: "Pravite plan otplate po meri (iznosi, datumi dospeća, EUR ili RSD), i sistem FIFO alocira svaku uplatu na najstariju otvorenu ratu. Vidite ko kasni koliko dana, bez ručnog praćenja po Excelu.",
      },
      {
        q: "Pančevačke agencije koriste Viber - može li i njima da bude jednostavno?",
        a: "Može. Agencije ne moraju da uče ništa novo - dobijaju jedan link, prijave se, vide slobodne jedinice i rezervišu klikom. Umesto Viber poruke 'jel slobodan 3a?' dobijaju direktan uvid u status.",
      },
    ],
    neighbors: ["beograd", "novi-sad", "kragujevac"],
  },
  {
    slug: "kraljevo",
    name: "Kraljevo",
    nameLokativ: "u Kraljevu",
    nameGenitiv: "Kraljeva",
    kind: "city",
    intro:
      "Kraljevo i okolina (uz Čačak i Kragujevac) čini zapadno-centralni pojas sa postojanim lokalnim investitorima - često porodične firme koje rade jednu po jednu zgradu. Za ovaj profil najveći rizik nije skaliranje nego gubitak jednog kupca zbog propuštene rezervacije ili ugovora u Word-u.",
    districtsTitle: "Zone grada",
    districts: ["Centar", "Čibukovac", "Ribnica", "Berana", "Vitanovačka"],
    faqs: [
      {
        q: "Mala smo firma - kako znamo da sistem nije prekomplikovan?",
        a: "Osnovni tok (dodaj projekat → uvezi cenovnik → napravi rezervaciju → ugovor → uplata) traje par minuta kada ga jednom vidite. Standardni onboarding je 1h video poziva na Vašim podacima, bez čitanja uputstava.",
      },
      {
        q: "Imamo kupce koji plaćaju gotovinom - može li sistem to da evidentira?",
        a: "Može. Gotovinske uplate unosite ručno sa datumom i brojem priznanice; sistem ih tretira isto kao bankovne uplate (FIFO alokacija na rate, prikaz salda). Fizički novac i dalje predajete banci - PropertyDesk ne zamenjuje blagajnu.",
      },
      {
        q: "Da li možemo da prestanemo sa korišćenjem bez komplikacija?",
        a: "Možete. Nema ugovorne obaveze - otkazujete iz aplikacije u bilo kom trenutku. Vlasnik preuzima JSON izvoz svih podataka (projekti, kupci, uplate) u Podešavanjima → Organizacija, i izvoz ostaje dostupan još 30 dana nakon otkazivanja.",
      },
    ],
    neighbors: ["cacak", "kragujevac", "nis"],
  },
];

/**
 * O(1) lookup slug → CityInfo. Grade se kao Map pri učitavanju modula,
 * tako da je ruta za nepostojeći grad odmah 404 bez skupe pretrage.
 */
const BY_SLUG = new Map(CITIES.map((c) => [c.slug, c] as const));

export function getCityBySlug(slug: string): CityInfo | undefined {
  return BY_SLUG.get(slug);
}

export const CITY_SLUGS: readonly string[] = CITIES.map((c) => c.slug);
