import type { BlogPost } from "@/features/marketing/blog/types";

export const paymentPlanPost: BlogPost = {
  slug: "plan-placanja-rate-za-stan",
  published: "2026-09-22",
  modified: "2026-10-03",
  minutes: 9,
  coverFile: "plan-placanja-rate-za-stan.webp",
  copy: {
    sr: {
      title: "Plan plaćanja i rate za stan u novogradnji",
      description:
        "Kapara, rate i poslednja uplata na kartici prodaje. Plan pamti dogovorene iznose. Izvod i dalje potvrđujete vi.",
      excerpt:
        "Deset kolona u Excelu nije plan. Plan je spisak iznosa i rokova čiji zbir odgovara ceni stana.",
      dateLabel: "22. septembar 2026.",
      coverAlt:
        "Plan plaćanja stana sa kaparom i ratama pored kartice jedinice, bez pravih izvoda banke",
      blocks: [
        {
          type: "p",
          text: "Plan plaćanja za stan je dogovor koji kupac ponavlja na svakom sastanku: kolika je kapara, koliko ima rata, i kada je poslednja uplata. U praksi taj dogovor živi u Excelu sa deset kolona, u mejlu agencije i u glavi čoveka koji prati izvod. Tri mesta, tri zbira. Nijedan ne zna da li je rata već evidentirana.",
        },
        {
          type: "p",
          text: "Ovaj tekst je o planu na kartici prodaje. Ne bira vam broj rata i ne kaže da li ugovor sme da veže kupca za taj raspored. To ostaje na vama. PropertyDesk pamti stavke čiji zbir odgovara ceni, rok svake stavke, i uplatu koja ne sme da pređe iznos te stavke. Ne čita izvod umesto vas i ne šalje fakturu na SEF.",
        },
        {
          type: "h2",
          id: "plan-nije-tabela",
          text: "Plan nije Excel sa deset kolona",
        },
        {
          type: "p",
          text: "Kolona „rata 3“ u tabeli nema vezu sa uplatom koju ste juče ukucali u drugi list. Nema ni vezu sa cenom koja je u međuvremenu promenjena. Zbir rata može da se raziđe od cene stana, i to niko ne vidi dok knjigovođa ne sabere ručno. Plan na prodaji ima jedan zadatak: stavke i cena moraju da se poklope.",
        },
        {
          type: "p",
          text: "Šablon plana pomaže kad isti raspored koristite na više stanova. I dalje ga vi primenite na tu prodaju. Šablon nije ugovor. Ako se cena jedinice promeni pre potpisa, plan mora da prati novu cifru, ne stari šablon koji je ostao sačuvan. Ta cifra dolazi sa kartice, a kako se do nje dolazi piše u tekstu o [cenovniku stana u evrima](/blog/cenovnik-stana-u-evrima).",
        },
        {
          type: "figure",
          file: "plan-placanja-stavke.webp",
          alt: "Stavke plana plaćanja čiji zbir odgovara ceni stana, sa rokovima i bez imena kupca",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "Zbir stavki odgovara ceni prodaje, ne otprilike.",
            "Svaka stavka ima iznos i rok.",
            "Uplata na stavku ne sme da pređe iznos te stavke.",
            "Šablon se primenjuje na prodaju, ne živi sam kao ugovor.",
          ],
        },
        {
          type: "p",
          text: "Jednake rate su zgodne kad je raspored isti na celom ulazu. I tada zbir mora da pogodi cenu tog stana, ne cenu komšijskog. Prva rata može da bude kapara, a ostale jednake, ili svaka stavka može da ima svoj iznos i svoj rok. Bitno je da se te stavke ne prepisuju ručno u drugi fajl čim ugovor izađe. Ako knjigovođa i dalje vodi „pravi“ plan u tabeli, kartica prodaje opet postaje kopija. Kopija zastareva istog dana kad neko unese uplatu samo na jednom mestu.",
        },
        {
          type: "p",
          text: "Kupac koji pita koliko je ostalo ne treba da dobije snimak ekrana od pre dve nedelje. Na kartici se vidi koja je stavka zatvorena, koja je delimično evidentirana, i kojoj je rok prošao. To nije opomena i nije kamata. To je odgovor koji prodaja može da da bez da sabira kolone. Agencija, ako uopšte vidi taj plan, vidi dogovor vezan za svoj zahtev. Ne vidi tuđu prodaju na istom spratu i ne vidi interni komentar uz kurs. Kad ista agencija vodi tri stana, svaki plan ostaje na svojoj prodaji. Zbir jednog stana ne prelazi u drugi. Ako kupac uzme i garažu, garaža ima svoju cenu i, kad dogovor tako stoji, svoju stavku. Ne skriva se u napomeni uz stan.",
        },
        {
          type: "h2",
          id: "kapara-rate-kraj",
          text: "Kapara, rate i kraj",
        },
        {
          type: "p",
          text: "Kupac razume tri dela: kapara da stan ostane njegov, rate dok traje gradnja ili dogovoreni rok, i poslednja uplata. Kancelarija mora da vidi iste delove kao stavke, ne kao rečenicu u napomeni. Kapara nije „otprilike deset odsto“ u četu. Ona je prva stavka, sa iznosom i rokom.",
        },
        {
          type: "p",
          text: "Dok je stan samo na holdu, plan još nije dokaz da je novac legao. Hold čeka uplatu. Status se menja kad vi potvrdite da je kapara na računu. Kako kupac dobija IPS QR za tu kaparu, bez prekucavanja poziva na broj, piše u tekstu o [IPS QR kapari](/blog/ips-qr-kapara-online-rezervacija-stana). Skeniranje puni nalog. Ne zatvara stavku.",
        },
        {
          type: "figure",
          file: "plan-placanja-kapara-rate.webp",
          alt: "Kapara kao prva stavka plana, pa rate sa rokovima, pored javnog linka stana bez pravog računa",
          width: 1600,
          height: 900,
        },
        {
          type: "h2",
          id: "dogovoreno-i-uplaceno",
          text: "Šta je uplaćeno, a šta je samo dogovoreno",
        },
        {
          type: "p",
          text: "Dogovorena rata i evidentirana uplata nisu isto polje. Plan kaže koliko treba da legne i do kog datuma. Uplata kaže koliko ste vi zapisali da je leglo, i na koju stavku. Ako uplata prelazi iznos stavke, zapis staje. Ostatak ne sme tiho da se prelije u sledeću ratu bez traga.",
        },
        {
          type: "p",
          text: "Izvod i dalje čitate vi. Sistem ne povlači promet sa računa i ne zna da je kupac platio ako to niste potvrdili. Javni link i lista zahteva pokazuju ko je krenuo. Potvrda je na vama. Tok je na stranici [rezervacije i uplate](/rezervacije-i-uplate). Status stana se ne pretvara u „kapara uplaćena“ zato što je kod prikazan na ekranu.",
        },
        {
          type: "h2",
          id: "kurs-koji-unosite",
          text: "Kurs koji ste vi uneli",
        },
        {
          type: "p",
          text: "Oglas je u evrima. Nalog za kaparu je u dinarima. Plan u evrima i nalog u dinarima moraju da potiču od kursa koji ste za tu prodaju zaključali. Srednji kurs Narodna banka Srbije objavljuje javno. Vi ga unosite. Lista je na [kursnoj listi NBS](https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate). PropertyDesk taj kurs ne vuče sam.",
        },
        {
          type: "p",
          text: "Ako danas promenite kurs u glavi, a kod za kaparu je generisan juče, to su dva iznosa. Stavka plana i kod moraju da prate iznos te rezervacije. Kupac u aplikaciji vidi iznos koji potvrđuje. Ne množi evro kursom iz pretrage i ne dobija drugi zbir od onog na kartici.",
        },
        {
          type: "h2",
          id: "plan-ne-salje-fakturu",
          text: "Plan ne šalje fakturu",
        },
        {
          type: "p",
          text: "Rata na planu nije eFaktura. Nije ni PDV prijava. Portal za elektronske fakture ostaje ručni korak, na [efaktura.gov.rs](https://www.efaktura.gov.rs/). Plan vam da zbir i rokove koje unosite u taj korak. Ne šalje dokument Ministarstvu finansija i ne zatvara poreski tretman umesto vas.",
        },
        {
          type: "p",
          text: "Isto važi za ugovor. Plan može da uđe u dokument kao spisak stavki, ali potpis i dalje traži fajl i kupca sa zatvorene liste. Šta mora da stoji na kupcu pre nego što ugovor izađe, piše u tekstu o [KYC kupca](/blog/kyc-kupca-pre-ugovora-o-stanu). Kartica kupca i plan sede na istoj prodaji, na [CRM-u za investitore](/crm-za-investitore).",
        },
        {
          type: "h2",
          id: "koliko-je-ostalo",
          text: "Kad kupac pita koliko je ostalo",
        },
        {
          type: "p",
          text: "Pitanje „koliko još treba da uplatim“ ne sme da traži deset minuta sabiranja. Na kartici se vidi koja je stavka zatvorena, koja je delimično evidentirana i koliki je zbir onoga što još nije leglo. Taj zbir je dogovoreni ostatak, ne izvod koji još niste pogledali. Ako kupac tvrdi da je platio, a stavka je i dalje otvorena, prvo ide izvod, pa evidencija. Ne obrnuto, da bi razgovor bio lakši.",
        },
        {
          type: "p",
          text: "Odgovor kupcu je jednostavan: ove stavke su zatvorene, ova još nije, rok je ovaj datum. Ne šaljete mu interni komentar, ni tuđu ratu, ni kursnu belešku. Ako plan ima šablon koji ste primenili na više stanova, ostatak i dalje pripada samo ovoj prodaji. Komšijski stan ima svoj zbir. Mešanje ta dva zbira je način da oba kupca dobiju pogrešan ostatak.",
        },
        {
          type: "p",
          text: "Agencija koja je dovela kupca može da pita isto, ali vidi dogovor vezan za svoj zahtev. Ne vidi cele rate drugih prodaja na ulazu. Ako partner traži tabelu svih uplata objekta, to više nije pitanje ovog kupca. To je interni pregled investitora. Stranica [za investitore](/za-investitore) razdvaja ta dva pogleda. Plan na prodaji služi da oba odgovora krenu od istih stavki, ne od dva Excel lista.",
        },
        {
          type: "p",
          text: "Ostatak na planu nije opomena i nije kamata. Ako rata kasni, to vidite kao otvorenu stavku posle roka, pa razgovarate sa kupcem onako kako vaš ugovor kaže. Sistem ne šalje opomenu sam i ne računa zateznu kamatu. On drži datum i iznos na mestu gde ih prodaja vidi pre nego što kupac nazove. Kad nazove, ne otvarate fajl od pre tri nedelje da biste mu rekli broj. Ako je u međuvremenu uplata evidentirana na pogrešnu stavku, ispravka ostaje na toj prodaji, sa tragom, pre nego što kupcu kažete novi ostatak. Dva ostatka u istom razgovoru znače da kartica nije bila spremna. Kartica treba da bude spremna pre poziva, ne tokom njega. Garaža, ako ide uz stan, ima svoj ostatak ako ima svoj plan. Ne krijete je u rečenici „otprilike još ovoliko“. Kupac koji pita za oba treba da čuje dva zbira ili jedan zbir koji je sabran iz dve kartice, ne iz glave. Ako garaža još nije na prodaji, ne recite da je uračunata. Recite da nije deo ovog plana. To je kraći razgovor od naknadnog objašnjenja zašto uplata ne pokriva parking, garažno mesto, ostavu ili bilo koju drugu pomoćnu jedinicu na istom projektu.",
        },
        {
          type: "h2",
          id: "kad-rata-kasni",
          text: "Kad rata kasni",
        },
        {
          type: "p",
          text: "Rok na stavci je datum koji možete da vidite, ne rečenica „javite se kad legne“. Kasnjenje se vidi kao stavka kojoj je rok prošao, a uplata nije zatvorila iznos. To nije automatska opomena kupcu i nije kamata. To je red na kartici da prodaja ne čeka da neko prelista izvod od pre tri nedelje.",
        },
        {
          type: "p",
          text: "Plan ne zamenjuje razgovor sa kupcem i ne bira šta ugovor kaže o docnji. On drži dogovorene iznose na jednom mestu, pored statusa stana i pored cene. Cene paketa su na [cenovniku](/#cenovnik). Rani pristup traje do 15.11.2026. Ako hoćete da vidite zbir rata na jednoj prodaji, to je deo [demoa od 25 minuta](/demo).",
        },
      ],
    },
    en: {
      title: "A payment schedule and installments for a new-build apartment",
      description:
        "The deposit, the installments, and the last payment sit on the sale. The schedule stores the agreed amounts. You still confirm the statement.",
      excerpt:
        "Ten columns in a spreadsheet are not a schedule. A schedule is a list of amounts and dates whose sum matches the price.",
      dateLabel: "22 September 2026",
      coverAlt:
        "An apartment payment schedule with a deposit and installments beside the unit card, with no real bank statements",
      blocks: [
        {
          type: "p",
          text: "A payment schedule is the agreement the buyer repeats in every meeting: how large the deposit is, how many installments there are, and when the last payment falls. In practice that agreement lives in a spreadsheet with ten columns, in the agency’s email, and in the head of the person who watches the statement. Three places, three totals. None of them knows whether an installment was already recorded.",
        },
        {
          type: "p",
          text: "This piece is about the schedule on the sale record. It does not choose the number of installments and it does not say whether the contract may bind the buyer to that split. That stays with you. PropertyDesk remembers lines whose sum matches the price, the due date of each line, and a payment that must not exceed that line. It does not read the statement for you and it does not send an invoice to SEF.",
        },
        {
          type: "h2",
          id: "not-a-spreadsheet",
          text: "A schedule is not a spreadsheet with ten columns",
        },
        {
          type: "p",
          text: "A column labeled “installment 3” has no link to the payment you typed yesterday on another sheet. It has no link to a price that changed in the meantime. The sum of the installments can drift away from the apartment price, and nobody sees it until someone adds the column by hand. A schedule on the sale has one job: the lines and the price have to match.",
        },
        {
          type: "p",
          text: "A schedule template helps when you use the same split on many units. You still apply it to that sale. A template is not a contract. If the unit price changes before signing, the schedule has to follow the new figure, not an old template left saved. That figure comes from the unit record, and how you get to it is in the piece on a [euro price list](/blog/cenovnik-stana-u-evrima).",
        },
        {
          type: "figure",
          file: "plan-placanja-stavke.webp",
          alt: "Payment-schedule lines whose sum matches the apartment price, with due dates and no buyer name",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "The sum of the lines matches the sale price, not roughly.",
            "Each line has an amount and a due date.",
            "A payment on a line must not exceed that line.",
            "A template is applied to a sale. It does not live on its own as a contract.",
          ],
        },
        {
          type: "h2",
          id: "deposit-installments-end",
          text: "Deposit, installments, and the end",
        },
        {
          type: "p",
          text: "The buyer understands three parts: a deposit so the unit stays theirs, installments while construction or the agreed period runs, and a last payment. The office has to see the same parts as lines, not as a sentence in a note. The deposit is not “about ten percent” in a chat. It is the first line, with an amount and a due date.",
        },
        {
          type: "p",
          text: "While the unit is only on hold, the schedule is not yet proof that the money landed. The hold waits for the payment. Status changes when you confirm that the deposit is on the account. How the buyer gets an IPS QR for that deposit, without retyping a reference, is in the piece on [IPS QR deposits](/blog/ips-qr-kapara-online-rezervacija-stana). A scan fills the order. It does not close the line.",
        },
        {
          type: "figure",
          file: "plan-placanja-kapara-rate.webp",
          alt: "The deposit as the first schedule line, then installments with due dates, beside a public unit link and no real account number",
          width: 1600,
          height: 900,
        },
        {
          type: "h2",
          id: "agreed-and-paid",
          text: "What is paid, and what is only agreed",
        },
        {
          type: "p",
          text: "An agreed installment and a recorded payment are not the same field. The schedule says how much should land and by which date. The payment says how much you recorded as landed, and against which line. If the payment would exceed the line, the entry stops. The remainder must not spill quietly into the next installment without a trail.",
        },
        {
          type: "p",
          text: "You still read the statement. The system does not pull account turnover and it does not know the buyer paid unless you confirmed it. The public link and the request list show who started. Confirmation is yours. The flow is on [reservations and payments](/rezervacije-i-uplate). Unit status does not become “deposit paid” because a code was shown on a screen.",
        },
        {
          type: "h2",
          id: "the-rate-you-enter",
          text: "The rate you entered",
        },
        {
          type: "p",
          text: "The advert is in euros. The deposit order is in dinars. A schedule in euros and an order in dinars have to come from the rate you locked for that sale. The National Bank of Serbia publishes the middle rate in public. You enter it. The list is on the [NBS exchange-rate list](https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate). PropertyDesk does not pull that rate on its own.",
        },
        {
          type: "p",
          text: "If you change the rate in your head today, and the deposit code was generated yesterday, those are two amounts. The schedule line and the code have to follow the amount of that reservation. The buyer sees the amount they confirm in the app. They do not multiply euros by a rate from a search, and they do not get a different total from the one on the record.",
        },
        {
          type: "h2",
          id: "no-invoice",
          text: "The schedule does not send an invoice",
        },
        {
          type: "p",
          text: "An installment on the schedule is not an e-invoice. It is not a VAT return either. The e-invoice portal stays a manual step, at [efaktura.gov.rs](https://www.efaktura.gov.rs/). The schedule gives you the total and the dates you type into that step. It does not send a document to the Ministry of Finance and it does not close the tax treatment for you.",
        },
        {
          type: "p",
          text: "The same applies to the contract. The schedule can enter the document as a list of lines, but signing still needs a file and a buyer whose checklist is closed. What has to sit on the buyer before the contract goes out is in the piece on [buyer checks](/blog/kyc-kupca-pre-ugovora-o-stanu). The buyer record and the schedule sit on the same sale, in [CRM for investors](/crm-za-investitore).",
        },
        {
          type: "h2",
          id: "how-much-is-left",
          text: "When the buyer asks how much is left",
        },
        {
          type: "p",
          text: "The question “how much do I still have to pay” should not take ten minutes of adding. The record shows which line is closed, which is partly recorded, and the total of what has not landed yet. That total is the agreed remainder, not a statement you have not looked at. If the buyer says they paid and the line is still open, the statement comes first, then the entry. Not the other way around, just to make the conversation easier.",
        },
        {
          type: "p",
          text: "The answer to the buyer is simple: these lines are closed, this one is not, the date is this one. You do not send them an internal comment, someone else’s installment, or a note about the rate. If the schedule came from a template you applied to many units, the remainder still belongs only to this sale. The neighbouring unit has its own total. Mixing those two totals is how both buyers get the wrong remainder.",
        },
        {
          type: "p",
          text: "The agency that brought the buyer may ask the same thing, but it sees the agreement tied to its own request. It does not see every installment of the other sales on the entrance. If a partner asks for a sheet of every payment in the building, that is no longer a question about this buyer. That is the developer’s internal view. The [page for investors](/za-investitore) separates those two views. The schedule on the sale exists so both answers start from the same lines, not from two spreadsheets.",
        },
        {
          type: "p",
          text: "The remainder on the schedule is not a reminder and it is not interest. If an installment is late, you see it as an open line past its date, then you talk to the buyer the way your contract says. The system does not send a reminder on its own and it does not calculate default interest. It keeps the date and the amount where sales can see them before the buyer calls. When they call, you do not open a file from three weeks ago to tell them a number. If a payment was recorded against the wrong line in the meantime, the correction stays on that sale, with a trail, before you tell the buyer a new remainder. Two remainders in one conversation mean the record was not ready. The record should be ready before the call, not during it.",
        },
        {
          type: "h2",
          id: "when-an-installment-is-late",
          text: "When an installment is late",
        },
        {
          type: "p",
          text: "A due date on a line is a date you can see, not a sentence that says “let us know when it lands”. A delay shows up as a line whose date has passed and whose payment has not closed the amount. That is not an automatic reminder to the buyer and it is not interest. It is an order on the record so the sale does not wait for someone to leaf through a statement from three weeks ago.",
        },
        {
          type: "p",
          text: "The schedule does not replace a conversation with the buyer and it does not choose what the contract says about delay. It keeps the agreed amounts in one place, next to the unit status and next to the price. Package prices are on the [pricing section](/#cenovnik). Early access runs until 15 November 2026. If you want to see the sum of installments on one sale, that is part of a [25-minute demo](/demo).",
        },
      ],
    },
  },
};
