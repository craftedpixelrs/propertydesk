# Upravnici zgrada (MANAGER modul)

Faza 11 modul za profesionalne upravnike stambenih zajednica. Isti PropertyDesk
backend/UI, ali nova vrsta tenanta: `Organization.type === "MANAGER"`.

Tenant tipovi su striktno razdvojeni — MANAGER vidi samo svoje zgrade, nikada
investitorov inventar ili agencijska povezivanja. Zajedničke su samo osnovne
Better Auth tabele (`User`, `Session`, `Account`).

## Brzi uputnik (za upravnika)

1. **Prijavi se** na `my.propertydesk.app` (ili demo
   `vlasnik@upravnikplus.test`). Otvara se **Kontrolna tabla** upravnika
   sa KPI-jevima: broj zgrada, dug, otvoreni kvarovi, zakazane skupštine.
2. **Zgrade** (`/zgrade`) — dodaj zgradu (adresa, broj spratova, godina
   gradnje, kat. parcela). Unutar zgrade → **Posebni delovi** → dodaj
   stanove / garaže / lokale (`m²`, `participationShare`). Masovno:
   **XLSX uvoz** na `/zgrade/[id]/uvoz`.
3. **Vlasnici i stanari** — na `/zgrade/stanari` dugme **Dodaj stanara**
   upisuje lice na posebni deo (vlasnik, zakupac ili korisnik) i, ako
   ima email, šalje link za portal. Isti podaci, u tri koraka, stoje i
   na tabu zgrade **Vlasnici**: novo lice, dodela na deo, pozivnica.
   JMBG nije potreban i aplikacija ga ne traži.
4. **Finansije zgrade** (`/zgrade/[id]/finansije`) — slika po stanu
   (zaduženo, uplate, korekcije, dug, radovi, isplate na stan) i stanje
   fondova (uplate u fond minus isplate). Kartica stana je
   `/zgrade/[id]/delovi/[unitId]`. Tu se vode i korekcije duga
   (pozitivan iznos povećava dug, negativan je u korist stanara).
   Ista stranica: mesečne
   tarife (održavanje, lift, čišćenje) iz **Tarife** sekcije. Scope: po
   zgradi / po ulazu / po tipu jedinice; basis: fiksno / po m² / po
   udelu. Ista stranica prikazuje zaduženja i troškove (`BuildingExpense`
   po fondu).
5. **Mesečna zaduženja** (`/zgrade/zaduzenja`) — cron
   `manager-generate-dues` pokreće ih prvog u mesecu u 02:00 UTC. Dugme
   **Generiši sada** iz tab-a Finansije radi istu stvar — idempotentno,
   bez duplikata.
6. **Uplatnica (PDF)** se otvara iz detalja zaduženja
   (`/zgrade/zaduzenja/[id]` → **Preuzmi uplatnicu**). Sadrži IPS QR kod
   + 14-cifreni poziv na broj (model 97) koji je uvek isti za isto
   zaduženje — reprint vraća istu referencu.
7. **Uplate** se unose u detaljnom prikazu zaduženja (**Zavedi uplatu**,
   **Storniraj**, **Otpiši**). Masovno: **Uvoz izvoda** (CSV/XLSX) iz
   `/zgrade/zaduzenja` ili `/zgrade/[id]/finansije` — matching po
   model-97 referenci. **Dužnici** (`/zgrade/duznici`) → **Pošalji
   opomene**.
8. **Kvarovi** (`/zgrade/kvarovi` + `/zgrade/kvarovi/[id]`) — ticket
   workflow sa fotografijama (upload direktno u `Document` sa
   `category: TICKET`). Lista se filtrira po zgradi, kategoriji i
   statusu. Klik na prijavu u listi, na tabli ili na tabu zgrade otvara
   bočni panel (`?ticket=`) sa tokom statusa, mestom, prijaviocem i
   poslednjim radom; promena statusa je u tom panelu. Ceo dosije
   (fotografije, evidencija, isplate) ostaje na `/zgrade/kvarovi/[id]`.
   Na detalju su prijavilac, ulaz, sprat, **evidencija rada**
   (`MaintenanceWorkEntry`, vidljivo stanaru ili interno) i isplate
   vezane za tu prijavu. Stavka vidljiva stanaru šalje email i pojavljuje
   se na `/stanar/kvarovi/[id]`. Zatvaranje tiketa (`COMPLETED` +
   `actualCost`) automatski piše `BuildingExpense` po izabranom fondu
   (tekuće održavanje / investiciono / ostalo). **Izvođači**
   (`/zgrade/izvodjaci`) su katalog firmi i majstora: naziv, vrsta
   posla, PIB i kontakt, za sve zgrade. Izvođač nema nalog. Na prijavi
   se bira iz te liste. Zatvaranje sa troškom veže isplatu za njega.
