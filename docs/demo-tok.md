# PropertyDesk — Demo tok i uputstvo za korišćenje

Ovaj dokument opisuje **kompletan operativni tok** kroz PropertyDesk platformu — od unosa prvog projekta do finalne isplate provizije agenciji — i sve dodatne akcije koje bi svaki operator (investor ili agencija) trebao da poznaje.

Sadržaj:

- [1. Pre nego što počneš](#1-pre-nego-što-počneš)
- [2. Unos projekta](#2-unos-projekta)
- [3. Unos jedinica](#3-unos-jedinica-stanovi--garaže--ostave)
- [4. Kupci](#4-kupci)
- [5. Rezervacije](#5-rezervacije)
- [6. Prodaja i plan otplate](#6-prodaja-i-plan-otplate)
- [7. Uplate](#7-uplate)
- [8. Agencijski portal i provizije](#8-agencijski-portal-i-provizije)
- [9. Zadaci i notifikacije](#9-zadaci-i-notifikacije)
- [10. Dokumenti](#10-dokumenti)
- [11. Izveštaji](#11-izveštaji)
- [12. Podešavanja tenant-a](#12-podešavanja-tenant-a)
- [13. Super-admin operativa](#13-super-admin-operativa)
- [14. Automatizacija (cron jobs)](#14-automatizacija-cron-jobs)
- [15. SaaS naplata (billing modul)](#15-saas-naplata-billing-modul)
- [16. Mobilna upotreba](#16-mobilna-upotreba)
- [17. Uloge i dozvole — brzi vodič](#17-uloge-i-dozvole--brzi-vodič)
- [18. Rešavanje čestih problema](#18-rešavanje-čestih-problema)

---

## 1. Pre nego što počneš

### 1.1. Preduslovi

- Node.js 22+, pnpm 10+
- PostgreSQL 15+ (lokalno ili preko Supabase-a)
- `.env` fajl podešen: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BILLING_SECRET_KEY`, `CRON_SECRET`

### 1.2. Pokretanje aplikacije

```bash
pnpm install
pnpm prisma migrate deploy
pnpm prisma db seed        # kreira demo tenant + admin nalog
pnpm dev                   # startuje na http://localhost:3000
```

### 1.3. Demo nalozi (posle `prisma db seed`)

| Uloga | Email | Lozinka |
| --- | --- | --- |
| Platformski super-admin | `admin@propertydesk.test` | `PropertyDesk!2026` |
| Investor — vlasnik | `investor-owner@propertydesk.test` | `PropertyDesk!2026` |
| Investor — prodavac | `sales-agent@propertydesk.test` | `PropertyDesk!2026` |
| Investor — finansije | `finance@propertydesk.test` | `PropertyDesk!2026` |
| Agencija — vlasnik | `agency-owner@propertydesk.test` | `PropertyDesk!2026` |
| Agencija — agent | `agent@propertydesk.test` | `PropertyDesk!2026` |

Detalji nalozima su vidljivi kao super-admin u `/administracija/organizacije`.

### 1.4. Prvi kontakt

Nakon prijave si na **Kontrolnoj tabli** (`/dashboard`). Levi sidebar sadrži sve module dostupne tvojoj ulozi. Gornja traka:

- **Zvono** — nepročitane notifikacije
- **Prekidač organizacije** — ako imaš pristup u više tenant-a (super-admin ili invited user)
- **Profil** → Odjava, Podešavanja profila

---

## 2. Unos projekta

**Sidebar → Projekti** (`/projekti`) → dugme **"Novi projekat"** ili direktno `/projekti/novi`.

### 2.1. Obavezna polja

| Polje | Napomena |
| --- | --- |
| **Šifra projekta** | Kratka, jedinstvena po organizaciji (npr. `P-BEO-001`). Ne može se menjati kasnije. |
| **Naziv projekta** | Naziv koji vidi kupac. |

### 2.2. Preporučena polja

- **Grad, Adresa, Opština, Poštanski broj** — za IPS QR na fakturama i kupoprodajnim ugovorima
- **Status** — `DRAFT` (rad u toku), `PRE_SALES` (priprema), `ACTIVE_SALES` (aktivna prodaja), `CONSTRUCTION` (izgradnja), `COMPLETED` (završen)
- **Datum početka prodaje** — koristi se u izveštajima o dužini prodajnog ciklusa
- **Datum početka izgradnje**, **Očekivani završetak** — prikazuju se kupcu
- **Podrazumevana valuta** (`EUR` / `RSD`) — nasleđuju sve jedinice i sve prodaje
- **PDV stopa** — automatski se dodaje u ugovorenu cenu

### 2.3. Šta se dešava kada snimiš

- Projekat se kreira u tvom tenant-u sa audit tragom (`project.created`)
- Otvara se `/projekti/{id}` — stranica sa svim tabovima:
  - **Pregled** — osnovne info + KPI (broj jedinica, prodato, dostupno)
  - **Objekti / Ulazi / Spratovi** — hijerarhijska struktura (opciono)
  - **Jedinice** — tabela svih jedinica
  - **Dokumenti** — ugovori, planovi, dozvole
  - **Timeline** — hronologija promena statusa i unosa

### 2.4. Kasnije izmene

Na detalju projekta u gornjem desnom uglu klikni **"Izmeni projekat"** (`/projekti/{id}/izmena`):

- Sva polja iz kreiranja se mogu menjati **osim šifre** (šifra je jedinstveni identifikator i koristi se u izveštajima).
- Prazno polje **briše vrednost** (npr. ako obrišeš "Grad" postaje `null`).
- Svaka izmena se audit-uje (`project.updated` sa dijem starih/novih vrednosti).

**"Arhiviraj"** — postavlja `ARCHIVED` status, isključuje iz svih izveštaja. Ne briše se; može se vratiti.

### 2.5. Struktura projekta: Objekat → Ulaz → Sprat

Ovo je **trostruka hijerarhija** koja se koristi za tačno lociranje svake jedinice u projektu. Sve tri razine su **opcione** — možeš ih preskočiti ako imaš prostu strukturu (npr. samo jedna zgrada bez izraženih ulaza).

**Kada koje polje popuniti:**

| Polje | Značenje | Kada koristiti |
| --- | --- | --- |
| **Objekat** (`Building`) | Zgrada / lamela / faza projekta | Kada projekat ima više odvojenih zgrada (npr. `Lamela A`, `Lamela B`, `Zgrada 1`, `Faza II`). Svaki objekat ima **šifru** (kratka, npr. `A`, `L1`) i **naziv**. |
| **Ulaz** (`Entrance`) | Ulaz u okviru objekta | Kada zgrada ima više odvojenih ulaza. Uobičajeno `Ulaz 1`, `Ulaz 2` ili `Ulaz A`, `Ulaz B`. Vezuje se za konkretan objekat. |
| **Sprat** (`Floor`) | Etaža unutar ulaza | `PR` (prizemlje), `1`, `2`, `PK` (potkrovlje), `S` (suteren). Vezuje se za konkretan ulaz. Broj sprata (`number`) služi za pravilno sortiranje (npr. −1 za suteren, 0 za prizemlje). |
| **Struktura** (na jedinici) | Klasifikacija jedinice | Slobodni tekst kao `2.5` (dvoiposoban), `3.0` (trosoban), `4.5` itd. Ovo je **karakteristika jedinice**, ne deo hijerarhije. |

**Pravila i ograničenja:**

- Svaki objekat mora imati **jedinstvenu šifru** u okviru projekta.
- Svaki ulaz mora imati **jedinstvenu šifru** u okviru objekta.
- Svaki sprat mora imati **jedinstvenu oznaku (`label`)** u okviru ulaza.
- **Redosled je bitan** — ne možeš da napraviš ulaz pre nego što napraviš objekat, ni sprat pre ulaza.
- Ne mogu se obrisati čvorovi koji sadrže jedinice — prvo premesti ili obriši jedinice.

**Kako se dodaje iz UI-ja:**

Iz detalja projekta (`/projekti/{id}`), u sekciji **"Struktura projekta"**:

1. **"+ Dodaj objekat"** — otvara modal, popuniš šifru + naziv → snimiš.
2. Klikni na objekat da se **proširi** i vidiš ulaze.
3. Pored objekta imaš **"+ Ulaz"** — kreiraš ulaz u tom objektu.
4. Pored ulaza imaš **"+ Sprat"** — kreiraš sprat u tom ulazu.

Sve tri operacije se audit-uju (`building.created`, `entrance.created`, `floor.created`).

**Kada popunjavaš jedinicu**, dropdown-i "Objekat", "Ulaz", "Sprat" na formi:

- Prazni su ako nema strukture — jedinica se snima bez lokacije u hijerarhiji.
- Kada odabereš objekat, **ulazi se filtriraju** samo na taj objekat.
- Kada odabereš ulaz, **spratovi se filtriraju** samo na taj ulaz.
- Sva tri polja su i dalje opciona — možeš snimiti jedinicu i sa samo objektom, ili sa objektom + ulazom, ili sa sva tri.

**Alternativa: CSV/XLSX uvoz** — sistem prilikom uvoza jedinica automatski kreira Objekat/Ulaz/Sprat ako naiđe na `buildingCode`, `entranceCode`, `floor` vrednosti koje ne postoje.

---

## 3. Unos jedinica (stanovi + garaže + ostave)

Dve opcije: ručno i CSV/XLSX uvoz.

### 3.1. Ručni unos

`/projekti/{id}/jedinice/nova` — forma za pojedinačnu jedinicu.

**Ključna polja:**

| Polje | Vrednosti / napomena |
| --- | --- |
| **Šifra** | Jedinstvena po projektu (npr. `A-3-04`) |
| **Vrsta** | `APARTMAN`, `LOKAL`, `GARAŽA`, `OSTAVA`, `STUDIO`, `PENTHOUSE`, `KUĆA`, `ZEMLJIŠTE` |
| **Objekat / Ulaz / Sprat** | Ako imaš hijerarhiju |
| **Površina (m²)** | Numerička |
| **Broj soba** | Numerička (može decimalna, npr. 2.5) |
| **Orijentacija** | Slobodan tekst (`Jug`, `SI`, …) |
| **Katalog cena / m²** | Ukupna cena se autopopunjava (površina × cena/m²) |
| **Ukupna cena** | Može se ručno override-ovati |
| **Status** | `DOSTUPNA`, `REZERVISANA`, `PRODATA`, `POVUČENA`, `ARHIVIRANA` |
| **Napomene** | Za internu upotrebu (nije vidljivo kupcu) |

### 3.2. CSV / XLSX uvoz (preporučeno za >10 jedinica)

`/projekti/{id}/uvoz` — wizard u 3 koraka:

1. **Preuzmi šablon** — sistem daje CSV/XLSX sa svim kolonama.
2. **Popuni i uploaduj** — sistem parsuje fajl (podržava `,`, `;`, `\t`, kao i XLSX preko `exceljs`).
3. **Preview + potvrda** — pokazuje šta će biti kreirano / ažurirano / preskočeno + eventualne greške po redu.

**Kolone u šablonu:**
`code, type, buildingCode, entranceCode, floor, area, rooms, orientation, pricePerSquareMeter, totalPrice, status, notes`

Postojeće jedinice sa istim `code` se **update-uju** (nikad ne dupliraju).

### 3.3. Detalj jedinice (`/jedinice/{id}`)

Iz njega dostupno:

- **"Izmeni jedinicu"** — otvara `/jedinice/{id}/izmena` sa punom formom. Šifra jedinice je zaključana, sve ostalo (Objekat/Ulaz/Sprat, površina, sobe, cena, PDV, orijentacija, opisi) može da se menja. **Osnovna cena** — ako je menjaš, forma traži razlog i sve upisuje u `PriceChangeHistory` (istoriju cena).
- **"Rezerviši"** — pokreće flow rezervacije (v. tačku 5)
- **"Promeni status"** — ručna promena (uz razlog, audituje se)
- **"Prodaj direktno"** — preskače rezervaciju, kreira odmah prodaju
- **"Arhiviraj"** — soft delete
- **Dokumenti** — planovi, slike, sertifikati vezani za tu jedinicu

Postoji i **optimističko zaključavanje** — ako dva korisnika istovremeno menjaju istu jedinicu, drugi će dobiti grešku "Neko je već izmenio ovu jedinicu, osveži stranicu" i tako se sprečava tiho gaženje izmena.

### 3.4. Pregled zaliha

**Sidebar → Jedinice** (`/jedinice`) — sve jedinice preko svih projekata sa filterima:

- Status, tip, površina (opseg), cena (opseg), broj soba, orijentacija, projekat

Filter se čuva u URL-u — možeš da podeliš link sa konkretnim filterom.

---

## 4. Kupci

### 4.1. Unos novog kupca

**Sidebar → Kupci** (`/kupci`) → **"Novi kupac"** ili `/kupci/novi`.

**Tipovi:**

- **FIZIČKO_LICE** — ime, prezime, JMBG, telefon, email
- **PRAVNO_LICE** — naziv firme, PIB, matični broj, adresa, kontakt osoba
- **STRANAC** — bez JMBG-a, sa brojem pasoša

**Automatska detekcija duplikata:**

Sistem normalizuje telefon i email (uklanja razmake, +/-, normalizuje kapitalizaciju) i **traži postojećeg kupca** pre nego što ti dozvoli snimanje. Ako pronađe, prikazuje panel:

> "Marko Marković postoji sa istim telefonom (+381 63 111 2222). Otvori postojećeg / Nastavi ipak / Otkaži."

Ovo sprečava dvostruko unošenje istog kupca preko različitih agenata.

### 4.2. Izvor kupca

Bitno je postaviti tačan izvor (koristi se u izveštajima):

`WEB`, `PREPORUKA`, `SAJAM`, `OFFLINE`, `AGENCIJA`, `MARKETING`, `DRUGO`

### 4.3. Detalj kupca (`/kupci/{id}`)

Tabovi:

- **Pregled** — kontakt info + KPI (broj rezervacija, ugovorena vrednost)
- **Aktivnosti** — timeline: pozivi, mail-ovi, obilazak, sastanci. Klik "Nova aktivnost" beleži novi entry sa datumom + tipom + tekstom.
- **Rezervacije** — sve rezervacije ovog kupca (aktivne + istorijske)
- **Prodaje** — svi ugovori
- **Zadaci** — TODO liste vezane za ovog kupca
- **Dokumenti** — kopije lične karte, ugovori, itd.

### 4.4. Akcije

- **"Izmeni kupca"** — otvara `/kupci/{id}/izmena`. Sva polja iz kreiranja se mogu menjati (ime, prezime, telefon, email, budžet, izvor, napomena, preferirani kontakt). Detekcija duplikata se **ne** okida na edit-u.
- **"Nova rezervacija"** — otvara rezervaciju vezanu za ovog kupca (bira jedinicu)
- **"Zakaži zadatak"** — kreira zadatak sa rokom (opciono "podseti me email-om")
- **"Objedini sa drugim kupcem"** — merge dva zapisa u jedan (koristi kad greškom uneseš duplikat)
- **"Anonimizuj"** — GDPR opcija: uklanja lične podatke, zadržava statistiku

---

## 5. Rezervacije

### 5.1. Kreiranje rezervacije

Dva puta:

**A) Iz detalja jedinice** (`/jedinice/{id}` → "Rezerviši"):
- Bira postojećeg kupca ili kreira novog on-the-fly
- Traje **7 dana** podrazumevano (može override)

**B) Iz detalja kupca** (`/kupci/{id}` → "Nova rezervacija"):
- Isti wizard, ali kupac je već izabran

**Polja:**

| Polje | Napomena |
| --- | --- |
| Kupac | Već izabran ili iz liste |
| Jedinica | Već izabrana ili iz liste (samo `DOSTUPNA`) |
| Datum rezervacije | Default: danas |
| Trajanje (dana) | Podrazumevano iz podešavanja projekta |
| Depozit | Iznos + valuta; može biti 0 |
| Napomena | Slobodan tekst |

### 5.2. Šta se dešava kada rezervišeš

1. Jedinica: `DOSTUPNA` → `REZERVISANA`
2. Rezervacija: status `AKTIVNA`
3. Ako je unesen depozit — kreira se `Payment` sa `type=DEPOZIT` (kada se konvertuje u prodaju, automatski se pripiše na prvu ratu)
4. Kupac dobija automatski email potvrde
5. Interni tim dobija notifikaciju (bell) i eventualno zadatak "Prati potpisivanje ugovora"

### 5.3. Isteklost i podsetnici

**Cron `expire-reservations`** (dnevno u 08:00 Europe/Belgrade):

- Ako je `expiresAt < now` i rezervacija je i dalje `AKTIVNA`:
  - Rezervacija: `AKTIVNA` → `ISTEKLA`
  - Jedinica: `REZERVISANA` → `DOSTUPNA`
  - Kupac i tim dobijaju notifikaciju
  - Ako je uplaćen depozit — automatski se otvara zadatak "Vrati depozit klijentu"

**Cron `reservation-reminders`** (dnevno u 09:00):
- Kupcima kojima rezervacija ističe za 2 dana šalje se email podsetnik + notifikacija u aplikaciji

### 5.4. Ručne akcije na rezervaciji (`/rezervacije/{id}`)

- **Produži** — dodaje X dana rezervaciji (uz razlog, audit)
- **Otkaži** — postavlja `OTKAZANA` status i vraća jedinicu na `DOSTUPNA` (uz razlog)
- **Konvertuj u prodaju** — glavni sledeći korak (v. tačku 6)
- **Vrati depozit** — automatska storniranje depozita

### 5.5. Race-condition sigurnost

Partial unique index u bazi (`reservation_unit_active_unique`) **fizički ne dozvoljava** dve aktivne rezervacije nad istom jedinicom. Ako dva agenta istovremeno kliknu "Rezerviši" na isti stan, drugi dobija:

> "Konflikt: jedinica je već rezervisana."

---

## 6. Prodaja i plan otplate

### 6.1. Konverzija rezervacije

Iz `/rezervacije/{id}` → **"Konvertuj u prodaju"** — otvara wizard:

**Korak 1 — Osnovni podaci:**

| Polje | Primer |
| --- | --- |
| Datum ugovora | Default: danas |
| Broj ugovora | Slobodan tekst; može se generisati automatski |
| Ugovorena cena | Pre-popunjeno iz jedinice, može override |
| Popust | Iznos (fiksan ili %) |
| Konačna cena | Autopopunjeno |
| Način plaćanja | `GOTOVINA`, `KREDIT`, `PLAN_OTPLATE` |
| Datum ulaska u posed | Očekivani datum primopredaje |

**Korak 2 — Plan otplate** (ako si izabrao `PLAN_OTPLATE`):

Tabela rata koje popunjavaš:

| # | Iznos | Datum dospeća | Opis |
| --- | --- | --- | --- |
| 1 | 20.000 EUR | 15.09.2026 | Kapara pri potpisu |
| 2 | 40.000 EUR | 15.10.2026 | Rata 1 |
| 3 | 40.000 EUR | 15.12.2026 | Rata 2 (etaža 3) |
| 4 | 40.000 EUR | 15.03.2027 | Rata 3 (fasada) |
| 5 | 35.000 EUR | 15.10.2027 | Primopredaja ključa |

Sistem proverava da zbir rata = konačna cena (upozorava ako nije).

**Postoji i "Predefinisani planovi"** — ako u podešavanjima projekta imaš standardnu šemu (npr. 10-40-40-10), možeš izabrati "Primeni šablon" i sistem popuni sve rate.

### 6.2. Šta se dešava kada potvrdiš

Sve u jednoj transakciji:

1. `Sale` se kreira sa svim `PaymentPlan` rate stavkama
2. Jedinica: `REZERVISANA` → `PRODATA`
3. Rezervacija: `AKTIVNA` → `KONVERTOVANA`
4. Depozit iz rezervacije (ako postoji) → automatski se alocira na prvu ratu
5. Ako je kupac agencijski → kreira se `Commission` zapis (v. tačku 8)
6. Emituje se notifikacija svima koji trebaju znati (prodavac, finansije)
7. Šalje se email potvrde kupcu sa PDF ugovorom (ako postoji šablon)
8. Audit: `sale.created`, `unit.status_changed`, `reservation.converted`, `commission.created`

### 6.3. Detalj prodaje (`/prodaje/{id}`)

Tabovi:

- **Pregled** — cena, popust, status, procenat naplate
- **Plan otplate** (`/prodaje/{id}/plan-placanja`) — tabela rata + akcije
- **Uplate** — sve zabeležene uplate + FIFO alokacija
- **Dokumenti** — ugovor, aneksi, PDF-ovi
- **Timeline** — hronologija svih promena statusa

### 6.4. Akcije nad prodajom

- **Izmeni prodaju** — ograničeno na non-financial polja (napomena, broj ugovora)
- **Izmeni plan otplate** — može se izmeniti iznos i datum rate, uz obavezan razlog (audit); zaključana ako su rate već delimično uplaćene bez `sale.plan_edit_paid` dozvole
- **Otkaži prodaju** — samo ako nije uplaćeno ništa; vraća jedinicu na `DOSTUPNA`, rezervaciju možeš ponovo otvoriti
- **Storniraj prodaju** — ako je bilo uplata: storno svih uplata, vraća stanje pre prodaje, obavezan razlog

### 6.5. Direktna prodaja bez rezervacije

Iz detalja jedinice: **"Prodaj direktno"** (dostupno samo dok je jedinica `DOSTUPNA`). Wizard je isti kao 6.1 samo bez koraka rezervacije.

Koristi se kad kupac uplaćuje u kešu i preskače proces rezervacije.

---

## 7. Uplate

### 7.1. Evidentiranje uplateimage.png

Dve rute:

**A) Iz detalja prodaje** (`/prodaje/{id}`) → "Evidentiraj uplatu" — najčešće.

**B) Sidebar → Uplate** (`/uplate`) → "Nova uplata" — kad ne znaš za koju prodaju vezuješ.

**Polja:**

| Polje | Primer |
| --- | --- |
| Prodaja | (autopopunjeno ako si došao iz detalja) |
| Iznos | `20.000,00` |
| Valuta | Nasleđuje se od prodaje |
| Datum uplate | Default: danas |
| Način | `BANKARSKI_TRANSFER`, `GOTOVINA`, `KARTICA`, `KOMPENZACIJA`, `DRUGO` |
| Referenca / broj naloga | Broj izvoda ili plaćanja |
| Napomena | Slobodan tekst |

### 7.2. FIFO alokacija — automatska

Kada snimiš uplatu:

1. Sistem uzima **najstariju otvorenu ratu** i alocira uplatu prvo na nju
2. Ako uplata pređe iznos rate → ostatak se alocira na sledeću najstariju ratu
3. Ako pređe **sve otvorene rate** → ostatak ostaje kao `unappliedAmount` (neraspoređeni saldo)
4. Ažurira `sale.amountPaid`, `sale.amountRemaining`, `sale.paidPercent`, `sale.paidStatus`
5. Ako je prodaja u potpunosti plaćena → status ide u `ZAVRŠENA`, kupac dobija zahvalnicu

### 7.3. Ručna alokacija (napredna)

U detalju uplate (`/uplate/{id}` ili preko modala iz `/prodaje/{id}`): dugme **"Realociraj"** — otvara panel gde ručno biraš koliko ide na koju ratu (koristi se npr. kad kupac napiše "ovaj iznos je za ratu 3, ne za 2").

### 7.4. Više prodaja — jedan uplatilac

Ako kupac uplati jednom sumom za više svojih prodaja (npr. stan + garaža):

- Klikni **"Nova uplata"** → izaberi kupca → panel "Rasporedi po prodajama" → unesi iznose po prodaji.

### 7.5. Storniranje uplate

Detalj uplate → **"Storniraj"**:

- Kreira **negativnu alokaciju** (audit-trail očuvan, ništa se ne briše)
- Rate se vraćaju u prethodno stanje
- Ako je prodaja bila `ZAVRŠENA` — vraća se u `AKTIVNA`
- Obavezan razlog

### 7.6. Podsetnici i kašnjenja

**Cron `overdue-installments`** (dnevno u 09:00):

- Detektuje rate čiji `dueDate < now` i status je `OTVORENA`
- Postavlja rate u `KAŠNJENJE`
- Šalje kupcu email + notifikaciju iz šablona (3 nivoa: 3 dana pre, na dan, 7 dana posle)
- Kreira zadatak finansijama "Kontaktiraj kupca zbog kašnjenja"

Šablone email-ova možeš izmeniti u `/administracija/naplata/sabloni` (super-admin).

---

## 8. Agencijski portal i provizije

### 8.1. Poziv agencije (od strane investora)

**`/administracija/agencije/nova`** — investor (ili super-admin) šalje pozivnicu agenciji:

- Naziv, PIB, email vlasnika
- Sistem šalje email sa link-om za registraciju
- Kada agencija prihvati, kreira se **konekcija** `AgencyConnection` u statusu `AKTIVNA`
- Investor bira koja provizijska pravila važe za tu agenciju (v. 8.4)

### 8.2. Agencija registruje interesenta

Agent se uloguje → **Sidebar → Moji kupci** → **"Registruj interesenta"** (`/moji-kupci`):

- Bira **projekat** (samo one za koje ima pristup)
- Unosi kupca (JMBG obavezan zbog jedinstvenosti zaštite)
- Sistem proverava:
  - Da li već postoji zaštita nad istim kupcem od drugog agenta ⇒ `CONFLICT_REVIEW`
  - Da li ima prethodni ugovor sa investorom ⇒ `CONFLICT_REVIEW`
  - Inače ⇒ status `PENDING`

### 8.3. Investor odobrava/odbija

**`/administracija/agencije/registracije`** — svi zahtevi:

- Klik na zahtev → detalj → **"Odobri"** ili **"Odbij"** (uz razlog)
- Odobreni prelazi u `APPROVED` sa važenjem **60 dana** (podešava se globalno)
- Za sve prodaje unutar 60 dana tom kupcu → automatski se veže za agenta i provizija ide agenciji

### 8.4. Provizijska pravila

**`/administracija/provizije/pravila`** (super-admin ili investor-owner):

| Polje | Napomena |
| --- | --- |
| Agencija | Konkretno ili "Sve agencije" |
| Projekat | Konkretno ili "Svi projekti" |
| Tip jedinice | Opciono filter |
| Formula | `Fiksno` (X EUR po prodaji) ili `Procentualno` (% od cene) |
| Iznos / procenat | Vrednost |
| Uslov | Opciono: "Samo ako je prodaja ≥ 100k" |
| Aktivno od / do | Vremenski okvir |

Pravila se evaluiraju po **najspecifičnijem match-u** (agencija + projekat + tip > agencija + projekat > agencija > default).

### 8.5. Automatska provizija

Kada se kreira `Sale` sa kupcem koji ima aktivnu zaštitu:

1. Sistem nađe agenciju + primenjivo pravilo
2. Kreira `Commission` zapis (status `NA_ČEKANJU`)
3. **Snapshot** iznosa i pravila se čuva na komisiji (immutable) — kasnija promena pravila ne menja postojeće provizije
4. Notifikacija agenciji: "Nova prodaja preko vaše agencije, provizija: X EUR"

### 8.6. Lifecycle provizije

| Status | Ko postavlja | Kada |
| --- | --- | --- |
| `NA_ČEKANJU` | Sistem | Odmah po kreiranju prodaje |
| `ODOBRENA` | Investor | Ručno u `/provizije/{id}` (ili automatski nakon 1. rate ako je globalno uključeno) |
| `SPREMNA_ZA_ISPLATU` | Sistem | Kad je kupac uplatio dovoljno za pokrivanje provizije |
| `ISPLAĆENA` | Investor | Kad zabelezi isplatu (`CommissionPayout`) |
| `OTKAZANA` | Investor | Ako je prodaja stornirana |

Agencija svoje provizije vidi u **Moje provizije** (`/moje-provizije`).

### 8.7. Ponuda za agenciju

**Sidebar → Ponuda** (`/ponuda`) — vidljivo samo agentima.

- Agent vidi listu projekata za koje ima pristup (dodeljuje investor)
- Klik na projekat (`/ponuda/{id}`) → svi detalji + tabela jedinica (`/ponuda/{id}/jedinice`)
- Samo **DOSTUPNE** jedinice su prikazane (rezervisane su skrivene)
- Ako investor sakrije cene za tog agenta — vidi samo šifru + osnovne info

Iz ponude agent direktno može:
- **"Rezerviši"** — kreira rezervaciju vezanu za tog agenta (agent → kupac → rezervacija; kupca možeš odabrati iz svojih ili kreirati novog)
- **"Pošalji kupcu"** — generiše link koji kupac otvori (koristi se za email)

---

## 9. Zadaci i notifikacije

### 9.1. Zadaci

**Sidebar → Zadaci** (`/zadaci`) — tabovi:

- **Danas** — sve što ističe danas
- **Prekoračeni** — dospelo, nije završeno
- **Nadolazeći** — sledećih 7 dana
- **Završeni** — arhiva

Svaki zadatak ima:
- Naslov + opis
- Vezan entitet (kupac / rezervacija / prodaja / jedinica)
- Rok
- Dodeljena osoba
- Prioritet (`NIZAK`, `SREDNJI`, `VISOK`, `URGENTAN`)

**Automatski kreirani zadaci:**

- Rezervacija ističe za 2 dana → "Kontaktiraj kupca"
- Rata dospela → "Naplati ratu X"
- Ugovor treba potpisati (7 dana od konverzije) → "Prati potpisivanje"
- Depozit vraćen → nova akcija za finansije

Sve ovo se generiše iz `/administracija/podesavanja/zadaci` (podesivi pravilnici).

### 9.2. Notifikacije

Zvono gore desno pokazuje broj nepročitanih. Otvara dropdown; klik na notifikaciju vodi na relevantnu stranicu.

**Pun pregled:** `/obavestenja` — sve notifikacije po kategorijama (`REZERVACIJA`, `PRODAJA`, `UPLATA`, `AGENCIJA`, `PROVIZIJA`, `NAPLATA`, `SISTEM`).

Notifikacije se šalju istovremeno kao **email + in-app** (kanal se određuje po tipu događaja i podešavanjima korisnika).

**Podešavanja notifikacija** — `/podesavanja/notifikacije` (u profilu). Svaki korisnik može isključiti:
- Konkretne kategorije za email
- "Ne šalji notifikacije van radnog vremena"

---

## 10. Dokumenti

**Sidebar → Dokumenti** (`/dokumenti`) — centralizovani repozitorijum.

### 10.1. Vezivanje dokumenata

Svaki dokument može biti vezan za:
- Projekat
- Jedinicu
- Kupca
- Rezervaciju
- Prodaju
- Agenciju

Filter dokumenata je po vezi (npr. "svi dokumenti za projekat X").

### 10.2. Tipovi

- **UGOVOR** — kupoprodajni, aneksi
- **LIČNA_DOKUMENTA** — kopija LK, pasoša (GDPR — brišu se pri anonimizaciji kupca)
- **PLAN** — nacrti, tlocrti
- **SLIKA** — foto-galerije jedinica
- **RAČUN** — fakture, uplatnice
- **DRUGO**

### 10.3. Upload

- Drag & drop u zonu → sistem detektuje tip po ekstenziji
- Podržani formati: PDF, DOCX, PNG, JPG, XLSX
- Maksimum 20 MB po fajlu (podesivo)

### 10.4. Sigurnost

- Fajlovi se skladište u S3/local (podešeno preko `STORAGE_PROVIDER`)
- Pristup preko **signed URL-a** koji ističe za 15 minuta
- RBAC gate: samo osobe sa `document.read` dozvolom nad tim entitetom vide fajl

---

## 11. Izveštaji

**Sidebar → Izveštaji** (`/izvestaji`) — sekcije:

| Izveštaj | Ruta | Šta prikazuje |
| --- | --- | --- |
| Prodaje | `/izvestaji/prodaje` | Broj i vrednost prodaja po mesecu, projektu, prodavcu, statusu |
| Zalihe | `/izvestaji/zalihe` | Ukupno / dostupno / rezervisano / prodato po projektu i tipu |
| Uplate | `/izvestaji/uplate` | Ukupno naplaćeno, dospelo, otvoreno, prosečno kašnjenje, top kupci |
| Rezervacije | `/izvestaji/rezervacije` | Konverzija (koliko % → prodaja), prosečno trajanje, top prodavci |
| Kupci | `/izvestaji/kupci` | Izvor kupaca, demografija, ROI po kanalu marketinga |
| Agencije | `/izvestaji/agencije` | Prodaje po agenciji, provizije, top agenti |

**Za sve:**
- Filter: datumski opseg, projekat, valuta
- **Eksport** u CSV / XLSX
- **Deljenje** — link koji zadržava filter za tim (zahteva `report.read` dozvolu)

---

## 12. Podešavanja tenant-a

**Sidebar → Podešavanja** (`/podesavanja`) — dostupno svim ulogama sa različitim prikazima.

### 12.1. Organizacija (`/podesavanja/organizacija`)

- Naziv, PIB, adresa, kontakt (koristi se na fakturama)
- Logo — upload PNG za PDF ugovore
- Bankarski računi

### 12.2. Korisnici (`/podesavanja/korisnici`)

- Lista svih članova tenant-a
- **"Pozovi člana"** — email pozivnica sa izborom uloge
- **"Promeni ulogu"** — samo vlasnik
- **"Ukloni člana"** — uklanja pristup (audit-trail očuvan)

### 12.3. Pretplata (`/podesavanja/pretplata`)

- Trenutni plan (Basic / Pro / Enterprise)
- Datum sledeće naplate
- Cikl (mesečno / kvartalno / godišnje)
- **Skoro fakture** (tabela zadnjih 5)
- **"Ažuriraj karticu"** / **"Otkazi plan"**

### 12.4. Fakture (`/podesavanja/fakture`)

- Sve tvoje fakture (za tvoj SaaS plan)
- Klik za PDF download
- Detalj (`/podesavanja/fakture/{id}`) — stavke + IPS QR + status uplate

---

## 13. Super-admin operativa

Vidljivo samo `SUPER_ADMIN` ulozi. Sidebar → **Administracija** (`/administracija`).

### 13.1. Organizacije (`/administracija/organizacije`)

- Lista svih tenant-a
- Klik na org → detalj sa tabovima:
  - **Pregled** — osnovne info, plan, članovi
  - **Naplata** (`/administracija/organizacije/{id}/naplata`) — sve fakture, uplate, provizije, akcije nad pretplatom (aktiviraj/promeni plan/pauziraj/otkaži)
  - **Timeline** — sve promene statusa

**"Nova organizacija"** (`/administracija/organizacije/nova`) — ručno kreiranje tenant-a bez čekanja na signup.

### 13.2. Korisnici platforme (`/administracija/korisnici`)

- Svi korisnici svih tenant-a
- Filter po ulozi, tenant-u, statusu

**Impersonate:**

- Klik na korisnika → **"Uloguj se kao ovaj korisnik"** — otvara novu sesiju u tenant-u tog korisnika
- Trakica gore ("Impersonating: Marko Marković — Odjavi se") — jasno je vidljivo
- Sve akcije se audituju sa `impersonatedBy` metapodatkom
- **"Stop Impersonating"** vraća te u super-admin sesiju

Koristi se za support, debugging, i verifikaciju bug-ova.

### 13.3. Planovi (`/administracija/planovi`)

- Pun CRUD SaaS planova sa iz UI-ja: lista → **Novi plan**, klik **Izmeni** za detalj, **Opasna zona** na kraju forme (arhiviraj / vrati u upotrebu / trajno obriši).
- Šifra plana je zaključana posle kreiranja (istorijske reference).
- Cena po ciklusu (mesečno / kvartalno / polugodišnje / godišnje) — prazne vrednosti se autopopunjavaju kao `N × mesečna`.
- Jednokratna naknada za onboarding, valuta, kvote (projekti/jedinice/članovi/agencije), probni period, `active`/`publiclyAvailable`/`recommended` flag-ovi.
- Trajno brisanje je moguće samo dok plan nema referencu (pretplata / faktura). U suprotnom se koristi **Arhiviraj**.
- Detaljno u [`docs/roles-and-plans.md`](./roles-and-plans.md#2-uređivanje-saas-planova).

### 13.3a. Role i dozvole (`/administracija/role`)

- Padajući meni sa svim rolama (`INVESTOR_*`, `SALES_*`, `FINANCE`, `AGENCY_*`, `SUPER_ADMIN`).
- Matrix tabela: red = dozvola `resurs.akcija`, kolone = Podrazumevano / Trenutno / Akcija.
- Super-admin može da uključi/isključi bilo koju dozvolu za bilo koju rolu bez izmene koda.
- Sve izmene se pamte u `role_permission_override` i mogu se u svakom trenutku vratiti klikom **Podrazumevano** (po redu) ili **Vrati rolu na podrazumevano** (za celu rolu).
- SUPER_ADMIN uvek zadržava `platform.*` dozvole — ne mogu se ukloniti (bezbednosna garancija).
- Sve promene ostavljaju audit trag (`role_override.set` / `role_override.reset`).
- Detaljno u [`docs/roles-and-plans.md`](./roles-and-plans.md#1-uređivanje-rola-i-dozvola).

### 13.4. Naplata (`/administracija/naplata`)

Ceo billing modul — pogledaj sekciju [15](#15-saas-naplata-billing-modul).

### 13.5. Revizija (`/administracija/revizija`)

Audit-log preko svih tenant-a:

- Filter po datumu, tenant-u, akciji, korisniku, entitetu
- Prikazuje `previousValues` → `newValues` diff
- Immutable — nema brisanja

---

## 14. Automatizacija (cron jobs)

Cron-ovi se pokreću preko `/api/v1/cron/run/{name}` sa `CRON_SECRET` u header-u.

### 14.1. Registrovani cron-ovi

| Cron | Preporučeno vreme | Šta radi |
| --- | --- | --- |
| `expire-reservations` | Dnevno 08:00 | Aktivne rezervacije čiji `expiresAt < now` → `ISTEKLA` |
| `reservation-reminders` | Dnevno 09:00 | Email podsetnik kupcima kojima rezervacija ističe za 2 dana |
| `overdue-installments` | Dnevno 09:00 | Rate koje su dospele → `KAŠNJENJE` + email podsetnici |
| `notify-trials-expiring` | Dnevno 10:00 | Tenanti čiji trial ističe za 3 dana → email + notifikacija |
| `billing.generate-invoices` | Dnevno 09:00 | Generiše SaaS fakture za sve pretplate |
| `billing.send-invoices` | Dnevno 09:15 | Šalje izdatane fakture kupcima (email + IPS QR PDF) |
| `billing.reminders` | Dnevno 09:30 | Podsetnike za neplaćene fakture |
| `billing.overdue` | Dnevno 09:45 | Pretplate: `PAYMENT_DUE` → `PAST_DUE` → `RESTRICTED` → `SUSPENDED` |
| `billing.extend-subscriptions` | Dnevno 10:00 | Produžava period pretplate nakon plaćene fakture |
| `billing.sync-sef` | Dnevno 10:15 | Šalje / retry-uje neuspele SEF submisije |
| `billing.match-payments` | Dnevno 10:30 | Rematch neresolvani transakcija bankarskih izvoda |

### 14.2. Ručno pokretanje

Super-admin: **`/administracija/naplata/automatizacija`** — svaki cron ima dugme **"Pokreni odmah"**. Rezultat + audit trag su vidljivi u sekciji "Skoro pokretanja".

### 14.3. Concurrency (bez dvostrukog izvršavanja)

Svaki cron akvire lock na `BillingJobRun` tabeli (partial unique index na `type WHERE status='RUNNING'`). Ako pokušaš da pokreneš isti cron dvaput istovremeno, drugi dobija `alreadyRunning: true` i tiho izlazi.

---

## 15. SaaS naplata (billing modul)

Ceo modul za naplatu tvojih klijenata za korišćenje PropertyDesk-a. Detaljna dokumentacija u [`docs/billing/`](./billing/).

### 15.1. Glavne stranice (super-admin)

`/administracija/naplata`:

| Sekcija | Ruta | Šta radi |
| --- | --- | --- |
| Dashboard | `/administracija/naplata` | KPI, otvorene fakture, red za pregled |
| Podešavanja | `/administracija/naplata/podesavanja` | Master prekidač, auto-generisanje, cikli, format broja fakture |
| Automatizacija | `/administracija/naplata/automatizacija` | 7 cron-ova sa "Pokreni odmah" |
| Profil izdavaoca | `/administracija/naplata/profil-firme` | Podaci firme na fakturama, SEF API ključ |
| Poslovni računi | `/administracija/naplata/racuni` | IBAN + model plaćanja |
| Planovi | `/administracija/naplata/planovi` | Cene po cikli (mesečno/kvartalno/…) |
| Fakture | `/administracija/naplata/fakture` | Sve fakture svih tenant-a |
| Uplate | `/administracija/naplata/uplate` | Sve SaaS uplate |
| Bankarski izvodi | `/administracija/naplata/izvodi` | CSV/XLSX upload + red za pregled |
| SEF | `/administracija/naplata/sef` | Elektronsko fakturisanje (Sistem Elektronskih Faktura Srbije) |
| Šabloni email-ova | `/administracija/naplata/sabloni` | 14 gotovih šablona (izdavanje, podsetnik, prekid) |
| Podsetnici | `/administracija/naplata/podsjetnici` | Raspored slanja podsetnika |

### 15.2. Ključne funkcionalnosti

- **Automatska generacija faktura** — na osnovu ciklusa pretplate
- **Automatsko slanje** — email + PDF sa IPS QR kodom
- **FIFO alokacija** — uplate se raspoređuju po najstarijim fakturama
- **Postpaid transitions** — automatsko degradiranje pretplate ako se ne plati (podesivo)
- **SEF integracija** — automatsko slanje u državni sistem (stub trenutno, produkcijski gateway u sledećem release-u)
- **Bankarski izvodi** — CSV/XLSX upload, 5-signal matcher automatski povezuje uplate sa fakturama

Više detalja u [`docs/billing/README.md`](./billing/README.md).

---

## 16. Mobilna upotreba

App je PWA (Progressive Web App) — može se instalirati na telefon:

- Android/Chrome: "Add to Home Screen"
- iOS/Safari: "Add to Home Screen"

Nakon instalacije radi kao native app (fullscreen, ikonica).

### 16.1. Mobilna navigacija

Na uređajima < 768px sidebar postaje **bottom nav bar** sa 5 ključnih ikonica + "More" dugme koje otvara punu listu (`/more`).

### 16.2. Brze akcije

Iz mobilnog UX-a najčešće akcije su optimizovane za dodir:

- Klik "+" na dugme (fixed bottom-right) → "Nova rezervacija" / "Nova uplata" / "Novi kupac"
- Swipe-left na jedinici u listi → "Rezerviši"
- Swipe-left na zadatku → "Označi kao završen"

### 16.3. Offline behavior

Osnovne stranice su cached preko service worker-a. Bez interneta:
- Možeš čitati zadnje viđene liste
- Kreiranje entiteta je blokirano (zahteva sinhronizaciju)
- Snap-toast obaveštava korisnika o stanju konekcije

---

## 17. Uloge i dozvole — brzi vodič

### 17.1. Investor uloge

| Uloga | Šta vidi | Šta može |
| --- | --- | --- |
| `INVESTOR_OWNER` | Sve | Sve, uključujući brisanje projekta i naplata |
| `INVESTOR_ADMIN` | Sve | Sve osim brisanja tenant-a i finansijskih akcija |
| `SALES_MANAGER` | Sve prodaje + zalihe | Kreira rezervacije, prodaje, upravlja timom |
| `SALES_AGENT` | Sopstvene prodaje | Kreira rezervacije, unosi kupce, prati svoje ugovore |
| `FINANCE` | Sve uplate, plan otplate | Zabeležava uplate, generiše fakture, izveštaji |
| `INVESTOR_VIEWER` | Sve read-only | Čita sve, ne menja ništa |

### 17.2. Agencijske uloge

| Uloga | Šta vidi | Šta može |
| --- | --- | --- |
| `AGENCY_OWNER` | Sve u tenant-u agencije | Sve, uključujući upravljanje agentima i konekcijama |
| `AGENCY_ADMIN` | Sve | Kao owner osim brisanja tenant-a |
| `AGENCY_AGENT` | Svoje kupce + ponuda | Registruje kupce, rezerviše, kreira ugovore |
| `AGENCY_VIEWER` | Sve read-only | Samo čitanje |

### 17.3. Platformske uloge

| Uloga | Ko je | Dozvole |
| --- | --- | --- |
| `SUPER_ADMIN` | Ti (vlasnik platforme) | Sve, plus impersonate, plus billing, plus admin panel |

### 17.4. Kako se dodjeljuje uloga

- Novi član — pri pozivanju biraš ulogu
- Postojeći član — vlasnik može promeniti ulogu iz `/podesavanja/korisnici`

RBAC matrica se testira sa 16 Vitest scenarija (`src/components/app/navigation.test.ts`) da nijedna uloga nikad ne vidi ništa što nije predviđeno.

---

## 18. Rešavanje čestih problema

### 18.1. "Greška u komunikaciji sa serverom"

- Otvori DevTools → Console — potraži `[apiClient] fetch failed`
- Ako vidiš `TypeError: Illegal invocation` → restart dev servera i osveži tab (Ctrl+F5)
- Ako vidiš CORS error → proveri da otvaraš aplikaciju na `http://localhost:3000` (ne 192.168.x.x)

### 18.2. "Cannot read properties of undefined (reading 'findFirst')"

Prisma Client je stariji od schema-e:

```bash
pnpm prisma generate
```

Zatim restart dev servera (Ctrl+C + `pnpm dev`).

### 18.3. Login ne radi / stalno preusmerava

- Proveri `BETTER_AUTH_URL` u `.env` — mora tačno da odgovara URL-u na kome je otvorena aplikacija
- Ako si menjao `BETTER_AUTH_SECRET`, obriši `session` kolačiće u browser-u

### 18.4. Migracija ne prolazi

```bash
pnpm prisma migrate status    # vidiš koje su primenjene
pnpm prisma migrate resolve --applied <migration-name>   # markiraj kao primenjenu
```

### 18.5. Seed ne radi

- Proveri da li `.env` ima `SEED_SUPER_ADMIN_EMAIL` i `SEED_SUPER_ADMIN_PASSWORD`
- Seed odbija da radi u `NODE_ENV=production` — postavi na `development`

### 18.6. Impersonate ne radi

- Proveri da super-admin ima grant `user.impersonate` u `src/server/permissions/access-control.ts`
- Ako je stariji session cookie — odjavi se i uloguj ponovo

---

## Rezime toka podataka

```
Projekat → Jedinice → Kupac → Rezervacija ─► (konverzija) ─► Prodaja
                                              ↓                 ↓
                                              └► Zaštita        ├─ Plan otplate
                                                 agencije       │      ↓
                                                    ↓           │  Uplate (FIFO alokacija)
                                                 Provizija ◄────┘      ↓
                                                    ↓            Prodaja ZAVRŠENA
                                                 Isplata
```

Svaki prelaz:
- **Transakcionalan** — sve promene u jednoj DB transakciji
- **Auditovan** — `AuditLog` beleži staru → novu vrednost
- **Notificiran** — email + in-app zainteresovanim stranama
- **Idempotent** — retry uvek pokazuje isti rezultat

---

## Dodatne reference

- [`docs/business-rules.md`](./business-rules.md) — poslovna pravila (rezervacije, prodaje, provizije)
- [`docs/permissions.md`](./permissions.md) — kompletna RBAC matrica
- [`docs/cron-jobs.md`](./cron-jobs.md) — cron scheduling
- [`docs/api.md`](./api.md) — REST API endpoints
- [`docs/database.md`](./database.md) — schema konvencije
- [`docs/billing/README.md`](./billing/README.md) — billing modul (12 pod-dokumenata)
- [`docs/import-format.md`](./import-format.md) — CSV/XLSX šablon za jedinice
- [`docs/security.md`](./security.md) — sigurnosni posmatrač
- [`docs/backup.md`](./backup.md) — backup strategija
- [`docs/incident-response.md`](./incident-response.md) — kako reagovati na incidente
