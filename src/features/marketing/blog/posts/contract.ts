import type { BlogPost } from "@/features/marketing/blog/types";

export const contractPost: BlogPost = {
  slug: "predugovor-i-ugovor-o-prodaji-stana",
  published: "2026-09-29",
  modified: "2026-10-03",
  minutes: 9,
  coverFile: "predugovor-i-ugovor-o-prodaji-stana.webp",
  copy: {
    sr: {
      title: "Predugovor i ugovor o prodaji stana: red pre potpisa",
      description:
        "Operativni red pre potpisa: cena sa jedinice, kupac sa liste, fajl ugovora na prodaji. Nije pravni savet.",
      excerpt:
        "Poruka da je stan dogovoren nije predugovor. Potpis ima smisla tek kad su cena, kupac i fajl na istoj kartici.",
      dateLabel: "29. septembar 2026.",
      coverAlt:
        "Fajl ugovora zakačen na karticu prodaje stana, bez pravog potpisa i bez ličnih dokumenata",
      blocks: [
        {
          type: "p",
          text: "Predugovor o prodaji stana u kancelariji često počne kao rečenica: „dogovoreno, šaljem nacrt“. Nacrt ide mejlom, cena je iz priloga, a ime kupca iz poruke agencije. Kad PDF treba da izađe, niko nije siguran koja je cifra važeća i da li su dokumenta uopšte stigla. Ugovor tada izgleda uredno, a osnovica i lice na njemu ne.",
        },
        {
          type: "p",
          text: "Ovaj tekst nije pravni savet. Ne kaže da li vam za konkretan posao treba predugovor, ugovor, ili oba, i ne tumači posledice potpisa. To radi vaš pravnik. Ovde je red koji PropertyDesk drži pre nego što neko označi da je dokument potpisan: cena sa jedinice, kupac sa zatvorene liste, i fajl na prodaji.",
        },
        {
          type: "h2",
          id: "nije-poruka",
          text: "Predugovor nije poruka u četu",
        },
        {
          type: "p",
          text: "Poruka da agencija „drži kupca“ nije predugovor i nije status stana. Dok stan stoji slobodan u sistemu, druga agencija sme da ga nudi. Tek jedan status i jedna rezervacija skidaju tu drugu ponudu. Kako se slobodan, rezervisan i prodat razlikuju u radu, piše u tekstu o [statusu stana](/blog/status-stana-slobodan-rezervisan-prodat).",
        },
        {
          type: "p",
          text: "Nacrt koji živi samo u sandučetu nema vezu sa karticom. Sutra neko izmeni cenu, a nacrt i dalje nosi staru. Ili kupac na nacrtu nije lice sa kartona, jer je agencija poslala ime iz prve poruke, a dokumenta stoje na drugom. Predugovor koji izlazi iz prodaje vuče podatke te prodaje. Ne vuče poslednji prilog.",
        },
        {
          type: "figure",
          file: "ugovor-cena-sa-jedinice.webp",
          alt: "Cena na nacrtu ugovora jednaka ceni na kartici stana, bez starije Excel verzije pored",
          width: 1600,
          height: 900,
        },
        {
          type: "h2",
          id: "cena-sa-jedinice",
          text: "Cena na ugovoru je cena jedinice",
        },
        {
          type: "p",
          text: "Cifra u predugovoru mora da bude važeća cena jedinice, ne cena iz fajla koji se zove final. Ako se cenovnik i dalje grana u prilozima, dokument će biti uredan, a osnovica pogrešna. Garaža i parking ulaze svojom cenom, ne napomenom koju šablon preskoči. Kako se do jedne cene dolazi, piše u tekstu o [cenovniku stana u evrima](/blog/cenovnik-stana-u-evrima).",
        },
        {
          type: "p",
          text: "Plan rata, ako ga prodaja ima, ulazi kao spisak stavki čiji zbir odgovara toj ceni. Ne kao tabela koju je neko nalepio iz drugog mejla. Kurs po kom se evro pretvara u dinar unosite vi. Sistem ga ne povlači sam. Valuta oglasa i poreski režim stoje na jedinici, da šablon ne mora da ih traži u komentaru.",
        },
        {
          type: "h2",
          id: "kupac-sa-kartice",
          text: "Kupac na ugovoru je kupac sa kartice",
        },
        {
          type: "p",
          text: "Ime na dokumentu je ime sa kartona kupca, ne ime iz uvoda mejla. Fizičko lice, pravno lice i stranac nisu ista kartica, i checklist nije isti. Ako lista nije zatvorena, ugovor ne izlazi samo zato što je kapara već na računu. Šta na toj listi stoji, i zašto PDF staje, piše u tekstu o [KYC kupca](/blog/kyc-kupca-pre-ugovora-o-stanu).",
        },
        {
          type: "p",
          text: "Podaci na ugovoru su podaci o ličnosti. Nadzor u Srbiji vodi [Poverenik](https://poverenik.rs/). Kako ih PropertyDesk drži opisano je u [politici privatnosti](/privatnost). Agencija vidi trag svog zahteva. Ne vidi tuđi dokument. Investitor drži karton. Ta podela je i na [CRM-u za investitore](/crm-za-investitore).",
        },
        {
          type: "figure",
          file: "ugovor-fajl-potpis.webp",
          alt: "Potpis ugovora označen tek uz priloženi fajl na prodaji, bez vidljivog potpisa i bez lične karte",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "Cena na dokumentu je cena jedinice u tom trenutku.",
            "Kupac na dokumentu je kupac čija je lista zatvorena.",
            "Potpis se označava uz fajl, ne uz prazno dugme.",
            "Provizija se zaključava tog dana, ne iz sutrašnje tabele.",
          ],
        },
        {
          type: "p",
          text: "Nacrt koji šaljete pravniku treba da nosi iste podatke kao kartica, da se primedba vraća na prodaju, a ne na treću verziju Word fajla. Ako pravnik izmeni cifru, cena na jedinici mora da prati tu izmenu pre nego što PDF izađe kupcu. Inače imate odobren nacrt i drugu cifru u sistemu. Dva dokumenta, jedan stan. Fajl koji na kraju označite kao potpisan je fajl koji ste vi stavili, ne privremeni nacrt koji je ostao u prepisci.",
        },
        {
          type: "p",
          text: "Više kupaca na istom stanu, ili kupac i supružnik, i dalje su lica na toj prodaji, ne imena u uvodu mejla. Svako lice koje ulazi u dokument mora da bude na kartici pre nego što se potpis označi. Ako fali dokument jednog od njih, lista nije zatvorena i PDF staje. To nije pravno mišljenje o tome ko sme da potpiše. To je operativni zastoj da ugovor ne izađe na ime koje nema karton. Isti zastoj važi i kad je kupac pravno lice: poreski dokument koji vaš proces traži stoji na kartici, ne u zasebnom folderu koji šablon ne vidi. Bez tog dokumenta lista nije zatvorena, pa PDF i dalje čeka. Predugovor i konačni ugovor, ako vaš pravnik traži oba, ostaju dva fajla na istoj prodaji. Sistem ne bira koji je pravno dovoljan. Vi stavljate onaj koji stojite iza njega, i potpis označavate uz taj fajl.",
        },
        {
          type: "h2",
          id: "potpis-uz-fajl",
          text: "Potpis ide uz fajl",
        },
        {
          type: "p",
          text: "Označiti da je ugovor potpisan, a nemati fajl, ostavlja prodaju bez dokumenta koji ste tvrdili da postoji. PropertyDesk traži fajl uz taj korak. Dugme bez priloga ne zatvara priču. Fajl je onaj koji ste vi stavili na prodaju, ne slika iz četa koja se sutra ne da naći.",
        },
        {
          type: "p",
          text: "To i dalje ne proverava da li je potpis pravno punovažan i da li je nacrt onaj koji je pravnik odobrio. Vi stavljate fajl koji stojite iza njega. Sistem pamti da potpis nije označen bez tog fajla. Tok od rezervacije do tog koraka je na stranici [prodaja novogradnje](/prodaja-novogradnje).",
        },
        {
          type: "h2",
          id: "provizija-tog-dana",
          text: "Provizija se zaključava tog dana",
        },
        {
          type: "p",
          text: "Dan potpisa je dan kad iznos provizije treba da ostane onakav kakav je pravilo tad davalo, a ne onakav kakav će tabela reći sledeće nedelje. Ako agencija ima svoje pravilo na projektu, snapshot je na prodaji. Partner ne vidi tuđe dogovore. Kako se taj iznos zaključava, piše u tekstu o [proviziji agencije](/blog/provizije-agencija-za-novogradnju).",
        },
        {
          type: "p",
          text: "Direktna prodaja, bez agencije, ne dobija proviziju samo zato što projekat ima partnere. Ugovor na kupca koji je došao sa vašeg oglasa ne sme da povuče procenat koji pripada drugom kanalu. Pravilo stoji uz prodaju. Ne uz poslednji mejl.",
        },
        {
          type: "h2",
          id: "koja-je-verzija",
          text: "Koja je verzija nacrta",
        },
        {
          type: "p",
          text: "Nacrt koji je pravnik video u utorak i PDF koji je kupac dobio u četvrtak moraju biti isti fajl, ili mora da piše zašto nisu. Ako je u međuvremenu promenjena cena, garaža ili ime kupca, stari nacrt nije „skoro isti“. On je drugi dokument. Na prodaji stoji fajl koji ste vi stavili posle te izmene. Mejl sa nazivom „final-v3“ nije taj fajl dok ga ne zakačite na karticu.",
        },
        {
          type: "p",
          text: "Kupac koji potpisuje treba da potpiše dokument sa kartice, ne fotografiju ekrana koju je agencija prosledila. Ako se ta dva razlikuju, spor počinje pre pečata. Zato red ide ovako: izmena na jedinici, pa novi nacrt, pa fajl na prodaji, pa tek oznaka da je potpisano. Preskok ostavlja potpis na verziji koju sistem ne poznaje. Sutra niko ne može da pokaže šta je zaista otišlo kupcu.",
        },
        {
          type: "p",
          text: "Više lica na ugovoru znači više imena na toj istoj verziji. Supružnik koji ulazi u dokument mora da bude na kartici pre nego što PDF izađe. Ako ga dodate samo u Word, kartica i fajl se opet razilaze. To nije savet ko po zakonu mora da potpiše. To je zastoj da se fajl ne označi potpisanim dok lista lica nije ona koju ste vi proverili.",
        },
        {
          type: "p",
          text: "Posle potpisa stari nacrti ostaju istorija, ne ponuda. Agencija ne šalje „onaj prvi“ drugom kupcu zato što mu je cena bila niža. Važeća cena je i dalje na jedinici, a fajl koji ste označili kao potpisan ostaje na ovoj prodaji. Sledeći stan dobija svoj nacrt. Ne nasleđuje Word iz tuđeg mejla. Kako se do te cene uopšte dolazi, piše u tekstu o [cenovniku stana u evrima](/blog/cenovnik-stana-u-evrima). Ako pravnik vrati nacrt sa izmenom člana koji ne dira cenu ni ime, i taj fajl zamenjuje prethodni na kartici. Ne držite dva „važeća“ PDF-a. Jedan je onaj koji ide na potpis. Drugi je istorija. Kupac ne bira koji mu se više sviđa. Ako ste mu već poslali stariji PDF, novi ide uz kratku rečenicu šta se promenilo: cena, garaža ili ime. Bez te rečenice kupac potpisuje ono što ima u telefonu. Telefon nije kartica. Kartica je fajl koji ste zakačili posle izmene, i samo se taj označava kao potpisan. Stariji PDF u mejlu ostaje prepiska. Ne postaje drugi original samo zato što ga kupac još ima u prijemnom sandučetu i što mu je ta cifra bila draža. Draža cifra nije važeća cena. Važeća je ona na jedinici u trenutku kad fajl ide na potpis.",
        },
        {
          type: "h2",
          id: "posle-potpisa",
          text: "Posle potpisa ostaju uplate i primopredaja",
        },
        {
          type: "p",
          text: "Potpis ne znači da su sve rate legle i da su ključevi predati. Plan plaćanja i dalje ima stavke sa rokovima. Primopredaja je poseban korak na prodaji, sa svojom listom, ne rečenica „gotovo“ u napomeni. Uplate i dalje potvrđujete vi, po izvodu. Faktura ka SEF-u i dalje je ručni korak.",
        },
        {
          type: "p",
          text: "Ne morate da uvezete stare ugovore da biste videli red. Dovoljan je prvi stan koji ide ka potpisu. Na njemu se vidi da PDF ne izađe dok lista nije zatvorena, i da se potpis ne označi bez fajla. Cene i rani pristup do 15.11.2026. su na [cenovniku](/#cenovnik). Ako hoćete taj zastoj na svom primeru, to pokazujemo na [demou od 25 minuta](/demo).",
        },
      ],
    },
    en: {
      title: "The preliminary contract and the apartment sale contract: the order before signing",
      description:
        "The operational order before signing: the unit price, a buyer whose checklist is closed, and a contract file on the sale. Not legal advice.",
      excerpt:
        "A message that the unit is agreed is not a preliminary contract. Signing makes sense once the price, the buyer, and the file are on the same record.",
      dateLabel: "29 September 2026",
      coverAlt:
        "A contract file attached to an apartment sale, with no real signature and no identity documents",
      blocks: [
        {
          type: "p",
          text: "A preliminary contract for an apartment often starts in the office as a sentence: “agreed, I am sending a draft”. The draft goes by email, the price comes from an attachment, and the buyer’s name comes from the agency’s message. When the PDF should go out, nobody is sure which figure is current or whether the documents arrived at all. The contract then looks tidy, and the base and the party on it do not.",
        },
        {
          type: "p",
          text: "This piece is not legal advice. It does not say whether your deal needs a preliminary contract, a sale contract, or both, and it does not interpret what a signature does. Your lawyer does that. Here is the order PropertyDesk keeps before someone marks a document signed: the price from the unit, a buyer whose checklist is closed, and a file on the sale.",
        },
        {
          type: "h2",
          id: "not-a-message",
          text: "A preliminary contract is not a chat message",
        },
        {
          type: "p",
          text: "A message that an agency is “holding a buyer” is not a preliminary contract and it is not the unit status. While the unit stays available in the system, another agency may offer it. Only one status and one reservation take that second offer off the table. How available, reserved, and sold differ in daily work is in the piece on [unit status](/blog/status-stana-slobodan-rezervisan-prodat).",
        },
        {
          type: "p",
          text: "A draft that lives only in an inbox has no link to the record. Tomorrow someone changes the price, and the draft still carries the old one. Or the buyer on the draft is not the party on the card, because the agency sent a name from the first message while the documents sit on another. A preliminary contract that comes from the sale pulls the data of that sale. It does not pull the latest attachment.",
        },
        {
          type: "figure",
          file: "ugovor-cena-sa-jedinice.webp",
          alt: "The price on a contract draft equal to the price on the unit card, with no older spreadsheet beside it",
          width: 1600,
          height: 900,
        },
        {
          type: "h2",
          id: "price-from-the-unit",
          text: "The price on the contract is the unit price",
        },
        {
          type: "p",
          text: "The figure in the preliminary contract has to be the current unit price, not the price from a file named final. If the price list still forks in attachments, the document will look tidy and the base will be wrong. The garage and the parking space enter with their own price, not with a note the template skips. How you get to one price is in the piece on a [euro price list](/blog/cenovnik-stana-u-evrima).",
        },
        {
          type: "p",
          text: "The installment schedule, if the sale has one, enters as a list of lines whose sum matches that price. Not as a table pasted from another email. You enter the rate that turns euros into dinars. The system does not pull it. The currency of the advert and the tax treatment sit on the unit, so the template does not have to look for them in a comment.",
        },
        {
          type: "h2",
          id: "buyer-on-the-record",
          text: "The buyer on the contract is the buyer on the record",
        },
        {
          type: "p",
          text: "The name on the document is the name on the buyer record, not the name in the opening of an email. A natural person, a company, and a foreign buyer are not the same card, and the checklist is not the same. If the list is not closed, the contract does not go out just because the deposit is already on the account. What sits on that list, and why the PDF waits, is in the piece on [buyer checks](/blog/kyc-kupca-pre-ugovora-o-stanu).",
        },
        {
          type: "p",
          text: "The data on a contract are personal data. Supervision in Serbia sits with the [Commissioner](https://poverenik.rs/). How PropertyDesk holds them is described in the [privacy policy](/privatnost). The agency sees the trail of its own request. It does not see someone else’s document. The developer keeps the record. That split is also in [CRM for investors](/crm-za-investitore).",
        },
        {
          type: "figure",
          file: "ugovor-fajl-potpis.webp",
          alt: "A contract marked signed only together with a file on the sale, with no visible signature and no identity card",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "The price on the document is the unit price at that moment.",
            "The buyer on the document is the buyer whose checklist is closed.",
            "Signed is marked together with a file, not with an empty button.",
            "Commission is locked that day, not from tomorrow’s sheet.",
          ],
        },
        {
          type: "p",
          text: "The draft you send to your lawyer should carry the same data as the record, so the comment comes back to the sale rather than to a third Word file. If the lawyer changes the figure, the price on the unit has to follow that change before the PDF goes to the buyer. Otherwise you have an approved draft and a different figure in the system. Two documents, one unit. The file you finally mark as signed is the file you attached, not a temporary draft left in the thread.",
        },
        {
          type: "h2",
          id: "signed-with-a-file",
          text: "Signed goes with a file",
        },
        {
          type: "p",
          text: "Marking a contract signed without a file leaves the sale without the document you claimed existed. PropertyDesk asks for a file with that step. A button without an attachment does not close the story. The file is the one you put on the sale, not a picture from a chat that cannot be found tomorrow.",
        },
        {
          type: "p",
          text: "That still does not check whether the signature is legally valid or whether the draft is the one your lawyer approved. You attach the file you stand behind. The system remembers that signed was not marked without that file. The path from the reservation to that step is on [new-build sales](/prodaja-novogradnje).",
        },
        {
          type: "h2",
          id: "commission-that-day",
          text: "Commission is locked that day",
        },
        {
          type: "p",
          text: "Signing day is the day the commission amount should stay as the rule gave it then, not as the sheet will say next week. If the agency has its own rule on the project, the snapshot sits on the sale. The partner does not see other deals. How that amount is locked is in the piece on [agency commission](/blog/provizije-agencija-za-novogradnju).",
        },
        {
          type: "p",
          text: "A direct sale, with no agency, does not pick up a commission just because the project has partners. A contract with a buyer who came from your own advert must not pull a percentage that belongs to another channel. The rule sits with the sale. Not with the latest email.",
        },
        {
          type: "h2",
          id: "which-draft",
          text: "Which draft this is",
        },
        {
          type: "p",
          text: "The draft your lawyer saw on Tuesday and the PDF the buyer received on Thursday have to be the same file, or it has to say why they are not. If the price, the garage or the buyer’s name changed in between, the old draft is not “almost the same”. It is another document. The sale holds the file you attached after that change. An email named “final-v3” is not that file until you attach it to the record.",
        },
        {
          type: "p",
          text: "The buyer who signs should sign the document from the record, not a screenshot an agency forwarded. If those two differ, the dispute starts before the stamp. So the order is: change the unit, then a new draft, then the file on the sale, and only then the mark that it was signed. A skip leaves a signature on a version the system does not know. Tomorrow nobody can show what actually went to the buyer.",
        },
        {
          type: "p",
          text: "Several parties on the contract means several names on that same version. A spouse who enters the document has to be on the record before the PDF goes out. If you add them only in a word processor, the record and the file drift apart again. This is not advice about who must sign under the law. It is a stop so the file is not marked signed until the list of parties is the one you checked.",
        },
        {
          type: "p",
          text: "After signing, old drafts stay history, not an offer. An agency does not send “that first one” to another buyer because the price was lower. The current price is still on the unit, and the file you marked as signed stays on this sale. The next unit gets its own draft. It does not inherit a word-processor file from someone else’s email. How you get to that price is in the piece on a [euro price list](/blog/cenovnik-stana-u-evrima). If the lawyer returns a draft with a change that does not touch the price or the name, that file still replaces the previous one on the record. You do not keep two PDFs that are both current. One is the file that goes to signature. The other is history.",
        },
        {
          type: "h2",
          id: "after-signing",
          text: "After signing, payments and handover remain",
        },
        {
          type: "p",
          text: "A signature does not mean every installment has landed and the keys have been handed over. The payment schedule still has lines with due dates. Handover is a separate step on the sale, with its own list, not a sentence that says “done” in a note. You still confirm payments against the statement. An invoice to SEF is still a manual step.",
        },
        {
          type: "p",
          text: "You do not have to import old contracts to see the order. The first unit heading toward a signature is enough. On it you see that the PDF does not go out until the checklist is closed, and that signed is not marked without a file. Prices and early access until 15 November 2026 are on the [pricing section](/#cenovnik). If you want that wait on your own example, we show it in a [25-minute demo](/demo).",
        },
      ],
    },
  },
};