9. **Obaveštenja** (`/zgrade/obavestenja` + `/zgrade/obavestenja/[id]` +
    tab `/zgrade/[id]/obavestenja`) — nacrt ili odmah objava. Publika je
    cela zgrada, ulaz, tip dela ili izabrani stanovi. Kanal je portal,
    email ili oba. Email ide vlasnicima, zakupcima i aktivnim nalozima
    portala na tim stanovima, sa linkom na `/stanar/obavestenja`. Samo
    email se ne vidi na portalu. Poziv i rezultat skupštine, prijava
    kvara u zajedničkom prostoru i zatvaranje te prijave sami prave
    obaveštenje vezano za tu skupštinu ili prijavu. Kvar na jednom stanu
    ostaje na portalu samo za taj stan.
10. **Skupštine** (`/zgrade/skupstine` + `/zgrade/skupstine/[id]`) —
    zakazivanje, dnevni red (odluka, izbor ili informacija), poziv
    emailom svim trenutnim vlasnicima i na portalu. Jedan posebni deo
    ima jedan glas, težina je `participationShare`. Prisustvo (lično,
    portal ili punomoćje) ulazi u kvorum: više od polovine ukupnog
    učešća. Bez kvoruma odluke ne prolaze. Većina po tački je prosta
    (više od polovine datih glasova), apsolutna ili dvotrećinska.
    Glas se može menjati dok je rok otvoren. Zatvaranje zamrzava
    rezultat. PDF **Zapisnik** je evidencija, ne zakonski obrazac.
11. **Stanari** (`/zgrade/stanari`) → **Dodaj stanara** upisuje lice na
    posebni deo (vlasnik, zakupac ili korisnik) i, ako ima email, šalje
    magic-link. Isti unos je i na tabu zgrade **Vlasnici** (lice, dodela,
    pozivnica odvojeno). **Pošalji ponovo** regeneriše token, **Opozovi**
    pristup je trenutno efektivan (sledeći zahtev stanara pada na proveri
    cookie-ja). Stanar nije `User` i ne troši mesto u organizaciji.
12. **Dokumenti zgrade** (`/zgrade/[id]/dokumenti`) — arhiva cele zgrade:
    fajlovi zgrade, stanova, kvarova i skupština. Upload bira da li je
    fajl interno ili vidljivo stanarima; isto se menja posle otpremanja.
    Zapisnik skupštine se čuva kao dokument skupštine vidljiv stanarima.
    Stan i prijava imaju sopstvenu listu, a arhiva zgrade ih sve pokazuje.
13. **Prenos zgrade od investitora** stiže kao `BuildingHandoverRequest`
    sažetak u `/zgrade/predaje`. **Prihvati** jednom transakcijom
    kopira strukturu i vlasnike — bez JMBG-a.
14. **Izveštaji** (`/izvestaji/upravljanje/*`) — Finansije, Dužnici,
    Troškovi, **Program održavanja**, Godišnji izveštaj o radu (PDF).
15. **Masovne uplatnice** — iz `/zgrade/zaduzenja` dugme **Masovno
    uplatnice (PDF)** → bira zgradu + mesec/godinu i preuzima jedan PDF
    sa po jednom stranom za svaku otvorenu uplatnicu. Endpoint:
    `GET /api/v1/manager/dues/bulk-pdf`.
16. **Opomene bez duplikata** — **Pošalji opomene** sada ne šalje
    opomenu stanaru koji je dobio opomenu u poslednjih N dana (podrazumevano
    7). Pokušaji se evidentiraju u `DuesReminderLog` i vide se u povratnom
    rezimeu. Pokrenite sa `cooldownDays=0` da naterate ponovno slanje.
17. **Kanban prikaz kvarova** — `/zgrade/kvarovi?view=board` otvara
    kolone po statusu (OPEN → COMPLETED). Klik na karticu otvara bočni
    panel. Prevucite karticu da promeni status; audit log i obaveštenja
    stanaru rade kao kod bilo koje druge promene statusa.
18. **EditTicketDialog** — na `/zgrade/kvarovi/[id]` dugme **Izmeni**
    menja naslov, kategoriju, prioritet, dodeljenog kolegu, izvođača i
    procenjeni trošak.

