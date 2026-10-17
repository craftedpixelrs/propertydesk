import type { BlogPost } from "@/features/marketing/blog/types";

export const choosePost: BlogPost = {
  slug: "kako-izabrati-softver-za-prodaju-novogradnje",
  published: "2026-10-04",
  modified: "2026-10-05",
  minutes: 9,
  coverFile: "kako-izabrati-softver-za-prodaju-novogradnje.webp",
  copy: {
    sr: {
      title: "Kako izabrati softver za prodaju novogradnje",
      description:
        "Softver za prodaju novogradnje drži stan, cenu, rezervaciju, ugovor i uplatu. Generički CRM drži deal. Evo kako da razlikujete.",
      excerpt:
        "Pitanje nije koji je CRM najpoznatiji. Pitanje je da li alat zna šta je stan, rata i provizija agencije.",
      dateLabel: "4. oktobar 2026.",
      coverAlt:
        "Poređenje tabele, generičkog CRM-a i jednog toka prodaje stana, bez logotipa tuđih proizvoda",
      blocks: [
        {
          type: "p",
          text: "Softver za prodaju novogradnje birate po tome šta mora da ostane jedna istina kad objekat preraste jednog čoveka. Stan ima status. Cena ima istoriju. Rezervacija je jedna. Ugovor traži fajl. Uplata sedi na stavci. Provizija agencije se zaključa na dan potpisa. Ako alat te reči nema, vi ćete ih crtati custom poljima, a sutra niko neće znati koje polje je važeće.",
        },
        {
          type: "p",
          text: "Ovo nije rang lista i nije recenzija tuđih proizvoda. Ne merimo ocene, ne brojimo tuđe klijente i ne tvrdimo da je neki svetski CRM loš za svoj posao. Tvrdimo da prodaja stana u izgradnji nije isti posao kao prodaja pretplate. PropertyDesk je građen za prvi posao. Stranica [prodaja novogradnje](/prodaja-novogradnje) opisuje tok. Ovaj tekst kaže koja pitanja da postavite pre nego što platite bilo koji alat, uključujući ovaj.",
        },
        {
          type: "h2",
          id: "tri-alata",
          text: "Tri alata koja tim već ima",
        },
        {
          type: "p",
          text: "Prvi je Excel. Dovoljan je dok jedan čovek zna svaki stan. Puca kad druga osoba sačuva drugu verziju cenovnika. Drugi je Viber. Dovoljan je za dogovor „držimo A-12 do petka“. Puca kad druga agencija ne vidi taj dogovor. Treći je generički CRM, alat u kom je sve deal, stage i custom polje. Dovoljan je za lid. Puca kad treba da kaže da stan ne sme imati dva holda, i da rata ne sme da primi veću uplatu od svog iznosa.",
        },
        {
          type: "p",
          text: "Softver za prodaju novogradnje ne zamenjuje ta tri time što ima lepši izveštaj. Zamenjuje ih time što su stan, kupac, rezervacija, ugovor, stavka plana i provizija posebni zapisi, povezani. Ako vam demo pokaže samo tabelu kontakata, niste videli prodaju. Tražite jedan stan od slobodnog do predatog. Tekst o [Excelu](/blog/excel-ili-softver-za-prodaju-novogradnje) drži prvi prelom. Ovaj drži izbor posle njega.",
        },
        {
          type: "figure",
          file: "izbor-excel-crm.webp",
          alt: "Tri kolone: Excel cenovnik, generički deal, i kartica stana sa statusom i ratom",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "Da li postoji jedan status po stanu, ili boja u ćeliji.",
            "Da li cena pamti ko ju je promenio i zašto.",
            "Da li druga rezervacija istog stana uopšte može da se otvori.",
            "Da li se ugovor može označiti potpisanim bez fajla.",
            "Da li uplata može da pređe iznos stavke.",
          ],
        },
        {
          type: "h2",
          id: "crm",
          text: "CRM za investitore nije pretraga reči CRM",
        },
        {
          type: "p",
          text: "Ako u pretrazi kucate samo CRM, dobićete alate za sve branše. To nije vaš upit. Vaš upit je CRM za investitore, u smislu kartona kupca vezanog za jedinicu, proveru pre ugovora i agenciju koja je dovela zahtev. Generički deal to može da imitira poljima. Imitacija puca prvog dana kad dva agenta popune polje „stan“ različitim tekstom za isti lokal.",
        },
        {
          type: "p",
          text: "Na [CRM stranici](/crm-za-investitore) je ta razlika. Ovde je proba na demou: otvorite kupca, otvorite stan, vidite da li su povezani ili samo pomenuti u napomeni. Ako su povezani, promena statusa stana vidi se i na kartonu. Ako nisu, CRM vam drži imenik, a zalihu i dalje držite u tabeli. Tada niste zamenili Excel. Dodali ste još jedan prozor.",
        },
        {
          type: "h2",
          id: "srbija",
          text: "Šta u Srbiji mora da postoji, a strani alat nema",
        },
        {
          type: "p",
          text: "IPS QR za kaparu. Cena u evrima i uplata u dinarima po kursu koji unosite, ne po kursu koji se sam povlači. Ručna potvrda izvoda. SEF koji ne ide sam: slanje eFakture ostaje vaš posao na portalu, i alat koji obeća automatsko slanje obećava nešto što ovde nije uključeno. PropertyDesk QR zna. Kurs ne povlači. SEF ne šalje. To treba da čujete i od svakog drugog ponuđača, jasno, pre ugovora o licenci.",
        },
        {
          type: "p",
          text: "Javni link stana, bez naloga za kupca, sa cenom samo ako je uključite i bez interne napomene, isto je pitanje za demo. Ako ponuđač nema link, i dalje ćete slati PDF. Ako link pokazuje sve napomene iz kartice, ne smete ga poslati. Oba ishoda su razlog da stanete. Opis onoga što link sme je u tekstu o [javnom linku](/blog/javni-link-ponuda-stana).",
        },
        {
          type: "figure",
          file: "izbor-jedan-tok.webp",
          alt: "Jedan tok od statusa stana, preko rezervacije i ugovora, do uplate i primopredaje",
          width: 1600,
          height: 900,
        },
        {
          type: "h2",
          id: "agencija",
          text: "Agencija nije korisnik koga delite lozinku",
        },
        {
          type: "p",
          text: "Ako prodajete i preko agencija, alat mora da im da ulaz bez vaše lozinke i bez celog cenovnika u prilogu. Vide jedinice koje smeju da nude. Rezervišu tako da drugi hold na isti stan ne prođe. Provizija im je pravilo, a iznos na dan ugovora se ne menja zato što ste kasnije promenili procenat. Ako demo to pokaže kao Excel koji im šaljete petkom, niste videli portal. Videli ste staru naviku u novom meniju.",
        },
        {
          type: "p",
          text: "Stranica [provizija agencije](/provizije-agencija) i stranica [za agencije](/za-agencije) drže taj deo. Na izboru alata pitajte: šta agencija vidi posle potpisa, i da li može da promeni iznos koji je zaključan. Tačan odgovor je da vidi status, a iznos ne pomera. Ako ponuđač kaže da se sve može naknadno ispraviti bez traga, to nije fleksibilnost. To je spor koji ćete voditi vi.",
        },
        {
          type: "h2",
          id: "sta-ne-trazite",
          text: "Šta ne treba da bude razlog za izbor",
        },
        {
          type: "p",
          text: "Ne birajte zato što brošura kaže da je najbolji CRM, ni zato što neko obeća da će softver sam da prodaje stanove. Ne birajte po tome da li ima modul za PDV kao pravni savet. Porez i zapisnik predaje nisu stvar koju alat sme da vam protumači. Primopredaja u PropertyDesk-u je lista na prodaji: ključevi, brojila, nedostaci, ko je bio, ko je zatvorio. Nije pravni zapisnik. Ako vam drugi alat proda „usklađenost sa zakonom“ jednom rečenicom, tražite šta ta rečenica tačno čuva u kartici.",
        },
        {
          type: "p",
          text: "Ne birajte ni po broju grafikona. Direktoru treba lista: šta je slobodno, šta je na holdu, koja rata kasni, koja predaja nije zatvorena. Grafikon koji ne vodi do te liste je slika. Evidencija uplata, opisana u tekstu o [uplatama](/blog/evidencija-uplata-za-stanove), jeste lista. Ako je nema, izveštaj ćete i dalje sklapati ručno.",
        },
        {
          type: "ul",
          items: [
            "Jedan stan, jedan status, jedna aktivna rezervacija.",
            "Cena sa tragom, ugovor samo uz fajl.",
            "Uplata do iznosa stavke, kurs koji unosite, SEF ručno.",
            "Agencija vidi svoje, provizija se ne pomera posle potpisa.",
            "Kupac nema lozinku. Link ne iznosi internu napomenu.",
          ],
        },
        {
          type: "h2",
          id: "demo",
          text: "Šta da tražite na demou od 25 minuta",
        },
        {
          type: "p",
          text: "Ponesite jedan ulaz, ne ceo objekat. Neka vam pokažu unos cene i šta ostane od stare cene. Neka otvore rezervaciju i pokušaju drugu na istom stanu. Neka označe ugovor bez fajla i vide da ne prolazi. Neka vežu uplatu veću od stavke i vide da ne prolazi. Neka otvore javni link i provere da interna napomena nije na njemu. Ako bilo koji od tih koraka „može, samo drugačije, u izveštaju“, niste videli pravilo. Videli ste obećanje.",
        },
        {
          type: "p",
          text: "Isto pitajte i nas. PropertyDesk na tom demou treba da pokaže baš te korake, na srpskom, sa IPS QR, bez priče da je SEF automatski i bez priče da se kurs sam povlači. Ako vam na demou neko od toga preskoči, recite. Alat za prodaju novogradnje se meri po onome što odbije da uradi pogrešno, ne po broju ekrana koje stigne da otvori za 25 minuta.",
        },
        {
          type: "h2",
          id: "posle-demoa",
          text: "Šta ostaje u kancelariji posle demoa",
        },
        {
          type: "p",
          text: "Posle demoa ne tražite od tima da „pređe na sistem“ u jednom danu. Tražite jedan ulaz. Unesite stanove, cene i jedan plan rata. Otvorite jednu rezervaciju. Tek kad taj ulaz ima jednu istinu, šaljite prvi javni link jednoj agenciji, sa njenim kodom. Ako tog dana i dalje šaljete i PDF, niste prešli. Držite PDF samo dok link ne pokaže istu cenu. Čim pokaže, stari fajl se više ne šalje. Dve ponude u istom danu vraćaju vas na početak, bez obzira koji je alat plaćen.",
        },
        {
          type: "p",
          text: "Ako na demou ne stignete do primopredaje, zapišite to kao otvoreno pitanje, ne kao usvojen modul. Lista ključeva i brojila ili postoji na prodaji, ili je nema. Treći odgovor, „dodaćemo custom polje“, znači da je obilazak i dalje u četu.",
        },
        {
          type: "p",
          text: "Na tom istom ulazu proverite i šta agencija vidi. Ako vidi sve stanove objekta, uključujući blokirane i one koji nisu u prodaji, portal je preširok. Ako ne vidi cenu koju sme da kaže kupcu, portal je prazan i ona će i dalje tražiti Excel. Pravi obim je uzak: jedinice koje sme da nudi, status koji se ne da zaobići drugom rezervacijom, i provizija koju vidi a ne menja. Ako demo to ne pokaže na jednom stanu, neće pokazati ni na sto. Ne čekajte drugi sastanak da biste to pitali. To je pitanje za tih 25 minuta, odmah posle cene i rezervacije.",
        },
        {
          type: "p",
          text: "Isto važi za uplate. Prva nedelja nije mesec u kom sve stare rate prepisujete iz tri godine tabela. Prva nedelja je tekući mesec: šta je dospelo, šta je leglo, šta još nije vezano. Stare prodaje unosite kad vam zatrebaju za ostatak duga, ne da bi grafikon izgledao pun. Pun grafikon od pogrešnih stavki je skuplji od praznog. Prazan se vidi. Pogrešan se brani na sastanku.",
        },
        {
          type: "p",
          text: "Kad se vratite u kancelariju, uporedite sa onim što tim sutra radi u tabeli. Ako posle demoa i dalje imate dva cenovnika i jedan čet, alat nije rešio prelom. Ako imate jedan stan, jednu rezervaciju i jednu stavku za uplatu, rešio je ono zbog čega ste uopšte tražili softver za prodaju novogradnje. Ostalo je navika, i ona se menja tek kad prva agencija pošalje zahtev na novi link umesto na stari PDF.",
        },
      ],
    },
    en: {
      title: "How to choose software for new-build sales",
      description:
        "New-build sales software keeps the unit, price, reservation, contract and payment. A generic CRM keeps a deal. Here is how to tell them apart.",
      excerpt:
        "The question is not which CRM is most famous. The question is whether the tool knows what a unit, an installment and an agency commission are.",
      dateLabel: "4 October 2026",
      coverAlt:
        "A comparison of a spreadsheet, a generic CRM and one apartment sales path, with no other product logos",
      blocks: [
        {
          type: "p",
          text: "You choose software for new-build sales by what must stay one truth when the building outgrows one person. A unit has a status. A price has a history. A reservation is one. A contract needs a file. A payment sits on a line. An agency commission locks on signing day. If the tool does not have those words, you will draw them as custom fields, and tomorrow nobody will know which field is the current one.",
        },
        {
          type: "p",
          text: "This is not a ranking and it is not a review of other products. We do not score ratings, we do not count other people’s clients, and we do not claim a global CRM is bad at its own job. We claim that selling an apartment during construction is not the same job as selling a subscription. PropertyDesk is built for the first job. The [new-build sales](/prodaja-novogradnje) page describes the path. This note says which questions to ask before you pay for any tool, including this one.",
        },
        {
          type: "h2",
          id: "three-tools",
          text: "Three tools the team already has",
        },
        {
          type: "p",
          text: "The first is Excel. It is enough while one person knows every apartment. It breaks when a second person saves another version of the price list. The second is chat. It is enough for an agreement to hold A-12 until Friday. It breaks when another agency does not see that agreement. The third is a generic CRM, a tool where everything is a deal, a stage and a custom field. It is enough for a lead. It breaks when it needs to say that an apartment must not have two holds, and that an installment must not take a payment larger than its amount.",
        },
        {
          type: "p",
          text: "New-build sales software does not replace those three by having a prettier report. It replaces them because the unit, the buyer, the reservation, the contract, the plan line and the commission are separate records, linked. If a demo shows you only a contact table, you have not seen a sale. Ask for one apartment from available to handed over. The note on [Excel](/blog/excel-ili-softver-za-prodaju-novogradnje) keeps the first break. This one keeps the choice after it.",
        },
        {
          type: "figure",
          file: "izbor-excel-crm.webp",
          alt: "Three columns: an Excel price list, a generic deal, and an apartment card with a status and an installment",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "Whether there is one status per apartment, or a colour in a cell.",
            "Whether the price remembers who changed it and why.",
            "Whether a second reservation of the same apartment can be opened at all.",
            "Whether a contract can be marked signed without a file.",
            "Whether a payment can exceed the line amount.",
          ],
        },
        {
          type: "h2",
          id: "crm",
          text: "A CRM for investors is not a search for the word CRM",
        },
        {
          type: "p",
          text: "If you type only CRM into search, you get tools for every industry. That is not your query. Your query is a CRM for investors, meaning a buyer record tied to a unit, a check before the contract, and the agency that brought the request. A generic deal can imitate that with fields. The imitation breaks on the first day two agents fill the field “apartment” with different text for the same unit.",
        },
        {
          type: "p",
          text: "That difference is on the [CRM page](/crm-za-investitore). Here is the test on a demo: open a buyer, open an apartment, see whether they are linked or only mentioned in a note. If they are linked, a status change on the apartment shows on the record. If they are not, the CRM holds an address book, and you still hold the stock in a spreadsheet. Then you have not replaced Excel. You have added another window.",
        },
        {
          type: "h2",
          id: "serbia",
          text: "What has to exist in Serbia, and a foreign tool does not have",
        },
        {
          type: "p",
          text: "An IPS QR for the deposit. A price in euros and a payment in dinars at the rate you enter, not at a rate that pulls itself. A manual confirmation of the statement. SEF that does not run by itself: sending an e-invoice stays your job on the portal, and a tool that promises automatic sending is promising something that is not switched on here. PropertyDesk knows the QR. It does not pull the rate. It does not send SEF. You should hear that, clearly, from every other vendor too, before a licence contract.",
        },
        {
          type: "p",
          text: "A public link for the apartment, with no account for the buyer, with the price only if you turn it on and without the internal note, is the same question for the demo. If the vendor has no link, you will still send PDFs. If the link shows every note from the card, you must not send it. Both outcomes are a reason to stop. What the link is allowed to show is in the note on the [public link](/blog/javni-link-ponuda-stana).",
        },
        {
          type: "figure",
          file: "izbor-jedan-tok.webp",
          alt: "One path from unit status, through reservation and contract, to payment and handover",
          width: 1600,
          height: 900,
        },
        {
          type: "h2",
          id: "the-agency",
          text: "An agency is not a user you share a password with",
        },
        {
          type: "p",
          text: "If you also sell through agencies, the tool has to give them an entrance without your password and without the whole price list as an attachment. They see the units they may offer. They reserve so that a second hold on the same apartment does not go through. Their commission is a rule, and the amount on contract day does not change because you later changed the percentage. If the demo shows that as an Excel file you send them on Friday, you have not seen a portal. You have seen the old habit in a new menu.",
        },
        {
          type: "p",
          text: "The [agency commission](/provizije-agencija) page and the [for agencies](/za-agencije) page keep that part. When choosing a tool, ask what the agency sees after signing, and whether it can change the amount that was locked. The right answer is that it sees the status, and it does not move the amount. If a vendor says everything can be corrected later with no trail, that is not flexibility. That is a dispute you will be the one to have.",
        },
        {
          type: "h2",
          id: "what-not-to-buy",
          text: "What should not be the reason you choose",
        },
        {
          type: "p",
          text: "Do not choose because a brochure says it is the best CRM, or because someone promises the software will sell the apartments by itself. Do not choose by whether it has a VAT module presented as legal advice. Tax and a handover protocol are not something the tool should interpret for you. Handover in PropertyDesk is a list on the sale: keys, meters, defects, who attended, who closed it. It is not a legal protocol. If another tool sells you “legal compliance” in one sentence, ask what that sentence actually stores on the card.",
        },
        {
          type: "p",
          text: "Do not choose by the number of charts either. A director needs a list: what is free, what is on hold, which installment is late, which handover is not closed. A chart that does not lead to that list is a picture. The payment record, described in the note on [payments](/blog/evidencija-uplata-za-stanove), is a list. If it is missing, you will still assemble the report by hand.",
        },
        {
          type: "ul",
          items: [
            "One apartment, one status, one active reservation.",
            "A price with a trail, a contract only with a file.",
            "A payment up to the line amount, a rate you enter, SEF by hand.",
            "The agency sees its own, the commission does not move after signing.",
            "The buyer has no password. The link does not carry the internal note.",
          ],
        },
        {
          type: "h2",
          id: "the-demo",
          text: "What to ask for in a 25-minute demo",
        },
        {
          type: "p",
          text: "Bring one entrance, not the whole building. Have them show a price change and what remains of the old price. Have them open a reservation and try a second one on the same apartment. Have them mark a contract signed without a file and see that it does not go through. Have them tie a payment larger than the line and see that it does not go through. Have them open the public link and check that the internal note is not on it. If any of those steps “can be done, just differently, in a report”, you have not seen a rule. You have seen a promise.",
        },
        {
          type: "p",
          text: "Ask us the same. On that demo PropertyDesk should show exactly those steps, in Serbian, with an IPS QR, without a story that SEF is automatic and without a story that the rate pulls itself. If someone skips one of those on the demo, say so. Software for new-build sales is measured by what it refuses to do wrong, not by how many screens it manages to open in 25 minutes.",
        },
        {
          type: "p",
          text: "When you get back to the office, compare it with what the team will do in the spreadsheet tomorrow. If after the demo you still have two price lists and one chat, the tool did not solve the break. If you have one apartment, one reservation and one line for the payment, it solved the reason you looked for new-build sales software at all. The rest is habit, and that changes only when the first agency sends a request on the new link instead of the old PDF.",
        },
      ],
    },
  },
};
