# PropertyDesk — Scenario za snimanje demo videa

Praktičan scenario za snimanje **prodajnog demo videa**. Napisan
kao skripta koju držiš pored ekrana dok snimaš: šta pokazuješ,
kojim redom klikneš, šta izgovaraš. Podrazumeva se da ćeš snimati
seed-ovani `investor@propertydesk.test` nalog (v.
[`demo-tok.md`](./demo-tok.md#13-demo-nalozi-posle-prisma-db-seed))
lokalno na `http://localhost:3000` ili na demo instanci.

Postoje tri varijante:

- **A. Glavni demo za investitora** — 10 minuta, pokriva sve ključne
  funkcije. Ovo je primarni video za landing page.
- **B. Kratki demo za agenciju** — 4 minuta, fokus na agencijski
  portal, referral kod i online rezervaciju.
- **C. Feature spotlight** — 60–90 sekundi po funkciji za social
  media (LinkedIn / Instagram Reels). Set od 6 spotova.

Svi scenariji rade na istoj seed-ovanoj bazi. Reset između snimanja:
`pnpm prisma migrate reset --force && pnpm prisma db seed`.

---

## Pre snimanja — priprema

### Tehnička

- **Rezolucija ekrana** 1920×1080; browser prozor 1440×900 sa
  levom-desnom marginom (izgleda profesionalnije nego full-screen).
- **Zoom** browsera **125%** — tekst mora da bude čitljiv na mobilnom.
- **Uskladi timezone** — `Europe/Belgrade`. Datumi u seed-u su
  vezani za trenutno vreme; ako je "danas" ponedeljak, kalendar
  pokazuje ponedeljak.
- **Isključi notifikacije** OS-a i browser tabovi bookmark bara.
- Otvori u tabovima pre snimanja: dashboard, projekti, kupci, javna
  ponuda (`/p/[token]` — imaš jedan u seed-u), monitoring. Prebacuj
  se `Ctrl+Tab`, ne kucajući URL-ove uživo.
- Screen recording: **OBS Studio** (besplatan, kvalitetan) ili
  Cursor's built-in ako radiš tutorijal za developere.

### Sadržajna

- Prijavi se pre snimanja i **osveži dashboard** — brojevi treba da
  budu "sazreli". Prazan dashboard izgleda kao skica.
- Prošetaj scenario **suvo dva puta** — otprilike znaš gde miš mora
  da bude na svakoj sekundi.
- Napravi **beleške sa cifrom** — koliko traje svaka sekcija; ako
  probiješ 15% preko planiranog vremena, video treba da se skrati
  u post-produkciji.
- **Nikad** ne pokazuj production podatke uživo. Uvek seed / demo
  organizacija.

### Off-camera glas

- Sve tekst-u-navodnicima ispod je **skripta za voice-over**, ne
  za on-screen podnaslove. Piše se u sr-Latn, prati brzinu
  ekranskih akcija.
- Cilj: **160–180 reči/min** — dovoljno da se svako slovo čuje.
- Alternativa: snimi bez glasa, ubaci podnaslove i muziku u
  Descript / DaVinci Resolve.

---

## A. Glavni demo za investitora — 10 minuta

**Naslov videa:** "PropertyDesk za investitore — od projekta do
provizije u 10 minuta"

**Ciljna publika:** vlasnik / prodajni menadžer investitora sa 1–5
projekata koji radi u Excelu.

**Ključne poruke (mora da čujem sve tri u 10 min):**
1. Nikad više dvostruko rezervisan stan.
2. Automatski računa PDV, ugovor, plan otplate, IPS QR.
3. Agencije rade u istom sistemu — provizija se sama zna.

### Struktura (chapter markers za YouTube)

| Vreme | Sekcija | Šta pokazuješ |
|-------|---------|---------------|
| 0:00 | Otvaranje | Landing page, brend, obećanje |
| 0:20 | Dashboard | KPI kartice, grafikoni |
| 1:00 | Projekti + jedinice | Kreiranje projekta, uvoz jedinica |
| 2:30 | Kupci i KYC | Novi kupac, JMBG, KYC checklist |
| 3:30 | Interaktivni floor plan | Klik na poligon → jedinica |
| 4:00 | Online rezervacija | Public share, IPS QR kapara |
| 5:30 | Prodaja + generator ugovora | Konverzija, PDF ugovor |
| 7:00 | Plan otplate i uplate | Šabloni, FIFO alokacija |
| 8:00 | Agencije i referral | Konekcija, provizija, referral |
| 9:00 | Cash-flow i P&L | Izveštaji, marža po projektu |
| 9:40 | Zatvaranje | Poziv na akciju |

---

### 0:00–0:20 · Otvaranje

**Ekran:** Otvori `https://propertydesk.app` (landing page). Kamera
staje na hero sekciji.

**Voice-over:**
> "PropertyDesk je platforma za investitore koji prodaju novogradnju.
> Za deset minuta pokazaću vam kako radimo bez Excela, bez izgubljenih
> stanova i sa automatskim provizijama za agencije koje sarađuju sa
> vama."

**Kadar:** 3 sekunde na hero sliku, zatim scroll nadole na
"Serbia-native" sekciju, zaustavi 2 sekunde.

**Prelazak:** Klik na "Prijava" gore desno. *(U seed-u je login
otvoren; ako je landing zatvoren za "Prijava biće dostupna nakon
lansiranja", direktno idi na `http://localhost:3000/sign-in`.)*

---

### 0:20–1:00 · Dashboard (kontrolna tabla)

**Ekran:** Uloguj se kao `investor-owner@propertydesk.test /
PropertyDesk!2026`. Otvara se `/dashboard`.

**Voice-over:**
> "Ovo je kontrolna tabla investitora. Na jednom pogledu:
> **ukupna vrednost 87 jedinica** u dva projekta,
> **ugovoreno 3.2 miliona evra**, **naplaćeno 1.9 miliona**,
> **preostalo 1.3 miliona**. Trakica ispod pokazuje da smo na
> **58 posto naplate**. Grafikon dole levo je funnel:
> od 84 lead-a, 41 rezervacija, 23 ugovora — konverzija
> **48 posto**. Ovo je slika koja se u Excelu ne dobija."

**Kadar:**
- 5s statično na hero KPI (ukupna vrednost / ugovoreno / naplaćeno / preostalo).
- 5s hover na funnel grafikon — tool tip se pojavljuje.
- 5s hover na trend liniju "Mesečne prodaje" — treba tri meseca podataka.
- 5s statično na "Zadaci danas" listu.

**Klik:** U sidebar-u → **Projekti**.

---

### 1:00–2:30 · Projekti i uvoz jedinica

**Ekran:** `/projekti` — lista sa 2 projekta iz seed-a.

**Voice-over:**
> "Ovde je lista svih projekata. Kliknimo na 'Sunny Hills'."

**Klik:** Red za `Sunny Hills` → otvara se `/projekti/{id}`.

**Voice-over (dok se učitava):**
> "Svaki projekat ima punu hijerarhiju: objekat, ulaz, sprat, jedinica.
> Ovaj projekat ima jednu zgradu, dva ulaza, četiri sprata, ukupno
> 42 jedinice. Statistika je live — čim se jedinica proda, ovi
> brojevi se ažuriraju."

**Kadar:**
- 3s na KPI trakicu projekta.
- Scroll dole do sekcije **Struktura projekta**, klik na "Ulaz A" da
  se raširi, klik na "1. sprat".
- Skroluj do **Jedinice** taba, pokaži listu.

**Klik:** Dugme **Uvoz jedinica** (gore desno) → otvara se
`/projekti/{id}/uvoz`.

**Voice-over:**
> "Ako imate Excel sa jedinicama, samo ga uploadujete. Sistem ima
> šablon koji preuzimate u prvom koraku, drugi korak je upload,
> treći je preview: pokazuje šta će biti kreirano, šta ažurirano, šta
> ima grešku. Ništa se ne snima dok ne kliknete 'Potvrdi'."

**Kadar:** 5s na wizard — statičan.

**Klik:** Back button u browseru → nazad na `/projekti/{id}`.

**Klik:** Dugme **Duplikat projekta** (dropdown gore desno).

**Voice-over:**
> "Ako radite sličan projekat na drugoj parceli, jedan klik i cela
> struktura — objekti, ulazi, spratovi, jedinice — se prekopiraju,
> a statusi se resetuju na 'Planirana'. Nema kopiranja Excel tabele
> i ručnog preimenovanja."

**Kadar:** 3s na dijalog **Duplikat projekta** sa opcijama
(kopiraj cene / floor plans). Zatvori bez potvrde.

---

### 2:30–3:30 · Kupci i KYC

**Klik:** Sidebar → **Kupci**.

**Voice-over:**
> "CRM strana — svi kupci na jednom mestu. Uneću novog."

**Klik:** **Novi kupac** → forma.

**Šta unosiš:** ime *Petar*, prezime *Petrović*, telefon
*+381 60 111 22 33*, email *petar@primer.rs*.

**Voice-over dok kucaš:**
> "Sistem automatski detektuje duplikate po telefonu i mejlu — pre
> nego što snimim, već me pita da li je ovo Petar iz prošlog meseca.
> Ovo štedi tim od dvostrukog unošenja istog kupca."

**Klik:** *Snimi* → otvara se `/kupci/{id}`.

**Klik:** Tab **KYC**.

**Voice-over:**
> "Za pravnu jedinicu unosim JMBG, broj lične karte, adresu.
> Za pravno lice — PIB i naziv firme. Checklist na desnoj strani
> je operatorska: ima li LK prednja, LK zadnja, dokaz adrese, i za
> pravno lice — poresku potvrdu. Sistem **blokira generisanje ugovora
> dok KYC nije kompletan** — ne možete slučajno da pošaljete ugovor
> bez validnog dokumenta."

**Kadar:**
- 5s na entity toggle → prebaci na *Pravno lice* pa nazad na
  *Fizičko lice*.
- Klik na sve 4 checkbox-e da vidiš kako se pale.
- 3s statično na *Pregled kompletnosti* dugmić kad su svi upaljeni.

**Klik:** Snimi KYC.

---

### 3:30–4:00 · Interaktivni floor plan

**Klik:** Sidebar → **Projekti** → `Sunny Hills` → **Struktura**
→ raširi *Ulaz A* → klik na **1. sprat**.

**Voice-over:**
> "Za svaki sprat možete da uploadujete tlocrt. Poligoni koje unesete
> se boje po statusu jedinice: zeleno je dostupno, žuto rezervisano,
> crveno prodato. Kupac ili agent klikne na poligon i odmah dobija
> detalje jedinice."

**Kadar:** 5s na floor plan sa poligonima. Ako je *Sunny Hills*
seed uneo poligone (proveri pre snimanja), klikni na jedan zeleni
poligon → otvara se `/jedinice/{id}`.

**Klik:** Back → nazad na `/projekti/{id}`.

---

### 4:00–5:30 · Online rezervacija sa IPS QR kaparom

**Ovaj deo je zvezda demoa** — pokazuje javnu stranu, IPS QR i email.

**Klik:** Sidebar → **Jedinice** → prvi red sa statusom `DOSTUPNA`
→ klik.

**Klik:** Dugme **Podeli sa kupcem** (panel na desnoj strani).

**Voice-over:**
> "Za svaku jedinicu mogu da generišem link koji se šalje kupcu bez
> logovanja. Ovo je token sa 192 bita entropije — praktično nemoguć
> za pogađanje. Uz to biram: da li se vidi cena, da li ima expiry,
> da li se link opoziva."

**Klik:** Generiši token → dijalog pokaže link `https://demo.propertydesk.app/p/xy…` (kopira u clipboard).

**Klik:** Otvori link u **novom incognito tabu** (Ctrl+Shift+N).

**Voice-over:**
> "Ovako to vidi kupac. Bez logovanja. Brend investitora, foto
> galerija, floor plan, opis. Dole — dugme 'Rezerviši online'."

**Kadar:** 5s scroll kroz javnu stranu.

**Klik:** **Rezerviši online** → forma se otvara u modalu.

**Šta unosiš:** ime *Marko*, prezime *Marković*, telefon
*+381 63 999 88 77*, email *marko@primer.rs*, kapara *500 EUR*.

**Klik:** Snimi.

**Voice-over:**
> "Server generiše IPS QR za kaparu, poziv na broj sa mod-97 kontrolnim
> ciframa, i šalje kupcu email sa QR-om. Kupac uzima Halkom / Bank
> Intesa aplikaciju, skenira QR, potvrdi, gotovo. Nema prekucavanja
> IBAN-a, nema pogrešnog poziva na broj, nema 'nismo videli vaše
> uplate'."

**Kadar:** 8s na "Zahvaljujemo" ekran sa IPS QR PNG-om. Uveličaj QR
na sekund da se vidi da je čitljiv (mora da bude — zapravo je
validan).

**Prelazak:** Zatvori incognito tab. Nazad u glavni prozor.

**Klik:** Sidebar → **Rezervacije** → prekidač **Zahtevi** (tab).

**Voice-over:**
> "Investitor ovde vidi sve online zahteve. Kliknem *Potvrdi* kada
> vidim uplatu u banci — sistem automatski kreira pravu rezervaciju
> i kupca, jedinica prelazi u rezervisano stanje."

**Klik:** Prvi zahtev → drawer se otvara → klik **Potvrdi**.

---

### 5:30–7:00 · Prodaja i generator ugovora

**Klik:** Rezervacija koju smo upravo potvrdili → **Konvertuj u
prodaju**.

**Voice-over:**
> "Kada kupac potpiše, konvertujem rezervaciju u prodaju. Ugovorena
> cena, popust, konačna cena. Ovde biram i PDV režim: **10 posto**
> za novogradnju, **2.5 posto** za sekundarno tržište. Sistem
> automatski računa iznos i propaguje ga u ugovor."

**Šta biraš u wizardu:**
- Datum ugovora: danas
- Popust: 2.000 EUR
- VAT mod: `NEW_BUILD_10`
- Način plaćanja: `PLAN_OTPLATE`

**Klik:** Sledeći → korak plan otplate.

**Voice-over:**
> "Umesto da ručno kucam rate, biram šablon '10-40-40-10' koji sam
> ranije napravio."

**Klik:** **Primeni šablon** → dropdown → *10-40-40-10 (novogradnja)* → OK.

**Kadar:** 5s na tabelu popunjenih rata.

**Klik:** **Potvrdi**.

**Voice-over:**
> "Prodaja je kreirana. Jedinica prelazi u 'Prodato', rezervacija
> u 'Konvertovana', a sada — generišem ugovor."

**Klik:** U detalju prodaje → kartica **Ugovor** → **Generiši**.

**Šta biraš:** kind `CONTRACT`, template *Ugovor o kupoprodaji — novogradnja*.

**Voice-over:**
> "Šabloni ugovora žive u Podešavanjima. Imaju placeholder-e kao
> `{{buyer.jmbg}}`, `{{sale.finalPrice}}`, `{{plan.installments}}`.
> Sistem ih zamenjuje pravim vrednostima, renderuje kao PDF i kači
> ga na prodaju. Status prelazi 'Generisan → Poslat → Potpisan' sa
> vremenskim pečatima."

**Klik:** **Generiši** → sačekaj 3s → PDF se otvara u novom tabu.

**Kadar:** 5s na PDF (scroll do dela sa iznosima i planom otplate).

**Prelazak:** Nazad na detalj prodaje.

**Klik:** Dugme **Označi kao poslato** → status ide *SENT*.

---

### 7:00–8:00 · Plan otplate, uplate i FIFO

**Klik:** Tab **Uplate** u detalju prodaje → **Evidentiraj uplatu**.

**Šta unosiš:** iznos *10.000 EUR*, način *BANKARSKI_TRANSFER*,
referenca *Izvod #2026-042*, napomena *Kapara po ugovoru*.

**Klik:** Snimi.

**Voice-over:**
> "Ovih 10.000 evra sistem automatski raspoređuje po najstarijoj
> otvorenoj rati — FIFO alokacija. Ako uplata prelazi ratu, ostatak
> ide na sledeću. Kupac ne mora da zna da postoji plan otplate, tim
> ne mora da matematiku ručno radi."

**Kadar:** 5s na tabelu rata sa označenom prvom kao "Uplaćena", i
progres bar prodaje popunjen 10%.

**Voice-over dodatno:**
> "Kad rata dospe, cron job dnevno u 9 ujutru pomeri je u kašnjenje
> i pošalje kupcu email podsetnik — 3 dana pre, na dan, 7 dana
> posle. Bez ručnog praćenja."

---

### 8:00–9:00 · Agencije i referral kod

**Klik:** Sidebar → **Agencije** → dropdown investitora → *Sve
konekcije*.

**Voice-over:**
> "Ovde vidim sve agencije koje sarađuju sa mnom. Za svaku konekciju
> mogu da definišem provizijsko pravilo — fiksno ili procentualno —
> po projektu, po tipu jedinice, po pragu prodaje. Sistem sam bira
> najspecifičnije pravilo."

**Klik:** Prva agencija → detalj → kartica **Referral kod**.

**Voice-over:**
> "Ovo je feature koji agencije zaista vole. Svaka agencija dobija
> svoj **referral kod** — 8 slova, unique, plus QR kod za marketing.
> Kad kupac dođe preko ovog link-a ili skenira ovaj QR na oglasu,
> cookie se postavlja na 90 dana. Bilo koja rezervacija koju kupac
> pošalje se automatski atribuira agenciji."

**Kadar:** 5s na kod + QR sliku.

**Klik:** Sidebar → **Izveštaji** → **Agencije**.

**Voice-over:**
> "U izveštaju za agencije vidim kolonu 'Preko referral-a' — koliko
> zahteva je došlo preko svake agencije i koliko je zapravo završilo
> u ugovoru. Agencije više ne mole 'da li vam je stigao onaj kupac
> koga sam poslao' — sistem se seća."

---

### 9:00–9:40 · Cash-flow i P&L

**Klik:** Izveštaji → **Uplate**.

**Voice-over:**
> "Cash-flow projekcija na 12 meseci. Sistem gleda sve dospele rate
> u budućnosti minus već uplaćeno i pokazuje mi mesečnu likvidnost."

**Kadar:** 5s na stubove grafikona.

**Klik:** Izveštaji → **Prodaje** → sekcija **Marža po projektu**.

**Voice-over:**
> "P&L po projektu — unosim troškove: zemljište, gradnja, marketing,
> ostalo. Sistem računa prihod minus troškove i pokazuje maržu.
> Za projekat 'Sunny Hills': 3.2 miliona prihod, 2.7 miliona troškovi,
> **marža 470.000 evra, 14.6 posto**. Ovo dobijate uživo, ne krajem
> godine kad kolega u računovodstvu spoji tabele."

---

### 9:40–10:00 · Zatvaranje

**Ekran:** Vrati se na dashboard, kadar na hero KPI-je.

**Voice-over:**
> "PropertyDesk. Investitorski softver napravljen za srpsko tržište —
> IPS QR, SEF, PDV 10 posto, ugovori u PDF-u, KYC za banke, plan
> otplate, provizije za agencije. Sve na jednom mestu.
>
> Rana ponuda za sve koji se prijave do prvog septembra 2026:
> **30 dana besplatno + 50 posto popusta na naredna 3 meseca**.
> Zaključana cena paketa 12 meseci.
>
> Prijavite se na propertydesk.app. Do sledećeg videa."

**Kadar:** 3s na dashboard, fade-out sa logom PropertyDesk-a.

---

## B. Kratki demo za agenciju — 4 minute

**Naslov:** "Kako agencija radi sa PropertyDesk-om — 4 minuta"

**Ciljna publika:** vlasnik butik agencije koja prodaje novogradnju
2–5 investitora paralelno.

**Struktura:**

| Vreme | Šta pokazuješ |
|-------|---------------|
| 0:00–0:20 | Otvaranje: agencija i njen bol (Excel po investitoru) |
| 0:20–1:00 | Login kao `agent@propertydesk.test`, dashboard agenta |
| 1:00–2:00 | Ponuda: projekti investitora, dostupne jedinice, "Rezerviši za kupca" |
| 2:00–2:45 | Referral kod: kopiraj link, QR PNG, share u WhatsApp-u |
| 2:45–3:30 | Moje provizije: lifecycle, snapshot na momentu ugovora |
| 3:30–4:00 | Zatvaranje: prijava do 01.09.2026 |

### 0:00–0:20 · Otvaranje

**Voice-over:**
> "Ako ste agencija koja prodaje novogradnju za više investitora, svaki
> investitor ima svoj Excel, svoju Viber grupu i svoj format cenovnika.
> Za četiri minuta pokazujem drugačiji način rada."

### 0:20–1:00 · Agent dashboard

**Login:** `agent@propertydesk.test / PropertyDesk!2026` →
`/dashboard`.

**Voice-over:**
> "Kao agent vidim samo svoje kupce, svoje rezervacije i svoje
> provizije. Nikad ne vidim kupce drugih agencija, nikad interne
> beleške investitora."

**Kadar:** 5s na KPI kartice: aktivni kupci, moje rezervacije,
provizije `NA_ČEKANJU` i `SPREMNE ZA ISPLATU`.

### 1:00–2:00 · Ponuda i rezervacija

**Klik:** Sidebar → **Ponuda** → prvi projekat u listi.

**Voice-over:**
> "Ovo su projekti za koje mi je investitor odobrio pristup.
> Vidim samo dostupne jedinice — rezervisane su sakrivene da ne
> gubim vreme praveći ponudu kupcu za nešto što je već zauzeto."

**Klik:** Prva dostupna jedinica → **Rezerviši za kupca**.

**Šta unosiš:** izaberi postojećeg kupca *Ana Anić* iz padajuće
liste, kapara *300 EUR*.

**Klik:** Snimi.

**Voice-over:**
> "Rezervacija je odmah vidljiva investitoru, jedinica je zaključana
> na 7 dana. Investitor dobija notifikaciju i vidi da sam ga poslao."

### 2:00–2:45 · Referral kod

**Klik:** Sidebar → **Moji investitori** → prva konekcija → kartica
**Referral kod**.

**Voice-over:**
> "Ovo je moj kod za tog investitora. Kopiram link — ovako izgleda:
> `demo.propertydesk.app/p/projekat/sunny-hills?ref=A1B2C3D4`.
> Šaljem ga u WhatsApp grupu, u Instagram story, u LinkedIn post.
> Svaki kupac koji klikne dobija cookie 90 dana. Kad rezerviše,
> automatski se atribuira meni — čak i ako meni pošalje mejl tek za
> mesec dana."

**Kadar:** 5s na QR PNG i copy-link dugme.

### 2:45–3:30 · Moje provizije

**Klik:** Sidebar → **Moje provizije**.

**Voice-over:**
> "Kada investitor kreira ugovor sa mojim kupcem, moja provizija
> se automatski računa po pravilu koje smo dogovorili. Iznos je
> zaključan u trenutku ugovora — čak i ako investitor kasnije menja
> pravilo, moja provizija se ne menja. Vidim tačno kad prelazi u
> 'Spremna za isplatu' — kad kupac uplati dovoljno."

**Kadar:** 5s na tabelu sa statusima.

### 3:30–4:00 · Zatvaranje

**Voice-over:**
> "Bez više izgubljenih kontakata, bez sporova ko je doveo koga.
> Za sve agencije koje se prijave do prvog septembra: rani pristup,
> naši ćemo vam podesiti pristup investitorima sa kojima već radite.
> propertydesk.app slash za-agencije. Do sledećeg puta."

---

## C. Feature spotlight — 6 mikro-videa (60–90s)

Kratki spotovi za LinkedIn / Instagram Reels / Facebook. Svaki je
**samo jedna funkcija**, sa fokusom na "pre / posle".

### C1. Online rezervacija sa IPS QR (75s)

- 0:00 — Voice-over: "Kupac hoće da rezerviše stan u nedelju uveče.
  Sve zatvoreno. Šta radite?"
- 0:10 — Kadar: incognito tab, javna ponuda jedinice, klik
  "Rezerviši online".
- 0:25 — Forma se popunjava (ubrzano).
- 0:35 — Ekran "Zahvaljujemo, evo IPS QR-a".
- 0:45 — Cut na telefon (over the shoulder) — mobilna banka skenira
  QR, potvrđuje kaparu.
- 1:00 — Cut nazad na investitorski `/rezervacije/zahtevi` — red
  se pojavljuje.
- 1:10 — Voice-over: "Kapara stiže dok spavate. PropertyDesk.app."

### C2. Generator ugovora u PDF-u (60s)

- 0:00 — "Zamenite Word ugovore sa placeholderima koji same rade."
- 0:10 — Prikaz `/podesavanja/ugovori-sabloni` sa listom šablona.
- 0:20 — Klik u šablon, pokaži placeholder-e `{{buyer.jmbg}}` itd.
- 0:35 — Prelazak na `/prodaje/[id]` → **Generiši ugovor**.
- 0:45 — PDF se otvara sa popunjenim JMBG-om, cenom, ratama.
- 0:55 — "Status: Generisan → Poslat → Potpisan. Sve u sistemu."

### C3. Referral kod za agencije (60s)

- 0:00 — "Agencija pita: 'Da li ste dobili onog kupca?'"
- 0:10 — Prikaz **referral kartice** — link + QR.
- 0:20 — Kopira link, cut na WhatsApp — poruka klijentu.
- 0:35 — Cut na `/izvestaji/agencije` sa kolonom "Preko referral-a".
- 0:50 — "Sistem se seća. Vi ne morate."

### C4. Cash-flow projekcija (60s)

- 0:00 — "Koliko para stiže u naredna 3 meseca?"
- 0:10 — Klik na `/izvestaji/uplate` → grafikon "Cash-flow 12
  meseci".
- 0:30 — Hover na stub septembar, tool tip: "Očekivano 380.000 EUR."
- 0:45 — Klik na stub — otvara se lista rata koje čine iznos.
- 0:55 — "Živa slika, ne kvartalni izveštaj."

### C5. KYC za banke (60s)

- 0:00 — "Banka traži JMBG, LK, potvrdu adrese. Vi zaboravite
  jednu."
- 0:10 — `/kupci/[id]` → tab **KYC**, prikaz 4 checkbox-a.
- 0:25 — Toggle svih 4 u zeleno, pojavljuje se "Kompletno".
- 0:35 — Cut na `/prodaje/[id]` → **Generiši ugovor** — dugme je
  aktivno.
- 0:45 — Cut nazad: 3 od 4 upaljeno → dugme onemogućeno sa tooltip-om
  "KYC nije kompletan".
- 0:55 — "Ne možete slučajno da pošaljete ugovor bez papira."

### C6. Duplikat projekta (75s)

- 0:00 — "Drugi projekat, ista struktura zgrade. Kopirate Excel?"
- 0:15 — `/projekti/[id]` → dropdown → **Duplikat**.
- 0:25 — Dijalog sa opcijama, klik "Kopiraj cene".
- 0:40 — Cut na novi projekat — cela hijerarhija je tu, statusi
  `PLANIRANA`.
- 0:55 — Zumiranje na jednu jedinicu — cena je ista, status je
  `PLANIRANA`.
- 1:05 — "Vaše vreme vredi više od Ctrl+C, Ctrl+V."

---

## Post-produkcija

- **Montaža:** Ukloni "mmm" pauze, spoji na cut-ovima. DaVinci Resolve
  ima *"Cut Page"* koja radi ovo poluautomatski.
- **Podnaslovi:** Descript ili Whisper. **Uvek u sr-Latn.**
- **Muzika:** Neutralna corporate loop, `-25 dB` ispod glasa. Epidemic
  Sound ili Artlist.
- **Intro/outro:** 3s logo animacija na početku i kraju. Uvek isti
  logo, isti brand colors (#0EA5E9 primarni).
- **Aspect ratio:**
  - YouTube glavni demo: **16:9**, 1920×1080.
  - LinkedIn: **1:1** ili **16:9**, max 10 min.
  - Instagram Reels / TikTok: **9:16**, max 90s.
- **Thumbnail:** krupno lice + jedna reč ("REZERVIŠI", "PDV", "IPS QR")
  — YouTube CTR raste 40% sa licem.
- **Chapter markers:** Uvek dodati u YouTube opisu — YouTube ih čita
  automatski i pravi timeline.

## Šta NE snimati

- **Nikad** produkcijske podatke — samo demo tenant / seed baza.
- **Nikad** email adrese pravih ljudi (koristi `@primer.rs` domen).
- **Nikad** deo super-admin panela u prodajnom demou — deluje
  "nevidljivo za mene" i zbunjuje kupca.
- **Nikad** developerske alate (DevTools, DB konzola) — ne pomažu
  investitoru koji uči proizvod.
- **Nikad** monolog o tehnologiji (Next.js, Postgres). Prodavcu ne
  interesuje, developeru se ne prodaje.

## Provera pre publikovanja

- [ ] Snimak proslušan na slušalicama i na zvučniku telefona
  (mora da bude jasan na oba).
- [ ] Podnaslovi provereni — nema "propteydesk" ili "IPS QR" umesto
  ispravnih reči.
- [ ] Chapter markeri postavljeni u YouTube opisu.
- [ ] Link ka `propertydesk.app` u opisu videa.
- [ ] Thumbnail A/B test spreman (2 varijante) — publikuj prvu,
  ako CTR < 4% posle 48h zameni drugom.
- [ ] Push u lead-form: kada kupac dođe sa `?utm_source=video`,
  označi ga u `AgencyBuyerRegistration.notes`.

---

## Reference

- Feature katalog: [`funkcionalnosti.md`](./funkcionalnosti.md).
- Detaljan operativni tok: [`demo-tok.md`](./demo-tok.md).
- Ciljne grupe / GTM: [`ciljne-grupe.md`](./ciljne-grupe.md).
- Faza 8 features (za pominjanje u demou):
  [`reservation-requests.md`](./reservation-requests.md),
  [`sale-contracts.md`](./sale-contracts.md),
  [`kyc.md`](./kyc.md),
  [`microsite.md`](./microsite.md),
  [`referral.md`](./referral.md),
  [`monitoring.md`](./monitoring.md).