## Brzi uputnik (za stanara)

1. Stanar dobija mejl „Pristup portalu" sa linkom
   `/stanar/pristup/[token]` koji važi 14 dana.
2. Klik na link postavlja cookie `pd_resident` i otvara
   `/stanar/pocetna`. Nema lozinke, nema registracije.
3. Stanar vidi **svoje jedinice**, otvorena zaduženja i dugme
   **Preuzmi uplatnicu** (PDF sa IPS QR).
4. **Prijavi kvar** (`/stanar/kvarovi/novi`) — upisuje opis, bira jedinicu
   iz svojih aktivnih pristupa i može priložiti do 5 fotografija koje se
   čuvaju kao `Document(category: TICKET)` uz tiket. Upravnik odmah vidi
   tiket u `/zgrade/kvarovi/[id]` sa galerijom fotografija.
5. **Obaveštenja** (`/stanar/obavestenja`) — objavljena obaveštenja za
   stanove kojima stanar ima pristup. Publika (svi, ulaz, tip, izabrani
   delovi) važi i ovde. Poruka samo za email se ne prikazuje. Ako je
   vezana za skupštinu ili kvar, kartica vodi na tu stranu.
5a. **Kvarovi** (`/stanar/kvarovi` + `/stanar/kvarovi/[id]`) — stanar
    vidi prijave koje je sam podneo i prijave na svojim stanovima, sa
    statusom, vidljivom evidencijom rada i fotografijama. Interne
    stavke evidencije ostaju samo kod upravnika.
5b. **Dokumenti** (`/stanar/dokumenti`) — fajlovi zgrade i stana koje je
    upravnik označio vidljivim stanarima, zapisnik skupštine te zgrade i
    prilozi prijava na stanovima kojima stanar ima pristup. Download ide
    preko `/api/v1/public/resident/documents/[id]/download`. Kartica vodi
    na skupštinu ili prijavu kada je fajl vezan za njih.
5c. **Privatnost** (`/stanar/privatnost`) — pregled svih ličnih podataka
    koje PropertyDesk čuva o stanaru (ime, email, telefon, adresa,
    vezane jedinice i udeli).
6. **Glasanje** (`/stanar/glasanje`) — stanar vidi zakazane, otvorene i
   završene skupštine svojih zgrada. Glas (`ZA / PROTIV / UZDRŽAN`) daje
   samo trenutni vlasnik, jednom po posebnom delu; težina se izvodi
   serverski iz `participationShare`. Informativne tačke se ne glasaju.
7. **Odjava** sa `/stanar/odjava` briše cookie. Upravnik može u svakom
   trenutku da povuče pristup iz `/zgrade/stanari`.

## Modeli

Sve ispod je dodato bez brisanja postojećih tabela. Idemo redom:

- `ManagedBuilding` — stambena zajednica. Ima ulaze (`BuildingEntranceSection`)
  i posebne delove (`ManagedUnit`).
- `BuildingPerson` + `UnitOwnership` — vlasnici / zakupci / korisnici.
  **Nema `jmbg` kolone** — ZZPL (`Zakon o zaštiti podataka o ličnosti`)
  minimalizacija.
- `DuesTariff` + `DuesCharge` + `DuesPayment` — zajedničke takse. Idempotentno
  generisanje po `(unitId, periodYear, periodMonth)`.
- `MaintenanceTicket` + `MaintenanceWorkEntry` + `Supplier` +
  `BuildingExpense` — kvarovi, evidencija rada, izvođači i troškovi.
  `Supplier` nije `User`. Zatvaranjem tiketa (`COMPLETED` + `actualCost`)
  automatski se pravi `BuildingExpense` na izabranom fondu.
- `Assembly` + `AgendaItem` + `AssemblyVote` + `AssemblyInvitation` +
  `AssemblyAttendance` — skupštine, dnevni red, glasanje i prisustvo.
  Relacija na `Assembly` se zove `items`. Težina glasa =
  `participationShare` jedinice. Većine: `SIMPLE`, `ABSOLUTE`,
  `TWO_THIRDS`. Kvorum je prisutno učešće veće od polovine ukupnog.
- `BuildingNotice` — obaveštenja stanarima (PORTAL/EMAIL/BOTH).
  Audijencija: `ALL | BY_ENTRANCE | BY_UNIT_TYPE | SPECIFIC_UNITS`
  (sa `audienceParams` JSON-om — `entranceIds[]`, `unitTypes[]`,
  `unitIds[]`). `resolveNoticeUnitIds()` je jedini izvor istine o tome
  ko sme da ga vidi — koriste ga i email dostava i portal.
