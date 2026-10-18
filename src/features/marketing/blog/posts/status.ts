import type { BlogPost } from "@/features/marketing/blog/types";

export const statusPost: BlogPost = {
  slug: "status-stana-slobodan-rezervisan-prodat",
  published: "2026-09-08",
  modified: "2026-10-03",
  minutes: 9,
  coverFile: "status-stana-slobodan-rezervisan-prodat.webp",
  copy: {
    sr: {
      title: "Status stana u novogradnji: slobodan, rezervisan ili prodat",
      description:
        "Jedan status po stanu skida duplu rezervaciju. Šta znače slobodan, rezervisan i prodat kad više agencija nudi isti objekat.",
      excerpt:
        "Kupac čuje tri reči. Kancelarija mora da vidi i korake između: hold, kapara, ugovor. Inače dve agencije prodaju isti stan.",
      dateLabel: "8. septembar 2026.",
      coverAlt:
        "Tri kartice stana u novogradnji, sa statusima slobodan, rezervisan i prodat, bez imena kupaca",
      blocks: [
        {
          type: "p",
          text: "Status stana je prva stvar koju agencija pita, i poslednja stvar koju Excel pouzdano drži. Slobodan, rezervisan ili prodat zvuči jednostavno dok je u igri jedan čovek i jedan objekat. Prelom je dan kad druga agencija pošalje ponudu za stan koji je već na holdu, a kupac prve agencije već računa na predugovor.",
        },
        {
          type: "p",
          text: "Ovaj tekst je operativan. Ne opisuje pravne posledice rezervacije i ne kaže koji status zakon traži na oglasu. Kaže šta mora da piše na jedinici da dve ponude ne idu na isti stan. PropertyDesk drži jedan status po jedinici. Boja u ćeliji to ne radi.",
        },
        {
          type: "h2",
          id: "jedan-hold",
          text: "Jedan stan ne može imati dva holda",
        },
        {
          type: "p",
          text: "Poruka „držimo A-12 do petka“ nije status. Druga agencija je ne vidi, ili je vidi kad je kupac već ušao u salu. Dupla rezervacija nije komercijalni nesporazum. To je odsustvo jednog mesta na kom piše da je jedinica zauzeta, do kada, i čiji je zahtev.",
        },
        {
          type: "p",
          text: "Pravilo koje skida taj rizik važi i na malom objektu. Jedna aktivna rezervacija po stanu. Dok ona traje, niko drugi ne otvara drugi hold na istoj jedinici. Kad rok prođe, stan se vraća u ponudu bez poruke da neko ručno skine oznaku. Taj tok je na stranici [rezervacije i uplate](/rezervacije-i-uplate).",
        },
        {
          type: "figure",
          file: "status-stana-jedan-hold.webp",
          alt: "Jedan stan sa jednom aktivnom rezervacijom i rokom, a drugi zahtev za isti stan stoji odbijen",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Hold i rezervacija nisu ista reč u kancelariji, iako ih kupac obe čuje kao „rezervisano“. Hold je kratak rok dok čekate kaparu ili odluku. Rezervacija je korak dalje, kad je zahtev prihvaćen. Ako te dve stvari stoje u istoj žutoj ćeliji, niko ne zna da li stan sme ponovo u oglas u ponedeljak.",
        },
        {
          type: "ul",
          items: [
            "Jedna aktivna rezervacija po jedinici, ne po Viber grupi.",
            "Rok koji ističe sam, bez ručnog skidanja oznake.",
            "Drugi zahtev za isti stan ne otvara drugi hold.",
            "Isti status vide investitor i agencija kojoj je ponuda otvorena.",
          ],
        },
        {
          type: "p",
          text: "Blokiran stan i stan koji nije u prodaji ostaju u objektu, ali ne ulaze u ponudu. Ako ih ostavite kao slobodne jer cena i dalje stoji, agencija će ih ponuditi. Oznaka nije kazna. Ona skida jedinicu iz oglasa dok vi ne odlučite drugačije. Garaža može biti slobodna dok je stan rezervisan, i obrnuto. Zato svaka jedinica nosi svoj status. Sprat, ulaz i pomoćna jedinica ne dele jednu boju u tabeli. Kad ujutru pitate šta je ostalo, odgovor je lista statusa, ne pregled četa od petka. Isti odgovor važi i za investitora koji prodaje direktno i za partnera koji šalje zahtev. Rok na holdu nije ukras na kartici. On je datum posle kog se stan sam vraća u ponudu, bez sastanka na kom neko traži dozvolu da skine oznaku.",
        },
        {
          type: "h2",
          id: "tri-reci-i-koraci",
          text: "Šta kupac čuje, a šta kancelarija mora da vidi",
        },
        {
          type: "p",
          text: "U oglasu i u razgovoru stanu treba tri jasne reči: slobodan, rezervisan, prodat. Između njih prodaja ima korake koje kupac ne mora da uči, a vi morate da razlikujete. Kapara uplaćena nije isto što i ugovor potpisan. Ugovoren stan nije isto što i stan koji je već predat. Blokiran stan, ili stan koji nije u prodaji, ne sme da izgleda kao slobodan samo zato što mu cena i dalje stoji u tabeli.",
        },
        {
          type: "p",
          text: "Ako te korake sabijete u jednu napomenu, filter ne radi. Ne možete da izlistate samo stanove kod kojih je kapara legala, a ugovor još nije izašao. Ne možete da vidite šta je blokirano za investitora, a šta je i dalje u ponudi. Jedan status po jedinici je zato polje, ne rečenica u komentaru.",
        },
        {
          type: "figure",
          file: "status-stana-ista-ponuda.webp",
          alt: "Ista ponuda stana kod investitora i kod agencije, sa istim statusom i bez interne napomene",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Javni link stana pokazuje jedinicu koju ste odlučili da objavite. Cena ide na taj link samo ako je uključite. Interna napomena, razlog popusta i tuđi kupac ne idu napolje. Status koji partner vidi mora da bude isti status koji vi vidite. Inače agencija nudi stan koji ste vi već sklonili iz prodaje.",
        },
        {
          type: "h2",
          id: "agencija-vidi-isto",
          text: "Šta agencija sme da vidi",
        },
        {
          type: "p",
          text: "Kad više agencija nudi isti objekat, svaka sme da vidi jedinice koje ste joj otvorili i status tih jedinica. Ne sme da vidi tuđeg kupca, tuđu proviziju i interni razlog zašto je cena spuštena. Ako partner vidi „slobodno“ na stanu koji je kod vas rezervisan, dupla ponuda je već u toku.",
        },
        {
          type: "p",
          text: "Zato status nije lokalna oznaka agencije. On živi na jedinici. Agencija koja pošalje zahtev vidi da je zahtev njen. Druga agencija vidi da stan više nije slobodan. Podela uloga je na stranici [za agencije](/za-agencije). Kako se do jednog statusa uopšte dolazi kad cenovnik živi u tabeli, piše u tekstu [Excel ili softver](/blog/excel-ili-softver-za-prodaju-novogradnje).",
        },
        {
          type: "h2",
          id: "status-nije-cena",
          text: "Status i cena nisu ista ćelija",
        },
        {
          type: "p",
          text: "Stan može da ostane slobodan, a cena da se promeni. Može da bude rezervisan po staroj ceni, dok je u tabeli već nova. Ako status i cena dele ćeliju, ne znate šta je važeće. Cena ima svoju istoriju: ko je uneo, kada, sa koje cifre na koju. Status ima svoj rok i svog podnosioca zahteva.",
        },
        {
          type: "p",
          text: "Kupac na javnom linku, ako cenu uopšte vidi, vidi cenu jedinice. Ne vidi jučerašnji prilog. Kako se do jedne cene dolazi za stan, garažu i parking, razrađeno je u tekstu o [cenovniku stana u evrima](/blog/cenovnik-stana-u-evrima). Status govori sme li se ta cena uopšte nuditi danas.",
        },
        {
          type: "h2",
          id: "od-statusa-do-ugovora",
          text: "Od statusa do ugovora",
        },
        {
          type: "p",
          text: "Rezervacija ne znači da ugovor sme napolje. Kapara može da legne, a dokumenta kupca da fale. Status „kapara uplaćena“ je korak. Ugovor je sledeći, i ne izlazi dok lista na kupcu nije zatvorena. Šta na toj listi stoji pre potpisa piše u tekstu o [KYC kupca](/blog/kyc-kupca-pre-ugovora-o-stanu). Kako se predugovor razlikuje od poruke u četu, u tekstu o [predugovoru i ugovoru](/blog/predugovor-i-ugovor-o-prodaji-stana).",
        },
        {
          type: "p",
          text: "Skeniranje IPS QR koda nije dokaz da je status smeo da pređe na „kapara uplaćena“. Izvod jeste, i potvrdu radite vi. Kako kupac uopšte dobija kod bez prekucavanja poziva na broj, piše u tekstu o [IPS QR kapari](/blog/ips-qr-kapara-online-rezervacija-stana). Status se menja kad vi potvrdite uplatu, ne kad telefon pišti.",
        },
        {
          type: "h2",
          id: "jutarnja-lista",
          text: "Šta pogledati pre nego što agencije nazovu",
        },
        {
          type: "p",
          text: "Jutarnja lista nije izveštaj od deset strana. To su jedinice kojima rok ističe danas, jedinice na kojima kapara još nije potvrđena, i jedinice koje su blokirane a i dalje imaju cenu u staroj tabeli. Ako to ne vidite pre prvog poziva, agencija će pitati za stan koji ste vi već sklonili, ili će čekati odgovor koji već piše na kartici. Status služi da taj poziv krene od činjenice, ne od „sačekajte da proverim čet“.",
        },
        {
          type: "p",
          text: "Hold koji ističe u podne ne sme da ostane zauzet do sutra samo zato što niko nije stigao da skine boju. Rok to radi sam. Vaš posao je da pre podneva odlučite da li zahtev produžavate, jer je kupac na putu sa kaparom, ili puštate stan nazad u ponudu. Produženje je nova odluka sa novim rokom. Nije ćutanje. Ćutanje ostavlja stan ni slobodan ni prodat, i druga agencija u tome vidi nered.",
        },
        {
          type: "p",
          text: "Blokiran stan i stan koji nije u prodaji treba da budu van oglasa i van ponude partneru. Cena može da ostane na kartici radi vas, ali je partner ne nudi. Ako javni link i dalje pokazuje tu jedinicu kao slobodnu, status i objava se nisu složili. Ugasite objavu, pa tek onda pričajte o ceni. Kupac koji vidi stan na linku, a u salonu čuje da nije u prodaji, pamti vas po tome, ne po brošuri.",
        },
        {
          type: "p",
          text: "Kad više agencija zove isti ulaz, odgovor je isti status za sve. Ne „vama još može“, a drugoj „već je rezervisano“, osim ako prvoj stvarno ističe hold koji ste produžili. Dvostruki odgovor je dupla rezervacija u najavi. Jedan status to seče pre nego što oba kupca dođu na potpis. Plan uplata i ugovor dolaze posle, i ne popravljaju pogrešan status unazad. Ako je stan obećan dvoma, predugovor samo bira koga ćete da razočarate. Isti pregled važi i kad je deo stanova još u izgradnji i nije pušten u prodaju. Oni stoje kao nisu u prodaji, ne kao slobodni sa cenom nula. Nula na oglasu izgleda kao poklon. Odsustvo iz ponude izgleda kao red. Kad agencija pita za stan koji nije pušten, odgovor je status, ne izgovor da tabela još nije ažurirana.",
        },
        {
          type: "h2",
          id: "sta-ostaje-na-vama",
          text: "Šta status ne radi umesto vas",
        },
        {
          type: "p",
          text: "Status ne prodaje stan. Ne bira kupca. Ne šalje fakturu. Ne zna da li je predugovor pravno dovoljan za vaš posao. On sprečava da dve ponude idu na istu jedinicu i ostavlja trag šta je bilo slobodno, šta je bilo na roku, i šta je već ugovoreno. Tok od oglasa do ugovora je na stranici [prodaja novogradnje](/prodaja-novogradnje).",
        },
        {
          type: "p",
          text: "Ne morate prvo da sredite ceo objekat. Dovoljan je jedan ulaz i jedan stan koji dve agencije već pitaju. Na njemu se vidi da drugi hold ne prolazi. Cene i rani pristup do 15.11.2026. su na [cenovniku](/#cenovnik). Ako hoćete da probate rok rezervacije na svom primeru, to je deo [demoa od 25 minuta](/demo).",
        },
      ],
    },
    en: {
      title: "Unit status in a new build: available, reserved, or sold",
      description:
        "One status per unit stops a double hold. What available, reserved, and sold mean when several agencies offer the same building.",
      excerpt:
        "The buyer hears three words. The office also needs the steps between them: hold, deposit, contract. Otherwise two agencies sell the same unit.",
      dateLabel: "8 September 2026",
      coverAlt:
        "Three new-build unit cards marked available, reserved, and sold, with no buyer names",
      blocks: [
        {
          type: "p",
          text: "Unit status is the first thing an agency asks, and the last thing a spreadsheet keeps reliably. Available, reserved, or sold sounds simple while one person knows every unit by heart. The break is the day a second agency sends an offer for a unit that is already on hold, while the first agency’s buyer is already counting on a preliminary contract.",
        },
        {
          type: "p",
          text: "This piece is operational. It does not describe the legal effect of a reservation and it does not say which status a listing is required to show. It says what has to sit on the unit so two offers do not go out for the same apartment. PropertyDesk keeps one status per unit. A color in a cell does not.",
        },
        {
          type: "h2",
          id: "one-hold",
          text: "One unit cannot carry two holds",
        },
        {
          type: "p",
          text: "A message that says “we are holding A-12 until Friday” is not a status. The other agency does not see it, or sees it after their buyer is already in the showroom. A double reservation is not a commercial misunderstanding. It is the absence of one place that says the unit is taken, until when, and whose request it is.",
        },
        {
          type: "p",
          text: "The rule that removes that risk is worth having even on a small building. One active reservation per unit. While it runs, nobody else opens a second hold on the same unit. When the deadline passes, the unit returns to the offer without a message asking someone to clear the flag. That flow is on [reservations and payments](/rezervacije-i-uplate).",
        },
        {
          type: "figure",
          file: "status-stana-jedan-hold.webp",
          alt: "One unit with a single active reservation and a deadline, and a second request for the same unit left rejected",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "A hold and a reservation are not the same word in the office, even though the buyer hears both as “reserved”. A hold is a short deadline while you wait for the deposit or a decision. A reservation is a step further, once the request is accepted. If both live in the same yellow cell, nobody knows whether the unit may go back into the listing on Monday.",
        },
        {
          type: "ul",
          items: [
            "One active reservation per unit, not per chat group.",
            "A deadline that expires on its own, without a manual clear.",
            "A second request for the same unit does not open a second hold.",
            "The investor and the agency with an open offer see the same status.",
          ],
        },
        {
          type: "h2",
          id: "three-words",
          text: "What the buyer hears, and what the office must see",
        },
        {
          type: "p",
          text: "In a listing and in conversation, a unit needs three clear words: available, reserved, sold. Between them the sale has steps the buyer does not have to learn, and you do have to tell apart. Deposit paid is not the same as contract signed. A contracted unit is not the same as a unit already handed over. A blocked unit, or a unit that is not for sale, must not look available just because its price is still in the sheet.",
        },
        {
          type: "p",
          text: "If you fold those steps into one note, the filter does not work. You cannot list only the units where the deposit has landed and the contract has not gone out. You cannot see what is blocked for the developer and what is still on offer. One status per unit is a field, not a sentence in a comment.",
        },
        {
          type: "figure",
          file: "status-stana-ista-ponuda.webp",
          alt: "The same unit offer at the developer and at the agency, with the same status and no internal note",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "A public link shows the unit you chose to publish. The price goes on that link only if you turn it on. An internal note, the reason for a discount, and someone else’s buyer stay off it. The status a partner sees has to be the status you see. Otherwise the agency offers a unit you have already taken out of sale.",
        },
        {
          type: "h2",
          id: "what-the-agency-sees",
          text: "What an agency is allowed to see",
        },
        {
          type: "p",
          text: "When several agencies offer the same building, each may see the units you opened for them and the status of those units. They may not see another buyer, another commission, or the internal reason a price was cut. If a partner still sees “available” on a unit you have reserved, a double offer is already underway.",
        },
        {
          type: "p",
          text: "That is why status is not the agency’s local flag. It lives on the unit. The agency that sent the request sees that the request is theirs. The other agency sees that the unit is no longer available. The split of roles is on the [page for agencies](/za-agencije). How you get to one status once the price list lives in a sheet is in [Excel or software](/blog/excel-ili-softver-za-prodaju-novogradnje).",
        },
        {
          type: "h2",
          id: "status-is-not-price",
          text: "Status and price are not the same cell",
        },
        {
          type: "p",
          text: "A unit can stay available while the price changes. It can be reserved at the old price while the sheet already shows a new one. If status and price share a cell, you do not know which is current. Price has its own history: who entered it, when, from which figure to which. Status has its own deadline and its own requester.",
        },
        {
          type: "p",
          text: "The buyer on a public link, if they see a price at all, sees the unit price. They do not see yesterday’s attachment. How you get to one price for the apartment, the garage, and the parking space is in the piece on a [euro price list](/blog/cenovnik-stana-u-evrima). Status says whether that price may be offered today.",
        },
        {
          type: "h2",
          id: "from-status-to-contract",
          text: "From status to the contract",
        },
        {
          type: "p",
          text: "A reservation does not mean the contract may go out. The deposit can land while the buyer’s documents are still missing. “Deposit paid” is a step. The contract is the next one, and it does not go out until the checklist on the buyer is closed. What sits on that list before signing is in the piece on [buyer checks](/blog/kyc-kupca-pre-ugovora-o-stanu). How a preliminary contract differs from a chat message is in the piece on the [preliminary contract and the sale contract](/blog/predugovor-i-ugovor-o-prodaji-stana).",
        },
        {
          type: "p",
          text: "Scanning an IPS QR code is not proof that the status was allowed to move to “deposit paid”. The bank statement is, and you confirm it. How the buyer gets that code without retyping a reference is in the piece on [IPS QR deposits](/blog/ips-qr-kapara-online-rezervacija-stana). Status changes when you confirm the payment, not when the phone beeps.",
        },
        {
          type: "h2",
          id: "morning-list",
          text: "What to check before the agencies call",
        },
        {
          type: "p",
          text: "The morning list is not a ten-page report. It is the units whose deadline expires today, the units whose deposit is not confirmed yet, and the units that are blocked while an old sheet still shows a price. If you do not see that before the first call, an agency will ask about a unit you already took off the offer, or will wait for an answer that is already on the record. Status exists so that call starts from a fact, not from “let me check the chat”.",
        },
        {
          type: "p",
          text: "A hold that expires at noon must not stay taken until tomorrow just because nobody cleared a color. The deadline does that on its own. Your job before noon is to decide whether you extend the request, because the buyer is on the way with the deposit, or you put the unit back on offer. An extension is a new decision with a new deadline. It is not silence. Silence leaves the unit neither free nor sold, and the other agency reads that as a mess.",
        },
        {
          type: "p",
          text: "A blocked unit and a unit that is not for sale have to stay off the listing and off the partner’s offer. The price can remain on the record for you, but the partner does not offer it. If the public link still shows that unit as available, the status and the publication have not matched. Turn the publication off, then talk about the price. A buyer who sees the unit on a link and hears in the showroom that it is not for sale remembers you for that, not for the brochure.",
        },
        {
          type: "p",
          text: "When several agencies call about the same entrance, the answer is the same status for all of them. Not “you can still have it” to one and “it is already reserved” to the other, unless the first one really has a hold you extended. Two answers are a double reservation in the making. One status cuts that off before both buyers arrive for a signature. The payment schedule and the contract come after, and they do not repair a wrong status backwards. If the unit was promised to two people, the preliminary contract only chooses whom you will disappoint.",
        },
        {
          type: "h2",
          id: "what-status-does-not-do",
          text: "What status does not do for you",
        },
        {
          type: "p",
          text: "Status does not sell the unit. It does not choose the buyer. It does not send an invoice. It does not know whether a preliminary contract is legally enough for your deal. It stops two offers going out for the same unit and leaves a trail of what was available, what was on a deadline, and what is already contracted. The path from the listing to the contract is on [new-build sales](/prodaja-novogradnje).",
        },
        {
          type: "p",
          text: "You do not have to tidy the whole building first. One entrance and one unit that two agencies are already asking about is enough. On it you see that a second hold does not go through. Prices and early access until 15 November 2026 are on the [pricing section](/#cenovnik). If you want to try a reservation deadline on your own example, that is part of a [25-minute demo](/demo).",
        },
      ],
    },
  },
};
