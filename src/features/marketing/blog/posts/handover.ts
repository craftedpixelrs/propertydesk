import type { BlogPost } from "@/features/marketing/blog/types";

export const handoverPost: BlogPost = {
  slug: "primopredaja-stana",
  published: "2026-10-01",
  modified: "2026-10-05",
  minutes: 9,
  coverFile: "primopredaja-stana.webp",
  copy: {
    sr: {
      title: "Primopredaja stana: lista pre nego što kupac uzme ključeve",
      description:
        "Primopredaja stana posle potpisa: ključevi, brojila, nedostaci i ko je bio prisutan. Lista na prodaji, ne u Viberu. Nije pravni savet.",
      excerpt:
        "Potpis ugovora nije kraj posla. Ključevi, brojila i lista nedostataka ostaju na prodaji, sa imenom ko je zapis završio.",
      dateLabel: "1. oktobar 2026.",
      coverAlt:
        "Lista primopredaje stana sa ključevima, brojilima i poljem za nedostatke, bez imena kupca",
      blocks: [
        {
          type: "p",
          text: "Primopredaja stana počinje tek kad je ugovor potpisan. Do tada je stan još uvek u prodaji: cena, kapara, rate i dokumenta. Dan kad kupac dolazi po ključeve je drugi događaj. Ako on živi u poruci „ostavili smo ključeve na porti“, niko za mesec dana ne zna da li su brojila pročitana, šta je zatečeno na zidu, i ko je bio u stanu.",
        },
        {
          type: "p",
          text: "Ovaj tekst je operativan. Ne kaže koji zapisnik zakon traži, ne zamenjuje advokata i ne opisuje garanciju izvođača. Kaže šta kancelarija treba da ostavi na kartici prodaje da se primopredaja ne raspe po četovima. PropertyDesk tu listu drži na prodaji, posle potpisa. [Ugovor](/blog/predugovor-i-ugovor-o-prodaji-stana) i dalje ostaje zaseban korak.",
        },
        {
          type: "h2",
          id: "posle-potpisa",
          text: "Ključevi nisu isti događaj kao potpis",
        },
        {
          type: "p",
          text: "Ugovor može biti potpisan, a stan još nije spreman. Kupac može platiti poslednju ratu, a ključ još stoji kod domara. Ako te dve stvari spojiš u jednu napomenu „završeno“, izveštaj ne razlikuje prodaju koja čeka predaju od prodaje koja je predaja već zatvorena. Tim ujutru vidi samo da je status prodat, a ne da li je neko fizički ušao u stan.",
        },
        {
          type: "p",
          text: "Zato lista ide na konkretnu prodaju, ne na sprat i ne u zajednički folder. Na njoj stoji da li su ključevi predati, stanja brojila struje, vode i grejanja, šta je zatečeno kao nedostatak, ko je bio prisutan, i da li je predaja označena kao završena. Kad je završena, ostaje ime osobe koja je zapis zatvorila. To nije potpis kupca na PDF-u. To je trag u sistemu ko je u kancelariji rekao da je obilazak gotov.",
        },
        {
          type: "ul",
          items: [
            "Ključevi: predati ili još nisu.",
            "Brojilo struje, vode i grejanja, kao broj koji ste pročitali tog dana.",
            "Nedostaci, kratko i na toj prodaji.",
            "Ko je bio u stanu: kupac, agent, neko iz izvođenja.",
            "Završeno, sa imenom ko je listu zatvorio.",
          ],
        },
        {
          type: "figure",
          file: "primopredaja-kljucevi.webp",
          alt: "Kartica prodaje sa čekiranim ključevima i praznim brojilima, pre nego što je predaja zatvorena",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Ako ključeve predate pre nego što su rate zatvorene, to i dalje može biti svesna odluka investitora. Sistem ne sme da je sakrije. Evidencija uplata ostaje na planu, a predaja ostaje na svojoj listi. Kad kasnije pitate da li je stan predat iako jedna rata kasni, odgovor je u oba mesta, ne u sećanju agenta. Plan rata je opisan u tekstu o [planu plaćanja](/blog/plan-placanja-rate-za-stan).",
        },
        {
          type: "h2",
          id: "brojila",
          text: "Brojila se upisuju onog dana kad se čitaju",
        },
        {
          type: "p",
          text: "Stanje brojila nije cena stana i nije stavka iz ugovora. To je broj sa uređaja u trenutku predaje. Ako ga zapišete u poruci, za tri meseca niko ne nađe fotografiju, a kupac tvrdi da je grejanje već bilo na drugoj cifri. Tri polja su dovoljna za kancelariju koja vodi novogradnju: struja, voda, grejanje. Ako objekat nema grejanje na brojilo, polje ostaje prazno. Prazno je bolje od izmišljene nule.",
        },
        {
          type: "p",
          text: "Ne mešajte ovo sa obračunom komunalija. PropertyDesk ne šalje stanje infostanu i ne računa potrošnju. Drži broj koji je tim uneo, na toj prodaji, da se ne traži po galeriji telefona. Ako kasnije treba fotografija brojila, ona ide u dokumenta prodaje, pored ugovora, a ne umesto broja u listi.",
        },
        {
          type: "figure",
          file: "primopredaja-brojila.webp",
          alt: "Tri polja za stanje brojila struje, vode i grejanja na listi primopredaje",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Isti stan može imati pomoćnu jedinicu, garažu ili parking. Predaja ključa stana ne znači da je predato i parking mesto. Zato svaka jedinica koja se prodaje nosi svoju prodaju i, kad dođe taj dan, svoju listu. Ako garažu predajete drugi dan, ne prepisujte jučerašnje brojilo stana u njen zapis. To su dva obilaska.",
        },
        {
          type: "h2",
          id: "nedostaci",
          text: "Nedostaci ostaju rečenica, ne nova cena",
        },
        {
          type: "p",
          text: "Na obilasku se vidi ogrebotina, vrata koja ne zatvaraju, ili utičnica koja fali. To nije razlog da se u istom dahu menja cena stana. Cena ima svoju istoriju i svoj razlog. Lista nedostataka je tekst na predaji: šta je viđeno, da tim sutra zna šta je obećano da se sredi pre nego što se predaja označi kao završena. Ako nedostatak ostane u Viberu, druga smena ga ne vidi.",
        },
        {
          type: "p",
          text: "Ne pretvarajte tu rečenicu u pravni nalaz. Ne pišite da je izvođač kriv, i ne obećavajte rok koji ugovor nije predvideo. Zapišite šta je tim video. Ako investitor odluči da stan ne predaje dok se stavka ne sredi, predaja ostaje otvorena. Ključevi mogu biti predati, a lista i dalje nije zatvorena, ako tako vodite taj objekat. Oba polja postoje zasebno baš zato.",
        },
        {
          type: "ul",
          items: [
            "Jedna kratka lista na toj prodaji, ne novi Excel po ulazu.",
            "Bez nove cene i bez novog ugovora u istom polju.",
            "Predaja može ostati otvorena dok se stavka ne sredi.",
            "Zatvaranje liste ne briše tekst nedostataka.",
          ],
        },
        {
          type: "h2",
          id: "ko-je-bio",
          text: "Ko je bio u stanu, i ko je zapis zatvorio",
        },
        {
          type: "p",
          text: "Prisutni su imena koja ste uneli: kupac, partner iz agencije, neko sa gradilišta. To nije spisak naloga u sistemu i nije potpis na papiru. Služi da se za nedelju dana ne raspravlja da li je agent uopšte bio na obilasku. Kad listu označite kao završenu, pored datuma ostaje ime korisnika koji je to uradio. Ako istu prodaju kasnije otvori drugi kolega, vidi ko je zatvorio, ne samo da je čekirano.",
        },
        {
          type: "p",
          text: "Agencija koja je dovela kupca i dalje vidi svoj tok provizije na svom portalu. Primopredaja nije mesto gde se menja procenat. Iznos provizije je zaključan na dan ugovora, što je opisano na stranici [provizija agencije](/provizije-agencija). Predaja ključeva ne otvara novi obračun i ne pomera taj iznos.",
        },
        {
          type: "p",
          text: "Javni link stana, koji ste slali dok je stan bio u ponudi, nije zapisnik predaje. Kupac na tom linku vidi ponudu, ne internu listu nedostataka i ne napomenu koju tim drži za sebe. Kad je predaja u toku, ne šaljite brojila kroz isti kanal kojim ste slali cenu. Tok ponude je na stranici [rezervacija stana](/rezervacije-i-uplate).",
        },
        {
          type: "h2",
          id: "nije-savet",
          text: "Šta ova lista ne radi",
        },
        {
          type: "p",
          text: "Ne zamenjuje zapisnik koji vaš advokat ili notar traži. Ne šalje se sama kupcu. Ne pali SEF i ne knjiži poslednju ratu. Ako poslednja rata još nije evidentirana, to se vidi u uplatama, ne u čekiranju ključeva. Kurs koji ste uneli za evro ostaje onaj koji je tim uneo. Niko ga ne povlači sa kursne liste umesto vas.",
        },
        {
          type: "p",
          text: "Ne obećavajte kupcu da je stan „pravno predat“ zato što je u sistemu čekirano. Čekiranje je interni trag kancelarije. Papir koji kupac potpisuje na licu mesta, ako ga uopšte potpisuje, i dalje je vaš dokument u fascikli prodaje. Sistem pamti da je obilazak zatvoren i ko ga je zatvorio. To je dovoljno da se ponedeljak ne počne pretragom četa.",
        },
        {
          type: "h2",
          id: "jutro-posle",
          text: "Šta pogledati sutradan",
        },
        {
          type: "p",
          text: "Sutra ujutru ne otvarajte Viber da biste saznali koji stan je predat. Otvorite prodaje kojima je ugovor potpisan, a predaja još nije zatvorena. To je red za tu nedelju: ključevi, brojila, nedostaci, prisutni. Ako je lista zatvorena bez brojila, vratite se na nju i dopišite broj, ili ostavite prazno ako brojila tog dana nije bilo. Prazno polje je vidljivo. Izmišljen broj nije.",
        },
        {
          type: "p",
          text: "Isti ritam važi i kad predajete više stanova u istom ulazu. Svaka prodaja ima svoju listu. Zajednička poruka „ulaz B predat“ ne kaže koji stan još čeka grejanje, ni koji kupac nije došao. Kad se red isprazni, status stana i dalje ostaje prodat. Predaja ne vraća stan u ponudu i ne dira cenovnik. Ona samo zatvara obilazak koji je do tada živeo van kartice.",
        },
        {
          type: "h2",
          id: "vise-stanova",
          text: "Više stanova u istom danu i dalje znači više lista",
        },
        {
          type: "p",
          text: "Kad u jednom danu predate četiri stana u istom ulazu, iskušenje je jedna zajednička beleška. Nju sutra niko ne rasporedi po prodajama. Svaki stan ima svog kupca, svoj ključ i svoje brojilo. Ako je na dva stana grejanje prazno zato što brojilo još nije ugrađeno, to piše na te dve prodaje, ne u poruci za ceo ulaz. Kolega koji u petak nastavlja obilazak otvara karticu, ne čet od srede. Ako je kupac odložio dolazak, predaja ostaje otvorena i ključevi ostaju nepredati. Ne zatvarajte listu da bi izveštaj izgledao čist. Otvorena lista je tačan izveštaj.",
        },
        {
          type: "p",
          text: "Isto važi kad agent dovede kupca, a na obilasku bude i neko iz izvođenja. U polje prisutnih upišite oba, kratko. Ne otvarajte poseban zadatak samo da biste zapamtili imena. Zadatak može da podseti tim da se vrati zbog utičnice. Lista i dalje drži šta je tog dana viđeno. Ako se utičnica sredi naredne nedelje, dopišite to u isti tekst nedostataka ili ostavite stavku i ne zatvarajte predaju dok je ne vidite. Zatvorena lista bez te rečenice izgleda kao da zamerke nije bilo. To je gore od otvorene liste.",
        },
        {
          type: "p",
          text: "Ako je na objektu više ulaza, ne pravite jednu listu „za zgradu“. Ulaz nije prodaja. Stan jeste. Kupac potpisuje jedan ugovor, dobija jedan ključ i gleda jedno brojilo. Zajednička beleška za ulaz sakrije stan koji još nije obiđen.",
        },
        {
          type: "p",
          text: "Ako tek birate kako da vodite objekat, primopredaja je jedan od koraka koji Excel ne drži pored ugovora. Poređenje alata je u tekstu [kako izabrati softver](/blog/kako-izabrati-softver-za-prodaju-novogradnje). Ovde je dovoljno da lista postoji na prodaji pre nego što prvi kupac dođe po ključ.",
        },
      ],
    },
    en: {
      title: "Apartment handover: the list before the buyer takes the keys",
      description:
        "Apartment handover after signing: keys, meters, defects and who attended. A list on the sale, not in chat. Not legal advice.",
      excerpt:
        "Signing the contract is not the end of the job. Keys, meters and the defect note stay on the sale, with the name of the person who closed the record.",
      dateLabel: "1 October 2026",
      coverAlt:
        "An apartment handover list with keys, meter readings and a defects field, with no buyer name",
      blocks: [
        {
          type: "p",
          text: "Apartment handover starts only after the contract is signed. Until then the unit is still in the sale: price, deposit, installments and documents. The day the buyer comes for the keys is a different event. If that day lives in a message that says the keys were left at the door, a month later nobody knows whether the meters were read, what was found on the wall, and who was in the apartment.",
        },
        {
          type: "p",
          text: "This note is operational. It does not say which protocol the law requires, it does not replace a lawyer, and it does not describe the contractor’s warranty. It says what the office should leave on the sale card so the handover does not scatter across chats. PropertyDesk keeps that list on the sale, after signing. The [contract](/blog/predugovor-i-ugovor-o-prodaji-stana) stays a separate step.",
        },
        {
          type: "h2",
          id: "after-signing",
          text: "Keys are not the same event as the signature",
        },
        {
          type: "p",
          text: "The contract can be signed while the apartment is not ready. The buyer can pay the last installment while the key is still with the building staff. If you merge those into one note that says done, the report cannot tell a sale that is waiting for handover from a sale whose handover is already closed. In the morning the team only sees that the status is sold, not whether anyone physically entered the unit.",
        },
        {
          type: "p",
          text: "The list therefore sits on that sale, not on the floor and not in a shared folder. It records whether the keys were handed over, the electricity, water and heating meter readings, what was noted as a defect, who attended, and whether handover was marked complete. When it is complete, the name of the person who closed the record remains. That is not the buyer’s signature on a PDF. It is the office trail of who said the visit was finished.",
        },
        {
          type: "ul",
          items: [
            "Keys: handed over, or not yet.",
            "Electricity, water and heating meters, as the number you read that day.",
            "Defects, short, and on that sale.",
            "Who was in the apartment: buyer, agent, someone from the site.",
            "Completed, with the name of the person who closed the list.",
          ],
        },
        {
          type: "figure",
          file: "primopredaja-kljucevi.webp",
          alt: "A sale card with keys checked and meter fields still empty, before handover is closed",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "If you hand over the keys before the installments are closed, that can still be a conscious decision by the investor. The system should not hide it. The payment record stays on the plan, and the handover stays on its own list. When you later ask whether the apartment was handed over even though one installment is late, the answer is in both places, not in an agent’s memory. Installments are described in the note on the [payment plan](/blog/plan-placanja-rate-za-stan).",
        },
        {
          type: "h2",
          id: "meters",
          text: "Meter readings are written on the day they are read",
        },
        {
          type: "p",
          text: "A meter reading is not the apartment price and it is not a clause in the contract. It is the number on the device at the moment of handover. If you write it in a chat, three months later nobody can find the photo, and the buyer says the heating was already on a different figure. Three fields are enough for an office that runs new-build sales: electricity, water, heating. If the building has no heating meter, the field stays empty. Empty is better than an invented zero.",
        },
        {
          type: "p",
          text: "Do not mix this with a utility bill. PropertyDesk does not send the reading to the utility company and does not calculate consumption. It keeps the number the team entered, on that sale, so it is not hunted through a phone gallery. If a photo of the meter is needed later, it goes into the sale documents, next to the contract, not instead of the number on the list.",
        },
        {
          type: "figure",
          file: "primopredaja-brojila.webp",
          alt: "Three fields for electricity, water and heating meter readings on a handover list",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "The same apartment can have a storage unit, a garage or a parking space. Handing over the apartment key does not mean the parking space was handed over too. Each unit that is sold has its own sale and, when that day comes, its own list. If you hand over the garage the next day, do not copy yesterday’s apartment meter into that record. Those are two visits.",
        },
        {
          type: "h2",
          id: "defects",
          text: "Defects stay a sentence, not a new price",
        },
        {
          type: "p",
          text: "On the visit you see a scratch, a door that does not close, or a socket that is missing. That is not a reason to change the apartment price in the same breath. The price has its own history and its own reason. The defect list is text on the handover: what was seen, so the team tomorrow knows what was promised to be fixed before the handover is marked complete. If the defect stays in a chat, the next shift does not see it.",
        },
        {
          type: "p",
          text: "Do not turn that sentence into a legal finding. Do not write that the contractor is at fault, and do not promise a deadline the contract did not set. Write what the team saw. If the investor decides not to hand the apartment over until the item is fixed, the handover stays open. The keys can be handed over while the list is still not closed, if that is how you run the building. The two fields exist separately for that reason.",
        },
        {
          type: "ul",
          items: [
            "One short list on that sale, not a new spreadsheet per entrance.",
            "No new price and no new contract in the same field.",
            "Handover can stay open until the item is fixed.",
            "Closing the list does not delete the defect text.",
          ],
        },
        {
          type: "h2",
          id: "who-was-there",
          text: "Who was in the apartment, and who closed the record",
        },
        {
          type: "p",
          text: "Attendees are the names you typed: the buyer, a partner from the agency, someone from the site. That is not the list of accounts in the system and it is not a signature on paper. It exists so that a week later you are not arguing about whether the agent was on the visit at all. When you mark the list complete, the name of the user who did it stays next to the date. If another colleague opens the same sale later, they see who closed it, not only that a box was ticked.",
        },
        {
          type: "p",
          text: "The agency that brought the buyer still sees its commission path on its own portal. Handover is not where the percentage changes. The commission amount is locked on contract day, which is described on the [agency commission](/provizije-agencija) page. Handing over the keys does not open a new calculation and does not move that amount.",
        },
        {
          type: "p",
          text: "The public link you sent while the apartment was on offer is not the handover record. On that link the buyer sees the offer, not the internal defect list and not the note the team keeps for itself. While handover is in progress, do not send meter readings through the same channel you used for the price. The offer path is on the [apartment reservation](/rezervacije-i-uplate) page.",
        },
        {
          type: "h2",
          id: "not-advice",
          text: "What this list does not do",
        },
        {
          type: "p",
          text: "It does not replace a protocol your lawyer or notary asks for. It does not send itself to the buyer. It does not file SEF and it does not book the last installment. If the last installment is not recorded yet, that shows in payments, not in the keys checkbox. The euro rate you entered stays the rate the team typed. Nobody pulls it from an exchange-rate list instead of you.",
        },
        {
          type: "p",
          text: "Do not tell the buyer the apartment is legally handed over because a box is ticked in the system. The tick is an internal office trail. The paper the buyer signs on site, if they sign one at all, is still your document in the sale folder. The system remembers that the visit was closed and who closed it. That is enough for Monday not to start with a search through chat.",
        },
        {
          type: "h2",
          id: "the-next-morning",
          text: "What to look at the next morning",
        },
        {
          type: "p",
          text: "The next morning, do not open a chat to learn which apartment was handed over. Open the sales whose contract is signed and whose handover is not closed yet. That is the queue for the week: keys, meters, defects, attendees. If the list was closed without meters, go back and add the number, or leave it empty if there was no meter that day. An empty field is visible. An invented number is not.",
        },
        {
          type: "p",
          text: "The same rhythm holds when you hand over several apartments in one entrance. Each sale has its own list. A shared message that says entrance B is done does not say which apartment is still waiting for heating, or which buyer did not come. When the queue is empty, the unit status stays sold. Handover does not put the apartment back on offer and it does not touch the price list. It only closes the visit that until then lived off the card.",
        },
        {
          type: "p",
          text: "If you are still choosing how to run the building, handover is one of the steps Excel does not keep next to the contract. The comparison of tools is in [how to choose software](/blog/kako-izabrati-softver-za-prodaju-novogradnje). Here it is enough that the list exists on the sale before the first buyer comes for the key.",
        },
      ],
    },
  },
};
