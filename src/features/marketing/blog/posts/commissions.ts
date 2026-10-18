import type { BlogPost } from "@/features/marketing/blog/types";

export const commissionsPost: BlogPost = {
  slug: "provizije-agencija-za-novogradnju",
  published: "2026-09-18",
  modified: "2026-10-03",
  minutes: 9,
  coverFile: "provizije-agencija-za-novogradnju.webp",
  copy: {
    sr: {
      title: "Provizija agencije na novogradnji: pravilo, snapshot i isplata",
      description:
        "Procenat koji živi u Excelu menja se posle ugovora. Kako pravilo po projektu, snapshot iznosa i referral kod drže proviziju agencije bez naknadne svađe.",
      excerpt:
        "Svađa oko provizije skoro nikad nije oko procenta iz ugovora. Skoro uvek je oko toga koja je tabela važila tog dana.",
      dateLabel: "18. septembar 2026.",
      coverAlt: "Obračun provizije agencije pored ugovora o prodaji stana u novogradnji",
      blocks: [
        {
          type: "p",
          text: "Investitor koji radi sa više agencija retko ima jedan procenat za sve. Jedan objekat ide na procenat od cene stana, drugi na fiksni iznos, treći ima drugačije pravilo za garažu nego za stan. Dok je to u glavi direktora prodaje, radi. Kad ugovor potpišu tri čoveka u tri grada, „mi smo tako dogovorili“ više nije dokaz. Dokaz je broj koji je važio tog dana, na toj jedinici, za tu agenciju.",
        },
        {
          type: "p",
          text: "Ovaj tekst je o tom broju. Nije o tome koji procenat treba da date. Procenat je vaš ugovor o posredovanju, i softver ga ne izmišlja. Softver treba da ga zapamti tamo gde se prodaja ugovara, da ga ne prepravi sutra, i da se zna koja je agencija dovela kupca kad je zahtev došao preko linka.",
        },
        {
          type: "h2",
          id: "pravilo-po-projektu",
          text: "Pravilo provizije živi uz projekat, ne uz mejl",
        },
        {
          type: "p",
          text: "Provizija je podatak projekta, jedinice i veze sa tom agencijom. Ako pravilo stoji samo u mejlu od marta, aprilski aneks ga ne povlači. Agent i dalje računa po starom, jer je stari mejl ostao u prepisu, a novi u nečijem sandučetu. PropertyDesk drži pravilo na mestu gde se prodaja i ugovara. Pregled je na stranici [provizije agencija](/provizije-agencija).",
        },
        {
          type: "figure",
          file: "provizije-pravilo-projekat.webp",
          alt: "Različita pravila provizije po projektu: procenat na stan, fiksni iznos, posebno pravilo za garažu",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "Različit procenat ili iznos po projektu, bez jedne kolone za sve objekte.",
            "Stan, garaža i parking mogu imati svoje pravilo, ako ste ga tako uneli.",
            "Agencija vidi svoj tok. Ne vidi tuđe dogovore ni tuđe kupce.",
            "Promena pravila od sutra ne prepravlja jučerašnji ugovor.",
          ],
        },
        {
          type: "p",
          text: "Cena od koje se procenat računa mora da bude cena sa kartice jedinice, ne cena iz priloga. Ako agencija i dalje šalje stari cenovnik, provizija će biti tačna na pogrešnoj osnovici. Zato cenovnik i provizija stoje u istom sistemu. Kako se do jedne cene dolazi kad Excel krene da se grana, piše u tekstu [Excel ili softver](/blog/excel-ili-softver-za-prodaju-novogradnje). Ista cifra, za stan, garažu i parking, razrađena je u tekstu o [cenovniku stana u evrima](/blog/cenovnik-stana-u-evrima). Direktna prodaja, bez agencije, nema proviziju samo zato što projekat ima partnere. Inače plaćate procenat kupcu koji je došao sa vašeg oglasa.",
        },
        {
          type: "h2",
          id: "snapshot",
          text: "Snapshot iznosa u trenutku ugovora",
        },
        {
          type: "figure",
          file: "provizije-snapshot-ugovor.webp",
          alt: "Iznos provizije zaključan na dan ugovora, odvojen od kasnije izmene procenta na projektu",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "Snapshot znači da se iznos zabeleži kad prodaja pređe u ugovor. Kasnija izmena procenta na projektu ne prepravlja jučerašnji stan. To je zaštita i za vas i za agenciju. Vi ne plaćate stari dogovor po novom, višem procentu. Agencija ne gubi dogovor zato što je neko u ponedeljak spustio procenat u tabeli. Niko ne računa iz verzije fajla koja je nastala posle potpisa.",
        },
        {
          type: "p",
          text: "Isplata i dalje ide po vašem ritmu. Sistem ne šalje novac i ne radi nalog banci. On drži iznos o kom se više ne raspravlja iz sećanja. Kad dođe dan isplate, otvarate taj iznos, a ne novu raspravu. Ako deo provizije čeka uplatu rate, to je vaše pravilo isplate. Snapshot i dalje pamti koliki je pun iznos dogovoren, da se ne izgubi dok rate teku.",
        },
        {
          type: "h2",
          id: "referral",
          text: "Referral kod kad kupac dođe preko linka",
        },
        {
          type: "p",
          text: "Kad kupac dođe preko javnog linka, mora da se zna koja ga je agencija dovela. Bez oznake, podrazumevani odgovor postane da je kupac sam našao stan. Referral kod na linku ili QR-u veže zahtev za tu agenciju pre nego što iko ručno dopisuje ime. To nije zamena za ugovor o posredovanju. To je trag da se izvor potražnje ne izgubi između forme i tabele.",
        },
        {
          type: "p",
          text: "Kod za kaparu i referral kod nisu isti kod. Jedan puni nalog za uplatu. Drugi pamti agenciju. Ako kupac skenira IPS QR, a link nije nosio agenciju, novac može da legne, a provizija da ostane sporna. Kako se kapara uopšte plaća bez prekucavanja, piše u tekstu o [IPS QR kapari](/blog/ips-qr-kapara-online-rezervacija-stana). Stranica [za agencije](/za-agencije) opisuje šta partner vidi na svom nalogu, a šta ne.",
        },
        {
          type: "h2",
          id: "sta-agencija-vidi",
          text: "Šta agencija sme da vidi",
        },
        {
          type: "p",
          text: "Agencija treba da vidi svoje jedinice, svoje zahteve i svoju proviziju. Ne treba da vidi portfolio, maržu objekta, ni kupca druge agencije. Čim tabela ide u zajednički folder, ta granica padne. Zajednički Excel je najbrži način da svaka agencija vidi tuđu cenu i tuđeg kupca. Sistem sa odvojenim pristupom tu grešku ne pravi slučajno, jer tuđi red nije na njenom ekranu.",
        },
        {
          type: "p",
          text: "Investitor i dalje vidi sve. To je razlika uloga, ne tajna radi tajne. Vi morate da znate koliko je obećano svim partnerima na istom ulazu, da provizija ne pređe ono što projekat podnosi. Agencija mora da zna svoj iznos. Oba pogleda čitaju isti snapshot, ne dve tabele koje se na kraju ne poklope.",
        },
        {
          type: "h2",
          id: "popust-i-osnovica",
          text: "Popust menja osnovicu, ne sećanje",
        },
        {
          type: "p",
          text: "Ako odobrite popust na stanu, menja se cena od koje se provizija računa, ako je pravilo procenat. Taj popust mora da bude na kartici, sa tragom ko ga je odobrio. Ako ostane u poruci „može 3.000 manje“, agencija računa od stare cene, a vi od nove. Snapshot onda zaključa pogrešan iznos, jer je pogrešna osnovica ušla u ugovor.",
        },
        {
          type: "p",
          text: "Fiksni iznos po stanu ne prati popust, osim ako ste tako ugovorili. Zato pravilo mora da kaže da li je osnovica cena posle popusta ili iznos po jedinici. To je jedna rečenica u dogovoru sa agencijom. U tabeli ta rečenica nestane čim neko ubaci novu kolonu. Na kartici projekta ostane.",
        },
        {
          type: "h2",
          id: "kupac-pre-isplate",
          text: "Provizija ne preskače proveru kupca",
        },
        {
          type: "p",
          text: "Isplata provizije posle ugovora i dalje pretpostavlja da je ugovor na pravom licu. Ako su dokumenta kupca falila na dan potpisa, spor oko provizije postane spor oko toga da li je prodaja uopšte zatvorena. Checklist pre ugovora nije knjigovodstveni ukras. Opisan je u tekstu o [KYC kupca](/blog/kyc-kupca-pre-ugovora-o-stanu).",
        },
        {
          type: "p",
          text: "Agencija ne treba da drži tuđu ličnu kartu u svom folderu da bi dokazala proviziju. Dovoljan je trag da je kupac njen, da je jedinica ugovorena i da je iznos zaključan. Dokumenta ostaju kod investitora, u obimu koji proces traži, a ne u pet prepisa po telefonima agenata.",
        },
        {
          type: "h2",
          id: "kraj-meseca",
          text: "Kraj meseca, bez nove tabele",
        },
        {
          type: "p",
          text: "Kraj meseca je dan kad agencija pita šta joj sleduje, a vi ne smete da odgovorite iz mejla od marta. Odgovor je lista prodaja na kojima je ugovor potpisan i iznos zaključan tog dana. Prodaje koje su još u rezervaciji nisu isplata. One su dogovor koji može da padne. Ako ih saberete u isti zbir, partner očekuje novac za stan koji još nema fajl ugovora.",
        },
        {
          type: "p",
          text: "Snapshot ne znači da ste novac već poslali. Znači da se procenat i osnovica više ne menjaju zato što je neko sutra dirao cenovnik. Isplata i dalje ide vašim redom, posle ugovora, onako kako ste se dogovorili van sistema. Sistem ne šalje uplatu agenciji. On pamti koliko je tog dana trebalo da piše na obračunu, da se to ne rekonstruiše iz dva priloga.",
        },
        {
          type: "p",
          text: "Agencija sme da vidi svoj obračun. Ne sme da vidi tuđu proviziju na istom spratu, ni popust koji ste odobrili drugom kupcu. Ako partner traži ceo Excel da proveri, taj fajl opet otvara tuđe dogovore. Bolji odgovor je izvod njegovih prodaja: stan, datum ugovora, osnovica, procenat, iznos. Osnovica je cena sa kartice, ona iz teksta o [cenovniku stana u evrima](/blog/cenovnik-stana-u-evrima).",
        },
        {
          type: "p",
          text: "Direktna prodaja na tom spisku nema proviziju. Ako je kupac došao sa vašeg oglasa, a agencija kasnije kaže da ga je ona dovela, spor se rešava tragom zahteva, ne sećanjem ko je prvi poslao brošuru. Zahtev koji nije njen ne ulazi u njen obračun. To je isto pravilo koje sprečava da se procenat plati dvaput. Kraj meseca samo pokaže da li ste to pravilo držali dok su se stanovi prodavali, ili tek kad je neko poslao fakturu. Ako se u tom zbiru pojavi stan bez fajla ugovora, izbacite ga pre nego što partner vidi broj. Broj koji kasnije povlačite narušava poverenje više nego kraći spisak. Kraći spisak je tačan. Duži spisak je obećanje koje prodaja još nije zatvorila. Partner koji vidi samo svoje redove i dalje može da pita za stan koji je rezervisan, ali ne ugovoren. Odgovor je da iznos nije zaključan dok nema fajla. To nije odlaganje isplate iz hira. To je isti datum koji ste dogovorili: dan ugovora, ne dan kad je kupac prvi put video stan na javnom linku, u salonu ili na sajmu nekretnina. Isto važi i za štand.",
        },
        {
          type: "h2",
          id: "sta-ne-obeca",
          text: "Šta ovde ne obećavamo, i kako da vidite obračun",
        },
        {
          type: "p",
          text: "Ne računamo pravne posledice vašeg ugovora o posredovanju i ne biramo procenat umesto vas. Ne šaljemo novac agenciji. Pamtimo pravilo, vezujemo online zahtev za agenciju i zaključavamo iznos na dan ugovora. Cene paketa su na [cenovniku](/#cenovnik). Rani pristup traje do zvaničnog puštanja 15.11.2026.",
        },
        {
          type: "p",
          text: "Ako hoćete da vidite pravilo, snapshot i šta agencija vidi na svom nalogu, to je predmet [demoa od 25 minuta](/demo). Dovoljan je jedan objekat, dve agencije i dva različita pravila. To je cela poenta: da se ta dva pravila više ne sareću iz istog Excel lista.",
        },
      ],
    },
    en: {
      title: "Agency commission on a new build: the rule, the snapshot and the payout",
      description:
        "A percentage kept in Excel changes after the contract. How a project rule, a snapshot and a referral code hold the commission.",
      excerpt:
        "A commission argument is almost never about the percentage in the contract. It is about which spreadsheet was valid that day.",
      dateLabel: "18 September 2026",
      coverAlt: "An agency commission calculation next to a new-build unit sale contract",
      blocks: [
        {
          type: "p",
          text: "A developer who works with several agencies rarely has one percentage for everyone. One building is a percentage of the unit price, another is a fixed amount, a third has a different rule for the garage than for the apartment. While that lives in the sales director’s head, it works. When three people in three cities sign, “that is what we agreed” is no longer evidence. The evidence is the number that applied that day, on that unit, for that agency.",
        },
        {
          type: "p",
          text: "This piece is about that number. It is not about which percentage you should offer. The percentage is your brokerage agreement, and the software does not invent it. The software should remember it where the sale is contracted, not rewrite it tomorrow, and it should be clear which agency brought the buyer when the request arrived through a link.",
        },
        {
          type: "h2",
          id: "pravilo-po-projektu",
          text: "The commission rule lives on the project, not in an email",
        },
        {
          type: "p",
          text: "Commission is data of the project, the unit and the link with that agency. If the rule exists only in a March email, an April amendment does not pull it forward. The agent still calculates on the old one, because the old email stayed in the thread and the new one stayed in someone’s inbox. PropertyDesk keeps the rule where the sale is contracted. The overview is on [agency commissions](/provizije-agencija).",
        },
        {
          type: "figure",
          file: "provizije-pravilo-projekat.webp",
          alt: "Different commission rules per project: a percentage on the apartment, a fixed amount, a separate rule for the garage",
          width: 1600,
          height: 900,
        },
        {
          type: "ul",
          items: [
            "A different percentage or amount per project, not one column for every building.",
            "The apartment, garage and parking space can have their own rule, if that is how you entered it.",
            "The agency sees its own trail. It does not see other deals or other buyers.",
            "A rule change from tomorrow does not rewrite yesterday’s contract.",
          ],
        },
        {
          type: "p",
          text: "The price the percentage is calculated from has to be the price on the unit record, not the price in an attachment. If the agency is still sending an old price list, the commission will be correct on the wrong base. That is why the price list and the commission sit in the same system. How you get to one price once Excel starts to fork is in [Excel or software](/blog/excel-ili-softver-za-prodaju-novogradnje). The same figure, for the apartment, the garage, and the parking space, is set out in the piece on a [euro price list](/blog/cenovnik-stana-u-evrima).",
        },
        {
          type: "h2",
          id: "snapshot",
          text: "A snapshot of the amount at the moment of the contract",
        },
        {
          type: "figure",
          file: "provizije-snapshot-ugovor.webp",
          alt: "A commission amount locked on the contract date, separate from a later change of the percentage on the project",
          width: 1600,
          height: 900,
        },
        {
          type: "p",
          text: "A snapshot means the amount is recorded when the sale becomes a contract. A later change of the percentage on the project does not rewrite yesterday’s unit. That protects both you and the agency. You do not pay an old deal at a new, higher percentage. The agency does not lose a deal because someone lowered the percentage in a sheet on Monday. Nobody calculates from a file version that appeared after signing.",
        },
        {
          type: "p",
          text: "The payout still follows your rhythm. The system does not send money and does not create a bank order. It holds the amount that is no longer argued from memory. When payout day comes, you open that amount, not a new argument. If part of the commission waits for an instalment, that is your payout rule. The snapshot still remembers the full amount agreed, so it is not lost while instalments run.",
        },
        {
          type: "h2",
          id: "referral",
          text: "A referral code when the buyer arrives through a link",
        },
        {
          type: "p",
          text: "When a buyer arrives through a public link, it has to be clear which agency brought them. Without a mark, the default answer becomes that the buyer found the unit alone. A referral code on the link or the QR ties the request to that agency before anyone types a name by hand. That does not replace the brokerage contract. It is a trail so the source of the enquiry is not lost between the form and the spreadsheet.",
        },
        {
          type: "p",
          text: "The deposit code and the referral code are not the same code. One fills the payment order. The other remembers the agency. If the buyer scans an IPS QR and the link carried no agency, the money can land and the commission can stay disputed. How the deposit is paid without retyping is in the piece on [IPS QR deposits](/blog/ips-qr-kapara-online-rezervacija-stana). The [page for agencies](/za-agencije) describes what a partner sees on their account, and what they do not.",
        },
        {
          type: "h2",
          id: "sta-agencija-vidi",
          text: "What the agency is allowed to see",
        },
        {
          type: "p",
          text: "The agency should see its own units, its own requests and its own commission. It should not see the portfolio, the building margin, or another agency’s buyer. The moment a sheet goes into a shared folder, that boundary falls. A shared Excel is the fastest way for every agency to see someone else’s price and someone else’s buyer. A system with separate access does not make that mistake by accident, because the other row is not on their screen.",
        },
        {
          type: "p",
          text: "The developer still sees everything. That is a difference of role, not secrecy for its own sake. You have to know how much has been promised to every partner on the same entrance, so commission does not exceed what the project can carry. The agency has to know its own amount. Both views read the same snapshot, not two sheets that fail to match at the end.",
        },
        {
          type: "h2",
          id: "popust-i-osnovica",
          text: "A discount changes the base, not the memory",
        },
        {
          type: "p",
          text: "If you approve a discount on the unit, the price the commission is calculated from changes, when the rule is a percentage. That discount has to be on the record, with a trace of who approved it. If it stays in a message that says “3,000 less is fine”, the agency calculates from the old price and you calculate from the new one. The snapshot then locks the wrong amount, because the wrong base entered the contract.",
        },
        {
          type: "p",
          text: "A fixed amount per unit does not follow a discount, unless that is what you agreed. So the rule has to say whether the base is the price after discount or an amount per unit. That is one sentence in the agreement with the agency. In a sheet that sentence disappears as soon as someone inserts a new column. On the project record it stays.",
        },
        {
          type: "h2",
          id: "kupac-pre-isplate",
          text: "Commission does not skip the buyer check",
        },
        {
          type: "p",
          text: "Paying commission after the contract still assumes the contract is in the right name. If the buyer’s documents were missing on signing day, the commission dispute becomes a dispute about whether the sale was closed at all. The checklist before the contract is not a bookkeeping ornament. It is described in the piece on [buyer checks](/blog/kyc-kupca-pre-ugovora-o-stanu).",
        },
        {
          type: "p",
          text: "The agency should not keep someone else’s identity card in its own folder in order to prove a commission. The trail that the buyer is theirs, that the unit was contracted and that the amount was locked is enough. The documents stay with the developer, in the scope the process requires, and not in five copies on agents’ phones.",
        },
        {
          type: "h2",
          id: "month-end",
          text: "Month end, without a new spreadsheet",
        },
        {
          type: "p",
          text: "Month end is the day an agency asks what it is owed, and you must not answer from a March email. The answer is the list of sales whose contract was signed and whose amount was locked that day. Sales that are still reservations are not a payout. They are an agreement that can still fall through. If you add them into the same total, the partner expects money for a unit that still has no contract file.",
        },
        {
          type: "p",
          text: "A snapshot does not mean you have already sent the money. It means the percentage and the base no longer change because someone touched the price list tomorrow. The payout still follows your own order, after the contract, the way you agreed outside the system. The system does not send a payment to the agency. It remembers what the statement should have said that day, so it is not rebuilt from two attachments.",
        },
        {
          type: "p",
          text: "The agency may see its own statement. It may not see another commission on the same floor, or a discount you approved for another buyer. If a partner asks for the whole spreadsheet “to check”, that file opens other people’s deals again. A better answer is a list of their sales: unit, contract date, base, percentage, amount. The base is the price on the record, the one in the piece on a [euro price list](/blog/cenovnik-stana-u-evrima).",
        },
        {
          type: "p",
          text: "A direct sale on that list has no commission. If the buyer came from your advert, and an agency later says it brought them, the dispute is settled by the trail of the request, not by memory of who sent the brochure first. A request that is not theirs does not enter their statement. That is the same rule that stops a percentage being paid twice. Month end only shows whether you kept that rule while units were selling, or only when someone sent an invoice.",
        },
        {
          type: "h2",
          id: "sta-ne-obeca",
          text: "What we do not promise, and how to see the calculation",
        },
        {
          type: "p",
          text: "We do not calculate the legal effect of your brokerage contract and we do not choose the percentage for you. We do not send money to the agency. We remember the rule, tie the online request to the agency and lock the amount on the day of the contract. Package prices are on the [pricing section](/#cenovnik). Early access runs until the public launch on 15 November 2026.",
        },
        {
          type: "p",
          text: "If you want to see the rule, the snapshot and what the agency sees on its own account, that belongs in a [25-minute demo](/demo). One building, two agencies and two different rules are enough. That is the whole point: those two rules are no longer reconstructed from the same Excel sheet.",
        },
      ],
    },
  },
};
