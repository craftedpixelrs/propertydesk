type Leaves<T> = T extends string ? string : { [K in keyof T]: Leaves<T[K]> };

/** Marketing site + public offer / share pages. */
export const marketingSr = {
  charts: {
    count: "Broj",
    distribution: "Distribucija",
  },

  nav: {
    features: "Mogućnosti",
    personas: "Za koga",
    roadmap: "Uskoro",
    roadmapLong: "Uskoro (roadmap)",
    pricing: "Cenovnik",
    faq: "FAQ",
    faqLong: "Česta pitanja",
    product: "Proizvod",
    solutions: "Rešenja",
    contact: "Kontakt",
    app: "Aplikacija",
    investors: "Za investitore",
    agencies: "Za agencije",
    newBuild: "Prodaja novogradnje",
    crm: "CRM za investitore",
    excel: "Alternativa Excelu",
    reservations: "Rezervacije i uplate",
    commissions: "Provizije agencija",
    bookDemo: "Zakažite demo",
    about: "O nama",
    help: "Pomoć",
    privacy: "Privatnost",
    terms: "Uslovi",
    imprint: "Impresum",
    company: "Kompanija",
  },

  header: {
    homeAria: "{{name}} — početna",
    signInSoonTitle: "Prijava biće dostupna nakon lansiranja 01.09.2026.",
    bookDemo: "Zakažite demo",
  },

  footer: {
    blurb:
      "Operativni sistem za prodaju novogradnje - projekti, kupci, rezervacije, uplate i provizije agencija na jednom mestu.",
    bookDemo: "Zakaži 25-minutni demo",
    signIn: "Prijava na nalog",
    launchDate: "Zvanično lansiranje: 01.09.2026.",
    rights: "Sva prava zadržana.",
    madeFor: "Napravljeno za srpsko tržište · sr-Latn · EUR / RSD",
    poweredBy: "Powered by",
    poweredByAria: "Powered by CraftedPixel",
    privacy: "Privatnost",
    terms: "Uslovi",
    imprint: "Impresum",
    about: "O nama",
    help: "Pomoć",
    cookies: "Kolačići",
    legal: "Pravno",
  },

  cookies: {
    title: "Kolačići na ovom sajtu",
    body:
      "Neophodni kolačići čuvaju jezik. Google Analytics učitavamo samo ako prihvatite. Možete promeniti izbor u bilo kom trenutku.",
    accept: "Prihvatam",
    reject: "Samo neophodni",
    privacyLink: "Politika privatnosti",
  },

  legal: {
    privacyTitle: "Politika privatnosti",
    privacyDescription:
      "Koje podatke PropertyDesk prikuplja na sajtu i u aplikaciji, zašto ih koristimo i koja prava imate.",
    termsTitle: "Uslovi korišćenja",
    termsDescription:
      "Uslovi za demo, rani pristup, trial i pretplatu PropertyDesk-a. Bez ugovorne obaveze, otkaz u bilo kom trenutku.",
    imprintTitle: "Impresum",
    imprintDescription:
      "Ko stoji iza PropertyDesk-a: operater CraftedPixel, kontakt hello@propertydesk.app.",
  },

  about: {
    eyebrow: "O nama",
    metaTitle: "O nama",
    metaDescription:
      "PropertyDesk razvija CraftedPixel. Softver za investitore i agencije koje prodaju novogradnju u Srbiji. Kontakt: hello@propertydesk.app.",
    title: "Gradimo alat koji zamenjuje Excel i Viber u prodaji novogradnje.",
    lead:
      "PropertyDesk je proizvod firme CraftedPixel. Nismo strani CRM prilagođen Srbiji — sistem je od početka pravljen za lokalni tok: rezervacija, kapara, ugovor, rate, provizija.",
    whoTitle: "Ko smo",
    whoBody:
      "Iza proizvoda stoji Marko Banović i CraftedPixel, softverska firma iz Srbije. Radimo sa investitorima i agencijama koje i dalje vode zalihe u Excelu i rezervacije u Viber grupama. PropertyDesk je odgovor na te iste probleme.",
    whyTitle: "Zašto sada",
    whyBody:
      "Zvanično lansiranje je 01.09.2026. Do tada radimo sa malim brojem pilot partnera: demo, pa trial na Vašim podacima, pa onboarding. Ne otvaramo samostalnu registraciju pre lansiranja.",
    contactTitle: "Kontakt",
    contactBody:
      "Za demo, rani pristup i pitanja o proizvodu pišite na poslovnu adresu. Odgovaramo u roku od 2 radna dana.",
  },

  help: {
    eyebrow: "Pomoć",
    metaTitle: "Pomoć i šta radi danas",
    metaDescription:
      "Šta PropertyDesk radi danas, šta dolazi posle lansiranja, i detaljan vodič za operatere.",
    title: "Šta radi danas, a šta još nije živo",
    lead:
      "Pre demoa ili prijave, evo iskreno šta možete da očekujete. Detaljan vodič za svaki modul je u Help Centeru.",
    worksTitle: "U upotrebi",
    works1: "Projekti, jedinice, cene, uvoz iz Excel-a i PDF cenovnik.",
    works2: "CRM kupaca sa KYC checklist-om i zaštitom kupca.",
    works3: "Rezervacije (interna i javna sa IPS QR kaparom) i konverzija u prodaju.",
    works4: "Plan otplate, uplate, uvoz izvoda i FIFO alokacija.",
    works5: "HTML šabloni ugovora i predugovora u PDF-u.",
    works6: "Provizije agencija, javni sajt projekta i izveštaji.",
    laterTitle: "Još nije automatski",
    laterIntro:
      "Ovo je na roadmapu ili se radi ručno. Ne tvrdimo da je već gotovo.",
    later1:
      "Automatsko slanje faktura u SEF — arhitektura postoji, pravi transport još nije uključen. Do tada status pratite preko SEF portala.",
    later2: "Editor poligona na spratu — pregled slike sprata postoji, crtanje jedinica još ne.",
    later3: "Elektronski potpis ugovora sa pravnom snagom u Srbiji.",
    later4: "WordPress plugin, AI asistent na sajtu i marketplace investitor–agencija.",
    guideTitle: "Detaljan vodič",
    guideBody:
      "Help Center pokriva prijavu, projekte, rezervacije, KYC, agencije i česta pitanja — uključujući trenutna ograničenja.",
    guideCta: "Otvori Help Center",
  },

  common: {
    bookDemo: "Zakažite 25-minutni demo",
    bookDemoShort: "Zakažite demo",
    watchVideo: "Pogledajte demo od 3 minuta",
    noObligation: "Bez obaveze. Direktno iz kalendara, bez čekanja.",
    callUs: "Pozovite nas",
    callUsPhone: "Pozovite nas: +381 65 43 63 142",
    earlyAccess: "Rani pristup",
    comingSoon: "Uskoro",
    problem: "Problem",
  },

  hero: {
    launchBadge: "Lansiranje {{date}}",
    earlyAccessBadge: "Rani pristup: 30 dana besplatno + 50% na naredna 3 meseca",
    title: "Operativni sistem za prodaju novogradnje.",
    subtitle:
      "Jedna platforma za investitore i partnerske agencije - od projekta i zaliha, preko rezervacija i ugovora, do uplata i provizija. Sve na srpskom, sa IPS QR za kaparu i fakture.",
    bookDemo: "Zakažite 25-minutni demo",
    watchVideo: "Pogledajte demo od 3 minuta",
    noObligation: "Bez obaveze. Direktno iz kalendara, bez čekanja.",
    countdownLabel: "Do zvaničnog lansiranja",
    mockupAlt:
      "Kontrolna tabla PropertyDesk sa projektima, jedinicama, rezervacijama i uplatama",
  },

  countdown: {
    days: "dana",
    hours: "sati",
    minutes: "minuta",
    seconds: "sekundi",
    aria: "Odbrojavanje do zvaničnog lansiranja PropertyDesk platforme",
  },

  mockup: {
    comingSoon: "Prikaz uskoro",
    mobileAlt: "PropertyDesk mobilni prikaz",
    desktopAlt: "PropertyDesk kontrolna tabla",
    mobileAria: "Prikaz mobilnog interfejsa PropertyDesk - {{label}}",
    desktopAria: "Prikaz desktop interfejsa PropertyDesk - {{label}}",
    desktopHint:
      "Ovde će biti prikaz kontrolne table sa projektima, prodajama i uplatama.",
  },

  video: {
    eyebrow: "Video demo - 3 minuta",
    title: "Pogledajte kako izgleda vođenje projekta u realnom vremenu",
    subtitle:
      "Od projekta i statusa jedinica, preko rezervacije i prodaje, do uplate, portala partnerske agencije i izveštaja direktora - sve u jednom kratkom pregledu.",
    regionAria: "Video demo PropertyDesk-a",
    iframeTitle: "Video demo PropertyDesk-a",
    playAria: "Pokreni video demo PropertyDesk-a",
    unsupported: "Vaš pregledač ne podržava HTML5 video.",
    placeholderTitle: "Video demo stiže uskoro",
    placeholderBody:
      "Pripremamo kratak pregled proizvoda. Do tada, najbrži način da vidite PropertyDesk uživo je 25-minutni personalizovan demo.",
    bookLive: "Zakažite live demo",
  },

  offer: {
    title: "Šta dobijate prijavom za rani pristup",
    trialTitle: "Prvih 30 dana besplatno",
    trialBody:
      "Kompletan pristup svim funkcijama plana bez obaveze plaćanja - test na Vašim projektima i podacima.",
    discountTitle: "50% popusta na naredna 3 meseca",
    discountBody:
      "Nakon isteka trial-a, sledeća tri meseca plaćate polovinu cene odabranog plana. Popust se aktivira automatski.",
    lockTitle: "Zaključana cena 12 meseci",
    lockBody:
      "Cena Vašeg paketa se ne menja godinu dana - nema iznenađenja i poskupljenja u prvoj godini korišćenja.",
  },

  features: {
    eyebrow: "Mogućnosti",
    title: "Sve što treba za prodaju novogradnje - u jednoj platformi",
    subtitle:
      "Bez Excel-a, bez Viber grupa i ad-hoc dogovora. Svaki korak prodajnog toka - od dodavanja jedinice do isplate provizije - evidentiran je, kontrolisan i praćen kroz sistem.",
    items: {
      projects: {
        title: "Projekti i zalihe",
        description:
          "Kompletna hijerarhija: objekat → ulaz → sprat → jedinica. Statusi, cene, istorija promena, uvoz iz Excel-a, klik-do-klika duplikat projekta i cenovnik u PDF-u.",
      },
      crm: {
        title: "CRM za kupce sa KYC-em",
        description:
          "Fizička i pravna lica, stranci. JMBG / LK / PIB, checklist dokumenata, blok na ugovor dok KYC nije potpun. Detekcija duplikata i GDPR anonimizacija.",
      },
      reservations: {
        title: "Rezervacije i Kanban pipeline",
        description:
          "Jedna aktivna rezervacija po jedinici, automatski istek, Kanban tabla po fazama prodaje, konverzija u prodaju u par klikova.",
      },
      qr: {
        title: "Online rezervacija sa IPS QR kaparom",
        description:
          "Javni link za jedinicu ili ceo projekat (microsite). Kupac popuni formu, dobija ispravan IPS QR za kaparu - Vi samo potvrđujete prijem.",
      },
      sales: {
        title: "Prodaje i plan otplate",
        description:
          "Ugovaranje, predugovori, prilagođeni planovi rata sa validacijom, ručno dodavanje rata, PDV režim (10% ili 2.5%), storniranje sa audit tragom.",
      },
      contracts: {
        title: "Generator ugovora i predugovora",
        description:
          "Šabloni sa placeholder-ima za sve podatke prodaje - ugovor se generiše u PDF-u za par sekundi, sa statusom (poslato / potpisano) i punim audit tragom.",
      },
      payments: {
        title: "Uplate sa FIFO alokacijom",
        description:
          "Automatska raspodela na najstarije otvorene rate, ručna realokacija, deljenje jedne uplate na više prodaja, uvoz bankarskih izvoda.",
      },
      commissions: {
        title: "Provizije i referral za agencije",
        description:
          "Pravila po projektu, jedinici i konekciji. Referral kod po agenciji (QR + link za marketing), snapshot iznosa u trenutku ugovora, jasan tok do isplate.",
      },
      documents: {
        title: "Dokumenti, foto-galerije i floor plan",
        description:
          "Foto-galerije jedinice i projekta, floor plan sa klikabilnim jedinicama, KYC dokumenti kupca, dokumentacija po prodaji - sa deljenjem preko share linkova.",
      },
      microsite: {
        title: "Javni sajt projekta (microsite)",
        description:
          "Uključite prekidač i projekat dobija javni sajt na Vašem slug-u sa dostupnim jedinicama, mapom i galerijom - bez potrebe za dodatnim web sajtom.",
      },
      reports: {
        title: "Izveštaji sa grafikonima",
        description:
          "Prodaje, zalihe, uplate, kupci, agencije, marža po projektu, cash-flow projekcija 12 meseci, vreme do prodaje - sa filterima i izvozom u CSV/XLSX.",
      },
      cashflow: {
        title: "Cash-flow i P&L po projektu",
        description:
          "Projekcija priliva za 12 meseci, trošak zemljišta / gradnje / marketinga po projektu i neto marža - dashboard koji investitor gleda pre kave.",
      },
      automation: {
        title: "Automatizacija, podsetnici i @mentions",
        description:
          "Email podsetnici za dospele rate, obaveštenja u aplikaciji, komentari sa @mentions na kupcima i prodajama - bez ručnog praćenja i Viber grupa.",
      },
    },
  },

  proof: {
    eyebrow: "Ko stoji iza proizvoda",
    title: "Razvijeno uz konsultacije sa investitorima i agentima",
    subtitle:
      "PropertyDesk gradimo direktno sa ljudima koji svakodnevno prodaju novogradnju - investitorima koji vode više projekata paralelno i agencijama koje treba da vide azurno stanje inventara u svakom trenutku.",
    pilots: "Pilot partneri",
    pilotsHint:
      "Tražimo 3–5 investitora i agencija za pilot pre 01.09.2026. Logo ide ovde kada krenemo da radimo zajedno — ne prikazujemo izmišljene reference.",
    yourLogo: "Pilot mesto",
    pilotsCta: "Prijavite se za pilot",
    investor: "Investitor",
    agency: "Agencija",
    slotAria: "Slot za logotip pilot partnera",
    founder: "Osnivač",
    founderBio:
      "Vodim razvoj PropertyDesk-a. Poslednjih godina sam blisko radio sa investitorima i agencijama koje prodaju novogradnju - ovaj proizvod je odgovor na iste probleme koje sam viđao iznova (Excel bez verzija, Viber grupe za rezervacije, ručno računanje provizija).",
    behind: "Iza proizvoda",
    companyBio:
      "PropertyDesk razvija CraftedPixel - softverska firma iz Srbije specijalizovana za proizvode koji rešavaju konkretne operativne probleme u B2B poslovanju.",
    dataEu: "Podaci u EU regionu",
    encryption: "Enkripcija u tranzitu i mirovanju",
    audit: "Trajni audit dnevnik",
  },

  personas: {
    eyebrow: "Za koga",
    title: "Dve strane, jedna platforma",
    subtitle:
      "PropertyDesk je dizajniran za dvosmernu saradnju investitora i agencija. Svaka strana dobija svoj portal i tačno one podatke koji su joj potrebni - ništa više, ništa manje.",
    investorEyebrow: "Za investitore",
    investorTitle: "Prodaja novogradnje pod punom kontrolom",
    investorDescription:
      "Vodite prodajni tim, projekte i zalihe. Kontrolišete kojim agencijama otvarate ponudu, pod kojim uslovima i sa kakvom provizijom.",
    investor1:
      "Zalihe stanova, garaža i lokala kroz više projekata (uvoz iz Excel-a, klon projekta)",
    investor2:
      "CRM sa KYC-em (JMBG, PIB, LK), detekcijom duplikata i @mentions komentarima",
    investor3: "Online rezervacija sa IPS QR kaparom - kupac plaća skeniranjem",
    investor4: "Generator ugovora i predugovora u PDF-u sa svim placeholder-ima",
    investor5:
      "Cash-flow projekcija 12 meseci, marža po projektu i vreme do prodaje",
    investor6: "Javni sajt projekta (microsite) sa mapom i dostupnim jedinicama",
    investor7: "Kontrola pristupa i provizija za partnerske agencije",
    agencyEyebrow: "Za agencije za nekretnine",
    agencyTitle: "Sve što treba za rad sa investitorima",
    agencyDescription:
      "Bez haosa u Excel-u i Viber grupama. Vidite tačno šta je slobodno, štitite kupca i pratite proviziju do isplate.",
    agency1: "Pregled dodeljenih projekata i slobodnih jedinica",
    agency2: "Referral kod sa jedinstvenim linkom i QR-om za marketing",
    agency3: "Registracija i zaštita kupaca (buyer protection)",
    agency4: "Rezervacije direktno iz ponude investitora, uz KYC checklist",
    agency5: "Praćenje provizija od odobrenja do isplate, sa referral bonusima",
    agency6: "Zaseban tim agenata i uloge sa dozvolama",
    agency7: "Nema više izgubljenih kontakata i konfuzije sa investitorima",
    mobileAlt: "Mobilna aplikacija PropertyDesk za rad na terenu",
    mobileLabel: "PWA za teren - uskoro",
  },

  serbia: {
    eyebrow: "Napravljeno za Srbiju",
    title: "Zakonska usklađenost i lokalni standardi ugrađeni od prvog dana",
    subtitle:
      "Ne prilagođavamo strani softver srpskom tržištu - PropertyDesk je izgrađen ovde, za ovaj poslovni kontekst.",
    languageTitle: "Srpski jezik i format",
    languageBody:
      "Ceo interfejs, emailovi, PDF izlazi i validacije - na srpskom (sr-Latn). Format datuma, adresa i telefona po lokalnom standardu.",
    currencyTitle: "EUR i RSD",
    currencyBody:
      "Ugrađena podrška za obe valute. Automatski preračun po srednjem kursu NBS na dan izdavanja fakture za dinarsku protivvrednost.",
    qrTitle: "IPS QR za kaparu i fakture",
    qrBody:
      "Ispravan IPS QR usklađen sa NBS specifikacijom - i na SaaS fakturama i na online rezervacijama sa kaparom. Kupac plaća skeniranjem, bez prekucavanja poziva na broj.",
    sefTitle: "Priprema za SEF",
    sefBody:
      "Arhitektura za Sistem elektronskih faktura je spremna. Automatsko slanje još nije uključeno — do tada status e-fakture pratite ručno preko SEF portala.",
    kycTitle: "KYC za kupce (fizička i pravna lica)",
    kycBody:
      "JMBG, broj lične karte, PIB, adresa - sa checklist-om (LK, potvrda adrese, poreska potvrda za pravna lica). Blok na prelazak u ugovor dok KYC nije potpun.",
    vatTitle: "PDV režim: novogradnja i sekundarno tržište",
    vatBody:
      "Automatski obračun PDV-a 10% za novogradnju ili poreza na prenos apsolutnih prava 2.5% za sekundarno tržište - upisan na svaku prodaju i propagiran u PDF ugovor.",
    contractsTitle: "Ugovori i predugovori u PDF-u",
    contractsBody:
      "Šabloni sa placeholder-ima ({{buyer.jmbg}}, {{sale.finalPrice}}, {{plan.installments}}) - generišu se u par klikova, sa audit tragom za status (poslato, potpisano).",
    importTitle: "Uvoz bankarskih izvoda i cenovnika",
    importBody:
      "CSV/XLSX izvod iz banke se uparuje po pozivu na broj i iznosu. Uvoz jedinica iz Excel-a: 3-korak wizard sa mapiranjem kolona i preview-om pre snimanja.",
  },

  demo: {
    eyebrow: "Demo i onboarding",
    title: "Kratak demo, pa realni trial - onboarding tek kada odlučite da probate",
    subtitle:
      "Vaše vreme je najskuplji resurs. Prvo Vam pokažemo sistem u 25 minuta na Vašim primerima - bez marketinških slajdova. Ako Vam ima smisla, aktiviramo probni nalog i zakazujemo praktičan onboarding sa timom nakon toga.",
    step1Title: "Zakažite demo iz kalendara",
    step1Body:
      "Direktno birate slobodan termin iz našeg kalendara - bez čekanja i bez emailova napred-nazad. Dobijate potvrdu i podsetnik e-mailom.",
    step2Title: "25-minutni personalizovan demo",
    step2Body:
      "Kratak video poziv u kome kroz Vaše primere prolazimo ključne tokove: projekte, statuse jedinica, rezervacije, prodaje i uplate.",
    step3Title: "30 dana besplatnog trial-a",
    step3Body:
      "Ako Vam se dopadne, aktiviramo probni nalog sa svim funkcijama. Bez kartice, bez obaveze - test na Vašim realnim podacima.",
    step4Title: "60-minutni onboarding za tim",
    step4Body:
      "Nakon aktivacije trial-a zakazujemo praktični onboarding sa Vašim prodajnim timom - kroz konkretne najbolje prakse i realne scenarije.",
  },

  booking: {
    eyebrow: "Direktno zakazivanje",
    title: "Zakažite 25-minutni demo",
    subtitle:
      "Izaberite termin koji Vam odgovara. Dobijate potvrdu i podsetnik e-mailom, sa linkom za video poziv.",
    iframeTitle: "Zakazivanje demo termina",
    liveSlots: "Termini u realnom vremenu",
    emailConfirm: "Potvrda i podsetnik na email",
    videoLink: "Link za video poziv u pozivnici",
    orCall: "Ili nas pozovite:",
    shareTitle: "Izaberite termin u Google kalendaru",
    shareBody:
      "Otvara se službena stranica za zakazivanje sa realnim slobodnim terminima. Dobijate potvrdu i podsetnik na email, sa Google Meet linkom za video poziv.",
    openCalendar: "Otvori kalendar i zakaži",
    newTab: "Otvara se u novom tabu (calendar.app.google)",
    fallbackTitle: "Direktno zakazivanje uskoro",
    fallbackBody:
      "Kalendar zakazivanja je u procesu aktivacije. Do tada, ostavite kontakt putem forme i javljamo se sa slobodnim terminima u toku istog radnog dana.",
    leaveContact: "Ostavite kontakt",
  },

  bonuses: {
    until: "Sve prijave do 01.09.2026.",
    title: "Šta tačno dobijate prijavom pre lansiranja",
    leadStrong:
      "Prvih 30 dana besplatno. Nakon toga 50% popusta na naredna tri meseca.",
    leadRest:
      "Uz to, dobijate paket bonusa koji Vam skida ceo teret prvog postavljanja i uvođenja tima u sistem - bez dodatne naplate.",
    trialTitle: "Prvih 30 dana besplatno",
    trialBody:
      "Kompletan pristup planu bez obaveze plaćanja, na Vašim realnim podacima.",
    discountTitle: "50% popusta na naredna 3 meseca",
    discountBody: "Polovina cene odabranog paketa u tri meseca nakon isteka trial-a.",
    excelTitle: "Besplatan uvoz prve Excel tabele",
    excelBody: "Vaš postojeći cenovnik / lista jedinica ubaci se u sistem umesto Vas.",
    setupTitle: "Besplatno podešavanje jednog projekta",
    setupBody:
      "Zajedno modelujemo strukturu Vašeg projekta (objekti, ulazi, spratovi, jedinice).",
    onboardingTitle: "Onboarding za ceo tim",
    onboardingBody:
      "60-minutna sesija u kojoj Vaš prodajni tim prolazi kroz sistem sa nama.",
    supportTitle: "Prioritetna podrška",
    supportBody:
      "Odgovor na Vaše prijave u okviru istog radnog dana - direktna komunikacija sa timom.",
    lockTitle: "Zaključana cena paketa 12 meseci",
    lockBody:
      "Cena se ne menja godinu dana - bez poskupljenja u toku prve godine korišćenja.",
    footnote:
      "Rana ponuda važi za sve koji zakažu demo ili se prijave putem forme do 01.09.2026. Nakon lansiranja standardni cenovnik.",
  },

  pricing: {
    eyebrow: "Cenovnik",
    title: "Jednostavno, transparentno, bez skrivenih troškova",
    subtitle:
      "Sve cene su na mesečnom nivou. Kvartalno, polugodišnje i godišnje plaćanje takođe je dostupno u aplikaciji. Bez obavezujućih ugovora - otkazivanje jednim klikom.",
    earlyBird:
      "Rani pristup: 30 dana besplatno + 50% na naredna 3 meseca (za prijave do 01.09.2026.)",
    popular: "Najpopularnije",
    monthly: "/ mesečno",
    footnote:
      "Prvih 30 dana besplatno. Nakon toga 50% popusta na naredna tri meseca. Zaključana cena paketa 12 meseci.",
    starterName: "Starter",
    starterDescription: "Za manje projekte i pojedinačne investitore.",
    starter1: "Do 3 projekta",
    starter2: "Do 250 jedinica",
    starter3: "Do 10 članova tima",
    starter4: "Do 5 povezanih agencija",
    growthName: "Growth",
    growthDescription: "Za profesionalne investitore u ekspanziji.",
    growth1: "Do 10 projekata",
    growth2: "Do 1.000 jedinica",
    growth3: "Do 30 članova tima",
    growth4: "Do 25 povezanih agencija",
    scaleName: "Scale",
    scaleDescription: "Neograničeno za velike investitore.",
    scale1: "Neograničeno projekata",
    scale2: "Neograničeno jedinica",
    scale3: "Neograničen tim",
    scale4: "Prioritetna podrška",
  },

  roadmap: {
    eyebrow: "Šta dolazi sledeće",
    title: "Roadmap posle lansiranja",
    subtitle:
      "PropertyDesk 1.0 već pokriva ceo prodajni tok od projekta do provizije. Ovo su naredni koraci - rani pretplatnici ih dobijaju čim budu dostupni, bez doplate.",
    wpTitle: "WordPress plugin",
    wpBody: "Auto-sync projekata, jedinica i cena sa sajtom - bez ručnog održavanja.",
    aiTitle: "AI asistent za sajtove",
    aiBody:
      "Chat widget kao jedan <script> tag - odgovara na pitanja o Vašim jedinicama 24/7.",
    qualifyTitle: "Automatska kvalifikacija upita",
    qualifyBody:
      "AI čita zahtev kupca i predlaže 3 najbolje jedinice iz Vašeg inventara.",
    leadsTitle: "Integracije za lead-ove",
    leadsBody:
      "Meta i Google forme, WhatsApp / Viber inbox, email drip - sve u istom pipeline-u.",
    signTitle: "Elektronski potpis",
    signBody:
      "Predugovori i ugovori online, sa vremenskim žigom i pravnom snagom u Srbiji.",
    marketTitle: "Marketplace investitor - agencija",
    marketBody:
      "Prvi sloj je u proizvodu: besplatna registracija agencije, opt-in teaser katalog i zahtev za saradnju. Pun inventar i dalje ide samo posle konekcije.",
  },

  faq: {
    eyebrow: "Česta pitanja",
    title: "Odgovori pre nego što pitate",
    q1: "Kada se lansira PropertyDesk?",
    a1: "Zvanično lansiranje je 01.09.2026. Do tada je otvorena rana prijava - svi koji se prijave putem forme na ovoj stranici dobijaju obaveštenje pre javnog puštanja.",
    q2: "Kako funkcioniše rana ponuda za prijave do 01.09.2026.?",
    a2: "Prvih 30 dana besplatno. Nakon toga 50% popusta na naredna tri meseca. Uz to: besplatan uvoz prve Excel tabele, besplatno podešavanje jednog projekta, onboarding za tim, prioritetna podrška i zaključana cena paketa 12 meseci - bez poskupljenja u toku prve godine.",
    q3: "Kako izgleda demo i koliko traje?",
    a3: "Personalizovan demo traje 20-30 minuta (video poziv, direktno zakazivanje iz kalendara na sajtu, bez čekanja). Ako nakon toga odlučite da probate PropertyDesk, dobijate 30 dana besplatnog trial-a. Onboarding za tim (60 min) zakazuje se nakon aktivacije trial naloga - kroz konkretne primere iz Vašeg poslovanja.",
    q4: "Da li je platforma na srpskom jeziku?",
    a4: "Da. Ceo interfejs, poruke, PDF izlazi i email obaveštenja su na srpskom (latinično pismo). Ugrađena je podrška za EUR i RSD, srpski format datuma i IPS QR kod na fakturama i kaparama. Automatsko slanje u SEF je u pripremi.",
    q5: "Za koga je PropertyDesk?",
    a5: "Za investitore koji prodaju novogradnju (stanove, garaže, poslovne prostore) direktno ili preko partnerskih agencija, i za same agencije koje sarađuju sa investitorima. Svaka strana dobija svoj portal sa jasno definisanim pravima.",
    q6: "Kako radi online rezervacija sa kaparom?",
    a6: "Svaka jedinica dobija javni share link (bez logina). Kupac otvori link, popuni ime / prezime / email / telefon i iznos kapare i dobija ispravan IPS QR kod za plaćanje. Vi kao investitor u '/rezervacije/zahtevi' vidite listu novih zahteva, potvrđujete prijem kapare kada legne na račun - i zahtev se konvertuje u pravu rezervaciju sa 48h hold-om.",
    q7: "Da li mogu da generišem ugovor i predugovor iz sistema?",
    a7: "Da. U 'Administracija → Šabloni ugovora' čuvate HTML šablon sa placeholder-ima ({{buyer.fullName}}, {{buyer.jmbg}}, {{sale.finalPrice}}, {{plan.installments}}, {{tax.mode}}, {{investor.pib}}). Na svakoj prodaji izaberete šablon i generišete PDF za par sekundi - sa punim audit tragom (poslato, potpisano).",
    q8: "Da li podržavate PDV režim za novogradnju (10%) i sekundarno tržište (2.5%)?",
    a8: "Da. Na svakoj prodaji birate režim (NEW_BUILD_10 / SECONDARY_MARKET_2_5 / NONE) i platforma automatski računa iznos poreza od ugovorene cene. Podatak se propagira u PDF ugovor i u izveštaje.",
    q9: "Mogu li otkazati pretplatu u bilo kom trenutku?",
    a9: "Da. Pretplata se otkazuje jednim klikom iz aplikacije, bez ugovorne obaveze. Vaši podaci ostaju dostupni za izvoz još 30 dana nakon otkazivanja.",
    q10: "Kako se čuvaju podaci?",
    a10: "Svi podaci se čuvaju u EU regionu, uz enkripciju u tranzitu i u mirovanju. Svaka izmena je evidentirana u trajnom audit dnevniku. Pristup podacima je striktno ograničen po organizaciji (multi-tenant izolacija) i po ulozi korisnika. Backup baze se verifikuje sedmično automatski - operateri dobijaju email upozorenje već na drugi uzastopni fail.",
  },

  lead: {
    eyebrow: "Rani pristup",
    title: "Prijavite se za rani pristup i besplatnu obuku",
    subtitleBefore:
      "Ostavite kontakt - javljamo se u roku od 2 radna dana radi dogovora za demo i obuku u trajanju od sat vremena. Prijavljeni korisnici automatski ostvaruju pravo na",
    subtitleStrong: "50% popusta prva 3 meseca",
    subtitleAfter: "nakon lansiranja 01.09.2026.",
    perk1: "Bez obaveze - sve dok Vi ne odlučite drugačije.",
    perk2: "Podaci ostaju u EU, brišu se na Vaš zahtev.",
    perk3:
      "Obuka je nezavisna od aplikacije - koristi Vam i ako izaberete drugu platformu.",
    successTitle: "Hvala Vam na prijavi!",
    successBody:
      "Javljamo se u roku od 2 radna dana radi dogovora za demo i obuku. Do tada, slobodno pogledajte ostatak stranice.",
    firstName: "Ime",
    lastName: "Prezime",
    firstNamePh: "Marko",
    lastNamePh: "Marković",
    emailPh: "ime@firma.rs",
    phonePh: "+381 60 000 0000",
    company: "Naziv firme",
    companyPh: "AKME Nekretnine d.o.o.",
    city: "Grad",
    cityPh: "Beograd",
    who: "Ko ste Vi?",
    investor: "Investitor",
    agency: "Agencija za nekretnine",
    projectCount: "Broj projekata koji trenutno vodite / prodajete",
    select: "Izaberite…",
    projects0: "0 - u pripremi",
    projects12: "1–2 projekta",
    projects35: "3–5 projekata",
    projects610: "6–10 projekata",
    projects10: "10+ projekata",
    note: "Napomena",
    notePh:
      "Recite nam ukratko šta prodajete i koje su Vaše najveće prepreke trenutno.",
    consent:
      "Saglasan/a sam da PropertyDesk koristi ove podatke isključivo radi kontaktiranja u vezi sa ranim pristupom, demoom i obukom, u skladu sa",
    consentPrivacy: "Politikom privatnosti",
    consentAfter: "Podatke mogu povući u bilo kom trenutku slanjem mejla na",
    submit: "Pošalji prijavu",
    afterSubmit: "Nakon slanja, kontaktiramo Vas u roku od 2 radna dana.",
    audienceRequired: "Molimo označite da li ste investitor ili agencija.",
    rateLimited: "Previše pokušaja. Sačekajte minut i pokušajte ponovo.",
    sendFailed: "Slanje nije uspelo. Pokušajte ponovo za koji trenutak.",
    network: "Nema veze sa serverom. Proverite internet i pokušajte ponovo.",
  },

  cta: {
    title: "Videli ste šta radi. Vidimo se na demo pozivu?",
    subtitle:
      "Prvih 30 dana besplatno. Nakon toga 50% popusta na naredna tri meseca. Zaključana cena paketa 12 meseci - za sve prijave do 01.09.2026.",
  },

  landing: {
    home: "Početna",
    metaHomeTitle:
      "{{name}} - Softver za prodaju novogradnje | Investitori i agencije",
    metaHomeDescription:
      "Softver za investitore i agencije koje prodaju novogradnju: projekti, KYC kupaca, online rezervacija sa IPS QR kaparom, generator ugovora u PDF-u, planovi otplate, uplate, provizije, referral kod za agencije, javni sajt projekta, cash-flow projekcija i izveštaji. IPS QR, PDV 10%/2.5%, EUR/RSD. Lansiranje 01.09.2026 - prijave do lansiranja dobijaju 30 dana besplatno + 50% na naredna 3 meseca.",
    softwareDescription:
      "Multi-tenant SaaS platforma za investitore u nekretnine i partnerske agencije. Projekti, jedinice, kupci, rezervacije, prodaje, planovi otplate, uplate, provizije, dokumenti i izveštaji - sa IPS QR za kaparu i fakture.",
    ogAlt: "PropertyDesk - operativni sistem za prodaju novogradnje",
    ogHeadline: "Operativni sistem za prodaju novogradnje",
    ogSub:
      "Projekti, kupci, rezervacije, uplate i provizije agencija - sve na srpskom, sa IPS QR za kaparu i fakture.",
    ogBadge: "Lansiranje 01.09.2026 · −50% prva 3 meseca",
  },

  pages: {
    demo: {
      metaTitle: "Zakažite 25-minutni demo",
      metaDescription:
        "Personalizovan demo PropertyDesk-a - 25 minuta na Vašim primerima, direktno iz kalendara. Bez čekanja, bez obaveze, sa video pozivom i email potvrdom. Ako Vam se dopadne - aktiviramo 30 dana besplatnog trial-a.",
      eyebrow: "Zakažite demo",
      title: "25 minuta uživo. Vaši primeri. Bez slajdova.",
      subtitle:
        "Odaberite termin ispod. Dobijate potvrdu i podsetnik e-mailom, sa linkom za video poziv. Ako nakon demoa odlučite da probate PropertyDesk - aktiviramo 30 dana besplatnog trial-a.",
      scrollCalendar: "Skroluj do kalendara",
      footnote: "Ili nas pozovite direktno: +381 65 43 63 142",
      bookingTitle: "Izaberite termin koji Vam odgovara",
      bookingSubtitle:
        "Standardni demo traje 25 minuta putem video poziva. Podsetnik dobijate e-mailom sa linkom za sastanak. Ako Vam ne odgovara video poziv, uvek Vas možemo pozvati telefonom.",
    },
    investors: {
      metaTitle: "Softver za investitore u novogradnju",
      metaDescription:
        "PropertyDesk je operativni sistem za investitore u novogradnju - projekti, jedinice, rezervacije, prodaje, uplate i provizije agencija na jednom mestu. Zamenite Excel i Viber grupe jasnim tokom, u realnom vremenu.",
      eyebrow: "Za investitore",
      title: "Vodite više projekata bez Excela, Vibera i haosa",
      subtitle:
        "PropertyDesk je centralni sistem za investitore koji istovremeno prodaju direktno i preko partnerskih agencija. Projekti, jedinice, rezervacije, prodaje, uplate, provizije - jedna platforma, sve pod kontrolom.",
      gridTitle: "10 stvari koje investitori žele da reše sa softverom",
      gridSubtitle:
        "Ovo su najčešći problemi koje čujemo od investitora sa 50 do 1.000 jedinica pod prodajom. Svaki od njih PropertyDesk rešava direktno, iz kutije.",
      p1: "Cenovnici u Excelu se granaju u više verzija - niko u timu ne zna koja je aktuelna.",
      s1: "Jedan cenovnik po projektu, jedna istina za ceo tim, sa istorijom svih promena cena. Novi projekat se pravi klik-do-klika (klon strukture zgrade / spratova / jedinica) ili uvozom Excel tabele u 3 koraka.",
      p2: "Agencije rezervišu jedinice preko Vibera - dešava se dupla rezervacija istog stana.",
      s2: "Jedna aktivna rezervacija po jedinici, automatski istek, real-time status vidljiv svim agencijama i Kanban pipeline od 'novo' do 'ugovoreno'.",
      p3: "Kupac gubi vreme prekucavajući poziv na broj za kaparu, pa uplata nikada ne stigne.",
      s3: "Online rezervacija: kupac skenira IPS QR direktno iz javnog linka jedinice, uplaćuje kaparu, a Vi u '/rezervacije/zahtevi' samo potvrđujete prijem kada legne na račun.",
      p4: "Ugovore i predugovore kucate u Word-u, sa pola sata copy-paste-a po prodaji.",
      s4: "Šablon ugovora sa placeholder-ima ({{buyer.jmbg}}, {{sale.finalPrice}}, {{plan.installments}}, {{tax.mode}}) - PDF se generiše u par sekundi, sa audit tragom (poslato, potpisano).",
      p5: "Provizije agencija se ručno računaju u svakoj tabeli, sa različitim pravilima po projektu.",
      s5: "Pravila po projektu, jedinici i agenciji, sa snapshot iznosom u trenutku ugovora - bez kasnijih nesporazuma. Referral kod za svaku agenciju povezuje online zahteve sa proviziom.",
      p6: "Uplate se ne poklapaju sa ratama; nemate uvid ko duguje, ko je platio i koliko je zakasnio.",
      s6: "Automatska FIFO alokacija uplata na otvorene rate, jasan prikaz salda po kupcu i podsetnici za dospele rate. Cash-flow projekcija narednih 12 meseci pored 'ugovoreno / naplaćeno / preostalo'.",
      p7: "Nemate uvid da li se konkretan projekat isplati - troškovi zemljišta i gradnje su u glavi računovođe.",
      s7: "Cost tracking po projektu (zemljište, gradnja, marketing, ostalo) + izračunata marža i P&L. 'Vreme do prodaje' (P50, P90) po projektu vidite iz jedne kartice.",
      p8: "Nemate javni sajt za svaki projekat, a agencije im šalju kupce sa raznih platformi.",
      s8: "Javni sajt projekta (microsite) uz jedan prekidač: hero slika, opis, mapa, grid slobodnih jedinica sa share linkovima - bez potrebe za dodatnim web sajtom.",
      p9: "Izveštaji za direktora se rade ručno svakog meseca; podaci su uvek zastareli.",
      s9: "Izveštaji prodaja, zaliha, uplata, agencija sa grafikonima i filterima po projektu i periodu - izvoz u CSV/XLSX jednim klikom.",
      p10: "Kupci gube dokumente (ponuda, predugovor, ugovor); slanje mailom je haotično.",
      s10: "Centralno skladište dokumenata vezano za projekat, jedinicu, kupca ili prodaju - sa Vašim brendom. KYC checklist na kupcu blokira ugovor dok LK, adresa i (za pravna lica) poreska potvrda nisu potvrđene.",
    },
    agencies: {
      metaTitle: "PropertyDesk za agencije za nekretnine",
      metaDescription:
        "Real-time pristup inventaru investitora, rezervacije u par klikova, automatske provizije i portal sa Vašim brendom. PropertyDesk daje agencijama za nekretnine sve što treba za prodaju novogradnje - bez čekanja na email potvrde investitora.",
      eyebrow: "Za agencije",
      title: "Prodajte novogradnju iz kataloga koji je uvek ažuran",
      subtitle:
        "PropertyDesk povezuje Vašu agenciju sa investitorima sa kojima sarađujete - vidite realne jedinice, statuse i cene, rezervišete jednim klikom i pratite proviziju od prodaje do isplate.",
      gridTitle: "Zašto se agencije bore sa novogradnjom",
      gridSubtitle:
        "Ako radite sa više investitora, verovatno svakom danu izgubite sat na provere dostupnosti i cenovnika. PropertyDesk uklanja to vreme.",
      ctaTitle:
        "Sledeći put kada Vas kupac pita za slobodne stanove - odgovorite odmah.",
      ctaSubtitle:
        "Priključite se pilot programu za agencije. Prvih 30 dana besplatno, sa aktivnim inventarom Vaših investitora - bez integracija na Vašoj strani.",
      p1: "Nemate uvid u aktuelan cenovnik investitora - klijentu prodajete stan koji je već rezervisan.",
      s1: "Real-time katalog jedinica sa aktuelnim statusom (slobodno, rezervisano, prodato) direktno iz investitorovog PropertyDesk-a.",
      p2: "Rezervacija zahteva mail investitoru pa čekanje potvrde satima ili danima.",
      s2: "Rezervišete jedinicu jednim klikom - status se odmah zaključava, investitor dobija notifikaciju. Kupac može i sam da rezerviše preko javnog linka i plati kaparu skeniranjem IPS QR-a.",
      p3: "Kupac se izgubi između investitora i tri agencije - niko ne zna ko ga je 'doveo'.",
      s3: "Svaka agencija dobija svoj referral kod (link + QR za marketing). Svaki online zahtev sa Vašim kodom se automatski atribuira Vama, sa vidljivim referral prihodom u izveštaju.",
      p4: "Provizija se dogovara mailom, računa u Excelu, isplaćuje sa zakašnjenjem.",
      s4: "Pravila provizije unapred definisana po projektu i jedinici; iznos se zaključava u trenutku ugovora.",
      p5: "Ne vidite kada je klijent uplatio ratu - ne znate kada da očekujete proviziju.",
      s5: "Transparentan tok od prodaje do isplate provizije - vidite status svake stavke uživo.",
      p6: "Kupci Vas zovu da pitaju za dostupnost - a Vi morate da zovete investitora da proverite.",
      s6: "Direktan pristup katalogu - odgovarate klijentu u realnom vremenu i zakazujete termin obilaska. Javni sajt projekta možete deliti kupcu jednim linkom.",
    },
    newBuild: {
      metaTitle: "Softver za prodaju novogradnje u Srbiji",
      metaDescription:
        "Prodaja stanova u fazi izgradnje uključuje projekte, cenovnike, rezervacije, ugovore, planove otplate i provizije agencija. PropertyDesk povezuje sve učesnike - investitora, prodajni tim, agencije, kupce - u jednom sistemu na srpskom.",
      eyebrow: "Prodaja novogradnje",
      title: "Kompletan operativni sistem za prodaju stanova u novogradnji",
      subtitle:
        "Od projekta i cenovnika, preko rezervacija i ugovora, do uplata i provizija - PropertyDesk pokriva ceo tok prodaje novogradnje u Srbiji. Sve na srpskom, sa IPS QR za kaparu i fakture.",
      gridTitle: "Zašto Excel i Google Sheets ne rade za novogradnju",
      gridSubtitle:
        "Prodaja u fazi izgradnje ima kompleksne, vremenski razvučene tokove koje generički alati ne razumeju. PropertyDesk je pravljen za tačno taj scenario.",
      p1: "Prodaja u fazi izgradnje traje mesecima ili godinama - podaci se razbacaju po više alata.",
      s1: "Jedan sistem koji prati kupca od prve rezervacije do poslednje rate - sa vremenskom linijom svakog događaja.",
      p2: "Predugovor, ugovor, aneksi i storniranje - svaki dokument u zasebnom folderu na disku.",
      s2: "Centralno skladište dokumenata vezano za konkretnu prodaju, sa audit tragom svake promene.",
      p3: "Različiti planovi otplate za različite kupce - lako se pogreši u ratama i valuti.",
      s3: "Prilagođeni planovi rata sa validacijom, konverzija EUR/RSD i IPS QR kod za uplatu.",
      p4: "Uplate iz banke stižu na različite načine - teško ih je uparivati sa ratama.",
      s4: "Automatska FIFO alokacija na najstarije otvorene rate, ručna realokacija po potrebi.",
    },
    crm: {
      metaTitle: "CRM za investitore u novogradnju",
      metaDescription:
        "HubSpot, Pipedrive i Salesforce nisu pravljeni za prodaju novogradnje. PropertyDesk je namenski CRM za investitore - povezuje kupca sa konkretnom jedinicom, ratom, ugovorom i agencijom - bez pretvaranja stanova u 'deal-ove'.",
      eyebrow: "CRM za novogradnju",
      title: "CRM koji razume da prodajete stanove, ne 'deal-ove'",
      subtitle:
        "PropertyDesk je namenski CRM za investitore - modeluje projekat, jedinicu, kupca, rezervaciju i prodaju kao prvorazredne entitete. Bez custom polja, bez izmišljanja tokova, bez integratora.",
      gridTitle: "Zašto generički CRM ne radi za investitore u novogradnju",
      gridSubtitle:
        "Ako ste probali HubSpot, Pipedrive ili Salesforce, prepoznajete ove probleme. PropertyDesk polazi od domene novogradnje - CRM je jedan sloj u sistemu, ne cela priča.",
      p1: "Generički CRM (HubSpot, Pipedrive) tretira stan kao apstraktan 'deal' bez veze sa jedinicom u projektu.",
      s1: "Kupac je vezan za konkretnu jedinicu, plan otplate, ugovor i agenciju - jedan klik do cele istorije.",
      p2: "Nema koncepta rezervacije, storniranja ili aneksa - morate to sami da modelujete kroz custom polja.",
      s2: "Rezervacije, storniranja, aneksi i planovi rata su ugrađeni tokovi - ne prilagođavate CRM njima.",
      p3: "Automatizacije rade na apstraktne 'stage-ove', ne na realne događaje (istek rezervacije, dospele rate).",
      s3: "Automatski podsetnici za dospele rate, istek rezervacije, obavezne dokumente - iz kutije.",
      p4: "Partnerske agencije nemaju svoj portal - morate im slati Excel svakog dana.",
      s4: "Svaka agencija ima svoj login sa pravima videti samo ono što joj Vi dopustite - stanovi, cene, provizije.",
    },
    excel: {
      metaTitle: "Alternativa Excelu za prodaju novogradnje",
      metaDescription:
        "Ako Vaš prodajni tim još uvek vodi projekte u Excel tabelama, ovo je Vaš prvi korak dalje. PropertyDesk uvozi Vaš postojeći Excel i pretvara ga u kolaborativan sistem sa istorijom, pravima pristupa i real-time statusima jedinica.",
      eyebrow: "Alternativa Excelu",
      title: "Iz Excela u sistem koji ne puca kad tim raste",
      subtitle:
        "PropertyDesk uvozi Vaše postojeće cenovnike i liste jedinica, dodaje slojeve prava pristupa, istorije i notifikacija - i daje Vam sistem u kojem svaki član tima vidi tačno ono što treba, u realnom vremenu.",
      gridTitle: "5 razloga zbog kojih Excel počinje da Vas usporava",
      gridSubtitle:
        "Excel je odličan za pojedinca. Za tim od 5 ljudi koji istovremeno vode 300 jedinica - postaje uzrok grešaka. Ovo su najčešće tačke bola.",
      ctaTitle: "Pošaljite nam Vašu Excel tabelu - postavimo Vam sistem besplatno",
      ctaSubtitle:
        "Prijave do 01.09.2026. dobijaju besplatan uvoz prve Excel tabele i besplatno podešavanje jednog projekta. Prvih 30 dana korišćenja bez plaćanja.",
      p1: "Excel se otvara u više verzija - kolega prepisuje ćeliju bez znanja da ste Vi već upisali novi status.",
      s1: "Jedna baza podataka, svako radi u istom trenutku, sa audit tragom ko je i kada promenio šta.",
      p2: "Formule pucaju - jedan pogrešan copy-paste briše polovinu izračuna cena.",
      s2: "Poslovna pravila su ugrađena u sistem, ne u formule - ne mogu se slučajno obrisati.",
      p3: "Nema koncepta prava pristupa - ceo tim vidi sve, ili niko ne vidi ništa.",
      s3: "Uloge (direktor, prodavac, agent, kontrolor) sa preciznim pravima po projektu i akciji.",
      p4: "Excel ne šalje podsetnike - dospele rate ostaju neprijavljene mesecima.",
      s4: "Automatski email podsetnici za kupce i notifikacije za prodajni tim - bez ručnog praćenja kalendara.",
      p5: "Prelazak na novi alat obično znači ručno ukucavanje 1.000+ jedinica.",
      s5: "Besplatan uvoz Vaše prve Excel tabele - mi radimo mapiranje, vi samo pošaljete fajl.",
    },
    reservations: {
      metaTitle: "Rezervacije i uplate za novogradnju",
      metaDescription:
        "Jedna aktivna rezervacija po jedinici, automatski istek, konverzija u prodaju u par klikova. Uplate se FIFO alociraju na najstarije otvorene rate uz podršku za EUR/RSD i IPS QR - bez ručnog uparivanja bankovnih izvoda.",
      eyebrow: "Rezervacije i uplate",
      title: "Rezervacije bez duplih zaključavanja, uplate bez ručnog uparivanja",
      subtitle:
        "PropertyDesk štiti tok od prve rezervacije do poslednje rate - jasan status svake jedinice, automatska alokacija uplata, srpski standardi (EUR/RSD, IPS QR) iz kutije.",
      gridTitle: "Gde se najčešće gubi novac u prodaji novogradnje",
      gridSubtitle:
        "Rezervacije koje se zaborave, uplate koje se ne poklope, kupci koji zakasne bez podsetnika - svaki od ovih scenarija je meseca prihoda.",
      p1: "Rezervacije se dogovaraju preko Vibera - ne znate ko je prvi rezervisao istu jedinicu.",
      s1: "Sistem forsira jednu aktivnu rezervaciju po jedinici - dupla rezervacija je fizički nemoguća.",
      p2: "Zaboravite da rezervacija ističe - stan je 'blokiran' mesec dana bez akcije.",
      s2: "Automatski istek rezervacije + email podsetnici pre isteka - tim vidi realno slobodne jedinice.",
      p3: "Uplate stižu u različitim valutama i preko različitih računa - ručno uparivanje traje danima.",
      s3: "FIFO alokacija na otvorene rate, konverzija EUR/RSD po dnevnom kursu, uvoz bankovnih izvoda.",
      p4: "Jedna uplata se deli na više prodaja (ili jedan kupac ima više stanova) - kako to rasporediti?",
      s4: "Deljenje uplate na više prodaja, ručna realokacija, potpuna transparentnost istorije uplate.",
      p5: "Za srpske kupce potreban je IPS QR - a strane platforme to ne podržavaju.",
      s5: "Ugrađen IPS QR na profakturama i kaparama. Automatsko slanje u SEF je u pripremi — do tada status pratite preko SEF portala.",
    },
    commissions: {
      metaTitle: "Automatske provizije agencija za nekretnine",
      metaDescription:
        "Pravila po projektu, jedinici i agenciji. Snapshot iznosa provizije u trenutku ugovora - bez kasnijih izmena i nesporazuma. Jasan tok od izračunavanja do isplate, sa portalom za svaku partnersku agenciju.",
      eyebrow: "Provizije agencija",
      title: "Provizije koje se same računaju i same isplaćuju",
      subtitle:
        "Definišete pravila jednom - PropertyDesk primenjuje ih na svaku novu prodaju, čuva snapshot u trenutku ugovora i vodi agenciju kroz jasan tok od izračunavanja do isplate. Bez tabela i bez trvenja.",
      gridTitle: "4 klasična problema koja gube saradnje sa agencijama",
      gridSubtitle:
        "Ako ste ikad imali neispravnu isplatu provizije ili spor sa agencijom, verovatno je uzrok bio jedan od ovih. PropertyDesk uklanja sve četiri.",
      p1: "Različiti procenti provizije po projektu, agenciji ili tipu jedinice - ručno računanje ne skalira.",
      s1: "Pravila su definisana u sistemu: po projektu, jedinici i konkretnoj agenciji. Sistem računa iznos automatski.",
      p2: "Investitor kasnije menja proviziju - agencija se buni. Sud, tužba, prekid saradnje.",
      s2: "Snapshot iznosa provizije se zaključava u trenutku ugovora. Kasnije izmene pravila ne utiču na već ugovorene prodaje.",
      p3: "Isplata kasni jer se čeka Excel od finansija, verifikacija od direktora, ponovna verifikacija od agencije.",
      s3: "Portal agencije prikazuje realan status svake stavke - ugovorena, aktivna, dospela za isplatu, isplaćena.",
      p4: "Agencija ne vidi kada je kupac uplatio - ne zna kada da očekuje proviziju.",
      s4: "Agencija vidi status uplata svojih prodaja u realnom vremenu - bez pozivanja investitora.",
    },
  },

  public: {
    projectUnavailable: "Projekat nije dostupan",
    offerUnavailable: "Ponuda nije dostupna",
    availableUnitsMeta: "{{count}} dostupnih jedinica u projektu {{name}}.",
    aboutProject: "O projektu",
    aboutUnit: "O jedinici",
    contactInvestor: "Kontaktirajte investitora za više informacija o projektu.",
    location: "Lokacija",
    availableUnits: "Dostupne jedinice",
    noUnits: "Trenutno nema slobodnih jedinica.",
    noImage: "Nema slike",
    rooms: "{{count}} sobe",
    bathrooms: "{{count}} kupatila",
    features: "Karakteristike",
    type: "Tip",
    structure: "Struktura",
    totalArea: "Ukupna površina",
    netArea: "Neto",
    terrace: "Terasa",
    garden: "Bašta",
    bedrooms: "Spavaće",
    bathroomsLabel: "Kupatila",
    orientation: "Orijentacija",
    contact: "Kontakt",
    areaM2: "{{value}} m²",
    footerPrivate:
      "Ova ponuda je privatna. Iznos i dostupnost mogu se promeniti bez najave.",
    emDash: "—",
    referralCatalogTitle: "Ponuda projekata",
    referralCatalogVia: "Preporuka agencije {{agency}}",
    referralCatalogEmpty: "Trenutno nema javnih projekata za ovaj link.",
    referralUnavailable: "Ovaj referral link više nije važeći.",
    viewProject: "Pogledaj jedinice →",
    poweredBy: "Powered by {{name}}",
    copyright: "© {{year}} {{name}}",
    filterSearch: "Pretraga",
    filterSearchHint: "Oznaka jedinice",
    filterArea: "Kvadratura (m²)",
    filterPrice: "Cena",
    filterMin: "od",
    filterMax: "do",
    filterReset: "Poništi filtere",
    filterEmpty: "Nema jedinica za izabrane filtere.",
    pagination: "Stranice",
    pageOf: "Strana {{page}} / {{total}}",
  },

  site: {
    title: "{{name}} - Operativni sistem za prodaju novogradnje",
    description:
      "PropertyDesk je multi-tenant SaaS platforma za investitore u nekretnine i partnerske agencije. Projekti, jedinice, kupci, rezervacije, prodaje, plan otplate, uplate, provizije, dokumenti i izveštaji — sa IPS QR za kaparu i fakture.",
    ogDescription:
      "Multi-tenant platforma za investitore i partnerske agencije. Od projekta i zaliha, preko rezervacija i ugovora, do uplata i provizija.",
    twitterDescription:
      "Multi-tenant platforma za investitore i partnerske agencije, sa IPS QR za kaparu i fakture.",
    keywords:
      "PropertyDesk,softver za investitore u nekretnine,CRM za nekretnine,prodaja novogradnje,upravljanje projektima nekretnina,rezervacije stanova,plan otplate,provizije agencija,IPS QR,Srbija",
  },
} as const;

