import type { BlogPost } from "@/features/marketing/blog/types";

export const ipsPost: BlogPost = {
  slug: "ips-qr-kapara-online-rezervacija-stana",
  published: "2026-09-12",
  modified: "2026-10-03",
  minutes: 9,
  coverFile: "ips-qr-kapara-online-rezervacija-stana.webp",
  copy: {
    sr: {
      title: "IPS QR za kaparu: kako kupac rezerviše stan bez prekucavanja",
      description:
        "Kupac koji prekucava poziv na broj često ne uplati kaparu. Kako IPS QR na javnom linku stana vodi uplatu, i šta i dalje potvrđujete ručno.",
      excerpt:
        "Kapara kasni ne zato što kupac nema novac, nego zato što poziv na broj, iznos i svrha uplate žive u tri poruke.",
      dateLabel: "12. septembar 2026.",
      coverAlt: "Telefon sa IPS QR kodom za uplatu kapare pri rezervaciji stana",
      blocks: [
        {
          type: "p",
          text: "U prodaji novogradnje kapara je prvi novac koji mora da legne na pravi račun, sa pravim iznosom i svrhom koju knjigovodstvo može da prepozna. U praksi kupac dobije račun u jednoj poruci, iznos u drugoj, a poziv na broj u trećoj. Jedna cifra pogrešno i uplata visi. Stan je „rezervisan“ u razgovoru, a na računu nema ničega što možete da vežete za tu jedinicu.",
        },
        {
          type: "p",
          text: "IPS QR kod postoji da se taj prepis ne radi rukom. Narodna banka Srbije ga opisuje kao način da nalog bude popunjen iz koda, a ne iz tri poruke. Zvanično objašnjenje je na [IPS stranici NBS](https://ips.nbs.rs/sr_lat). Ovaj tekst je o tome kako taj kod staje u online rezervaciju stana, i šta i dalje ostaje na vama. Skeniranje nije dokaz da je novac legao.",
        },
        {
          type: "h2",
          id: "zasto-kasni",
          text: "Zašto uplata kasni i kad kupac hoće da plati",
        },
        {
          type: "p",
          text: "Problem nije motivacija. Problem je prepisivanje. Kupac stoji u banci ili u aplikaciji i traži poziv na broj iz Viber poruke koja je skrolovana. Agent mu pošalje screenshot stare uplatnice, sa tuđim iznosom. Kapara od 2.000 evra i kapara od 2.000 dinara nisu ista greška, ali obe nastanu na isti način: cifra se prekuca.",
        },
        {
          type: "p",
          text: "Drugi zastoj je svrha. Ako u svrsi piše samo „kapara“, knjigovodstvo ne zna da li je to stan A-12, garaža ili stan komšije. Poziv na broj je tu da uplata nađe jedinicu. Ako ga kupac skrati ili agencija pošalje poziv od prošlog kupca, novac uđe na račun i izađe iz procesa. Tražite ga ručno, a rok rezervacije ističe.",
        },
        {
          type: "h2",
          id: "sta-kod-nosi",
          text: "Šta NBS IPS QR kod mora da nosi",
        },
        {
          type: "p",
          text: "Kod nije slika radi slike. On nosi podatke naloga: primaoca, račun, iznos, valutu i poziv na broj. Kupac u aplikaciji bira IPS skeniraj, vidi popunjen nalog i tek onda potvrdi. Ako je nešto pogrešno, vidi pre potvrde, a ne sutradan na izvodu. Tehničku proveru koda NBS drži na [generatoru i validatoru](https://ips.nbs.rs/qr-validacija-generisanje). To je alat za usklađenost koda, ne zamena za vaš ugovor sa kupcem.",
        },
        {
          type: "figure",
          file: "ips-qr-polja.webp",
          alt: "Polja NBS IPS QR koda za kaparu: primalac, račun, iznos, valuta i poziv na broj, bez tuđeg broja računa",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "Primalac i račun organizacije koja prodaje, ne privatni račun agenta.",
            "Iznos kapare dogovoren za tu jedinicu, ne zaokružen iz razgovora.",
            "Poziv na broj po kome se uplata prepoznaje na izvodu.",
            "Valuta koju stvarno naplaćujete, EUR ili RSD, a ne obe odjednom u istom kodu.",
          ],
        },
        {
          type: "p",
          text: "Stan se često oglašava u evrima, a nalog ide u dinarima. Kurs za tu protivvrednost unosite vi. PropertyDesk ne povlači srednji kurs sam, i ne treba ga tako opisivati kupcu. Zvanična lista je na [kursnoj listi NBS](https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate). Ako danas promenite kurs u glavi, a kod je generisan juče, to su dva iznosa. Kod mora da prati iznos koji ste za tu rezervaciju zaključali.",
        },
        {
          type: "h2",
          id: "od-linka-do-potvrde",
          text: "Od javnog linka stana do potvrde na izvodu",
        },
        {
          type: "figure",
          file: "ips-qr-tok-rezervacije.webp",
          alt: "Tok online rezervacije: javni link jedinice, forma kupca, IPS QR za kaparu i ručna potvrda da je novac na izvodu",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Redosled koji držimo je namerno kratak. Kupac otvori javni link jedinice ili celog projekta, ostavi podatke i dobije kod koji pripada tom zahtevu. Vi u listi zahteva vidite ko je krenuo. Rezervacija postaje važeća kad potvrdite da je kapara na računu, ne u trenutku skeniranja. Skeniranje nije dokaz uplate. Izvod jeste. Detalj toka je na stranici [rezervacije i uplate](/rezervacije-i-uplate).",
        },
        {
          type: "p",
          text: "Ako više agencija nudi isti objekat, jedna aktivna rezervacija i dalje važi. Kod ne sme da otvori drugi hold na stanu koji je već zauzet. Inače online rezervacija samo ubrza duplu rezervaciju koju ste do juče imali u četu. Kako se do jednog statusa uopšte dolazi kad cenovnik živi u tabeli, piše u tekstu [Excel ili softver](/blog/excel-ili-softver-za-prodaju-novogradnje).",
        },
        {
          type: "h2",
          id: "agencija-i-referral",
          text: "Čiji je kupac ako je došao preko linka",
        },
        {
          type: "p",
          text: "Javni link bez oznake agencije pojede proviziju. Kupac „sam nađe stan“, a agencija koja je poslala link ostane bez traga. Referral kod na linku ili na QR-u veže zahtev za tu agenciju pre nego što iko dopisuje ime u tabelu. Kod za kaparu i kod agencije nisu ista stvar. Jedan puni nalog. Drugi pamti ko je doveo kupca.",
        },
        {
          type: "p",
          text: "Pravilo provizije i iznos koji se zaključa na dan ugovora nisu deo QR koda. Oni sede na prodaji. Ako ih pomešate, agent će od koda očekivati obračun koji kod ne radi. Obračun je u tekstu o [proviziji agencije](/blog/provizije-agencija-za-novogradnju), a ugao agencije na stranici [za agencije](/za-agencije).",
        },
        {
          type: "h2",
          id: "sta-kod-ne-radi",
          text: "Šta kod ne radi umesto knjigovođe",
        },
        {
          type: "p",
          text: "IPS QR ne šalje fakturu na SEF. Ne zatvara PDV. Ne potvrđuje ugovor. Ne zna da li je kupac lice koje sme da potpiše. On skida prepisivanje naloga za kaparu. Sve ostalo i dalje ide vašim redom: izvod, potvrda zahteva, podaci kupca, pa ugovor. Kako se kapara, rate i poslednja uplata drže kao stavke čiji zbir odgovara ceni, piše u tekstu o [planu plaćanja](/blog/plan-placanja-rate-za-stan). Portal za elektronske fakture ostaje ručni korak, na [efaktura.gov.rs](https://www.efaktura.gov.rs/). Kod takođe ne zna da li je stan u režimu novogradnje. PDV i valuta oglasa ostaju na kartici jedinice. Kupac u aplikaciji vidi iznos koji potvrđuje, a ne množi evro kursom iz pretrage.",
        },
        {
          type: "p",
          text: "Ni rok rezervacije se ne produžava zato što je neko skenirao kod u ponoć. Ako je rok tri dana, a novac legne četvrtog, to je vaša odluka da li prihvatate zahtev ili vraćate stan u ponudu. Sistem treba da vam pokaže oba datuma. Ne treba da pretpostavi da je skeniranje jednako uplati.",
        },
        {
          type: "h2",
          id: "podaci-kupca",
          text: "Kod stiže tek kad znate kome šaljete nalog",
        },
        {
          type: "p",
          text: "Forma na javnom linku nije KYC. Ona je dovoljna da zahtev ima ime, kontakt i stan. Ugovor i dalje čeka dokumenta koja vaš proces traži. Ako pustite ugovor čim je kod skeniran, preskočili ste proveru koja vas košta više od same kapare. Šta stoji na toj listi pre potpisa piše u tekstu o [KYC kupca](/blog/kyc-kupca-pre-ugovora-o-stanu).",
        },
        {
          type: "p",
          text: "Kupac na linku ostavlja podatke koje čuvate sa svrhom i rokom. To nije beleška u četu koju niko ne briše. Politika je na stranici [privatnost](/privatnost). Ako zahtev odbijete, i dalje znate šta ste primili i zašto. Ako ga prihvatite, ti podaci prelaze na karticu kupca, a ne ostaju samo u mejlu agenta.",
        },
        {
          type: "h2",
          id: "jutro-posle-uplate",
          text: "Jutro posle uplate",
        },
        {
          type: "p",
          text: "Sledeće jutro ne počinje od toga da li je telefon pištao. Počinje od izvoda. Na njemu tražite iznos, poziv na broj i uplatu koja pripada jednom zahtevu. Ako se tri stvari poklope, potvrđujete kaparu i status sme da krene dalje. Ako se iznos razlikuje jer je kupac uplatio evro po kursu iz pretrage, to nije ista kapara. Kod je nosio iznos koji ste vi zaključali. Razlika ostaje da se reši pre nego što stan označite kao plaćen.",
        },
        {
          type: "p",
          text: "Poziv na broj je veza između uplate i stana, ne ukras na nalogu. Ako kupac prekuca račun ručno i pogreši poziv, novac može da legne na pravi račun, a da ne znate čiji je. Zato kod postoji: da se poziv ne kuca. Kad se ipak pojavi uplata bez poklapanja, ne menjate status da bi stan bio zauzet. Tražite uplatu, pa je vežete za zahtev. Zauzet stan bez jasne uplate je hold bez traga, i sutra niko ne zna da li sme da ga pusti.",
        },
        {
          type: "p",
          text: "Više zahteva na isti stan i dalje ne otvara više holdova. Ako je prvi kupac platio, drugi zahtev ostaje odbijen čak i ako je i on skenirao kod pre nego što ste vi stigli da potvrdite izvod. Skeniranje nije red na stan. Red je jedna aktivna rezervacija. Potvrda uplate je vaš korak posle izvoda, opisan na stranici [rezervacije i uplate](/rezervacije-i-uplate).",
        },
        {
          type: "p",
          text: "To jutro nije ni dan fakture. Kapara na izvodu ne šalje ništa na SEF i ne zatvara plan rata. Ona zatvara prvu stavku ako ste je vi tako evidentirali. Ostale rate i dalje imaju svoje rokove. Kako taj spisak izgleda kad zbir mora da pogodi cenu, piše u tekstu o [planu plaćanja](/blog/plan-placanja-rate-za-stan). IPS QR je odradio prepis naloga. Ostatak dana i dalje je na vama. Ako izvod stigne posle podne, status do tada ostaje onakav kakav je bio jutros. Ne pomerate ga unapred da bi oglas izgledao ažurno. Ažuran oglas je onaj koji ne nudi stan čiju uplatu još niste videli. Kupac koji je platio može da sačeka potvrdu. Kupac koji nije platio ne sme da vidi tuđ stan kao slobodan samo zato što izvod kasni. Ako je kod generisan, a uplata nije stigla do kraja roka, hold ističe sam. Novi kod za isti stan ide tek kad je jedinica opet slobodna. Dva važeća koda na jednom stanu znače dva obećanja. Jedan rok to seče bez novog sastanka.",
        },
        {
          type: "h2",
          id: "sta-ostaje-vama",
          text: "Šta podesiti pre prvog javnog linka",
        },
        {
          type: "p",
          text: "Pre nego što link izađe u oglas, treba da stoje račun primaoca, iznos kapare, rok rezervacije i pravilo da je jedna jedinica slobodna za jedan hold. Širi okvir, od zalihe do ugovora, je na [prodaji novogradnje](/prodaja-novogradnje). Cene paketa i rani pristup do 15.11.2026. su na [cenovniku](/#cenovnik).",
        },
        {
          type: "p",
          text: "Najkraći način da vidite link, kod i potvrdu na svom stanu je [demo od 25 minuta](/demo). Ponesite jedan stan, jedan iznos kapare i jedan račun. Ne treba vam cela istorija objekta da biste videli da li kupac više ne prekucava poziv na broj.",
        },
      ],
    },
    en: {
      title: "IPS QR for the deposit: how a buyer reserves a unit without retyping",
      description:
        "Buyers who retype a payment reference often never pay the deposit. How an IPS QR on the unit link carries it, and what you still confirm.",
      excerpt:
        "The deposit is late not because the buyer has no money, but because the reference, the amount and the purpose live in three messages.",
      dateLabel: "12 September 2026",
      coverAlt: "A phone showing an IPS QR code for a unit deposit during reservation",
      blocks: [
        {
          type: "p",
          text: "In new-build sales the deposit is the first money that has to land on the right account, with the right amount and a purpose the books can recognise. In practice the buyer gets the account in one message, the amount in a second, and the reference in a third. One wrong digit and the payment hangs. The unit is “reserved” in conversation, and the account shows nothing you can tie to that unit.",
        },
        {
          type: "p",
          text: "An IPS QR code exists so that copy is not done by hand. The National Bank of Serbia describes it as a way for the payment order to be filled from the code, not from three messages. The official explanation is on the [NBS IPS page](https://ips.nbs.rs/sr_lat). This piece is about how that code sits inside an online unit reservation, and what still stays with you. A scan is not proof the money arrived.",
        },
        {
          type: "h2",
          id: "zasto-kasni",
          text: "Why the payment is late even when the buyer wants to pay",
        },
        {
          type: "p",
          text: "The problem is not motivation. It is transcription. The buyer stands in a branch or in an app and looks for a reference in a Viber message that has scrolled away. The agent sends a screenshot of an old payment slip, with someone else’s amount. A deposit of 2,000 euro and a deposit of 2,000 dinars are not the same mistake, but both start the same way: a figure is retyped.",
        },
        {
          type: "p",
          text: "The second stall is the purpose. If the purpose only says “deposit”, the books cannot tell whether it is unit A-12, a garage or the neighbour’s apartment. The reference exists so the payment can find the unit. If the buyer shortens it, or the agency sends the previous buyer’s reference, the money enters the account and leaves the process. You search for it by hand, and the reservation deadline expires.",
        },
        {
          type: "h2",
          id: "sta-kod-nosi",
          text: "What an NBS IPS QR code has to carry",
        },
        {
          type: "p",
          text: "The code is not a picture for its own sake. It carries the order: payee, account, amount, currency and reference. In the banking app the buyer chooses IPS scan, sees a filled order and only then confirms. If something is wrong, they see it before confirming, not the next day on the statement. The NBS keeps a technical check on the [generator and validator](https://ips.nbs.rs/qr-validacija-generisanje). That tool checks the code. It does not replace your contract with the buyer.",
        },
        {
          type: "figure",
          file: "ips-qr-polja.webp",
          alt: "Fields of an NBS IPS QR deposit code: payee, account, amount, currency and reference, with no real account number",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "The payee and account of the organisation that is selling, not an agent’s private account.",
            "The deposit amount agreed for that unit, not a figure rounded in conversation.",
            "A reference the payment can be recognised by on the statement.",
            "The currency you actually collect, EUR or RSD, not both at once in the same code.",
          ],
        },
        {
          type: "p",
          text: "A unit is often advertised in euro while the order is in dinars. You enter the rate for that equivalent. PropertyDesk does not pull the middle rate by itself, and it should not be described that way to a buyer. The official list is on the [NBS rate list](https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate). If you change the rate in your head today and the code was generated yesterday, those are two amounts. The code has to follow the amount you locked for that reservation.",
        },
        {
          type: "h2",
          id: "od-linka-do-potvrde",
          text: "From the public unit link to the statement",
        },
        {
          type: "figure",
          file: "ips-qr-tok-rezervacije.webp",
          alt: "Online reservation flow: public unit link, buyer form, IPS QR deposit code, and a manual confirmation that the money is on the statement",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "The sequence we keep is deliberately short. The buyer opens the public link of a unit or a whole project, leaves their details and receives a code that belongs to that request. You see who started, in the request list. The reservation becomes real when you confirm the deposit is on the account, not at the moment of the scan. A scan is not proof of payment. The statement is. The flow is on [reservations and payments](/rezervacije-i-uplate).",
        },
        {
          type: "p",
          text: "If several agencies offer the same building, one active reservation still applies. The code must not open a second hold on a unit that is already taken. Otherwise the online reservation only speeds up the double booking you used to have in chat. How you get to a single status when the price list still lives in a sheet is in [Excel or software](/blog/excel-ili-softver-za-prodaju-novogradnje).",
        },
        {
          type: "h2",
          id: "agencija-i-referral",
          text: "Whose buyer it is when they arrived through a link",
        },
        {
          type: "p",
          text: "A public link with no agency mark eats the commission. The buyer “found the unit alone”, and the agency that sent the link leaves no trace. A referral code on the link or the QR ties the request to that agency before anyone types a name into a sheet. The deposit code and the agency code are not the same thing. One fills the payment order. The other remembers who brought the buyer.",
        },
        {
          type: "p",
          text: "The commission rule and the amount locked on the day of the contract are not part of the QR code. They sit on the sale. If you mix them, the agent will expect the code to calculate something the code does not do. The calculation is in the piece on [agency commission](/blog/provizije-agencija-za-novogradnju), and the agency’s view is on the [page for agencies](/za-agencije).",
        },
        {
          type: "h2",
          id: "sta-kod-ne-radi",
          text: "What the code does not do for the accountant",
        },
        {
          type: "p",
          text: "An IPS QR does not send an invoice to SEF. It does not close VAT. It does not confirm a contract. It does not know whether the buyer is the person allowed to sign. It removes retyping the deposit order. Everything else still follows your order: the statement, accepting the request, the buyer’s details, then the contract. How the deposit, the installments, and the last payment are kept as lines whose sum matches the price is in the piece on a [payment schedule](/blog/plan-placanja-rate-za-stan). The e-invoice portal stays a manual step, at [efaktura.gov.rs](https://www.efaktura.gov.rs/).",
        },
        {
          type: "p",
          text: "The reservation deadline does not extend because someone scanned a code at midnight. If the deadline is three days and the money lands on the fourth, it is your decision whether you accept the request or return the unit to the offer. The system should show you both dates. It should not assume a scan equals a payment.",
        },
        {
          type: "h2",
          id: "podaci-kupca",
          text: "The code goes out only when you know who the order is for",
        },
        {
          type: "p",
          text: "The form on the public link is not a buyer check. It is enough for the request to have a name, a contact and a unit. The contract still waits for the documents your process requires. If you release a contract as soon as the code is scanned, you skipped a check that costs more than the deposit itself. What sits on that list before signature is in the piece on [buyer checks](/blog/kyc-kupca-pre-ugovora-o-stanu).",
        },
        {
          type: "p",
          text: "The buyer on the link leaves data you keep for a purpose and a limit. That is not a chat note nobody deletes. The policy is on the [privacy page](/privatnost). If you reject the request, you still know what you received and why. If you accept it, those details move onto the buyer record, and do not stay only in an agent’s inbox.",
        },
        {
          type: "h2",
          id: "the-morning-after",
          text: "The morning after the payment",
        },
        {
          type: "p",
          text: "The next morning does not start from whether the phone beeped. It starts from the statement. On it you look for the amount, the reference and the payment that belongs to one request. If the three match, you confirm the deposit and the status may move on. If the amount differs because the buyer paid euros at a rate from a search, that is not the same deposit. The code carried the amount you locked. The difference stays to be settled before you mark the unit paid.",
        },
        {
          type: "p",
          text: "The reference is the link between the payment and the unit, not decoration on the order. If the buyer retypes the account by hand and misses the reference, the money can land on the right account and you still do not know whose it is. That is why the code exists: so the reference is not typed. When a payment appears without a match, you do not change the status just to make the unit look taken. You find the payment, then you tie it to the request. A taken unit without a clear payment is a hold without a trail, and tomorrow nobody knows whether it may be released.",
        },
        {
          type: "p",
          text: "Several requests for the same unit still do not open several holds. If the first buyer paid, the second request stays rejected even if that buyer also scanned a code before you confirmed the statement. A scan is not a place in line. The line is one active reservation. Confirming the payment is your step after the statement, described on [reservations and payments](/rezervacije-i-uplate).",
        },
        {
          type: "p",
          text: "That morning is not invoice day either. A deposit on the statement sends nothing to SEF and does not close the installment schedule. It closes the first line if you recorded it that way. The other installments still have their own dates. How that list looks when the sum has to match the price is in the piece on a [payment schedule](/blog/plan-placanja-rate-za-stan). The IPS QR did the copying of the order. The rest of the day is still yours.",
        },
        {
          type: "h2",
          id: "sta-ostaje-vama",
          text: "What to set before the first public link",
        },
        {
          type: "p",
          text: "Before a link goes into an advert, the payee account, the deposit amount, the reservation deadline and the rule that one unit is free for one hold all have to be in place. The wider frame, from inventory to contract, is on [new-build sales](/prodaja-novogradnje). Package prices and early access until 15 November 2026 are on the [pricing section](/#cenovnik).",
        },
        {
          type: "p",
          text: "The shortest way to see the link, the code and the confirmation on your own unit is a [25-minute demo](/demo). Bring one unit, one deposit amount and one account. You do not need the whole history of the building to see whether the buyer has stopped retyping the reference.",
        },
      ],
    },
  },
};