- `ResidentAccess` — portal za stanare. **Nije `User`** — magic-link + HMAC
  potpisana cookie (`pd_resident`).
- `BuildingHandoverRequest` — prenos projekta investitora na upravnika.
- `DuesReminderLog` — audit svake poslate opomene (`chargeId`, `email`,
  `sentAt`). Omogućava cooldown dedupe iz `sendDuesReminders`.
- `Document.uploadedByUserId` je sada `nullable` — `uploadedByPersonId`
  (FK na `BuildingPerson`) hvata uploade sa portala stanara.
  `DocumentVisibility.RESIDENT_SHARED` je nova vrednost namenjena
  dokumentima koje stanar sme da vidi.

## Dozvole

Resursi (`src/server/permissions/access-control.ts`):

- `building.*` — read, manage, import, handover
- `dues.*` — read, tariff.manage, generate, payment.record, payment.reverse,
  bankstatement.import, invoice.send, reminder.send, writeoff
- `ticket.*` — read, manage, close
- `assembly.*` — read, manage, vote.cast, minutes.generate
- `notice.*` — read, manage
- `resident.*` — read, manage

Jedini "dodir" sa investitorom: `project.handover_manager` (investitor pokreće
predaju).

Rolne mape (`src/server/permissions/roles.ts`):

| Rola | Pokrivanje |
|---|---|
| `MANAGER_OWNER` | Sve, uključujući otpis duga i čitanje naplate |
| `MANAGER_ADMIN` | Isto kao vlasnik, osim što ne upravlja organizacijom i ne otpisuje dug |
| `MANAGER_ACCOUNTANT` | Zaduženja, uplate, opomene, izveštaji i dokumenti. Prijave i stanare samo čita. Ne dodaje stanare ni izvođače |
| `MANAGER_TECHNICIAN` | Čita zgrade. Vodi prijave, fotografije, dokumente i katalog izvođača. Nema finansije, skupštine ni obaveštenja |
| `MANAGER_VIEWER` | Samo čitanje, uključujući izveštaje |

## Portal za stanare (`/stanar/*`)

Nova route grupa `src/app/(stanar)/stanar/**` sa sopstvenim layoutom. Bez
sidebar-a i bez redirect-a na `/sign-in` — stanari uopšte nisu u Better Auth.

### Autentikacija

- `inviteResident()` kreira `ResidentAccess` sa 32-byte hex tokenom (važnost
  14 dana) i šalje magic-link email na `/stanar/pristup/{token}`.
- Prihvatanje linka postavlja status `ACTIVE`, briše token i postavlja cookie
  `pd_resident` sa `${accessId}.${hmac}` (`BETTER_AUTH_SECRET` → HMAC-SHA256,
  60 dana, `httpOnly`, `secure` u production).
- Svaki server-side request re-validira cookie (`getResidentSession()`) i
  resetuje `ResidentAccess` iz baze — opoziv je trenutno efektivan.
- Stanari NE troše seats upravnikove organizacije.

### Funkcije

- Pregled otvorenih zaduženja i PDF uplatnice sa IPS QR kodom (model 97).
- Prijava kvara, sa fotografijama. Na portalu vidi i prijave svojih
  stanova, status i samo evidenciju rada koju je upravnik označio
  vidljivom.
- Obaveštenja za svoje stanove. Poruka samo za email se ne prikazuje.
  Kartica vodi na skupštinu ili kvar kada je obaveštenje vezano za njih.
- Dokumenti zgrade i stana koje je upravnik podelio, zapisnik skupštine
  i prilozi prijava na svojim stanovima.
- Glasanje na otvorenoj skupštini, samo ako je trenutni vlasnik dela.
  Težina glasa dolazi sa servera iz učešća dela. Informativna tačka se
  ne glasa.

## Finansije

### Uplatnica (IPS QR + model 97)

- `src/lib/payments/model97.ts` — jedini izvor istine za Model 97 reference.
  12 cifara → `98 − (num mod 97)` BigInt-om.
- `deterministicModel97(chargeCuid)` kolapsira cuid u 12 cifara pa doda
  check-digit — reprintovana uplatnica ima istu referencu.
