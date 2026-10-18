import type { BlogPost } from "@/features/marketing/blog/types";

export const excelPost: BlogPost = {
  slug: "excel-ili-softver-za-prodaju-novogradnje",
  published: "2026-09-04",
  modified: "2026-10-03",
  minutes: 9,
  coverFile: "excel-ili-softver-za-prodaju-novogradnje.webp",
  copy: {
    sr: {
      title: "Excel ili softver: kako investitori vode prodaju novogradnje",
      description:
        "Cenovnik u Excelu i rezervacije na Viberu rade dok je projekat mali. Evo gde se lome cena, status stana i provizija, i šta jedan sistem drži na jednom mestu.",
      excerpt:
        "Tabela je dovoljna za prvih dvadeset stanova. Problem počinje kad isti stan ima dve cene, dve rezervacije i nijedan trag ko je šta promenio.",
      dateLabel: "4. septembar 2026.",
      coverAlt: "Poređenje Excel tabele i jednog cenovnika stana u softveru za prodaju novogradnje",
      blocks: [
        {
          type: "p",
          text: "Većina investitora u Srbiji krene isto: cenovnik stanova u Excelu, status bojom u ćeliji, a rezervacija u Viber grupi sa agencijama. To je uredan početak dok je u igri jedan objekat i jedan čovek koji zna svaki stan napamet. Prelom nije broj stanova u brošuri. Prelom je dan kad dve osobe menjaju istu cenu, a kupac već drži predugovor sa trećom cifrom.",
        },
        {
          type: "p",
          text: "Softver za prodaju novogradnje ne zamenjuje prodavca. On skida tri paralelne istine: tabelu, čet i ugovor. Dok te tri stvari žive odvojeno, svaki sastanak počinje pitanjem koja je verzija važeća. Ovaj tekst je o tom prelomu, bez izmišljenih referenci i bez obećanja da će program sam prodati stan.",
        },
        {
          type: "h2",
          id: "gde-excel-prestaje",
          text: "Gde Excel prestaje da bude cenovnik",
        },
        {
          type: "p",
          text: "Excel je odličan nacrt. Loš je kao jedini izvor istine čim fajl krene da živi u prilozima. „Cenovnik-final-v7-agencija“ i „cenovnik-FINAL-ispravka“ nisu dva dokumenta. To su dve cene za isti stan. Nema zapisa ko je spustio cenu, da li je popust odobren, i da li je agencija uopšte videla novu verziju pre nego što je poslala ponudu kupcu.",
        },
        {
          type: "p",
          text: "Na projektu sa više ulaza ista greška se ponavlja na spratu, orijentaciji i pomožnoj jedinici. Garaža i parking često ostanu u drugom listu, pa se prodaju po staroj ceni dok je stan već u novoj. Kupac to vidi kao nered. Knjigovodstvo to vidi kad predugovor ne odgovara ponudi koju je agencija prosledila.",
        },
        {
          type: "figure",
          file: "excel-cenovnik-verzije.webp",
          alt: "Tri verzije Excel cenovnika za isti stan, naspram jednog važećeg cenovnika u sistemu",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Jedan cenovnik po projektu znači da promena cene ima mesto i vreme. Ko je uneo, kada, sa koje cifre na koju. To nije ukras. To je odgovor na pitanje koje se pojavi čim agencija kaže da je prodala po ceni koju vi više ne priznajete. [Alternativa Excelu](/alternative-excelu) na PropertyDesk-u drži tu istoriju na jedinici, umesto u imenu fajla.",
        },
        {
          type: "ul",
          items: [
            "Jedna važeća cena po stanu, garaži i parkingu, ne po prilogu mejla.",
            "Trag ko je promenio cenu i kada, vidljiv i posle mesec dana.",
            "Klon strukture objekta ili uvoz tabele, umesto prekucavanja spratova.",
            "Isti status vide investitor i agencija kojoj je ponuda otvorena.",
          ],
        },
        {
          type: "h2",
          id: "valuta-i-pdv",
          text: "EUR, RSD i PDV ne smeju da žive u napomeni",
        },
        {
          type: "p",
          text: "Cenovnik novogradnje u Srbiji skoro uvek ima dve valute u glavi, a jednu u tabeli. Stan se oglašava u evrima, kapara legne u dinarima, a ugovor mora da kaže po kom kursu. Ako je kurs „otprilike srednji“ upisan u žutu ćeliju prošlog meseca, ponuda i uplatnica se razilaze. Zvanični srednji kurs Narodna banka Srbije objavljuje za knjigovodstvo i statistiku, i njega unosite vi. PropertyDesk ne povlači kurs automatski, i to ne treba obećavati kupcu. Lista je javna na [kursnoj listi NBS](https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate).",
        },
        {
          type: "p",
          text: "Isto važi za poreski režim. Novogradnja i sekundarno tržište ne idu u istu kolonu bez pravila. U praksi se na stanu vodi jedan režim, a na pomožnoj jedinici drugi, i Excel to sakrije u napomenu koju šablon ugovora ne pročita. Kad se ugovor generiše iz podataka jedinice, režim je deo kartice, ne deo sećanja. Faktura ka SEF-u i dalje ostaje ručni korak. Sistem ne šalje eFakturu umesto vas. Portal Ministarstva finansija je na [efaktura.gov.rs](https://www.efaktura.gov.rs/).",
        },
        {
          type: "h2",
          id: "rezervacija-u-chatu",
          text: "Rezervacija u Viberu nije status stana",
        },
        {
          type: "p",
          text: "Poruka „držimo A-12 do petka“ nije rezervacija. Druga agencija je ne vidi, ili je vidi prekasno. Kupac prve agencije već računa na stan, a stan je u međuvremenu obećan drugom. Svađa nije komercijalna. Svađa je operativna: nema jednog mesta na kom piše da je jedinica zauzeta, do kada, i čiji je zahtev.",
        },
        {
          type: "p",
          text: "Pravilo koje skida taj rizik je prosto i vredi i na malom objektu. Jedna aktivna rezervacija po stanu, sa rokom koji ističe sam. Kad rok prođe, stan se vraća u ponudu bez poruke „može li neko da skine hold“. Dok rok traje, niko drugi ne može da otvori drugi hold na istoj jedinici. To je opisano na stranici [rezervacije i uplate](/rezervacije-i-uplate), a kako kupac u tom roku uplaćuje kaparu bez prekucavanja poziva na broj piše u tekstu o [IPS QR kapari](/blog/ips-qr-kapara-online-rezervacija-stana). Šta slobodan, rezervisan i prodat znače kad više agencija gleda isti stan, razrađeno je u tekstu o [statusu stana](/blog/status-stana-slobodan-rezervisan-prodat).",
        },
        {
          type: "h2",
          id: "jedan-status",
          text: "Jedan status, jedna cena, jedan trag",
        },
        {
          type: "figure",
          file: "excel-status-jedinice.webp",
          alt: "Status jedinice slobodna, rezervisana i prodata, sa jednom cenom i jednim rokom rezervacije",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Status jedinice, kupac, kapara, plan rata i provizija agencije sede na istoj kartici. Kad se ugovor potpiše, provizija ostaje onakva kakva je dogovorena tog dana, a ne onakva kakva piše u tabeli koju je neko sutra izmenio. Zašto je taj snapshot bitan, posebno kad više agencija radi na istom objektu, razrađeno je u tekstu o [proviziji agencije](/blog/provizije-agencija-za-novogradnju).",
        },
        {
          type: "p",
          text: "Za investitora koji prodaje i direktno i preko partnera, to je cela poenta [stranice za investitore](/za-investitore). Agencija vidi svoju ponudu i svoje kupce. Vi vidite ko je rezervisao, koliko je uplaćeno i šta još nije zatvoreno. Ne vidite tri tabele koje treba ručno da saberete pre sastanka u ponedeljak.",
        },
        {
          type: "h2",
          id: "uvoz-umesto-prekucavanja",
          text: "Uvoz tabele umesto novog prekucavanja",
        },
        {
          type: "p",
          text: "Prelazak sa Excela ne znači da bacate ono što ste već sredili. Struktura objekta, ulaz, sprat i oznaka jedinice mogu da uđu uvozom, ili klonom postojećeg projekta ako gradite sličan objekat. Smisao uvoza nije da zadržite haos u novom omotu. Smisao je da prvi dan ne provedete prepisujući sto redova, pa da drugi dan opet imate dve cene.",
        },
        {
          type: "p",
          text: "Posle uvoza i dalje važi isto pravilo. Menja se cena u sistemu, ne u kopiji koju je neko sačuvao na desktop. Ako agencija traži „pošaljite Excel“, pošaljete izvoz iz jednog izvora, a ne još jedan fajl koji od sutra živi svojim životom. Javni sajt projekta, ako ga uključite, čita taj isti status. Kupac na linku ne vidi stan koji je u tabeli slobodan, a u četu rezervisan.",
        },
        {
          type: "h2",
          id: "kad-preci",
          text: "Kada tabela prestaje da bude jeftina",
        },
        {
          type: "p",
          text: "Ne morate da čekate hiljadu jedinica. Dovoljno je da vam se jednom desi dupla rezervacija, ili da agencija pošalje kupcu cenovnik od prošlog meseca. Ako vas to već košta jedan sastanak i jedno izvinjenje, tabela više nije jeftina. Jeftina je bila dok je jedna osoba držala sve u glavi.",
        },
        {
          type: "p",
          text: "Drugi znak je kad direktor prodaje ne može da kaže, bez otvaranja tri fajla, koliko je slobodno, koliko je rezervisano i koliko je ugovoreno na jednom ulazu. Treći znak je kad se provizija računa iz sećanja, jer je procenat u mejlu od marta, a aneks u aprilu nije stigao do tabele. Ni jedan od ta tri znaka ne traži veliki portfolio. Traži da više od jedne osobe dira istu ponudu.",
        },
        {
          type: "h2",
          id: "ponedeljak",
          text: "Ponedeljak u devet, bez tri fajla",
        },
        {
          type: "p",
          text: "Kad direktor prodaje u ponedeljak pita šta je slobodno, odgovor ne sme da zavisi od toga ko je vikend držao telefon. Ako je jedna osoba bila na gradilištu, druga na sastanku sa agencijom, a treća je u mejlu obećala popust, tabela od petka više nije istina. Softver ne zamenjuje taj sastanak. On skida prvih deset minuta u kojima se tri fajla porede pre nego što iko kaže broj. Broj koji izađe iz sećanja nije izveštaj. Izveštaj je lista jedinica sa statusom koji je važio u tom satu.",
        },
        {
          type: "p",
          text: "Isto važi kad čovek koji zna svaki stan napamet ode na odmor. Zamena ne nasleđuje glavu. Nasleđuje karticu: status, cena, rok rezervacije i čiji je zahtev. Ako toga nema, prvi dan zamene je dan duplih obećanja. Kupac koji je u petak čuo da je stan njegov, u ponedeljak čuje da je dat drugom, jer niko nije video hold. To nije pitanje veličine objekta. To je pitanje da li istina živi u jednom mestu ili u jednom čoveku. Objekat od četrdeset stanova već ima taj problem čim dve osobe diraju istu ponudu.",
        },
        {
          type: "p",
          text: "Izvoz za agenciju i dalje ima smisla. Partner ponekad traži tabelu za svoju pripremu. Taj izvoz je snimak u trenutku slanja, ne novi cenovnik koji od utorka živi sam. Ako partner sutra nudi po tom snimku, a vi ste u međuvremenu rezervisali stan, spor je oko toga što snimak nije status. Status je na jedinici, i partner sa otvorenom ponudom vidi promenu bez novog priloga. Kako se slobodan, rezervisan i prodat razlikuju u radu, piše u tekstu o [statusu stana](/blog/status-stana-slobodan-rezervisan-prodat).",
        },
        {
          type: "p",
          text: "Na sastanku u ponedeljak dovoljna su tri broja po ulazu: slobodno, rezervisano, ugovoreno. Ako ih nemate bez otvaranja četa, tabela vas i dalje košta. Ne košta vas program. Košta vas izvinjenje kupcu i sastanak koji je mogao da počne od odluke, a ne od usklađivanja verzija. Jedan objekat je dovoljan da se vidi razlika. Ne treba čekati drugi ulaz da bi prvi dobio jednu cenu i jedan rok. Garaža i parking ulaze u isti pregled, svojom cenom, da se ne zaborave u listu koji niko nije osvežio od prošlog meseca.",
        },
        {
          type: "h2",
          id: "sta-dalje",
          text: "Šta uraditi pre nego što uvezete sve",
        },
        {
          type: "p",
          text: "PropertyDesk se pušta 15.11.2026. Do tog datuma rani pristup je 30 dana bez naknade, pa 50% na naredna tri meseca. Cene paketa su na [cenovniku](/#cenovnik). Najkraći sledeći korak nije uvoz svih istorijskih tabela od 2019. Najkraći korak je [25-minutni demo](/demo) na jednom objektu: jedna cena, jedna rezervacija, jedna agencija.",
        },
        {
          type: "p",
          text: "Pre ugovora i dalje treba da stoje podaci kupca, ne samo cena stana. Šta tim proverava pre potpisa, i kada sistem ne da ugovor dok lista nije zatvorena, piše u tekstu o [KYC kupca](/blog/kyc-kupca-pre-ugovora-o-stanu). Ako vas više zanima sam novac na računu nego tabela, krenite od [IPS QR kapare](/blog/ips-qr-kapara-online-rezervacija-stana).",
        },
      ],
    },
    en: {
      title: "Excel or software: how developers run new-build sales",
      description:
        "A spreadsheet and chat reservations work while a project is small. Here is where price, status and commission break.",
      excerpt:
        "A sheet is enough for the first twenty units. The problem starts when the same apartment has two prices, two reservations and no record of who changed what.",
      dateLabel: "4 September 2026",
      coverAlt: "An Excel price list beside a single unit price in new-build sales software",
      blocks: [
        {
          type: "p",
          text: "Most developers in Serbia start the same way: an apartment price list in Excel, status as a cell colour, and a reservation in a Viber group with agencies. That is a tidy start while one building and one person who knows every unit by heart are in play. The break is not the unit count in the brochure. The break is the day two people change the same price, and the buyer already holds a pre-contract with a third figure.",
        },
        {
          type: "p",
          text: "New-build sales software does not replace the salesperson. It removes three parallel truths: the sheet, the chat and the contract. While those three live apart, every meeting starts with the question of which version is current. This piece is about that break, with no invented references and no promise that a program will sell the unit for you.",
        },
        {
          type: "h2",
          id: "gde-excel-prestaje",
          text: "Where Excel stops being a price list",
        },
        {
          type: "p",
          text: "Excel is an excellent draft. It is a poor single source of truth once the file lives in attachments. “Price-list-final-v7-agency” and “price-list-FINAL-fix” are not two documents. They are two prices for the same unit. There is no record of who lowered the price, whether the discount was approved, or whether the agency saw the new version before sending an offer to the buyer.",
        },
        {
          type: "p",
          text: "On a project with several entrances the same mistake repeats across floor, orientation and the ancillary unit. A garage and a parking space often stay on another sheet, so they sell at the old price while the apartment is already on the new one. The buyer reads that as disorder. The books see it when the pre-contract does not match the offer the agency forwarded.",
        },
        {
          type: "figure",
          file: "excel-cenovnik-verzije.webp",
          alt: "Three Excel price-list versions for the same unit, against one current price list in the system",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "One price list per project means a price change has a place and a time. Who entered it, when, and from which figure to which. That is not decoration. It is the answer when an agency says it sold at a price you no longer recognise. The [Excel alternative](/alternative-excelu) in PropertyDesk keeps that history on the unit, instead of in the file name.",
        },
        {
          type: "ul",
          items: [
            "One current price per apartment, garage and parking space, not per email attachment.",
            "A record of who changed the price and when, still visible a month later.",
            "A clone of the building structure, or an import, instead of retyping floors.",
            "The investor and the agency with an open offer see the same status.",
          ],
        },
        {
          type: "h2",
          id: "valuta-i-pdv",
          text: "EUR, RSD and VAT do not belong in a note",
        },
        {
          type: "p",
          text: "A new-build price list in Serbia almost always has two currencies in someone’s head and one in the sheet. The unit is advertised in euro, the deposit lands in dinars, and the contract has to say which rate applies. If the rate is “roughly the middle rate”, typed into a yellow cell last month, the offer and the payment order diverge. The National Bank of Serbia publishes the official middle rate for bookkeeping and statistics, and you enter it. PropertyDesk does not pull the rate automatically, and that should not be promised to a buyer. The list is public on the [NBS rate list](https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate).",
        },
        {
          type: "p",
          text: "The same applies to the tax treatment. New-build and the secondary market do not belong in the same column without a rule. In practice one treatment sits on the apartment and another on the ancillary unit, and Excel hides that in a note the contract template never reads. When the contract is generated from the unit’s data, the treatment is part of the record, not part of memory. Sending an invoice to SEF stays a manual step. The system does not file an e-invoice for you. The Ministry of Finance portal is at [efaktura.gov.rs](https://www.efaktura.gov.rs/).",
        },
        {
          type: "h2",
          id: "rezervacija-u-chatu",
          text: "A Viber reservation is not a unit status",
        },
        {
          type: "p",
          text: "A message that says “we are holding A-12 until Friday” is not a reservation. The other agency does not see it, or sees it too late. The first buyer is already counting on the unit, and the unit has been promised again. The argument is not commercial. It is operational: there is no single place that says the unit is taken, until when, and whose request it is.",
        },
        {
          type: "p",
          text: "The rule that removes that risk is simple, and it is worth having even on a small building. One active reservation per unit, with a deadline that expires on its own. When the deadline passes, the unit returns to the offer without a message asking someone to clear the hold. While the deadline runs, nobody else can open a second hold on the same unit. That is described on [reservations and payments](/rezervacije-i-uplate), and how the buyer pays the deposit in that window without retyping a reference is in the piece on [IPS QR deposits](/blog/ips-qr-kapara-online-rezervacija-stana). What available, reserved, and sold mean when several agencies look at the same unit is in the piece on [unit status](/blog/status-stana-slobodan-rezervisan-prodat).",
        },
        {
          type: "h2",
          id: "jedan-status",
          text: "One status, one price, one trail",
        },
        {
          type: "figure",
          file: "excel-status-jedinice.webp",
          alt: "A unit status of available, reserved and sold, with one price and one reservation deadline",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Unit status, buyer, deposit, instalment plan and agency commission sit on the same record. When the contract is signed, the commission stays as agreed that day, not as written in a sheet someone edits tomorrow. Why that snapshot matters, especially when several agencies work on the same building, is set out in the piece on [agency commission](/blog/provizije-agencija-za-novogradnju).",
        },
        {
          type: "p",
          text: "For a developer who sells both directly and through partners, that is the point of the [page for investors](/za-investitore). The agency sees its own offer and its own buyers. You see who reserved, how much was paid, and what is still open. You do not open three sheets and add them up before Monday’s meeting.",
        },
        {
          type: "h2",
          id: "uvoz-umesto-prekucavanja",
          text: "An import, instead of typing it all again",
        },
        {
          type: "p",
          text: "Leaving Excel does not mean throwing away what you already organised. The building structure, entrance, floor and unit label can come in through an import, or by cloning a project if you are building a similar building. The point of the import is not to keep the mess in a new wrapper. The point is that day one is not spent retyping a hundred rows, and day two you do not have two prices again.",
        },
        {
          type: "p",
          text: "After the import the same rule still applies. The price changes in the system, not in a copy someone saved on a desktop. If an agency asks you to “send the Excel”, you send an export from one source, not another file that lives its own life from tomorrow. The public project site, if you turn it on, reads that same status. A buyer on the link does not see a unit that is free in the sheet and reserved in the chat.",
        },
        {
          type: "h2",
          id: "kad-preci",
          text: "When the spreadsheet stops being cheap",
        },
        {
          type: "p",
          text: "You do not have to wait for a thousand units. It is enough that a double booking happens once, or that an agency sends last month’s price list to a buyer. If that already costs you one meeting and one apology, the sheet is no longer cheap. It was cheap while one person held everything in their head.",
        },
        {
          type: "p",
          text: "The second sign is when the sales director cannot say, without opening three files, how many units are free, reserved and contracted on one entrance. The third sign is when commission is calculated from memory, because the percentage is in a March email and the April amendment never reached the sheet. None of those three signs requires a large portfolio. They require more than one person touching the same offer.",
        },
        {
          type: "h2",
          id: "monday-morning",
          text: "Monday at nine, without three files",
        },
        {
          type: "p",
          text: "When the sales director asks on Monday what is still free, the answer cannot depend on who held the phone over the weekend. If one person was on site, another was in a meeting with an agency, and a third promised a discount by email, Friday’s sheet is no longer the truth. Software does not replace that meeting. It removes the first ten minutes in which three files are compared before anyone says a number. A number that comes from memory is not a report. A report is a list of units with the status that was current in that hour.",
        },
        {
          type: "p",
          text: "The same applies when the person who knows every unit by heart goes on leave. The replacement does not inherit a memory. They inherit a record: status, price, reservation deadline and whose request it is. If that is missing, the first day of cover is the day of double promises. A buyer who heard on Friday that the unit was theirs hears on Monday that it was given to someone else, because nobody saw the hold. This is not a question of building size. It is a question of whether the truth lives in one place or in one person. A building of forty units already has that problem as soon as two people touch the same offer.",
        },
        {
          type: "p",
          text: "An export for an agency still makes sense. A partner sometimes asks for a sheet for their own preparation. That export is a snapshot at the moment you sent it, not a new price list that lives on its own from Tuesday. If the partner offers from that snapshot tomorrow, and you reserved the unit in the meantime, the dispute is that a snapshot is not a status. Status sits on the unit, and a partner with an open offer sees the change without a new attachment. How available, reserved and sold differ in daily work is in the piece on [unit status](/blog/status-stana-slobodan-rezervisan-prodat).",
        },
        {
          type: "p",
          text: "Monday’s meeting needs three numbers per entrance: free, reserved, contracted. If you cannot say them without opening a chat, the sheet is still costing you. It does not cost you a program. It costs you an apology to a buyer and a meeting that could have started from a decision, not from reconciling versions. One building is enough to see the difference. You do not have to wait for a second entrance before the first one has one price and one deadline. Garages and parking spaces belong in the same view, each with its own price, so they are not forgotten on a tab nobody refreshed last month.",
        },
        {
          type: "h2",
          id: "sta-dalje",
          text: "What to do before you import everything",
        },
        {
          type: "p",
          text: "PropertyDesk launches on 15 November 2026. Until then, early access is 30 days free, then 50% off for the next three months. Package prices are on the [pricing section](/#cenovnik). The shortest next step is not importing every historical sheet since 2019. It is a [25-minute demo](/demo) on one building: one price, one reservation, one agency.",
        },
        {
          type: "p",
          text: "Before the contract, the buyer’s details still have to be in place, not only the unit price. What the team checks before signature, and when the system will not produce a contract until the list is closed, is in the piece on [buyer checks](/blog/kyc-kupca-pre-ugovora-o-stanu). If you care more about money on the account than about the sheet, start with [IPS QR deposits](/blog/ips-qr-kapara-online-rezervacija-stana).",
        },
      ],
    },
  },
};
