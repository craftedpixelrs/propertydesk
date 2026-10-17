import type { BlogPost } from "@/features/marketing/blog/types";

export const priceListPost: BlogPost = {
  slug: "cenovnik-stana-u-evrima",
  published: "2026-09-15",
  modified: "2026-10-03",
  minutes: 9,
  coverFile: "cenovnik-stana-u-evrima.webp",
  copy: {
    sr: {
      title: "Cenovnik stana u evrima: jedna cena umesto tri tabele",
      description:
        "Stan se oglašava u evrima, kapara legne u dinarima. Jedna cena za stan, garažu i parking, sa tragom ko je cenu promenio.",
      excerpt:
        "Tri priloga nisu tri cenovnika. Dok fajl živi u mejlu, agencija nudi cenu koju vi više ne priznajete.",
      dateLabel: "15. septembar 2026.",
      coverAlt:
        "Jedna kartica stana sa cenom u evrima, bez nekoliko verzija Excel tabele u pozadini",
      blocks: [
        {
          type: "p",
          text: "Cenovnik stana u evrima je dokument koji kupac pamti, a kancelarija često ima u tri fajla. „Final“, „final-agencija“ i „ispravka-sprat“ nisu istorija cene. To su tri važeće cifre za isti stan, i svaka od njih je već otišla nekome. Prelom nije broj redova. Prelom je dan kad predugovor nosi cenu koju tabela više nema.",
        },
        {
          type: "p",
          text: "Ovaj tekst je o jednoj ceni po jedinici. Ne bira vam popust i ne kaže po kom kursu ugovor mora da glasi. To ostaje na vama i na vašem pravniku. PropertyDesk pamti cifru, ko ju je promenio i kada. Ne povlači srednji kurs sam, i to ne treba obećavati kupcu.",
        },
        {
          type: "h2",
          id: "jedna-cena",
          text: "Jedna cena po jedinici",
        },
        {
          type: "p",
          text: "Jedinica ima jednu važeću cenu. Promena ima mesto i vreme: sa koje cifre, na koju, ko je uneo, i zašto. Razlog nije ukras. On je odgovor kad agencija kaže da je ponudila po ceni koju vi više ne priznajete. Ime fajla to ne pamti. Kartica jedinice pamti.",
        },
        {
          type: "p",
          text: "Dok cenovnik živi u prilogu, agencija šalje verziju koju je juče dobila. Vi ste ujutru spustili cenu na drugom listu. Kupac drži ponudu sa trećom cifrom. Nema zapisa koja je od tih tri bila dozvoljena u tom satu. [Alternativa Excelu](/alternative-excelu) drži tu istoriju na stanu, umesto u nazivu dokumenta.",
        },
        {
          type: "figure",
          file: "cenovnik-istorija-cene.webp",
          alt: "Istorija cene jednog stana: stara cifra, nova cifra, datum i razlog, bez imena zaposlenih",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "Jedna važeća cena po stanu, ne po prilogu mejla.",
            "Trag ko je promenio cenu, kada, i sa koje cifre na koju.",
            "Razlog promene ostaje na jedinici i posle mesec dana.",
            "Agencija vidi cenu otvorene ponude, ne tuđi interni dogovor.",
          ],
        },
        {
          type: "p",
          text: "Uvoz tabele ima smisla samo ako prvi dan ne napravite istu granu u novom omotu. Struktura ulaza, sprata i oznake može da uđe iz fajla koji već imate. Posle uvoza važeća cena je ona na kartici. Stari prilog ostaje arhiva, ne izvor za ponudu. Ako dve cene uđu u isti red jer je kolona „akcija“ bila puna, to sredite pre nego što agencija vidi stan. Inače ste samo preselili „final-v7“ u sistem i ostavili kupcu istu zabunu. Jedinica bez cene ne ide u oglas. Prazno polje nije nula, i nije poziv da partner sam upiše cifru iz brošure.",
        },
        {
          type: "p",
          text: "Ista disciplina važi kad objekat ima više ulaza. Cena na prvom ulazu ne važi automatski na drugom samo zato što je sprat isti. Orijentacija, površina i pomoćna jedinica prave razliku koju napomena ne sme da nosi sama. Kad prodaja pita koja je cifra za A-12, odgovor je polje na toj jedinici, u tom trenutku. Ne poslednji mejl sa rečju final u nazivu. Ako cenu menjate zbog jednog kupca, razlog ostaje na kartici i posle potpisa, da se sutra ne spore dve agencije oko toga šta je bilo dozvoljeno u petak. Kupac na javnom linku tu raspravu ne vidi.",
        },
        {
          type: "h2",
          id: "stan-garaza-parking",
          text: "Stan, garaža i parking nisu jedna ćelija",
        },
        {
          type: "p",
          text: "Pomoćna jedinica ima svoju cenu. Garaža i parking često ostanu u drugom listu, pa se prodaju po staroj cifri dok je stan već u novoj. Kupac to vidi kao nered kad predugovor ne odgovara ponudi. Knjigovodstvo to vidi kad osnovica ne prati ono što je obećano.",
        },
        {
          type: "p",
          text: "Isto važi za orijentaciju, sprat i ulaz. Ako se cena razlikuje, razlika stoji na toj jedinici, ne u napomeni koju šablon ugovora ne pročita. Jedan cenovnik projekta znači da se pomoćna jedinica ne zaboravi u tabu koji niko ne osvežava. Kako se tabela uopšte lomi na više verzija, piše u tekstu [Excel ili softver](/blog/excel-ili-softver-za-prodaju-novogradnje).",
        },
        {
          type: "figure",
          file: "cenovnik-stan-garaza.webp",
          alt: "Stan i garaža kao dve jedinice, svaka sa svojom cenom u evrima, na istom projektu",
          width: 1600,
          height: 900,
        },
        {
          type: "h2",
          id: "popust",
          text: "Popust koji ima ime i datum",
        },
        {
          type: "p",
          text: "Popust bez zapisa je nova cena koja se pretvara da je stara. Ako ste spustili cenu za jednog kupca, to je promena sa razlogom, ne žuta ćelija. Sutra druga agencija ne sme da nasledi taj popust samo zato što je fajl ostao sačuvan. Važeća cena je ona na kartici. Ranija cifra ostaje u istoriji, ne u ponudi.",
        },
        {
          type: "p",
          text: "Interni razlog popusta ne ide na javni link i ne ide agenciji koja nije u tom dogovoru. Partner vidi cenu koju sme da nudi. Ne vidi belešku „samo za ovog kupca“. Status stana i dalje govori sme li se ta cena uopšte nuditi danas. To je razdvojeno u tekstu o [statusu stana](/blog/status-stana-slobodan-rezervisan-prodat).",
        },
        {
          type: "h2",
          id: "evro-i-dinar",
          text: "Evro u oglasu, dinar na nalogu",
        },
        {
          type: "p",
          text: "Stan se u Srbiji skoro uvek oglašava u evrima. Kapara i rate legnu u dinarima. Ugovor mora da kaže po kom kursu. Ako je kurs „otprilike srednji“ upisan prošlog meseca u napomenu, ponuda i uplatnica se razilaze. Zvanični srednji kurs Narodna banka Srbije objavljuje javno, i njega unosite vi. Lista je na [kursnoj listi NBS](https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate).",
        },
        {
          type: "p",
          text: "PropertyDesk ne povlači taj kurs automatski. Kod za kaparu nosi iznos koji ste za tu rezervaciju zaključali, ne kurs koji je kupac našao u pretrazi. Kako se taj iznos rasporedi na kaparu i rate, piše u tekstu o [planu plaćanja](/blog/plan-placanja-rate-za-stan). Kurs u glavi i kurs na nalogu moraju biti isti broj.",
        },
        {
          type: "h2",
          id: "cena-i-provizija",
          text: "Cena je osnovica i za proviziju",
        },
        {
          type: "p",
          text: "Procenat provizije računa se od cene na jedinici, ne od cene u prilogu. Ako agencija i dalje šalje stari cenovnik, provizija će biti tačna na pogrešnoj osnovici. Zato cenovnik i pravilo provizije stoje u istom sistemu. Iznos se zaključava na dan ugovora, a ne sutra kad neko izmeni tabelu. To je razrađeno u tekstu o [proviziji agencije](/blog/provizije-agencija-za-novogradnju).",
        },
        {
          type: "p",
          text: "Poreski režim takođe stoji na jedinici. Novogradnja i drugi režim ne idu u istu napomenu ako šablon ugovora tu napomenu ne čita. Faktura ka SEF-u ostaje ručni korak. Sistem ne šalje eFakturu umesto vas. Portal je na [efaktura.gov.rs](https://www.efaktura.gov.rs/). Cena na kartici je osnovica koju vi unosite u taj korak, ne cifra koju program pogodi.",
        },
        {
          type: "h2",
          id: "dan-kad-menjate-cenu",
          text: "Dan kad menjate cenu",
        },
        {
          type: "p",
          text: "Promena cene nije gotova kad upišete novu cifru. Gotova je kad javni link, agencija i nacrt ugovora čitaju tu cifru, a stara ostane u istoriji sa razlogom. Ako link i dalje pokazuje jučerašnji iznos, kupac će doći sa ponudom koju vi više ne stojite. Ako agencija i dalje ima prilog od jutros, ista ponuda ide drugom kupcu. Zato promena ima red: kartica, pa objava, pa partner. Ne obrnuto.",
        },
        {
          type: "p",
          text: "Razlog ne mora da bude dug. „Usklađeno sa ulazom B“ ili „popust odobren za ovog kupca“ dovoljan je da se za mesec dana zna šta je bilo dozvoljeno. Popust za jednog kupca ne sme da postane nova cena za ceo sprat samo zato što je fajl sačuvan preko stare. Važeća cena na kartici je ona koju sme da vidi svako kome je ponuda otvorena. Interni razlog ostaje kod vas.",
        },
        {
          type: "p",
          text: "Garaža i parking menjaju se posebno. Spuštanje cene stana ne spušta garažu, osim ako ste to namerno uradili na toj jedinici. Kupac koji uzme oboje treba da vidi dve cifre, ne jednu koja u sebi krije parking. Predugovor koji sabira „stan sa garažom“ bez te dve kartice opet zavisi od sećanja. Dve kartice daju zbir koji šablon može da pročita.",
        },
        {
          type: "p",
          text: "Kurs tog dana unosite vi, ako kapara ide u dinarima a oglas stoji u evrima. Nova cena u evrima i stari kod za kaparu nisu isti dogovor. Ako menjate cenu, a rezervacija već ima kod, taj kod prati iznos koji ste zaključali za taj zahtev, ne novu cifru sa oglasa. Kako se taj iznos rasporedi na rate, piše u tekstu o [planu plaćanja](/blog/plan-placanja-rate-za-stan). Cena na kartici i dalje je ona koja treba da uđe u ugovor. Ako istog dana menjate više stanova, radite jedan po jedan, sa razlogom na svakoj kartici. Grupna izmena u tabeli, pa ručno „usklađivanje“ linkova, opet ostavlja jedan stan na staroj cifri. Kupac tog stana ne zna da je izuzetak. On vidi broj. Zato izuzetak mora da bude svesna odluka na toj jedinici, ne zaboravljen red u fajlu koji ste zatvorili u žurbi. Kad sutra neko pita zašto je A-12 jeftiniji od A-14, odgovor je razlog na kartici, sa datumom. Ako razloga nema, promena izgleda kao greška, i agencija će tražiti isti popust za susedni stan. Susedni stan ima svoju cenu. Ne nasleđuje tuđu olakšicu samo zato što deli sprat, ulaz i istu orijentaciju. Površina sama po sebi ne prenosi popust.",
        },
        {
          type: "h2",
          id: "sta-kupac-vidi",
          text: "Šta kupac vidi na javnom linku",
        },
        {
          type: "p",
          text: "Javni link pokazuje jedinicu koju ste objavili. Cenu pokazuje samo ako je uključite. Ne pokazuje istoriju popusta, razlog promene ni tuđu rezervaciju. Kupac vidi cenu koju sme da vidi. Kancelarija i dalje vidi trag. Ako link ostane uključen posle promene cene, na njemu je nova važeća cifra, ne jučerašnji snimak ekrana.",
        },
        {
          type: "p",
          text: "Cenovnik ne zamenjuje ugovor. Cifra na kartici je ona koja treba da uđe u predugovor, umesto cifre iz priloga koji je agencija prosledila. Tok od oglasa do tog ugovora je na stranici [prodaja novogradnje](/prodaja-novogradnje). Cene paketa i rani pristup do 15.10.2026. su na [cenovniku](/#cenovnik). Ako hoćete da vidite istoriju cene na jednom stanu, to staje u [demo od 25 minuta](/demo).",
        },
      ],
    },
    en: {
      title: "A euro price list for an apartment: one price instead of three sheets",
      description:
        "The unit is advertised in euros and the deposit lands in dinars. One price for the apartment, garage, and parking, with a trail of who changed it.",
      excerpt:
        "Three attachments are not three price lists. While the file lives in email, the agency offers a price you no longer stand behind.",
      dateLabel: "15 September 2026",
      coverAlt:
        "One apartment card with a price in euros, without several Excel versions behind it",
      blocks: [
        {
          type: "p",
          text: "A euro price list is the document the buyer remembers, and the office often keeps in three files. “Final”, “final-agency”, and “correction-floor” are not a price history. They are three current figures for the same unit, and each of them has already gone to someone. The break is not the number of rows. The break is the day the preliminary contract carries a price the sheet no longer has.",
        },
        {
          type: "p",
          text: "This piece is about one price per unit. It does not choose your discount and it does not say which exchange rate the contract must use. That stays with you and with your lawyer. PropertyDesk remembers the figure, who changed it, and when. It does not pull the middle rate on its own, and that should not be promised to the buyer.",
        },
        {
          type: "h2",
          id: "one-price",
          text: "One price per unit",
        },
        {
          type: "p",
          text: "A unit has one current price. A change has a place and a time: from which figure, to which, who entered it, and why. The reason is not decoration. It is the answer when an agency says it offered a price you no longer stand behind. A file name does not remember that. The unit record does.",
        },
        {
          type: "p",
          text: "While the price list lives in an attachment, the agency sends the version it received yesterday. You cut the price this morning on another sheet. The buyer holds an offer with a third figure. There is no record of which of the three was allowed in that hour. The [Excel alternative](/alternative-excelu) keeps that history on the unit, instead of in the document name.",
        },
        {
          type: "figure",
          file: "cenovnik-istorija-cene.webp",
          alt: "Price history of one apartment: old figure, new figure, date, and reason, with no staff names",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "One current price per apartment, not per email attachment.",
            "A trail of who changed the price, when, and from which figure to which.",
            "The reason for the change stays on the unit a month later.",
            "The agency sees the price of the open offer, not someone else’s internal deal.",
          ],
        },
        {
          type: "h2",
          id: "apartment-garage-parking",
          text: "The apartment, the garage, and the parking space are not one cell",
        },
        {
          type: "p",
          text: "An ancillary unit has its own price. Garages and parking often stay on another sheet, so they sell at the old figure while the apartment is already on the new one. The buyer sees that as a mess when the preliminary contract does not match the offer. The books see it when the base does not follow what was promised.",
        },
        {
          type: "p",
          text: "The same applies to orientation, floor, and entrance. If the price differs, the difference sits on that unit, not in a note the contract template never reads. One project price list means the ancillary unit is not forgotten on a tab nobody refreshes. How a sheet forks into several versions is in [Excel or software](/blog/excel-ili-softver-za-prodaju-novogradnje).",
        },
        {
          type: "figure",
          file: "cenovnik-stan-garaza.webp",
          alt: "An apartment and a garage as two units, each with its own price in euros, on the same project",
          width: 1600,
          height: 900,
        },
        {
          type: "h2",
          id: "a-discount-with-a-date",
          text: "A discount that has a name and a date",
        },
        {
          type: "p",
          text: "A discount without a record is a new price pretending to be the old one. If you cut the price for one buyer, that is a change with a reason, not a yellow cell. Tomorrow another agency must not inherit that discount just because the file was left saved. The current price is the one on the record. The earlier figure stays in the history, not in the offer.",
        },
        {
          type: "p",
          text: "The internal reason for a discount does not go on the public link and does not go to an agency that is not part of that deal. The partner sees the price they may offer. They do not see a note that says “this buyer only”. Unit status still says whether that price may be offered today. That split is in the piece on [unit status](/blog/status-stana-slobodan-rezervisan-prodat).",
        },
        {
          type: "h2",
          id: "euros-and-dinars",
          text: "Euros in the advert, dinars on the payment order",
        },
        {
          type: "p",
          text: "In Serbia an apartment is almost always advertised in euros. The deposit and the installments land in dinars. The contract has to say which rate applies. If “roughly the middle rate” was typed into a note last month, the offer and the payment order drift apart. The National Bank of Serbia publishes the official middle rate in public, and you enter it. The list is on the [NBS exchange-rate list](https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate).",
        },
        {
          type: "p",
          text: "PropertyDesk does not pull that rate automatically. The deposit code carries the amount you locked for that reservation, not a rate the buyer found in a search. How that amount is split into a deposit and installments is in the piece on a [payment schedule](/blog/plan-placanja-rate-za-stan). The rate in your head and the rate on the order have to be the same number.",
        },
        {
          type: "h2",
          id: "price-and-commission",
          text: "The price is also the base for commission",
        },
        {
          type: "p",
          text: "The commission percentage is calculated from the price on the unit, not from the price in an attachment. If the agency is still sending an old price list, the commission will be correct on the wrong base. That is why the price list and the commission rule sit in the same system. The amount is locked on the day of the contract, not the next day when someone edits the sheet. That is set out in the piece on [agency commission](/blog/provizije-agencija-za-novogradnju).",
        },
        {
          type: "p",
          text: "The tax treatment also sits on the unit. A new-build treatment and another treatment do not belong in the same note if the contract template never reads that note. An invoice to SEF stays a manual step. The system does not send the e-invoice for you. The portal is at [efaktura.gov.rs](https://www.efaktura.gov.rs/). The price on the record is the base you type into that step, not a figure the program guesses.",
        },
        {
          type: "h2",
          id: "the-day-you-change-a-price",
          text: "The day you change a price",
        },
        {
          type: "p",
          text: "A price change is not finished when you type the new figure. It is finished when the public link, the agency and the contract draft all read that figure, and the old one stays in the history with a reason. If the link still shows yesterday’s amount, the buyer will arrive with an offer you no longer stand behind. If the agency still has this morning’s attachment, the same offer goes to another buyer. So a change has an order: the record, then the publication, then the partner. Not the other way around.",
        },
        {
          type: "p",
          text: "The reason does not have to be long. “Aligned with entrance B” or “discount approved for this buyer” is enough to know a month later what was allowed. A discount for one buyer must not become the new price for the whole floor just because a file was saved over the old one. The current price on the record is the one anyone with an open offer may see. The internal reason stays with you.",
        },
        {
          type: "p",
          text: "The garage and the parking space change on their own. Cutting the apartment price does not cut the garage, unless you did that on purpose on that unit. A buyer who takes both should see two figures, not one that hides the parking inside it. A preliminary contract that adds “apartment with garage” without those two records depends on memory again. Two records give a total the template can read.",
        },
        {
          type: "p",
          text: "You enter that day’s rate yourself when the deposit is in dinars and the advert is in euros. A new price in euros and an old deposit code are not the same agreement. If you change the price while a reservation already has a code, that code follows the amount you locked for that request, not the new figure on the advert. How that amount is split into installments is in the piece on a [payment schedule](/blog/plan-placanja-rate-za-stan). The price on the record is still the one that should enter the contract. If you change several units the same day, do them one by one, with a reason on each record. A bulk edit in a sheet, then a manual fix of the links, again leaves one unit on the old figure. That buyer does not know they are an exception. They see a number.",
        },
        {
          type: "h2",
          id: "what-the-buyer-sees",
          text: "What the buyer sees on a public link",
        },
        {
          type: "p",
          text: "A public link shows the unit you published. It shows the price only if you turn that on. It does not show the discount history, the reason for a change, or someone else’s reservation. The buyer sees the price they are allowed to see. The office still sees the trail. If the link stays on after a price change, it shows the new current figure, not yesterday’s screenshot.",
        },
        {
          type: "p",
          text: "A price list does not replace a contract. The figure on the record is the one that should enter the preliminary contract, instead of the figure from an attachment the agency forwarded. The path from the listing to that contract is on [new-build sales](/prodaja-novogradnje). Package prices and early access until 15 October 2026 are on the [pricing section](/#cenovnik). If you want to see a price history on one unit, that fits in a [25-minute demo](/demo).",
        },
      ],
    },
  },
};
