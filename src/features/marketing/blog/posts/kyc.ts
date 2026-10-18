import type { BlogPost } from "@/features/marketing/blog/types";

export const kycPost: BlogPost = {
  slug: "kyc-kupca-pre-ugovora-o-stanu",
  published: "2026-09-26",
  modified: "2026-10-03",
  minutes: 9,
  coverFile: "kyc-kupca-pre-ugovora-o-stanu.webp",
  copy: {
    sr: {
      title: "KYC kupca pre ugovora o stanu: šta proveriti i kada",
      description:
        "Ugovor o stanu ne čeka da se lična karta nađe u mejlu. Operativni checklist za fizičko lice, pravno lice i stranca, i trenutak kad sistem blokira ugovor.",
      excerpt:
        "Najskuplja greška nije pogrešan procenat. Najskuplja je ugovor na kupca čije podatke niko nije složio pre potpisa.",
      dateLabel: "26. septembar 2026.",
      coverAlt: "Checklist dokumenata kupca pre potpisa ugovora o stanu",
      blocks: [
        {
          type: "p",
          text: "Ovo nije pravni savet i ne zamenjuje advokata koji piše ugovor o prodaji stana. Ovo je operativni red koji prodajni tim može da drži pre nego što PDF ugovora uopšte krene na potpis. Podatak koji nedostaje u petak popodne neće se pojaviti zato što je šablon lep. Pojaviće se kao aneks, ili kao stan koji je obećan licu koje na ugovoru nije ono koje je uplatilo kaparu.",
        },
        {
          type: "p",
          text: "KYC ovde znači proveru kupca koju vi sami postavite: identitet, adresa, i za pravno lice poreski dokument koji vaš proces traži. Nije bankarski upitnik i nije zamena za obaveze koje vaš pravnik veže za konkretan posao. Nadzor nad zaštitom podataka o ličnosti u Srbiji vodi [Poverenik](https://poverenik.rs/). Kako PropertyDesk te podatke drži opisano je i u [politici privatnosti](/privatnost).",
        },
        {
          type: "h2",
          id: "koga-vodite",
          text: "Fizičko lice, pravno lice i stranac nisu ista kartica",
        },
        {
          type: "figure",
          file: "kyc-tri-lica.webp",
          alt: "Tri kolone provere kupca: fizičko lice, pravno lice i stranac, sa različitim dokumentima pre ugovora",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Fizičko lice traži identitet i adresu koja ide na ugovor, ne samo broj telefona sa vizitkarte agencije. Pravno lice traži PIB i dokument koji vaš interni red traži pre potpisa, na primer poresku potvrdu ako ste je stavili na listu. Stranac traži dokument koji vaš ugovor stvarno koristi. Pretpostavka da JMBG uvek postoji napravi prazno polje baš na dan overe. Ako pravnik na listu stavi pasoš, polje prati tu listu. Ne blokira ugovor zato što obrazac podrazumeva samo domaće fizičko lice.",
        },
        {
          type: "p",
          text: "CRM koji sve to spoji u jednu napomenu garantuje da će nešto faliti. Napomena se ne da filtrirati, ne blokira dugme i ne kaže koja stavka još nije potvrđena. PropertyDesk razdvaja ta lica i drži checklist na kupcu. Pregled je na [CRM-u za investitore](/crm-za-investitore). Duplikat istog kupca, unet dvaput jer je agencija poslala drugi broj, vidi se pre nego što napravite drugu prodaju na isto ime.",
        },
        {
          type: "h2",
          id: "blok-na-ugovor",
          text: "Checklist koji ne da ugovor dok lista nije zatvorena",
        },
        {
          type: "figure",
          file: "kyc-blok-ugovora.webp",
          alt: "Checklist kupca sa nepotvrđenom stavkom i zaustavljenim generisanjem ugovora o stanu",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Smisao liste nije da stoji u fioci. Smisao je da ugovor ne izađe dok obavezne stavke nisu potvrđene. Lična karta, adresa, i za pravno lice poreska potvrda ako je vaš proces tako postavljen. Kad stavka fali, radnja za ugovor stoji. To je neugodno u petak. Jeftinije je od aneksa u ponedeljak i od kupca koji na overi kaže da adresa na predugovoru nije njegova.",
        },
        {
          type: "ul",
          items: [
            "Identitet i kontakt koji odgovaraju licu na ugovoru, ne licu koje je samo došlo na razgledanje.",
            "Adresa za dostavu i za ugovor, ne samo broj sa vizitkarte agencije.",
            "Dokument koji vaš interni red traži pre potpisa, označen kao primljen.",
            "Jedan kupac u bazi, ne dva kartona zbog različitog zapisa imena ili prezimena.",
          ],
        },
        {
          type: "p",
          text: "Kapara može da legne pre nego što je lista zatvorena. To nije razlog da ugovor izađe istog sata. Novac na računu i lice na ugovoru moraju da se poklope. Kako kupac uopšte uplaćuje kaparu preko javnog linka, bez prekucavanja poziva na broj, piše u tekstu o [IPS QR kapari](/blog/ips-qr-kapara-online-rezervacija-stana). Potvrda uplate i potvrda identiteta ostaju dva koraka.",
        },
        {
          type: "h2",
          id: "agencija-ne-drzi-tudju-kartu",
          text: "Agencija ne drži tuđu ličnu kartu u svom folderu",
        },
        {
          type: "p",
          text: "Agencija treba da vidi kupca kog je dovela, u obimu koji joj je otvoren. Ne treba da vidi tuđi KYC, ni dokumenta koja su stigla posle, ako nisu deo njenog posla. Čim se lične karte slikaju u zajedničku Viber grupu, više ne znate ko ima kopiju. To nije brži KYC. To je kopija bez roka i bez svrhe koju možete da objasnite.",
        },
        {
          type: "p",
          text: "Investitor drži dokument na kartici kupca. Agencija drži trag da je zahtev njen. Provizija se onda vezuje za prodaju, a ne za fotografiju dokumenta u chatu. Kako se iznos provizije zaključava na dan ugovora, a da agencija ne vidi tuđe dogovore, piše u tekstu o [proviziji agencije](/blog/provizije-agencija-za-novogradnju). Podela uloga je i na [stranici za investitore](/za-investitore).",
        },
        {
          type: "h2",
          id: "duplikat-i-brisanje",
          text: "Duplikat, pa pravo da se podaci sklone",
        },
        {
          type: "p",
          text: "Isto lice uneto dvaput napravi dve prodaje koje izgledaju kao dva kupca. Jedan karton ima mejl, drugi samo telefon. Ugovor ode na onaj koji je nepotpun. Zato detekcija duplikata stoji pre nove prodaje, a ne posle žalbe. Različito napisano ime nije razlog za novi karton. Razlog je da se zapisi spoje dok je još samo jedan stan u igri.",
        },
        {
          type: "p",
          text: "Kupac koji odustane i dalje ima podatke kod vas. Čuvanje ima svrhu i rok. Anonimizacija nije brisanje fajla sa desktopa. Kartica prestaje da nosi ime, kontakt i dokument, a prodaja koja je već nastala ostaje čitljiva kao poslovni zapis bez identiteta tog lica. To je operativni odgovor na zahtev, ne parola. Ako vam pravnik kaže drugačiji rok za određeni dokument, rok iz njegovog saveta važi. Softver treba da može da skine identitet, a ne da vam drži kopiju zauvek jer je tako lakše.",
        },
        {
          type: "h2",
          id: "ugovor-iz-podataka",
          text: "Ugovor čita karticu, ne poslednji mejl",
        },
        {
          type: "p",
          text: "Šablon ugovora ima smisla samo ako vuče ime, adresu, cenu i plan rata iz kartice. Ako i dalje kucate te stavke iz poslednjeg mejla, checklist je bio uzalud. Greška se vrati na papir tačno tamo gde ste je jednom već ulovili na ekranu. Generator ne popravlja prazno polje. On odbija da izađe dok polje nije potvrđeno, ili uvuče ono što na kartici piše. Zato kartica mora da bude tačna pre klika.",
        },
        {
          type: "p",
          text: "Cena na tom ugovoru je cena jedinice, ne cena iz stare tabele. Ako se cenovnik i dalje grana u prilozima, ugovor će biti uredan, a osnovica pogrešna. Taj deo je u tekstu [Excel ili softver](/blog/excel-ili-softver-za-prodaju-novogradnje). Red pre potpisa, od cene do fajla uz oznaku da je dokument potpisan, piše u tekstu o [predugovoru i ugovoru](/blog/predugovor-i-ugovor-o-prodaji-stana). PDV režim i valuta takođe stoje na jedinici. Ne u napomeni koju šablon preskoči.",
        },
        {
          type: "h2",
          id: "ko-vidi-dokument",
          text: "Ko sme da vidi dokument",
        },
        {
          type: "p",
          text: "Dokument kupca nije prilog koji ide u grupu sa agencijama. Investitor ga drži na kartici kupca. Agencija drži trag da je zahtev njen, ne fotografiju lične karte u četu. Ako partner traži kopiju da „ima kod sebe“, to je novi primerak podataka o ličnosti van mesta gde znate ko ga je otvorio. Bolji odgovor je da je lista na kartici zatvorena ili nije. Sadržaj dokumenta ostaje kod vas.",
        },
        {
          type: "p",
          text: "U timu ne mora svako da otvara taj fajl. Prodaja mora da vidi da li je stavka potvrđena, da bi ugovor stao ili izašao. Knjigovodstvo mora da vidi da je lice na fakturi isto lice. Čovek koji samo ažurira status stana ne mora da lista tuđa dokumenta da bi rekao da je stan rezervisan. Checklist je zato polje, ne fascikla koju svi prevlače na desktop.",
        },
        {
          type: "p",
          text: "Duplikat kupca, unet dvaput jer je agencija poslala drugi broj telefona, pravi dva kartona i dve liste. Ugovor onda rizikuje da izađe na onaj karton koji nema dokument. Pre potpisa vredi spojiti ta dva zapisa, ne krenuti treći. Kako se fizičko lice, pravno lice i stranac uopšte razlikuju na kartici, ostaje u ovom tekstu iznad. Ovde je samo pravilo: jedan kupac, jedna lista, jedan ugovor.",
        },
        {
          type: "p",
          text: "Kad se prodaja završi, dokument i dalje nije materijal za brošuru i nije nešto što ostaje u Viberu „za svaki slučaj“. Šta posle čuvate, i koliko dugo, dogovarate sa pravnikom i sa obavezama koje vaš posao ima. PropertyDesk nije zamena za taj dogovor. Politika je na [privatnosti](/privatnost), a nadzor i dalje vodi [Poverenik](https://poverenik.rs/). Lista pre ugovora služi da fajl uopšte bude na pravom mestu kad taj dogovor treba da se sprovede. Ako dokument stiže mejlom od agencije, na karticu ga stavljate vi, pa tek onda zatvarate stavku. Prilog u tuđem sandučetu nije stavka na listi. Stavka je potvrda da je fajl kod vas i da je pregledan. Bez te potvrde ugovor i dalje čeka, čak i kad je kapara već na računu. Čekanje nije kazna kupcu. To je red da ime na PDF-u ima dokument iza sebe pre nego što bilo ko kaže da je stan ugovoren. Ako agencija žuri jer kupac putuje, stavka se zatvara istog dana kad fajl stigne kod vas. Ne dan ranije, na osnovu obećanja da će slika stići kasnije uveče ili sutra ujutru.",
        },
        {
          type: "h2",
          id: "kad-krenuti",
          text: "Kada ovo uvesti, pre kampanje a ne posle spora",
        },
        {
          type: "p",
          text: "Najbolji trenutak je pre prve kampanje, ne posle prvog spornog ugovora. Lista je kratka ako je unesete jednom i ako je ista za sve agencije. Postaje haos ako je svaka agencija vodi u svom folderu, sa svojim imenima stavki. Jedna lista, na kupcu, sa blokadom ugovora, skida taj dogovor sa sastanka.",
        },
        {
          type: "p",
          text: "Ne morate prvo da uvezete pet godina starih kupaca. Dovoljan je prvi stan koji ide u oglas. Na njemu vidite formu, kaparu, listu i zastoj ugovora. Cene i rani pristup do 15.11.2026. su na [cenovniku](/#cenovnik). Ako hoćete da vidite blok na ugovor na svom primeru, to pokazujemo na [demou od 25 minuta](/demo). Ponesite jednog kupca, jedan dokument koji vam fali, i jedan stan. To je dovoljno da se vidi da PDF ne izađe dok lista nije zatvorena.",
        },
      ],
    },
    en: {
      title: "Buyer checks before a unit contract: what to verify, and when",
      description:
        "A unit contract should not wait for an ID card in email. What to check for a person, a company and a foreign buyer before signing.",
      excerpt:
        "The expensive mistake is not a wrong percentage. It is a contract in the name of a buyer whose details nobody assembled before signing.",
      dateLabel: "26 September 2026",
      coverAlt: "A buyer document checklist before signing a unit contract",
      blocks: [
        {
          type: "p",
          text: "This is not legal advice and it does not replace the lawyer who drafts the contract for the sale of a unit. It is the operational order a sales team can keep before a contract PDF ever goes out for signature. A missing detail on Friday afternoon will not appear because the template looks tidy. It will appear as an annex, or as a unit promised to a person who is not the person who paid the deposit.",
        },
        {
          type: "p",
          text: "KYC here means the buyer check you set yourself: identity, address, and for a company the tax document your process requires. It is not a bank questionnaire and it is not a substitute for duties your lawyer attaches to a specific deal. Supervision of personal-data protection in Serbia sits with the [Commissioner](https://poverenik.rs/). How PropertyDesk holds those data is also described in the [privacy policy](/privatnost).",
        },
        {
          type: "h2",
          id: "koga-vodite",
          text: "A person, a company and a foreign buyer are not the same record",
        },
        {
          type: "figure",
          file: "kyc-tri-lica.webp",
          alt: "Three columns of a buyer check: a person, a company and a foreign buyer, with different documents before the contract",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "A person needs identity and the address that goes on the contract, not only the phone number on the agency’s card. A company needs a tax id and the document your internal order requires before signature, for example a tax confirmation if you put it on the list. A foreign buyer needs the document your contract actually uses. The assumption that a national id is always there creates an empty field on the day of certification.",
        },
        {
          type: "p",
          text: "A CRM that folds all of this into one note guarantees something will be missing. A note cannot be filtered, does not block a button and does not say which item is still unconfirmed. PropertyDesk separates those parties and keeps the checklist on the buyer. The overview is on [CRM for investors](/crm-za-investitore). A duplicate of the same buyer, entered twice because an agency sent another number, shows up before you create a second sale on the same name.",
        },
        {
          type: "h2",
          id: "blok-na-ugovor",
          text: "A checklist that will not produce a contract until the list is closed",
        },
        {
          type: "figure",
          file: "kyc-blok-ugovora.webp",
          alt: "A buyer checklist with an unconfirmed item and the unit contract generation stopped",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "The point of the list is not to sit in a drawer. The point is that the contract does not go out until the required items are confirmed. Identity document, address, and for a company the tax confirmation if that is how your process is set. When an item is missing, the contract action waits. That is uncomfortable on a Friday. It is cheaper than an annex on Monday and cheaper than a buyer who says at certification that the address on the pre-contract is not theirs.",
        },
        {
          type: "ul",
          items: [
            "Identity and contact that match the party on the contract, not the person who only came to a viewing.",
            "An address for delivery and for the contract, not only the number on the agency’s card.",
            "The document your internal order requires before signature, marked as received.",
            "One buyer in the file, not two cards because the name was written differently.",
          ],
        },
        {
          type: "p",
          text: "The deposit can land before the list is closed. That is not a reason for the contract to go out the same hour. The money on the account and the party on the contract have to match. How a buyer pays the deposit through a public link, without retyping a reference, is in the piece on [IPS QR deposits](/blog/ips-qr-kapara-online-rezervacija-stana). Confirming the payment and confirming identity stay two steps.",
        },
        {
          type: "h2",
          id: "agencija-ne-drzi-tudju-kartu",
          text: "The agency does not keep someone else’s identity card in its folder",
        },
        {
          type: "p",
          text: "The agency should see the buyer it brought, in the scope you opened. It should not see someone else’s checks, nor documents that arrived later if they are not part of its job. The moment identity cards are photographed into a shared Viber group, you no longer know who has a copy. That is not a faster check. It is a copy with no limit and no purpose you can explain.",
        },
        {
          type: "p",
          text: "The developer keeps the document on the buyer record. The agency keeps the trail that the request is theirs. Commission is then tied to the sale, not to a photo of a document in chat. How the commission amount is locked on the day of the contract, without the agency seeing other deals, is in the piece on [agency commission](/blog/provizije-agencija-za-novogradnju). The split of roles is also on the [page for investors](/za-investitore).",
        },
        {
          type: "h2",
          id: "duplikat-i-brisanje",
          text: "A duplicate, then the right to have the data removed",
        },
        {
          type: "p",
          text: "The same person entered twice creates two sales that look like two buyers. One card has an email, the other only a phone. The contract goes out on the incomplete one. That is why duplicate detection sits before a new sale, not after a complaint. A differently written name is not a reason for a new card. The reason to merge the records is that only one unit is still in play.",
        },
        {
          type: "p",
          text: "A buyer who walks away still has data with you. Keeping it has a purpose and a limit. Anonymisation is not deleting a file from a desktop. The card stops carrying the name, contact and document, and a sale that already happened stays readable as a business record without that person’s identity. That is an operational answer to a request, not a slogan. If your lawyer sets a different limit for a particular document, the limit in that advice applies. The software should be able to remove the identity, not keep a copy forever because that is easier.",
        },
        {
          type: "h2",
          id: "ugovor-iz-podataka",
          text: "The contract reads the record, not the last email",
        },
        {
          type: "p",
          text: "A contract template only makes sense if it pulls the name, address, price and instalment plan from the record. If you still type those items from the last email, the checklist was wasted. The error returns to paper exactly where you already caught it on screen. The generator does not repair an empty field. It refuses to go out until the field is confirmed, or it pulls what the record says. So the record has to be right before the click.",
        },
        {
          type: "p",
          text: "The price on that contract is the unit price, not the price from an old sheet. If the price list still forks in attachments, the contract will look tidy and the base will be wrong. That part is in [Excel or software](/blog/excel-ili-softver-za-prodaju-novogradnje). The order before signing, from the price to the file that goes with marking the document signed, is in the piece on the [preliminary contract and the sale contract](/blog/predugovor-i-ugovor-o-prodaji-stana). The VAT treatment and the currency also sit on the unit. Not in a note the template skips.",
        },
        {
          type: "h2",
          id: "who-may-see-the-document",
          text: "Who may see the document",
        },
        {
          type: "p",
          text: "A buyer’s document is not an attachment for the agency group. The developer keeps it on the buyer record. The agency keeps the trail that the request is theirs, not a photo of an identity card in a chat. If a partner asks for a copy “to have on file”, that is another copy of personal data outside the place where you know who opened it. A better answer is whether the checklist on the record is closed or not. The content of the document stays with you.",
        },
        {
          type: "p",
          text: "Not everyone on the team has to open that file. Sales has to see whether an item is confirmed, so the contract waits or goes out. The books have to see that the party on the invoice is the same party. The person who only updates unit status does not have to leaf through other people’s documents to say the unit is reserved. The checklist is a field, not a folder everyone drags onto a desktop.",
        },
        {
          type: "p",
          text: "A duplicate buyer, entered twice because an agency sent another phone number, makes two records and two lists. The contract then risks going out on the record that has no document. Before signing it is worth merging those two entries, not starting a third. How a natural person, a company and a foreign buyer differ on the card stays in this piece above. The rule here is only this: one buyer, one list, one contract.",
        },
        {
          type: "p",
          text: "When the sale is finished, the document is still not material for a brochure and it is not something that stays in a chat “just in case”. What you keep afterwards, and for how long, you agree with your lawyer and with the duties your business has. PropertyDesk is not a substitute for that agreement. The policy is in the [privacy policy](/privatnost), and supervision still sits with the [Commissioner](https://poverenik.rs/). The checklist before the contract exists so the file is in the right place when that agreement has to be carried out.",
        },
        {
          type: "h2",
          id: "kad-krenuti",
          text: "When to bring this in: before the campaign, not after the dispute",
        },
        {
          type: "p",
          text: "The best moment is before the first campaign, not after the first disputed contract. The list is short if you enter it once and if it is the same for every agency. It becomes a mess if every agency keeps it in its own folder, with its own names for the items. One list, on the buyer, with the contract blocked, takes that argument off the meeting.",
        },
        {
          type: "p",
          text: "You do not have to import five years of old buyers first. The first unit that goes into an advert is enough. On it you see the form, the deposit, the list and the contract waiting. Prices and early access until 15 November 2026 are on the [pricing section](/#cenovnik). If you want to see the contract block on your own example, we show that in a [25-minute demo](/demo). Bring one buyer, one document you are missing, and one unit. That is enough to see that the PDF does not go out until the list is closed.",
        },
      ],
    },
  },
};