- `src/server/pdf/documents/uplatnica.tsx` renderuje PDF sa breakdown-om po
  fondu i NBS IPS QR payload-om (`N\n` separator, `K:PR|V:01|...` fields).

### Generisanje zaduženja

- Cron `manager-generate-dues` (`0 2 1 * *` — 02:00 UTC prvog u mesecu).
- Idempotentno — ako već postoji `DuesCharge` za `(unitId, year, month)`,
  preskače. Operator može ručno pokrenuti iz UI-a.

### Masovni PDF uplatnica

- `GET /api/v1/manager/dues/bulk-pdf?buildingId=&year=&month=&includePaid=`
  renderuje jedan PDF sa po jednom stranom (`<Page />`) za svaku otvorenu
  uplatnicu zgrade za zadati mesec. Interno koristi
  `renderBulkDuesUplatnicaPdf()` i `buildUplatnicaPdfData()` — ista
  model-97 referenca kao i pojedinačni PDF.

### Opomene bez duplikata

- `sendDuesReminders(organizationId, { cooldownDays })` preskače svaku
  uplatnicu za koju postoji `DuesReminderLog` novijih od
  `cooldownDays` (default 7). Pokušaj se vraća u `dedupedSkipped` nizu.
  Svaka realno poslata opomena se upisuje u `DuesReminderLog`.

## Prenos zgrade od investitora

- Investitor na `/projekti/[id]`: dugme „Predaj upravniku" (dozvola
  `project.handover_manager`).
- `createHandoverRequest()` pravi `BuildingHandoverRequest` sa `summary` JSON-om
  i šalje email na targetContactEmail.
- Upravnik na `/zgrade/predaje/[id]` prihvata ili odbija.
- **Prihvat**: jedna transakcija kopira `Unit` → `ManagedUnit` (sa
  `sourceUnitId`) i `Buyer` → `BuildingPerson` + `UnitOwnership`. Kopiraju se
  samo prodaje u statusu `PAID`/`HANDED_OVER`.
- **JMBG, identityNumber i taxId se NE prenose** (ZZPL minimizacija). Upravnik
  dobija samo ime/email/telefon/adresu — dovoljno za uplatnice i skupštine.
- Nema deljenja baze posle prenosa — čista kopija + audit.

## i18n

- Namespace `src/lib/i18n/namespaces/manager.ts` (SR + EN) sa:
  buildings, building (tabs), units, owners, import, dues, tariffs, debtors,
  tickets, suppliers, expenseFund, assemblies, notices, residents, handover,
  dashboard, reports.
- Registrovan u `src/lib/i18n/sr-Latn.ts` i `en.ts`.

## Admin / rollout

- Platform-admin (`/administracija/organizacije`) ima filter po tipu
  `MANAGER`.
- Lead provisioning (Property Desk) podržava `audience: "MANAGER"` → kreira
  organizaciju sa `MANAGER_OWNER` kao prvim članom.
- Demo seed: organizacija „Upravnik Plus" sa dve zgrade, stanovima,
  garažom, lokalom i parking mestom, tarifama, otvorenim, delimično
  plaćenim, plaćenim i otpisanom zaduženjem, izvođačima, kvarovima u
  svim statusima, obaveštenjima, pozivnicama za portal i skupštinama
  (zakazana, glasanje otvoreno, otkazana). Idempotentno, u
  `seedManagerDemoContent()` u `prisma/seed.ts`. Produkcija se ne seede.

## Testovi

- Unit: [`src/lib/payments/model97.test.ts`](../src/lib/payments/model97.test.ts)
  (11 testova: model-97 check-digit, deterministic reference, round-trip).
- Catalog / navigacija / permissions: `src/components/app/navigation.test.ts`
  i `src/server/permissions/permissions.test.ts` uključuju MANAGER role u
  svoje provere; `src/lib/guides/catalog.test.ts` pokriva nove
  `PAGE_GUIDES` ulaze za `/zgrade/**`.
- E2E: [`e2e/manager-flow.spec.ts`](../e2e/manager-flow.spec.ts) —
  route guards (`/zgrade`, `/stanar`, `/manager/handovers`),
  nepoželjan unauth pristup portalu za stanare, zaštita handover
  endpointa bez sesije.

## Granice

- Pravna valjanost elektronskog glasanja po Zakonu o stanovanju i održavanju
  zgrada mora se proveriti sa pravnikom pre produkcije — u UI-ju glasanje stoji
  kao „evidencija glasanja".
- Format godišnjeg izveštaja o radu je informativan — ne zamenjuje overene
  dokumente.
