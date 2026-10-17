import type { BlogPost } from "@/features/marketing/blog/types";

export const sharePost: BlogPost = {
  slug: "javni-link-ponuda-stana",
  published: "2026-10-02",
  modified: "2026-10-05",
  minutes: 9,
  coverFile: "javni-link-ponuda-stana.webp",
  copy: {
    sr: {
      title: "Javni link za ponudu stana, umesto PDF-a na Viberu",
      description:
        "Javni link za ponudu stana pokazuje cenu samo ako je uključite. Interne napomene ostaju van linka. Kupac nema nalog.",
      excerpt:
        "Agencija i kupac dobijaju isti link. Cena se vidi samo ako ste je uključili. Napomena za tim se ne šalje napolje.",
      dateLabel: "2. oktobar 2026.",
      coverAlt: "Javna ponuda stana na linku, sa cenom i bez interne napomene tima",
      blocks: [
        {
          type: "p",
          text: "Javni link za ponudu stana zamenjuje PDF koji se juče zvao final, a danas ima drugu cenu. Agencija ga prosleđuje kupcu. Kupac ga otvara bez naloga i bez lozinke. Vidi stan koji ste odlučili da pokažete: površinu, strukturu, i cenu samo ako je prikaz cene uključen. Ne vidi internu napomenu, ne vidi tuđi KYC i ne vidi ratu koju knjigovodstvo još nije potvrdilo.",
        },
        {
          type: "p",
          text: "Ovo nije sajt projekta umesto celog marketinga, i nije nalog za kupca. Nema registracije, nema šifre, nema sandučeta u kom kupac „prati svoj stan“. Link je ponuda. Kad istekne ili ga ugasite, ponuda nestaje. Status stana i dalje živi u sistemu, što je opisano u tekstu o [statusu stana](/blog/status-stana-slobodan-rezervisan-prodat).",
        },
        {
          type: "h2",
          id: "sta-se-vidi",
          text: "Šta link sme da pokaže",
        },
        {
          type: "p",
          text: "Podrazumevano se cena može pokazati, ali prekidač postoji baš zato da je sklonite kad ponuda ide bez cifre. Neki investitori šalju strukturu i sprat, a cenu kažu na sastanku. Ako prekidač ugasite, na linku nema iznosa. Ne oslanjajte se na to da će kupac „ionako skrolovati“. Ako cena ne sme napolje, ne sme ni u HTML-u te stranice.",
        },
        {
          type: "p",
          text: "Interna napomena ostaje uvek unutra. Tu pišete da je stan rezervisan za rođaka investitora, da popust čeka direktora, ili da agencija ne sme da spušta cenu. Nijedna od tih rečenica ne ide na javni link, čak i kad je cena uključena. Ako vam treba beleška koju kupac sme da vidi, to nije to polje. To je tekst ponude koji svesno objavljujete.",
        },
        {
          type: "figure",
          file: "javni-link-cena.webp",
          alt: "Javna stranica stana sa uključenom cenom i isključenom internom napomenom",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "Cena samo ako je prikaz cene uključen.",
            "Interna napomena nikad na linku.",
            "Kupac nema nalog i ne ostavlja lozinku.",
            "Isti link može da nosi kod agencije, da se zahtev veže za nju.",
          ],
        },
        {
          type: "h2",
          id: "kapara-na-linku",
          text: "Kapara na linku i dalje traži vašu potvrdu",
        },
        {
          type: "p",
          text: "Na javnom linku kupac može da vidi IPS QR za kaparu, kad je taj tok uključen na jedinici. Skenira kod, plati na račun, a zahtev stiže vama. Novac na računu nije sam po sebi potvrda u sistemu. Tim i dalje potvrđuje da je uplata legala. To je isti ritam kao na stranici [rezervacija stana](/rezervacije-i-uplate). QR skida prekucavanje poziva na broj. Ne skida proveru izvoda.",
        },
        {
          type: "p",
          text: "Ne pišite na linku da je stan rezervisan čim je QR skeniran. Sken je namera. Rezervacija je status koji sistem drži kao jedan hold po stanu. Dok hold nije otvoren, druga agencija i dalje može da pošalje zahtev. Zato link i status nisu ista reč. Link pokazuje ponudu. Status kaže da li stan sme ponovo u oglas.",
        },
        {
          type: "figure",
          file: "javni-link-bez-napomene.webp",
          alt: "Ista ponuda stana bez cene, dok interna napomena ostaje samo u kancelariji",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Kurs evra koji ste uneli za tu ponudu je kurs koji ste uneli. Link ga ne osvežava sa srednjeg kursa Narodne banke. Ako sutra srednji kurs bude drugi, cifra na linku ostaje dok je vi ne promenite u cenovniku. To je namerno. Javna ponuda ne sme da menja iznos dok niko iz tima nije rekao da se cena menja.",
        },
        {
          type: "h2",
          id: "agencija",
          text: "Jedan link, trag koje je agencije",
        },
        {
          type: "p",
          text: "Agencija dobija svoj kod na linku. Kad kupac otvori tu adresu i pošalje zahtev, zahtev se vezuje za tu agenciju, ne za onu koja je juče poslala drugi PDF. To je odgovor na svađu „ko je doveo kupca“. Nije odgovor na visinu provizije. Visina je pravilo na projektu i iznos zaključan na dan ugovora, opisano u tekstu o [provizijama](/blog/provizije-agencija-za-novogradnju).",
        },
        {
          type: "p",
          text: "Ne šaljite svim agencijama isti link bez koda, pa da se kasnije dogovarate u grupi. Kod je na linku baš da se ne dogovarate. Ako agencija prosledi link dalje, kod putuje sa njim. Ako želite da druga agencija ima svoj trag, dajte joj njen link. Dva koda na jednoj adresi nema.",
        },
        {
          type: "h2",
          id: "sta-ne-ide",
          text: "Šta na link ne stavljate",
        },
        {
          type: "p",
          text: "Ne stavljate JMBG, ličnu kartu, ni dokument koji je kupac poslao za proveru. KYC ostaje na kartonu kupca, u kancelariji. Javni link nije fascikla. Ne stavljate ni nacrt ugovora sa tuđim podacima iz prethodne prodaje. Ako šaljete predugovor, šaljete ga kao dokument te prodaje, ne kao stranicu koju može da otvori svako ko ima jučerašnji link.",
        },
        {
          type: "p",
          text: "Ne obećavajte da će se faktura sama poslati na SEF zato što je kupac video QR. QR je nalog za uplatu kapare ili profakture. Slanje u SEF i dalje radite vi, ručno, preko portala. Link to ne pokreće. Ako u ponudi piše da je eFaktura automatska, brišite tu rečenicu pre nego što link izađe.",
        },
        {
          type: "ul",
          items: [
            "Bez naloga i bez lozinke za kupca.",
            "Bez interne napomene i bez tuđih dokumenata.",
            "Bez automatske rezervacije samo zato što je QR otvoren.",
            "Bez obećanja da SEF ide sam.",
          ],
        },
        {
          type: "h2",
          id: "kad-ugasiti",
          text: "Kad link treba ugasiti",
        },
        {
          type: "p",
          text: "Ugasite ga kad stan više nije u ponudi, kad je cena koju ste slali povučena, ili kad je hold istekao i ne želite da stara cifra i dalje kruži. Ugašen link ne briše istoriju zahteva koji su već stigli. Briše stranicu koju sledeći klik otvara. Ako agencija i dalje ima staru adresu u četu, kupac vidi da ponuda nije dostupna, a ne jučerašnji iznos.",
        },
        {
          type: "p",
          text: "Pre nego što ujutru pošaljete tri linka, proverite status i da li je cena ona koju direktor juče odobrio. Cenovnik i istorija izmene su u tekstu o [cenovniku u evrima](/blog/cenovnik-stana-u-evrima). Link je samo prozor. Ako je iza prozora stara cena, kupac je video staru cenu. To se ne popravlja porukom „ignore prethodno“.",
        },
        {
          type: "h2",
          id: "pre-slanja",
          text: "Šta proveriti pre nego što link izađe iz kancelarije",
        },
        {
          type: "p",
          text: "Pre slanja ne gledajte samo da li se stranica otvara. Gledajte da li je stan i dalje slobodan ili na holdu koji sme da se pokaže. Ako je drugi kupac već u predugovoru, link sa jučerašnjom cenom pravi obećanje koje kancelarija ne može da održi. Ugasite ga pre nego što agencija prosledi adresu dalje. Ako je cena jutros promenjena, stari link i dalje može da pokazuje staru cifru dok ga ne osvežite iz cenovnika. Osvežavanje nije poruka u grupi. Osvežavanje je nova ponuda na istoj jedinici, sa trenutnom cenom, ili link bez cene ako cifru još ne želite napolju.",
        },
        {
          type: "p",
          text: "Proverite i šta kupac može da uradi na stranici, ne samo šta vidi. Ako je QR uključen, kupac može da plati kaparu. To nije rezervacija dok je vi ne potvrdite. Ako QR nije uključen, ne recite agenciji da kupac „može odmah da uplati sa linka“. Može da vidi ponudu. Uplatu i dalje vodi tim. Ako na stranici nema površine ili strukture, link je prazan prozor i bolje je da ne izađe. Prazna ponuda izgleda kao da stan ne postoji, a postoji, samo kartica nije popunjena.",
        },
        {
          type: "p",
          text: "Kad isti stan nudite iz kancelarije i preko dve agencije, svaka agencija dobija svoj kod. Kupac koji dođe direktno može da dobije link bez koda, i taj zahtev ostaje vaš, ne tuđi. Ne delite direktan link agenciji da biste „ubrzali“. Ubrzanje vam briše trag. Ako kasnije treba da kažete koja je agencija dovela zahtev, kod na adresi je jedini trag koji ne zavisi od sećanja. Provizija se i dalje ne računa sa linka. Računa se pravilom, na dan ugovora.",
        },
        {
          type: "p",
          text: "Ako link delite i na štandu, ista adresa važi. Papir sa QR kodom nije drugi cenovnik. Kad cena na papiru zastari, papir se baca, a link se gasi ili osveži. Dve cifre na pultu su ista greška kao dve cifre u četu.",
        },
        {
          type: "p",
          text: "Posebno pogledajte pomoćne jedinice. Garaža i parking imaju svoju ponudu i svoj link. Ne kačite ih u napomenu stana pa da kupac na linku stana vidi cenu garaže koja više nije tačna. Ako garaža ide uz stan, i dalje su dve jedinice, dve cene i, ako obe šaljete, dva linka ili jedna ponuda u kojoj je jasno šta je uključeno. Unutrašnja napomena „garaža u paketu, ne nuditi posebno“ ostaje unutra. Na linku stana je samo ono što ste uključili. Ako paket ne sme da se vidi kao posebna garaža u oglasu, ugasite link garaže. Oglas koji živi pored linka, na portalu ili u PDF-u, mora da kaže istu stvar. Inače kupac uporedi tri cifre i ne veruje nijednoj. Taj raskorak se ne rešava dužom porukom. Rešava se time što napolju ostane jedna ponuda.",
        },
        {
          type: "p",
          text: "Na kraju dana ugasite linkove stanova koji su u toku dana otišli u ugovor ili u blokadu. Otvoren link na prodatom stanu je najskuplja greška ovog kanala, jer kupac vidi ponudu koja više nije ponuda. Status u sistemu može već da kaže prodat, a stara adresa i dalje da se otvara ako je niste ugasili. To su dva mesta. Oba moraju da se slože pre nego što odete kući. Sutra ujutru prva provera nije novi oglas. Prva provera je da li jučerašnji linkovi i dalje pokazuju samo ono što sme da se nudi.",
        },
        {
          type: "p",
          text: "Za agenciju je ovo katalog koji sme da prosledi, opisan i na stranici [softver za agencije](/za-agencije). Za investitora je kontrola šta izlazi napolje. Oba gledaju isti stan. Razlika je u tome što interna rečenica ostaje kod vas, a javna ponuda ide samo sa onim što ste uključili.",
        },
      ],
    },
    en: {
      title: "A public link for a unit offer, instead of a PDF in chat",
      description:
        "A public unit-offer link shows the price only if you turn it on. Internal notes stay off the link. The buyer has no account.",
      excerpt:
        "The agency and the buyer get the same link. The price shows only if you enabled it. The note for the team is not sent out.",
      dateLabel: "2 October 2026",
      coverAlt:
        "A public apartment offer on a link, with a price and without the team’s internal note",
      blocks: [
        {
          type: "p",
          text: "A public link for a unit offer replaces the PDF that was called final yesterday and has another price today. The agency forwards it to the buyer. The buyer opens it without an account and without a password. They see the apartment you decided to show: area, layout, and the price only if the price display is on. They do not see the internal note, someone else’s KYC, or an installment the accounts team has not confirmed.",
        },
        {
          type: "p",
          text: "This is not a project website instead of your marketing, and it is not an account for the buyer. There is no registration, no password, and no inbox where the buyer “tracks their apartment”. The link is an offer. When it expires or you turn it off, the offer disappears. The unit status still lives in the system, which is described in the note on [unit status](/blog/status-stana-slobodan-rezervisan-prodat).",
        },
        {
          type: "h2",
          id: "what-the-link-may-show",
          text: "What the link is allowed to show",
        },
        {
          type: "p",
          text: "The price can be shown by default, but the switch exists so you can hide it when the offer goes out without a figure. Some investors send the layout and the floor, and say the price in a meeting. If you turn the switch off, the link has no amount. Do not rely on the buyer “not scrolling that far”. If the price must not leave the office, it must not be in the HTML of that page either.",
        },
        {
          type: "p",
          text: "The internal note always stays inside. That is where you write that the apartment is held for the investor’s relative, that a discount is waiting for the director, or that the agency must not drop the price. None of those sentences go on the public link, even when the price is on. If you need a note the buyer is allowed to see, that is not this field. That is offer text you publish on purpose.",
        },
        {
          type: "figure",
          file: "javni-link-cena.webp",
          alt: "A public unit page with the price on and the internal note left off",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "The price only if price display is on.",
            "The internal note never on the link.",
            "The buyer has no account and does not set a password.",
            "The same link can carry an agency code, so the request is tied to that agency.",
          ],
        },
        {
          type: "h2",
          id: "deposit-on-the-link",
          text: "A deposit on the link still needs your confirmation",
        },
        {
          type: "p",
          text: "On the public link the buyer can see an IPS QR for the deposit, when that path is switched on for the unit. They scan the code, pay to the account, and the request reaches you. Money on the account is not by itself a confirmation in the system. The team still confirms that the payment landed. That is the same rhythm as on the [apartment reservation](/rezervacije-i-uplate) page. The QR removes retyping the reference. It does not remove checking the statement.",
        },
        {
          type: "p",
          text: "Do not write on the link that the apartment is reserved the moment the QR is scanned. A scan is an intention. A reservation is a status the system holds as one hold per apartment. Until the hold is open, another agency can still send a request. That is why the link and the status are not the same word. The link shows the offer. The status says whether the apartment may go back into an ad.",
        },
        {
          type: "figure",
          file: "javni-link-bez-napomene.webp",
          alt: "The same unit offer without a price, while the internal note stays in the office",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "The euro rate you entered for that offer is the rate you entered. The link does not refresh it from the National Bank middle rate. If tomorrow’s middle rate is different, the figure on the link stays until you change it in the price list. That is deliberate. A public offer must not change the amount while nobody on the team has said the price changes.",
        },
        {
          type: "h2",
          id: "the-agency",
          text: "One link, a trail of which agency",
        },
        {
          type: "p",
          text: "The agency gets its own code on the link. When the buyer opens that address and sends a request, the request is tied to that agency, not to the one that sent a different PDF yesterday. That answers the argument about who brought the buyer. It does not answer the size of the commission. The size is the project rule and the amount locked on contract day, described in the note on [commissions](/blog/provizije-agencija-za-novogradnju).",
        },
        {
          type: "p",
          text: "Do not send every agency the same link without a code and then negotiate in the group later. The code is on the link so you do not negotiate. If the agency forwards the link, the code travels with it. If you want another agency to have its own trail, give it its own link. Two codes do not sit on one address.",
        },
        {
          type: "h2",
          id: "what-stays-off",
          text: "What you do not put on the link",
        },
        {
          type: "p",
          text: "You do not put a national ID number, an identity card, or a document the buyer sent for a check. KYC stays on the buyer record, in the office. The public link is not a folder. You also do not put a draft contract that still has another buyer’s data from the previous sale. If you send a pre-contract, you send it as a document of that sale, not as a page anyone with yesterday’s link can open.",
        },
        {
          type: "p",
          text: "Do not promise that an invoice will file itself to SEF because the buyer saw a QR. The QR is a payment instruction for a deposit or a proforma. Sending to SEF is still something you do, manually, through the portal. The link does not start it. If the offer says e-invoicing is automatic, delete that sentence before the link goes out.",
        },
        {
          type: "ul",
          items: [
            "No account and no password for the buyer.",
            "No internal note and no one else’s documents.",
            "No automatic reservation just because the QR was opened.",
            "No promise that SEF runs by itself.",
          ],
        },
        {
          type: "h2",
          id: "when-to-turn-it-off",
          text: "When the link should be turned off",
        },
        {
          type: "p",
          text: "Turn it off when the apartment is no longer on offer, when the price you sent has been withdrawn, or when the hold expired and you do not want the old figure to keep circulating. A disabled link does not delete the history of requests that already arrived. It removes the page the next click opens. If the agency still has the old address in chat, the buyer sees that the offer is not available, not yesterday’s amount.",
        },
        {
          type: "p",
          text: "Before you send three links in the morning, check the status and whether the price is the one the director approved yesterday. The price list and the change history are in the note on the [euro price list](/blog/cenovnik-stana-u-evrima). The link is only a window. If the old price is behind the window, the buyer saw the old price. That is not fixed by a message that says to ignore the previous one.",
        },
        {
          type: "h2",
          id: "before-it-goes-out",
          text: "What to check before the link leaves the office",
        },
        {
          type: "p",
          text: "Before you send it, do not only check that the page opens. Check whether the apartment is still available, or on a hold you are willing to show. If another buyer is already in a pre-contract, a link with yesterday’s price makes a promise the office cannot keep. Turn it off before the agency forwards the address. If the price changed this morning, the old link can still show the old figure until you refresh it from the price list. A refresh is not a message in the group. A refresh is a current offer on the same unit, with the current price, or a link without a price if you do not want the figure outside yet.",
        },
        {
          type: "p",
          text: "Also check what the buyer can do on the page, not only what they see. If the QR is on, the buyer can pay a deposit. That is not a reservation until you confirm it. If the QR is off, do not tell the agency the buyer can pay immediately from the link. They can see the offer. The payment is still run by the team. If the page has no area and no layout, the link is an empty window and it is better that it does not go out. An empty offer looks as if the apartment does not exist, while it does, and only the card was not filled in.",
        },
        {
          type: "p",
          text: "When the same apartment is offered from the office and through two agencies, each agency gets its own code. A buyer who comes directly can get a link without a code, and that request stays yours. Do not hand the direct link to an agency to “speed things up”. The shortcut deletes the trail. If you later need to say which agency brought the request, the code on the address is the only trail that does not depend on memory. The commission is still not calculated from the link. It is calculated from the rule, on contract day.",
        },
        {
          type: "p",
          text: "At the end of the day, turn off links for apartments that went to contract or were blocked that day. An open link on a sold apartment is the expensive mistake of this channel, because the buyer sees an offer that is no longer an offer. The status in the system may already say sold, while the old address still opens if you did not turn it off. Those are two places. Both have to agree before you leave. The first check the next morning is not a new ad. The first check is whether yesterday’s links still show only what may be offered.",
        },
        {
          type: "p",
          text: "For an agency this is a catalogue they may forward, also described on the [software for agencies](/za-agencije) page. For the investor it is control of what leaves the office. Both look at the same apartment. The difference is that the internal sentence stays with you, and the public offer goes out only with what you switched on.",
        },
      ],
    },
  },
};
