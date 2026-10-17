import type { BlogPost } from "@/features/marketing/blog/types";

export const paymentsPost: BlogPost = {
  slug: "evidencija-uplata-za-stanove",
  published: "2026-10-03",
  modified: "2026-10-05",
  minutes: 9,
  coverFile: "evidencija-uplata-za-stanove.webp",
  copy: {
    sr: {
      title: "Evidencija uplata za stanove: ko je platio, a ko kasni",
      description:
        "Evidencija uplata za stanove ide na stavke plana. Uplata ne sme preko stavke. Izvod potvrđujete vi. SEF ostaje ručan.",
      excerpt:
        "Zbir stavki mora da odgovara ceni. Uplata ne prelazi stavku. Kurs unosite vi, a izvod potvrđujete ručno.",
      dateLabel: "3. oktobar 2026.",
      coverAlt: "Lista rata za stan sa uplaćenim i otvorenim iznosom, bez imena kupca na ekranu",
      blocks: [
        {
          type: "p",
          text: "Evidencija uplata za stanove odgovara na pitanje koje Excel ostavlja za kraj meseca: ko je platio koju ratu, koliko je ostalo, i koja prodaja kasni. Odgovor nije zbir na računu. Račun je jedan za više stanova. Odgovor je stavka plana na konkretnoj prodaji, sa iznosom koji je tim vezao za tu stavku, i sa potvrdom da je izvod stvarno tako pokazao.",
        },
        {
          type: "p",
          text: "Ovaj tekst prati ono što sistem radi. Ne računa zateznu kamatu, ne kaže kada potraživanje zastareva, i ne šalje opomenu umesto vas. Plan se pravi tako da zbir stavki odgovara ceni. Uplata ne sme da pređe iznos stavke. To su dva pravila koja skidaju tabelu u kojoj ista rata stoji kao plaćena u jednom listu i otvorena u drugom. Kako se plan slaže opisano je u tekstu o [planu plaćanja](/blog/plan-placanja-rate-za-stan).",
        },
        {
          type: "h2",
          id: "stavka",
          text: "Uplata sedi na stavci, ne na celom stanu",
        },
        {
          type: "p",
          text: "Kupac retko plati ceo stan odjednom. Plaća kaparu, pa ratu po osnovu, pa ratu po završetku krova, pa ostatak pred primopredaju. Ako sve to upišete kao jedan iznos „uplaćeno“, ne znate koja je stavka zatvorena. Sutra finansije pitaju da li je krov plaćen ili je plaćena samo kapara. Bez stavke nema odgovora, ima samo saldo koji svako čita drugačije.",
        },
        {
          type: "p",
          text: "Zato evidencija ide na stavku. Kapara je stavka. Rata je stavka. Ako uplata pokriva dve stavke, deli se. Ako je manja od stavke, stavka ostaje delimično otvorena. Ako neko pokuša da na stavku veže više nego što stavka traži, sistem to ne prima. Višak nije „avans za sledeći mesec“ dok ga ne stavite na sledeću stavku. Tako se ne desi da jedna rata izgleda preplaćena, a sledeća nestane iz zbira.",
        },
        {
          type: "figure",
          file: "evidencija-rate.webp",
          alt: "Plan plaćanja stana sa zatvorenom kaparom i otvorenom sledećom ratom",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "Zbir stavki odgovara ceni te prodaje.",
            "Jedna uplata ne prelazi iznos stavke na koju je vezana.",
            "Delimična uplata ostavlja ostatak na istoj stavci.",
            "Višak ide na sledeću stavku, ne u napomenu.",
          ],
        },
        {
          type: "h2",
          id: "izvod",
          text: "Izvod potvrđuje čovek, ne fajl",
        },
        {
          type: "p",
          text: "Uvoz izvoda donosi redove. Red nije knjiženje. Ime uplatilaca može da liči na kupca, poziv na broj može da liči na stan, a iznos može da pokrije dve rate odjednom. Tim gleda red i vezuje ga. Dok to ne uradite, evidencija te prodaje se nije promenila. To je namerno. Automatsko slaganje po sličnom imenu pravi tihu grešku koju vidite tek kad kupac dođe po ključeve.",
        },
        {
          type: "p",
          text: "Isto važi za IPS QR na kapari. Kupac može da plati sa linka. Zahtev stiže. Uplata u evidenciji postoji kad je potvrdite prema izvodu, ne kad je QR prikazan. Taj tok je na stranici [rezervacija stana](/rezervacije-i-uplate) i u tekstu o [IPS kapari](/blog/ips-qr-kapara-online-rezervacija-stana). QR skraćuje uplatu. Ne zatvara stavku sam.",
        },
        {
          type: "figure",
          file: "evidencija-potvrda.webp",
          alt: "Red izvoda pored stavke plana, pre nego što je tim potvrdio vezivanje",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Ako je cena u evrima, a uplata stigla u dinarima, koristite kurs koji ste uneli za tu prodaju. Sistem ne povlači srednji kurs Narodne banke umesto vas. Ako kurs tog dana niste uneli, ne pretvarajte dinar u evro „otprilike“. Ostavite uplatu dok kurs ne stoji u kartici. Inače će zbir stavki u evrima i zbir uplata u dinarima da se raziđu bez traga zašto.",
        },
        {
          type: "h2",
          id: "ko-kasni",
          text: "Ko kasni vidi se po otvorenoj stavci",
        },
        {
          type: "p",
          text: "Kašnjenje nije osećaj da kupac „dugo nije javio“. Kašnjenje je stavka čiji je rok prošao, a iznos nije zatvoren. Ujutru je to lista, ne pretraga po mejlu. Prodavac vidi svoje prodaje. Finansije vide objekat. Agencija vidi status uplata na prodajama koje su njene, da zna da li provizija uopšte ima o čemu da se razgovara. Iznos provizije se time ne računa ponovo. On je zaključan na ugovoru.",
        },
        {
          type: "p",
          text: "Podsetnik kupcu mejlom, da rata dospeva, još nije uključen. Tim i dalje dobija svoj signal. Ne pišite kupcu da će sistem sam da ga podseti. Dok to nije uključeno, podsetnik je vaš poziv ili vaš mejl. Evidencija vam kaže koga da zovete. Ne zove umesto vas.",
        },
        {
          type: "h2",
          id: "sef",
          text: "SEF i faktura nisu isto što i evidencija rate",
        },
        {
          type: "p",
          text: "Stavka plana kaže šta je dogovoreno i šta je plaćeno. Faktura i slanje na SEF su drugi posao. PropertyDesk ne šalje fakturu sam na portal. Status eFakture pratite vi, ručno. Ako u razgovoru sa kupcem pomešate „rata je evidentirana“ i „faktura je poslata na SEF“, sutra će tražiti dokument koji niste ni otvorili na portalu. Držite te dve rečenice odvojene i u govoru i u kartici.",
        },
        {
          type: "p",
          text: "Profaktura sa IPS QR može da stoji kao nalog za uplatu. Kad novac legne i vi ga vežete za stavku, evidencija je ažurirana. PDF fakture, ako ga izdajete, i dalje ide kroz vaš tok, ne kroz automatsko slanje. Ne obećavajte na ponudi da je eFaktura uključena. Nije.",
        },
        {
          type: "ul",
          items: [
            "Potvrda izvoda je ručna.",
            "Kurs EUR/RSD unosite vi.",
            "Uplata ne prelazi stavku.",
            "SEF se ne šalje sam.",
            "Podsetnik kupcu mejlom još nije uključen.",
          ],
        },
        {
          type: "h2",
          id: "kraj-meseca",
          text: "Šta zatvoriti pre kraja meseca",
        },
        {
          type: "p",
          text: "Pre kraja meseca ne pravite novu tabelu „van sistema“ da biste direktoru rekli naplatu. Otvorite stavke kojima je rok prošao. Vežite redove izvoda koji još stoje nevezani. Ako zbir stavki na jednoj prodaji ne odgovara ceni, plan nije zatvoren i evidencija te prodaje nije spremna za izveštaj. Popravite plan pre nego što objašnjavate saldo.",
        },
        {
          type: "p",
          text: "Primopredaja ne zatvara ratu. Čekirani ključevi ne znače da je poslednja stavka plaćena. Ako predajete stan dok jedna rata stoji otvorena, to je odluka, i obe stvari ostaju vidljive: lista predaje na prodaji i otvorena stavka u evidenciji. Tekst o [primopredaji](/blog/primopredaja-stana) drži obilazak. Ovaj drži novac. Ne spajajte ih u jednu boju u tabeli.",
        },
        {
          type: "h2",
          id: "vise-kupaca",
          text: "Više kupaca na istom objektu ne deli jedan saldo",
        },
        {
          type: "p",
          text: "Na objektu od pedeset stanova lako je gledati jedan zbir na računu i reći da je mesec dobar. Taj zbir ne kaže koji kupac kasni, ni koja rata krova još nije vezana. Evidencija se čita po prodaji. Ako tri kupca plate istog dana, to su tri vezivanja, čak i kad je izvod jedan fajl. Ako jedan kupac plati za dva stana istom uplatom, iznos se deli na dve prodaje i na njihove stavke. Ne ostavljajte ga na prvom stanu zato što je poziv na broj ličio na taj lokal. Drugi stan sutra izgleda kao da nije plaćen, a novac je već ušao.",
        },
        {
          type: "p",
          text: "Isto proverite kad agencija javi da je kupac platio njoj, a ne na vaš račun. To nije red u vašem izvodu. Ne zatvarajte stavku dok novac nije kod vas ili dok nemate jasan dogovor koji je već u kartici, a ne u poruci. Poruka „kupac je platio meni“ nije evidencija. Evidencija je stavka sa iznosom i potvrdom. Dok toga nema, rata stoji otvorena i tako treba da stoji u izveštaju, čak i ako je razgovor u kancelariji zvučao kao da je sve sređeno.",
        },
        {
          type: "p",
          text: "Kad u ponedeljak pravite spisak za pozive, krenite od stavki kojima je rok prošao, ne od kupaca koji su se poslednji javili. Ko se javio može i dalje da kasni sa krovom. Ko se nije javio može da ima kaparu zatvorenu i sledeću ratu koja još nije dospela. Lista to razdvaja. Ako je rok sutra, stavka još nije kašnjenje. Ne zovite je kašnjenjem u izveštaju. Zovite je onim što jeste: otvorena, u roku. To je dovoljno da direktor vidi razliku između naplate i dogovora.",
        },
        {
          type: "p",
          text: "Garaža koja se plaća posebno ima svoju stavku na svojoj prodaji. Ne gurajte je u ratu stana da bi zbir izgledao kao jedna cifra iz oglasa. Oglas može da kaže paket. Evidencija i dalje zna šta je stan, a šta je parking.",
        },
        {
          type: "p",
          text: "Ako kupac plati više od jedne stavke istom uplatom, podelite iznos redom kojim stavke dospevaju, osim ako je na izvodu jasno da je plaćena tačno jedna rata. Ne razbacujte višak „gde ima mesta“. Mesta ima na sledećoj otvorenoj stavci, do njenog iznosa, i ništa preko. Ako posle toga ostane dinar ili evro koji ne staje, ostavite ga kao nevezan ostatak dok ne odlučite da li je preplata, pogrešan iznos ili kapara za drugi stan istog kupca. Ta odluka je rečenica u kartici, ne formula koja se sama doseti. Sutra će neko drugi čitati isti red. Ako ostatak nema objašnjenje, ponovo će ga lepiti na pogrešan stan.",
        },
        {
          type: "p",
          text: "Na kraju nedelje prebrojte nevezane redove izvoda. Svaki red koji stoji je novac koji još nije na stavci. Nije izgubljen na računu. Izgubljen je za izveštaj, jer izveštaj gleda vezano. Pet minuta vezivanja vredi više od nove tabele. Ako red ne možete da prepoznate, ostavite ga nevezanog i pitajte, umesto da ga zalepite na stan čije ime liči. Pogrešno vezivanje se teže skida nego prazan red. Prazan red se vidi. Pogrešan stan izgleda sređeno.",
        },
        {
          type: "p",
          text: "Kad izveštaj za direktora traži „koliko je naplaćeno na ovom objektu“, odgovor je zbir vezanih uplata u periodu, ne zbir obećanja iz predugovora. Obećanje je plan. Naplata je evidencija. Razlika između njih je posao te nedelje, i jedino mesto gde se vidi ko kasni a da niko ne prebrojava redove u fajlu koji se zove final.",
        },
      ],
    },
    en: {
      title: "A payment record for apartments: who paid, and who is late",
      description:
        "Apartment payments sit on plan lines. A payment cannot exceed the line. You confirm the statement. SEF stays manual.",
      excerpt:
        "The lines must add up to the price. A payment does not exceed the line. You enter the rate, and you confirm the statement by hand.",
      dateLabel: "3 October 2026",
      coverAlt:
        "An apartment installment list with a paid amount and an open amount, with no buyer name on screen",
      blocks: [
        {
          type: "p",
          text: "A payment record for apartments answers the question Excel leaves for the end of the month: who paid which installment, how much is left, and which sale is late. The answer is not the balance on the bank account. The account is one account for many apartments. The answer is a line on the plan of a specific sale, with the amount the team tied to that line, and with a confirmation that the statement really showed it.",
        },
        {
          type: "p",
          text: "This note follows what the system does. It does not calculate default interest, it does not say when a claim expires, and it does not send a reminder instead of you. The plan is built so the lines add up to the price. A payment must not exceed the line. Those two rules remove the spreadsheet where the same installment is paid on one sheet and open on another. How the plan is assembled is described in the note on the [payment plan](/blog/plan-placanja-rate-za-stan).",
        },
        {
          type: "h2",
          id: "the-line",
          text: "A payment sits on a line, not on the whole apartment",
        },
        {
          type: "p",
          text: "A buyer rarely pays the whole apartment at once. They pay a deposit, then an installment for the foundation, then one for the roof, then the rest before handover. If you write all of that as one amount called paid, you do not know which line is closed. Tomorrow finance asks whether the roof was paid or only the deposit. Without a line there is no answer, only a balance everyone reads differently.",
        },
        {
          type: "p",
          text: "The record therefore sits on the line. The deposit is a line. The installment is a line. If a payment covers two lines, it is split. If it is smaller than the line, the line stays partly open. If someone tries to tie more to a line than the line asks for, the system does not accept it. The extra is not “an advance for next month” until you put it on the next line. That is how one installment does not look overpaid while the next one disappears from the total.",
        },
        {
          type: "figure",
          file: "evidencija-rate.webp",
          alt: "An apartment payment plan with the deposit closed and the next installment still open",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "The lines add up to the price of that sale.",
            "One payment does not exceed the line it is tied to.",
            "A partial payment leaves the rest on the same line.",
            "The extra goes to the next line, not into a note.",
          ],
        },
        {
          type: "h2",
          id: "the-statement",
          text: "A person confirms the statement, not the file",
        },
        {
          type: "p",
          text: "Importing a statement brings rows. A row is not a booking. The payer’s name can look like the buyer, the reference can look like the apartment, and the amount can cover two installments at once. The team looks at the row and ties it. Until you do that, the record of that sale has not changed. That is deliberate. Automatic matching on a similar name makes a quiet error you see only when the buyer comes for the keys.",
        },
        {
          type: "p",
          text: "The same applies to an IPS QR on the deposit. The buyer can pay from the link. The request arrives. The payment exists in the record when you confirm it against the statement, not when the QR is shown. That path is on the [apartment reservation](/rezervacije-i-uplate) page and in the note on the [IPS deposit](/blog/ips-qr-kapara-online-rezervacija-stana). The QR shortens the payment. It does not close the line by itself.",
        },
        {
          type: "figure",
          file: "evidencija-potvrda.webp",
          alt: "A statement row next to a plan line, before the team has confirmed the match",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "If the price is in euros and the payment arrived in dinars, use the rate you entered for that sale. The system does not pull the National Bank middle rate instead of you. If you have not entered that day’s rate, do not turn dinars into euros “roughly”. Leave the payment until the rate is on the card. Otherwise the total of the lines in euros and the total of the payments in dinars will diverge with no trail of why.",
        },
        {
          type: "h2",
          id: "who-is-late",
          text: "Who is late shows on the open line",
        },
        {
          type: "p",
          text: "Being late is not a feeling that the buyer “has not called for a while”. Being late is a line whose date has passed and whose amount is not closed. In the morning that is a list, not a search through email. The salesperson sees their sales. Finance sees the building. The agency sees the payment status on the sales that are theirs, so they know whether there is anything to discuss about commission. The commission amount is not recalculated by that. It is locked on the contract.",
        },
        {
          type: "p",
          text: "An email reminder to the buyer, that an installment is due, is not switched on yet. The team still gets its own signal. Do not tell the buyer the system will remind them by itself. Until that is switched on, the reminder is your call or your email. The record tells you whom to call. It does not call instead of you.",
        },
        {
          type: "h2",
          id: "sef",
          text: "SEF and the invoice are not the installment record",
        },
        {
          type: "p",
          text: "A plan line says what was agreed and what was paid. The invoice and sending it to SEF are a different job. PropertyDesk does not send an invoice to the portal by itself. You track the e-invoice status yourself, manually. If in a conversation with the buyer you mix “the installment is recorded” and “the invoice was sent to SEF”, tomorrow they will ask for a document you have not even opened on the portal. Keep those two sentences separate, in speech and on the card.",
        },
        {
          type: "p",
          text: "A proforma with an IPS QR can stand as a payment instruction. When the money lands and you tie it to the line, the record is up to date. The invoice PDF, if you issue one, still goes through your own path, not through automatic sending. Do not promise on the offer that e-invoicing is switched on. It is not.",
        },
        {
          type: "ul",
          items: [
            "Statement confirmation is manual.",
            "You enter the EUR/RSD rate.",
            "A payment does not exceed the line.",
            "SEF is not sent by itself.",
            "An email reminder to the buyer is not switched on yet.",
          ],
        },
        {
          type: "h2",
          id: "month-end",
          text: "What to close before the end of the month",
        },
        {
          type: "p",
          text: "Before the end of the month, do not build a new spreadsheet “outside the system” to tell the director what was collected. Open the lines whose date has passed. Tie the statement rows that are still untied. If the lines on one sale do not add up to the price, the plan is not closed and the record of that sale is not ready for a report. Fix the plan before you explain the balance.",
        },
        {
          type: "p",
          text: "Handover does not close an installment. Ticked keys do not mean the last line was paid. If you hand over an apartment while one installment is still open, that is a decision, and both things stay visible: the handover list on the sale and the open line in the record. The note on [handover](/blog/primopredaja-stana) keeps the visit. This one keeps the money. Do not merge them into one colour in a spreadsheet.",
        },
        {
          type: "h2",
          id: "several-buyers",
          text: "Several buyers on one building do not share one balance",
        },
        {
          type: "p",
          text: "On a building of fifty apartments it is easy to look at one bank balance and say the month was good. That total does not say which buyer is late, or which roof installment is still untied. The record is read per sale. If three buyers pay on the same day, that is three matches, even when the statement is one file. If one buyer pays for two apartments with one payment, the amount is split across two sales and their lines. Do not leave it on the first apartment because the reference looked like that unit. The second apartment will look unpaid tomorrow, while the money has already arrived.",
        },
        {
          type: "p",
          text: "Check the same thing when an agency says the buyer paid them, not your account. That is not a row on your statement. Do not close the line until the money is with you, or until there is a clear agreement already on the card, not in a message. A message that says the buyer paid the agency is not the record. The record is a line with an amount and a confirmation. Until that exists, the installment stays open, and it should stay open in the report, even if the conversation in the office sounded finished.",
        },
        {
          type: "p",
          text: "When the director’s report asks how much was collected on this building, the answer is the total of tied payments in the period, not the total of promises in the pre-contract. The promise is the plan. The collection is the record. The gap between them is the work of that week, and the only place you see who is late without counting rows in a file called final.",
        },
      ],
    },
  },
};