export const marketingEn: Leaves<typeof marketingSr> = {
  charts: {
    count: "Count",
    distribution: "Distribution",
  },

  nav: {
    features: "Features",
    personas: "Who it's for",
    roadmap: "Coming soon",
    roadmapLong: "Coming soon (roadmap)",
    pricing: "Pricing",
    faq: "FAQ",
    faqLong: "FAQ",
    product: "Product",
    solutions: "Solutions",
    contact: "Contact",
    app: "App",
    investors: "For investors",
    agencies: "For agencies",
    newBuild: "New-build sales",
    crm: "CRM for investors",
    excel: "Excel alternative",
    reservations: "Reservations and payments",
    commissions: "Agency commissions",
    bookDemo: "Book a demo",
    about: "About",
    help: "Help",
    privacy: "Privacy",
    terms: "Terms",
    imprint: "Legal notice",
    company: "Company",
  },

  header: {
    homeAria: "{{name}} — home",
    signInSoonTitle: "Sign-in will be available after launch on 01.09.2026.",
    bookDemo: "Book a demo",
  },

  footer: {
    blurb:
      "The operating system for new-build sales — projects, buyers, reservations, payments and agency commissions in one place.",
    bookDemo: "Book a 25-minute demo",
    signIn: "Sign in",
    launchDate: "Official launch: 01.09.2026.",
    rights: "All rights reserved.",
    madeFor: "Built for the Serbian market · sr-Latn · EUR / RSD",
    poweredBy: "Powered by",
    poweredByAria: "Powered by CraftedPixel",
    privacy: "Privacy",
    terms: "Terms",
    imprint: "Legal notice",
    about: "About",
    help: "Help",
    cookies: "Cookies",
    legal: "Legal",
  },

  cookies: {
    title: "Cookies on this site",
    body:
      "Necessary cookies store your language. We load Google Analytics only if you accept. You can change this at any time.",
    accept: "Accept",
    reject: "Necessary only",
    privacyLink: "Privacy policy",
  },

  legal: {
    privacyTitle: "Privacy policy",
    privacyDescription:
      "What PropertyDesk collects on the site and in the app, why we use it, and what rights you have.",
    termsTitle: "Terms of use",
    termsDescription:
      "Terms for the demo, early access, trial and PropertyDesk subscription. No lock-in — cancel at any time.",
    imprintTitle: "Legal notice",
    imprintDescription:
      "Who stands behind PropertyDesk: operator CraftedPixel, contact hello@propertydesk.app.",
  },

  about: {
    eyebrow: "About",
    metaTitle: "About us",
    metaDescription:
      "PropertyDesk is built by CraftedPixel. Software for investors and agencies selling new builds in Serbia. Contact: hello@propertydesk.app.",
    title: "We are building the tool that replaces Excel and Viber in new-build sales.",
    lead:
      "PropertyDesk is a CraftedPixel product. We are not a foreign CRM adapted for Serbia — the system was built from the start for the local flow: reservation, deposit, contract, installments, commission.",
    whoTitle: "Who we are",
    whoBody:
      "Behind the product are Marko Banović and CraftedPixel, a software company in Serbia. We work with investors and agencies that still run inventory in Excel and reservations in Viber groups. PropertyDesk is the answer to those same problems.",
    whyTitle: "Why now",
    whyBody:
      "Official launch is 01.09.2026. Until then we work with a small number of pilot partners: demo, then a trial on your data, then onboarding. We do not open self-serve sign-up before launch.",
    contactTitle: "Contact",
    contactBody:
      "For demo, early access and product questions write to the business address. We reply within 2 business days.",
  },

  help: {
    eyebrow: "Help",
    metaTitle: "Help and what works today",
    metaDescription:
      "What PropertyDesk does today, what comes after launch, and a detailed operator guide.",
    title: "What works today, and what is not live yet",
    lead:
      "Before a demo or an application, here is an honest picture of what to expect. The detailed guide for every module is in the Help Center.",
    worksTitle: "In use",
    works1: "Projects, units, prices, Excel import and a PDF price list.",
    works2: "Buyer CRM with a KYC checklist and buyer protection.",
    works3: "Reservations (internal and public with an IPS QR deposit) and conversion to a sale.",
    works4: "Payment plans, payments, bank-statement import and FIFO allocation.",
    works5: "HTML templates for contracts and pre-contracts as PDF.",
    works6: "Agency commissions, a public project site and reports.",
    laterTitle: "Not automatic yet",
    laterIntro:
      "These are on the roadmap or done manually. We do not claim they are finished.",
    later1:
      "Automatic invoice submission to SEF — the architecture exists, the real transport is not enabled. Until then you track status via the SEF portal.",
    later2: "Floor-plan polygon editor — the floor image viewer exists, drawing units does not.",
    later3: "Electronic contract signing with legal effect in Serbia.",
    later4: "WordPress plugin, on-site AI assistant and an investor–agency marketplace.",
    guideTitle: "Detailed guide",
    guideBody:
      "The Help Center covers sign-in, projects, reservations, KYC, agencies and FAQ — including current limitations.",
    guideCta: "Open Help Center",
  },

  common: {
    bookDemo: "Book a 25-minute demo",
    bookDemoShort: "Book a demo",
    watchVideo: "Watch the 3-minute demo",
    noObligation: "No obligation. Book straight from the calendar, no waiting.",
    callUs: "Call us",
    callUsPhone: "Call us: +381 65 43 63 142",
    earlyAccess: "Early access",
    comingSoon: "Coming soon",
    problem: "Problem",
  },

  hero: {
    launchBadge: "Launch {{date}}",
    earlyAccessBadge: "Early access: 30 days free + 50% off the next 3 months",
    title: "The operating system for new-build sales.",
    subtitle:
      "One platform for investors and partner agencies — from projects and inventory, through reservations and contracts, to payments and commissions. Built for Serbia, with IPS QR for deposits and invoices.",
    bookDemo: "Book a 25-minute demo",
    watchVideo: "Watch the 3-minute demo",
    noObligation: "No obligation. Book straight from the calendar, no waiting.",
    countdownLabel: "Until official launch",
    mockupAlt:
      "PropertyDesk dashboard with projects, units, reservations and payments",
  },

  countdown: {
    days: "days",
    hours: "hours",
    minutes: "minutes",
    seconds: "seconds",
    aria: "Countdown to the official PropertyDesk launch",
  },

  mockup: {
    comingSoon: "Preview coming soon",
    mobileAlt: "PropertyDesk mobile view",
    desktopAlt: "PropertyDesk dashboard",
    mobileAria: "PropertyDesk mobile interface preview - {{label}}",
    desktopAria: "PropertyDesk desktop interface preview - {{label}}",
    desktopHint:
      "A dashboard preview with projects, sales and payments will appear here.",
  },

  video: {
    eyebrow: "Product video - 3 minutes",
    title: "See what running a project looks like in real time",
    subtitle:
      "From the project and unit statuses, through reservation and sale, to payment, the partner agency portal and the director's reports — all in one short walkthrough.",
    regionAria: "PropertyDesk product video",
    iframeTitle: "PropertyDesk product video",
    playAria: "Play the PropertyDesk product video",
    unsupported: "Your browser does not support HTML5 video.",
    placeholderTitle: "Product video coming soon",
    placeholderBody:
      "We are preparing a short product overview. Until then, the fastest way to see PropertyDesk live is a 25-minute personalised demo.",
    bookLive: "Book a live demo",
  },

  offer: {
    title: "What you get by applying for early access",
    trialTitle: "First 30 days free",
    trialBody:
      "Full access to every plan feature with no payment obligation — test it on your projects and data.",
    discountTitle: "50% off the next 3 months",
    discountBody:
      "After the trial, the next three months are half the price of the selected plan. The discount applies automatically.",
    lockTitle: "Price locked for 12 months",
    lockBody:
      "Your plan price does not change for a year — no surprises or increases in the first year.",
  },

  features: {
    eyebrow: "Features",
    title: "Everything you need to sell new builds — in one platform",
    subtitle:
      "No Excel, no Viber groups, no ad-hoc deals. Every step of the sales flow — from adding a unit to paying a commission — is recorded, controlled and tracked.",
    items: {
      projects: {
        title: "Projects and inventory",
        description:
          "Full hierarchy: building → entrance → floor → unit. Statuses, prices, change history, Excel import, one-click project clone and a PDF price list.",
      },
      crm: {
        title: "Buyer CRM with KYC",
        description:
          "Individuals and companies, including foreigners. National ID / company number, document checklist, contract blocked until KYC is complete. Duplicate detection and GDPR anonymisation.",
      },
      reservations: {
        title: "Reservations and Kanban pipeline",
        description:
          "One active reservation per unit, automatic expiry, a Kanban board by sales stage, conversion to a sale in a few clicks.",
      },
      qr: {
        title: "Online reservation with IPS QR deposit",
        description:
          "A public link for a unit or the whole project (microsite). The buyer fills in the form, gets a valid IPS QR for the deposit — you only confirm receipt.",
      },
      sales: {
        title: "Sales and payment plans",
        description:
          "Contracting, pre-contracts, custom installment plans with validation, manual installments, VAT mode (10% or 2.5%), cancellation with an audit trail.",
      },
      contracts: {
        title: "Contract and pre-contract generator",
        description:
          "Templates with placeholders for every sale field — the contract is generated as a PDF in seconds, with status (sent / signed) and a full audit trail.",
      },
      payments: {
        title: "Payments with FIFO allocation",
        description:
          "Automatic allocation to the oldest open installments, manual reallocation, splitting one payment across sales, bank statement import.",
      },
      commissions: {
        title: "Commissions and agency referrals",
        description:
          "Rules per project, unit and connection. A referral code per agency (QR + marketing link), amount snapshot at contract time, a clear path to payout.",
      },
      documents: {
        title: "Documents, galleries and floor plans",
        description:
          "Unit and project photo galleries, a floor plan with clickable units, buyer KYC documents, sale documentation — shared via share links.",
      },
      microsite: {
        title: "Public project site (microsite)",
        description:
          "Flip a switch and the project gets a public site on your slug with available units, a map and a gallery — no extra website needed.",
      },
      reports: {
        title: "Reports with charts",
        description:
          "Sales, inventory, payments, buyers, agencies, margin per project, 12-month cash-flow projection, time to sale — with filters and CSV/XLSX export.",
      },
      cashflow: {
        title: "Cash-flow and P&L per project",
        description:
          "12-month inflow projection, land / construction / marketing cost per project and net margin — the dashboard an investor checks before coffee.",
      },
      automation: {
        title: "Automation, reminders and @mentions",
        description:
          "Email reminders for due installments, in-app notifications, comments with @mentions on buyers and sales — no manual chasing or Viber groups.",
      },
    },
  },

  proof: {
    eyebrow: "Who is behind the product",
    title: "Built with investors and agents",
    subtitle:
      "We build PropertyDesk with people who sell new builds every day — investors running several projects at once and agencies that need live inventory at all times.",
    pilots: "Pilot partners",
    pilotsHint:
      "We are looking for 3–5 investors and agencies as pilots before 01.09.2026. A logo goes here when we start working together — we do not show invented references.",
    yourLogo: "Pilot slot",
    pilotsCta: "Apply for a pilot",
    investor: "Investor",
    agency: "Agency",
    slotAria: "Pilot partner logo slot",
    founder: "Founder",
    founderBio:
      "I lead PropertyDesk development. In recent years I have worked closely with investors and agencies selling new builds — this product answers the same problems I kept seeing (Excel without versions, Viber groups for reservations, commissions calculated by hand).",
    behind: "Behind the product",
    companyBio:
      "PropertyDesk is built by CraftedPixel — a software company from Serbia focused on products that solve concrete operational problems in B2B.",
    dataEu: "Data in the EU region",
    encryption: "Encryption in transit and at rest",
    audit: "Permanent audit log",
  },

  personas: {
    eyebrow: "Who it's for",
    title: "Two sides, one platform",
    subtitle:
      "PropertyDesk is designed for two-way collaboration between investors and agencies. Each side gets its own portal and exactly the data it needs — nothing more, nothing less.",
    investorEyebrow: "For investors",
    investorTitle: "New-build sales under full control",
    investorDescription:
      "Run your sales team, projects and inventory. Control which agencies see the offer, on what terms and at what commission.",
    investor1:
      "Inventory of apartments, garages and commercial units across projects (Excel import, project clone)",
    investor2:
      "CRM with KYC (national ID, company number), duplicate detection and @mention comments",
    investor3: "Online reservation with an IPS QR deposit — the buyer pays by scanning",
    investor4: "Contract and pre-contract PDF generator with every placeholder",
    investor5: "12-month cash-flow projection, margin per project and time to sale",
    investor6: "Public project site (microsite) with a map and available units",
    investor7: "Access control and commissions for partner agencies",
    agencyEyebrow: "For real-estate agencies",
    agencyTitle: "Everything you need to work with investors",
    agencyDescription:
      "No Excel chaos and Viber groups. See exactly what is free, protect the buyer and track the commission through to payout.",
    agency1: "Assigned projects and available units at a glance",
    agency2: "Referral code with a unique link and QR for marketing",
    agency3: "Buyer registration and protection",
    agency4: "Reservations directly from the investor offer, with a KYC checklist",
    agency5: "Commission tracking from approval to payout, including referral bonuses",
    agency6: "A separate agent team and roles with permissions",
    agency7: "No more lost contacts and confusion with investors",
    mobileAlt: "PropertyDesk mobile app for field work",
    mobileLabel: "PWA for the field — coming soon",
  },

  serbia: {
    eyebrow: "Built for Serbia",
    title: "Legal fit and local standards from day one",
    subtitle:
      "We are not adapting foreign software to the Serbian market — PropertyDesk was built here, for this business context.",
    languageTitle: "Serbian language and format",
    languageBody:
      "The full interface, emails, PDF output and validation — in Serbian (sr-Latn). Date, address and phone formats follow the local standard.",
    currencyTitle: "EUR and RSD",
    currencyBody:
      "Built-in support for both currencies. Automatic conversion at the NBS mid rate on the invoice issue date for the dinar equivalent.",
    qrTitle: "IPS QR for deposits and invoices",
    qrBody:
      "A valid IPS QR aligned with the NBS specification — on SaaS invoices and on online reservations with a deposit. The buyer pays by scanning, with no manual payment reference.",
    sefTitle: "SEF in preparation",
    sefBody:
      "The architecture for Serbia’s electronic invoicing system is ready. Automatic submission is not enabled yet — until then you track e-invoice status manually via the SEF portal.",
    kycTitle: "KYC for buyers (individuals and companies)",
    kycBody:
      "National ID, ID card number, company number, address — with a checklist (ID, proof of address, tax certificate for companies). Contract is blocked until KYC is complete.",
    vatTitle: "VAT mode: new build and secondary market",
    vatBody:
      "Automatic 10% VAT for new builds or 2.5% transfer tax for the secondary market — stored on every sale and carried into the PDF contract.",
    contractsTitle: "Contracts and pre-contracts as PDF",
    contractsBody:
      "Templates with placeholders ({{buyer.jmbg}}, {{sale.finalPrice}}, {{plan.installments}}) — generated in a few clicks, with an audit trail for status (sent, signed).",
    importTitle: "Bank statement and price-list import",
    importBody:
      "A CSV/XLSX bank statement is matched by payment reference and amount. Unit import from Excel: a 3-step wizard with column mapping and a preview before save.",
  },

  demo: {
    eyebrow: "Demo and onboarding",
    title: "A short demo, then a real trial — onboarding only after you decide to try it",
    subtitle:
      "Your time is the most expensive resource. First we show the system in 25 minutes on your examples — no marketing slides. If it makes sense, we activate a trial account and schedule practical onboarding with the team after that.",
    step1Title: "Book a demo from the calendar",
    step1Body:
      "Pick a free slot from our calendar directly — no waiting and no email ping-pong. You get a confirmation and an email reminder.",
    step2Title: "25-minute personalised demo",
    step2Body:
      "A short video call where we walk through the key flows on your examples: projects, unit statuses, reservations, sales and payments.",
    step3Title: "30-day free trial",
    step3Body:
      "If you like it, we activate a trial account with every feature. No card, no obligation — a test on your real data.",
    step4Title: "60-minute team onboarding",
    step4Body:
      "After the trial is activated we schedule a practical onboarding with your sales team — through concrete best practices and real scenarios.",
  },

  booking: {
    eyebrow: "Direct booking",
    title: "Book a 25-minute demo",
    subtitle:
      "Pick a time that works for you. You get a confirmation and an email reminder, with a video-call link.",
    iframeTitle: "Book a demo slot",
    liveSlots: "Real-time availability",
    emailConfirm: "Email confirmation and reminder",
    videoLink: "Video-call link in the invite",
    orCall: "Or call us:",
    shareTitle: "Pick a time in Google Calendar",
    shareBody:
      "The official booking page opens with real free slots. You get an email confirmation and reminder, with a Google Meet link for the video call.",
    openCalendar: "Open the calendar and book",
    newTab: "Opens in a new tab (calendar.app.google)",
    fallbackTitle: "Direct booking coming soon",
    fallbackBody:
      "The booking calendar is being activated. Until then, leave your contact via the form and we will come back with free slots the same business day.",
    leaveContact: "Leave your contact",
  },

  bonuses: {
    until: "All applications until 01.09.2026.",
    title: "Exactly what you get by applying before launch",
    leadStrong: "First 30 days free. Then 50% off the next three months.",
    leadRest:
      "On top of that you get a bonus pack that removes the whole first-setup and team-rollout burden — at no extra charge.",
    trialTitle: "First 30 days free",
    trialBody: "Full plan access with no payment obligation, on your real data.",
    discountTitle: "50% off the next 3 months",
    discountBody: "Half the selected plan price for three months after the trial ends.",
    excelTitle: "Free import of the first Excel file",
    excelBody: "Your existing price list / unit list is loaded into the system for you.",
    setupTitle: "Free setup of one project",
    setupBody:
      "We model your project structure together (buildings, entrances, floors, units).",
    onboardingTitle: "Onboarding for the whole team",
    onboardingBody:
      "A 60-minute session where your sales team walks through the system with us.",
    supportTitle: "Priority support",
    supportBody:
      "A reply to your tickets the same business day — direct communication with the team.",
    lockTitle: "Plan price locked for 12 months",
    lockBody: "The price does not change for a year — no increase during the first year.",
    footnote:
      "The early offer applies to everyone who books a demo or applies via the form by 01.09.2026. After launch, standard pricing applies.",
  },

  pricing: {
    eyebrow: "Pricing",
    title: "Simple, transparent, no hidden costs",
    subtitle:
      "All prices are monthly. Quarterly, semi-annual and annual billing is also available in the app. No binding contracts — cancel in one click.",
    earlyBird:
      "Early access: 30 days free + 50% off the next 3 months (for applications until 01.09.2026.)",
    popular: "Most popular",
    monthly: "/ month",
    footnote:
      "First 30 days free. Then 50% off the next three months. Plan price locked for 12 months.",
    starterName: "Starter",
    starterDescription: "For smaller projects and individual investors.",
    starter1: "Up to 3 projects",
    starter2: "Up to 250 units",
    starter3: "Up to 10 team members",
    starter4: "Up to 5 connected agencies",
    growthName: "Growth",
    growthDescription: "For professional investors in expansion.",
    growth1: "Up to 10 projects",
    growth2: "Up to 1,000 units",
    growth3: "Up to 30 team members",
    growth4: "Up to 25 connected agencies",
    scaleName: "Scale",
    scaleDescription: "Unlimited for large investors.",
    scale1: "Unlimited projects",
    scale2: "Unlimited units",
    scale3: "Unlimited team",
    scale4: "Priority support",
  },

  roadmap: {
    eyebrow: "What's next",
    title: "Roadmap after launch",
    subtitle:
      "PropertyDesk 1.0 already covers the full sales flow from project to commission. These are the next steps — early subscribers get them as soon as they ship, at no extra cost.",
    wpTitle: "WordPress plugin",
    wpBody: "Auto-sync of projects, units and prices with the website — no manual upkeep.",
    aiTitle: "AI assistant for websites",
    aiBody:
      "A chat widget as a single <script> tag — answers questions about your units 24/7.",
    qualifyTitle: "Automatic lead qualification",
    qualifyBody:
      "AI reads the buyer request and suggests the 3 best units from your inventory.",
    leadsTitle: "Lead integrations",
    leadsBody:
      "Meta and Google forms, WhatsApp / Viber inbox, email drip — all in the same pipeline.",
    signTitle: "Electronic signature",
    signBody:
      "Pre-contracts and contracts online, with a timestamp and legal force in Serbia.",
    marketTitle: "Investor–agency marketplace",
    marketBody:
      "The first slice is live: free agency signup, an opt-in teaser catalogue, and a connection request. Full inventory still opens only after a connection.",
  },

  faq: {
    eyebrow: "FAQ",
    title: "Answers before you ask",
    q1: "When does PropertyDesk launch?",
    a1: "The official launch is 01.09.2026. Until then early applications are open — everyone who applies via the form on this page is notified before the public release.",
    q2: "How does the early offer work for applications until 01.09.2026?",
    a2: "The first 30 days are free. Then 50% off the next three months. Plus: free import of the first Excel file, free setup of one project, team onboarding, priority support and a locked plan price for 12 months — no increase during the first year.",
    q3: "What does the demo look like and how long is it?",
    a3: "A personalised demo lasts 20–30 minutes (video call, booked directly from the site calendar, no waiting). If you then decide to try PropertyDesk, you get a 30-day free trial. Team onboarding (60 min) is scheduled after the trial account is activated — using concrete examples from your business.",
    q4: "Is the platform in Serbian?",
    a4: "Yes. The full interface, messages, PDF output and email notifications are in Serbian (Latin script). EUR and RSD, Serbian date format and IPS QR on invoices and deposits are built in. Automatic SEF submission is in preparation.",
    q5: "Who is PropertyDesk for?",
    a5: "For investors selling new builds (apartments, garages, commercial space) directly or through partner agencies, and for the agencies that work with those investors. Each side gets its own portal with clearly defined rights.",
    q6: "How does online reservation with a deposit work?",
    a6: "Each unit gets a public share link (no login). The buyer opens the link, fills in name / email / phone and the deposit amount and gets a valid IPS QR code. As the investor you see new requests in '/rezervacije/zahtevi', confirm the deposit when it lands — and the request converts into a real reservation with a 48h hold.",
    q7: "Can I generate a contract and pre-contract from the system?",
    a7: "Yes. In 'Administration → Contract templates' you store an HTML template with placeholders ({{buyer.fullName}}, {{buyer.jmbg}}, {{sale.finalPrice}}, {{plan.installments}}, {{tax.mode}}, {{investor.pib}}). On each sale you pick a template and generate a PDF in seconds — with a full audit trail (sent, signed).",
    q8: "Do you support the 10% new-build VAT mode and 2.5% secondary market?",
    a8: "Yes. On each sale you choose the mode (NEW_BUILD_10 / SECONDARY_MARKET_2_5 / NONE) and the platform calculates tax from the contracted price. The figure is carried into the PDF contract and into reports.",
    q9: "Can I cancel the subscription at any time?",
    a9: "Yes. The subscription is cancelled in one click from the app, with no contractual lock-in. Your data stays available for export for another 30 days after cancellation.",
    q10: "How is data stored?",
    a10: "All data is stored in the EU region, encrypted in transit and at rest. Every change is recorded in a permanent audit log. Access is strictly limited by organisation (multi-tenant isolation) and by user role. Database backups are verified automatically every week — operators get an email warning on the second consecutive fail.",
  },

  lead: {
    eyebrow: "Early access",
    title: "Apply for early access and free training",
    subtitleBefore:
      "Leave your contact — we reply within 2 business days to arrange a demo and a one-hour training. Applicants automatically get",
    subtitleStrong: "50% off the first 3 months",
    subtitleAfter: "after launch on 01.09.2026.",
    perk1: "No obligation — until you decide otherwise.",
    perk2: "Data stays in the EU and is deleted on your request.",
    perk3:
      "The training is independent of the app — it still helps if you choose another platform.",
    successTitle: "Thank you for applying!",
    successBody:
      "We will get back within 2 business days to arrange a demo and training. Until then, feel free to browse the rest of the page.",
    firstName: "First name",
    lastName: "Last name",
    firstNamePh: "Marko",
    lastNamePh: "Markovic",
    emailPh: "name@company.com",
    phonePh: "+381 60 000 0000",
    company: "Company name",
    companyPh: "ACME Real Estate Ltd.",
    city: "City",
    cityPh: "Belgrade",
    who: "Who are you?",
    investor: "Investor",
    agency: "Real-estate agency",
    projectCount: "Number of projects you currently run / sell",
    select: "Select…",
    projects0: "0 — in preparation",
    projects12: "1–2 projects",
    projects35: "3–5 projects",
    projects610: "6–10 projects",
    projects10: "10+ projects",
    note: "Note",
    notePh: "Tell us briefly what you sell and what your biggest blockers are right now.",
    consent:
      "I agree that PropertyDesk may use this data only to contact me about early access, the demo and training, in line with the",
    consentPrivacy: "Privacy policy",
    consentAfter: "I can withdraw my data at any time by emailing",
    submit: "Send application",
    afterSubmit: "After you send this, we contact you within 2 business days.",
    audienceRequired: "Please indicate whether you are an investor or an agency.",
    rateLimited: "Too many attempts. Wait a minute and try again.",
    sendFailed: "Sending failed. Please try again in a moment.",
    network: "No connection to the server. Check your internet and try again.",
  },

  cta: {
    title: "You've seen what it does. Shall we meet on a demo call?",
    subtitle:
      "First 30 days free. Then 50% off the next three months. Plan price locked for 12 months — for all applications until 01.09.2026.",
  },

  landing: {
    home: "Home",
    metaHomeTitle: "{{name}} - Software for new-build sales | Investors and agencies",
    metaHomeDescription:
      "Software for investors and agencies selling new builds: projects, buyer KYC, online reservation with IPS QR deposit, PDF contract generator, payment plans, payments, commissions, agency referral codes, public project site, cash-flow projection and reports. IPS QR, VAT 10%/2.5%, EUR/RSD. Launch 01.09.2026 — applications before launch get 30 days free + 50% off the next 3 months.",
    softwareDescription:
      "A multi-tenant SaaS platform for real-estate investors and partner agencies. Projects, units, buyers, reservations, sales, payment plans, payments, commissions, documents and reports — with IPS QR for deposits and invoices.",
    ogAlt: "PropertyDesk - the operating system for new-build sales",
    ogHeadline: "The operating system for new-build sales",
    ogSub:
      "Projects, buyers, reservations, payments and agency commissions — built for Serbia, with IPS QR for deposits and invoices.",
    ogBadge: "Launch 01.09.2026 · −50% first 3 months",
  },

  pages: {
    demo: {
      metaTitle: "Book a 25-minute demo",
      metaDescription:
        "A personalised PropertyDesk demo — 25 minutes on your examples, booked straight from the calendar. No waiting, no obligation, with a video call and email confirmation. If you like it — we activate a 30-day free trial.",
      eyebrow: "Book a demo",
      title: "25 minutes live. Your examples. No slides.",
      subtitle:
        "Pick a slot below. You get a confirmation and an email reminder, with a video-call link. If after the demo you decide to try PropertyDesk — we activate a 30-day free trial.",
      scrollCalendar: "Scroll to the calendar",
      footnote: "Or call us directly: +381 65 43 63 142",
      bookingTitle: "Pick a time that works for you",
      bookingSubtitle:
        "A standard demo lasts 25 minutes on a video call. You get an email reminder with the meeting link. If a video call does not work, we can always call you.",
    },
    investors: {
      metaTitle: "Software for new-build investors",
      metaDescription:
        "PropertyDesk is the operating system for new-build investors — projects, units, reservations, sales, payments and agency commissions in one place. Replace Excel and Viber groups with a clear, real-time flow.",
      eyebrow: "For investors",
      title: "Run multiple projects without Excel, Viber and chaos",
      subtitle:
        "PropertyDesk is the central system for investors who sell both directly and through partner agencies. Projects, units, reservations, sales, payments, commissions — one platform, everything under control.",
      gridTitle: "10 things investors want software to solve",
      gridSubtitle:
        "These are the most common problems we hear from investors with 50 to 1,000 units for sale. PropertyDesk solves each of them out of the box.",
      p1: "Excel price lists branch into many versions — nobody on the team knows which one is current.",
      s1: "One price list per project, one source of truth for the whole team, with a history of every price change. A new project is created in one click (clone building / floor / unit structure) or by importing an Excel file in 3 steps.",
      p2: "Agencies reserve units over Viber — the same apartment gets double-booked.",
      s2: "One active reservation per unit, automatic expiry, real-time status visible to every agency and a Kanban pipeline from 'new' to 'contracted'.",
      p3: "The buyer wastes time typing a payment reference for the deposit, so the payment never arrives.",
      s3: "Online reservation: the buyer scans an IPS QR from the public unit link, pays the deposit, and you only confirm receipt in '/rezervacije/zahtevi' when it lands.",
      p4: "You type contracts and pre-contracts in Word, with half an hour of copy-paste per sale.",
      s4: "A contract template with placeholders ({{buyer.jmbg}}, {{sale.finalPrice}}, {{plan.installments}}, {{tax.mode}}) — the PDF is generated in seconds, with an audit trail (sent, signed).",
      p5: "Agency commissions are calculated by hand in every spreadsheet, with different rules per project.",
      s5: "Rules per project, unit and agency, with an amount snapshot at contract time — no later disputes. A referral code per agency ties online requests to the commission.",
      p6: "Payments do not match installments; you cannot see who owes, who paid and who is late.",
      s6: "Automatic FIFO allocation of payments to open installments, a clear balance per buyer and reminders for due installments. A 12-month cash-flow projection next to 'contracted / collected / outstanding'.",
      p7: "You cannot see whether a given project pays off — land and construction costs live in the accountant's head.",
      s7: "Cost tracking per project (land, construction, marketing, other) + calculated margin and P&L. Time-to-sale (P50, P90) per project from a single card.",
      p8: "You have no public site per project, and agencies send buyers from all kinds of platforms.",
      s8: "A public project site (microsite) with one switch: hero image, description, map, a grid of free units with share links — no extra website needed.",
      p9: "Director reports are built by hand every month; the data is always stale.",
      s9: "Sales, inventory, payment and agency reports with charts and filters by project and period — export to CSV/XLSX in one click.",
      p10: "Buyers lose documents (offer, pre-contract, contract); emailing them is chaotic.",
      s10: "A central document store tied to the project, unit, buyer or sale — with your brand. A KYC checklist on the buyer blocks the contract until ID, address and (for companies) the tax certificate are confirmed.",
    },
    agencies: {
      metaTitle: "PropertyDesk for real-estate agencies",
      metaDescription:
        "Real-time access to the investor's inventory, reservations in a few clicks, automatic commissions and a portal with your brand. PropertyDesk gives agencies everything they need to sell new builds — without waiting for email confirmations from the investor.",
      eyebrow: "For agencies",
      title: "Sell new builds from a catalogue that is always current",
      subtitle:
        "PropertyDesk connects your agency with the investors you work with — you see real units, statuses and prices, reserve in one click and track the commission from sale to payout.",
      gridTitle: "Why agencies struggle with new builds",
      gridSubtitle:
        "If you work with several investors, you probably lose an hour every day checking availability and price lists. PropertyDesk removes that time.",
      ctaTitle: "Next time a buyer asks about free apartments — answer immediately.",
      ctaSubtitle:
        "Join the agency pilot. First 30 days free, with your investors' live inventory — no integrations on your side.",
      p1: "You cannot see the investor's current price list — you sell the client an apartment that is already reserved.",
      s1: "A real-time unit catalogue with the current status (available, reserved, sold) straight from the investor's PropertyDesk.",
      p2: "A reservation means emailing the investor and waiting hours or days for confirmation.",
      s2: "You reserve a unit in one click — the status locks immediately and the investor is notified. The buyer can also reserve via the public link and pay the deposit by scanning an IPS QR.",
      p3: "The buyer gets lost between the investor and three agencies — nobody knows who 'brought' them.",
      s3: "Each agency gets its own referral code (link + QR for marketing). Every online request with your code is attributed to you, with visible referral revenue in the report.",
      p4: "Commission is agreed over email, calculated in Excel and paid late.",
      s4: "Commission rules are defined up front per project and unit; the amount is locked at contract time.",
      p5: "You cannot see when the client paid an installment — you do not know when to expect the commission.",
      s5: "A transparent flow from sale to commission payout — you see the status of every item live.",
      p6: "Buyers call you about availability — and you have to call the investor to check.",
      s6: "Direct catalogue access — you answer the client in real time and book a viewing. You can share the public project site with the buyer as a single link.",
    },
    newBuild: {
      metaTitle: "Software for new-build sales in Serbia",
      metaDescription:
        "Selling apartments during construction includes projects, price lists, reservations, contracts, payment plans and agency commissions. PropertyDesk connects every participant — investor, sales team, agencies, buyers — in one Serbian-language system.",
      eyebrow: "New-build sales",
      title: "A complete operating system for selling new-build apartments",
      subtitle:
        "From the project and price list, through reservations and contracts, to payments and commissions — PropertyDesk covers the full new-build sales flow in Serbia. Built for Serbia, with IPS QR for deposits and invoices.",
      gridTitle: "Why Excel and Google Sheets fail for new builds",
      gridSubtitle:
        "Sales during construction have complex, long-running flows that generic tools do not understand. PropertyDesk is built for exactly that scenario.",
      p1: "A sale during construction lasts months or years — data is scattered across many tools.",
      s1: "One system that follows the buyer from the first reservation to the last installment — with a timeline of every event.",
      p2: "Pre-contract, contract, annexes and cancellation — each document in a separate folder on disk.",
      s2: "A central document store tied to the specific sale, with an audit trail of every change.",
      p3: "Different payment plans for different buyers — easy to get installments and currency wrong.",
      s3: "Custom installment plans with validation, EUR/RSD conversion and IPS QR for payment.",
      p4: "Bank payments arrive in different ways — matching them to installments is hard.",
      s4: "Automatic FIFO allocation to the oldest open installments, with manual reallocation when needed.",
    },
    crm: {
      metaTitle: "CRM for new-build investors",
      metaDescription:
        "HubSpot, Pipedrive and Salesforce were not built for new-build sales. PropertyDesk is a purpose-built CRM for investors — it ties the buyer to a specific unit, installment, contract and agency — without turning apartments into 'deals'.",
      eyebrow: "CRM for new builds",
      title: "A CRM that understands you sell apartments, not 'deals'",
      subtitle:
        "PropertyDesk is a purpose-built CRM for investors — it models the project, unit, buyer, reservation and sale as first-class entities. No custom fields, no invented flows, no integrator.",
      gridTitle: "Why a generic CRM fails for new-build investors",
      gridSubtitle:
        "If you have tried HubSpot, Pipedrive or Salesforce, you will recognise these problems. PropertyDesk starts from the new-build domain — CRM is one layer in the system, not the whole story.",
      p1: "A generic CRM (HubSpot, Pipedrive) treats an apartment as an abstract 'deal' with no link to a unit in the project.",
      s1: "The buyer is tied to a specific unit, payment plan, contract and agency — one click to the full history.",
      p2: "There is no concept of a reservation, cancellation or annex — you have to model that yourself with custom fields.",
      s2: "Reservations, cancellations, annexes and installment plans are built-in flows — you do not adapt the CRM to them.",
      p3: "Automations run on abstract 'stages', not real events (reservation expiry, due installments).",
      s3: "Automatic reminders for due installments, reservation expiry and required documents — out of the box.",
      p4: "Partner agencies have no portal of their own — you have to send them Excel every day.",
      s4: "Each agency has its own login with rights to see only what you allow — apartments, prices, commissions.",
    },
    excel: {
      metaTitle: "An Excel alternative for new-build sales",
      metaDescription:
        "If your sales team still runs projects in Excel, this is the first step forward. PropertyDesk imports your existing Excel and turns it into a collaborative system with history, access rights and real-time unit statuses.",
      eyebrow: "Excel alternative",
      title: "From Excel to a system that does not break as the team grows",
      subtitle:
        "PropertyDesk imports your existing price lists and unit lists, adds access rights, history and notifications — and gives you a system where every team member sees exactly what they need, in real time.",
      gridTitle: "5 reasons Excel starts slowing you down",
      gridSubtitle:
        "Excel is great for one person. For a team of 5 running 300 units at once — it becomes a source of errors. These are the most common pain points.",
      ctaTitle: "Send us your Excel file — we will set the system up for free",
      ctaSubtitle:
        "Applications until 01.09.2026 get a free import of the first Excel file and free setup of one project. The first 30 days of use are unpaid.",
      p1: "Excel opens in several versions — a colleague overwrites a cell without knowing you already entered a new status.",
      s1: "One database, everyone works at the same time, with an audit trail of who changed what and when.",
      p2: "Formulas break — one bad copy-paste wipes half the price calculations.",
      s2: "Business rules live in the system, not in formulas — they cannot be deleted by accident.",
      p3: "There is no access-rights concept — the whole team sees everything, or nobody sees anything.",
      s3: "Roles (director, salesperson, agent, controller) with precise rights per project and action.",
      p4: "Excel does not send reminders — due installments stay unreported for months.",
      s4: "Automatic email reminders for buyers and notifications for the sales team — no manual calendar chasing.",
      p5: "Moving to a new tool usually means typing 1,000+ units by hand.",
      s5: "Free import of your first Excel file — we do the mapping, you just send the file.",
    },
    reservations: {
      metaTitle: "Reservations and payments for new builds",
      metaDescription:
        "One active reservation per unit, automatic expiry, conversion to a sale in a few clicks. Payments are FIFO-allocated to the oldest open installments with EUR/RSD and IPS QR — no manual bank-statement matching.",
      eyebrow: "Reservations and payments",
      title: "Reservations without double locks, payments without manual matching",
      subtitle:
        "PropertyDesk protects the flow from the first reservation to the last installment — a clear status for every unit, automatic payment allocation, Serbian standards (EUR/RSD, IPS QR) out of the box.",
      gridTitle: "Where money is most often lost in new-build sales",
      gridSubtitle:
        "Forgotten reservations, unmatched payments, late buyers with no reminder — each of these scenarios is a month of revenue.",
      p1: "Reservations are agreed over Viber — you do not know who reserved the same unit first.",
      s1: "The system enforces one active reservation per unit — a double reservation is physically impossible.",
      p2: "You forget the reservation expires — the apartment is 'blocked' for a month with no action.",
      s2: "Automatic reservation expiry + email reminders before expiry — the team sees units that are actually free.",
      p3: "Payments arrive in different currencies and via different accounts — manual matching takes days.",
      s3: "FIFO allocation to open installments, EUR/RSD conversion at the daily rate, bank-statement import.",
      p4: "One payment is split across several sales (or one buyer has several apartments) — how do you allocate it?",
      s4: "Split a payment across sales, manual reallocation, full payment-history transparency.",
      p5: "Serbian buyers need IPS QR — and foreign platforms do not support that.",
      s5: "Built-in IPS QR on proformas and deposits. Automatic SEF submission is in preparation — until then you track status via the SEF portal.",
    },
    commissions: {
      metaTitle: "Automatic real-estate agency commissions",
      metaDescription:
        "Rules per project, unit and agency. A commission-amount snapshot at contract time — no later changes or disputes. A clear flow from calculation to payout, with a portal for every partner agency.",
      eyebrow: "Agency commissions",
      title: "Commissions that calculate and pay themselves",
      subtitle:
        "You define the rules once — PropertyDesk applies them to every new sale, stores a snapshot at contract time and walks the agency through a clear flow from calculation to payout. No spreadsheets and no friction.",
      gridTitle: "4 classic problems that lose agency partnerships",
      gridSubtitle:
        "If you have ever had a wrong commission payout or a dispute with an agency, the cause was probably one of these. PropertyDesk removes all four.",
      p1: "Different commission percentages per project, agency or unit type — manual calculation does not scale.",
      s1: "Rules are defined in the system: per project, unit and specific agency. The system calculates the amount automatically.",
      p2: "The investor later changes the commission — the agency objects. Court, lawsuit, end of the partnership.",
      s2: "The commission-amount snapshot is locked at contract time. Later rule changes do not affect already contracted sales.",
      p3: "Payout is late because you wait for Excel from finance, director verification, then agency re-verification.",
      s3: "The agency portal shows the real status of every item — contracted, active, due for payout, paid.",
      p4: "The agency cannot see when the buyer paid — they do not know when to expect the commission.",
      s4: "The agency sees the payment status of its sales in real time — without calling the investor.",
    },
  },

  public: {
    projectUnavailable: "Project is not available",
    offerUnavailable: "Offer is not available",
    availableUnitsMeta: "{{count}} available units in project {{name}}.",
    aboutProject: "About the project",
    aboutUnit: "About the unit",
    contactInvestor: "Contact the investor for more information about the project.",
    location: "Location",
    availableUnits: "Available units",
    noUnits: "There are currently no free units.",
    noImage: "No image",
    rooms: "{{count}} rooms",
    bathrooms: "{{count}} bathrooms",
    features: "Features",
    type: "Type",
    structure: "Layout",
    totalArea: "Total area",
    netArea: "Net",
    terrace: "Terrace",
    garden: "Garden",
    bedrooms: "Bedrooms",
    bathroomsLabel: "Bathrooms",
    orientation: "Orientation",
    contact: "Contact",
    areaM2: "{{value}} m²",
    footerPrivate:
      "This offer is private. Price and availability may change without notice.",
    emDash: "—",
    referralCatalogTitle: "Project offer",
    referralCatalogVia: "Recommended by {{agency}}",
    referralCatalogEmpty: "There are no public projects for this link right now.",
    referralUnavailable: "This referral link is no longer valid.",
    viewProject: "View units →",
    poweredBy: "Powered by {{name}}",
    copyright: "© {{year}} {{name}}",
    filterSearch: "Search",
    filterSearchHint: "Unit code",
    filterArea: "Area (m²)",
    filterPrice: "Price",
    filterMin: "from",
    filterMax: "to",
    filterReset: "Clear filters",
    filterEmpty: "No units match these filters.",
    pagination: "Pages",
    pageOf: "Page {{page}} / {{total}}",
  },

  site: {
    title: "{{name}} - Operating system for new-build sales",
    description:
      "PropertyDesk is a multi-tenant SaaS platform for real-estate developers and partner agencies. Projects, units, buyers, reservations, sales, payment plans, payments, commissions, documents and reports — with IPS QR for deposits and invoices.",
    ogDescription:
      "Multi-tenant platform for developers and partner agencies. From project and inventory, through reservations and contracts, to payments and commissions.",
    twitterDescription:
      "Multi-tenant platform for developers and partner agencies, with IPS QR for deposits and invoices.",
    keywords:
      "PropertyDesk,software for real-estate developers,real-estate CRM,new-build sales,property project management,apartment reservations,payment plan,agency commissions,IPS QR,e-invoices,Serbia",
  },
};
