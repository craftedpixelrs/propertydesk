# ClickUp — korak po korak (sada)

Radi redom. Ne preskači 1–4 pre importa, inače statusi i polja
pucaju. Fajlovi su u `d:\propertydesk\docs\clickup\`.

---

## 0. Šta ti treba otvoreno

1. Browser: [https://app.clickup.com](https://app.clickup.com) (ulogovan).
2. Explorer: `d:\propertydesk\docs\clickup\`
   - `leads.csv`
   - `ritam.csv`
   - `onboarding-sablon.csv`
   - `features.csv`
3. Ovaj fajl pored.

Vreme: ~25–40 min prvi put.

---

## 1. Novi Space (prazan, bez templejta)

1. Levo, pored **Spaces**, klikni **+**.
2. **Create new Space** (ili **Add Space**).
3. Ime: `PropertyDesk`.
4. **Start from scratch** / **Everything** — **ne** biraj Sales
   templejt (donese tuđe statuse).
5. Click **Create** / **Next** do kraja. Boja po želji.
6. Ako ClickUp napravi default listu `List` u folderu — obriši je
   (desni klik → Delete) kad napraviš prave dole.

---

## 2. Četiri foldera

U Space-u `PropertyDesk`, levo **+** pored imena Space-a (ili
**Add Folder**):

1. `01 Prodaja`
2. `02 Klijenti`
3. `03 Ritam`
4. `04 Proizvod`

Imena tačno ovako, da posle znaš gde šta ide.

---

## 3. Liste u folderima

Hover na folder → **+** → **List**. Napravi **8 listi**:

| Folder | Lista |
| --- | --- |
| 01 Prodaja | `Leadovi` |
| 01 Prodaja | `Demoi i ponude` |
| 02 Klijenti | `Onboarding` |
| 02 Klijenti | `Naplata` |
| 03 Ritam | `Nedelja` |
| 03 Ritam | `Mesec i kvartal` |
| 04 Proizvod | `Bagovi` |
| 04 Proizvod | `Feature` |

---

## 4. Statusi na svakoj listi (pre importa)

Otvori listu → gore desno **…** (List settings) → **Statuses**.

Obriši default `TO DO` / `IN PROGRESS` / `COMPLETE` ako smetaju
mapiranju, pa dodaj **tačno ove stringove** (copy-paste):

### Leadovi

Redosled kolona na Board-u:

`NEW` → `CONTACTED` → `QUALIFIED` → `NURTURING` → `DEMO` → `PROPOSAL` → `WON` → `LOST`

- `WON` = zatvoreno / zeleno (Closed).
- `LOST` = zatvoreno / crveno (Closed).
- Ostalo = otvoreno.

### Demoi i ponude

`TO DO` · `ZAKAZANO` · `ODRŽANO` · `RECAP` · `DONE` (DONE = Closed)

### Onboarding

`TO DO` · `U TOKU` · `BLOKADA` · `DONE`

### Naplata

`TO DO` · `ČEKA UPLATU` · `PAST DUE` · `DONE`

### Nedelja i Mesec i kvartal

`TO DO` · `U TOKU` · `DONE`

### Bagovi

`P0` · `P1` · `P2` · `DONE`  
(`P0` crveno, `DONE` Closed)

### Feature

`BACKLOG` · `OVA NEDELJA` · `STAGING` · `DONE`

Sačuvaj posle svake liste.

---

## 5. Custom fields (jednom, na Space-u)

1. Otvori bilo koju listu u `PropertyDesk`.
2. Desno iznad tabele: **+** na kolonama ili **Customize** →
   **Fields** → **Add Field**.
   Još pouzdanije: klik na ime Space-a `PropertyDesk` →
   **Space settings** → **Custom Fields** → **New Field**.
3. Stavi **Space** kao lokaciju (All lists in PropertyDesk), ne
   samo jednu listu.
4. Napravi ova polja, redom:

| Ime polja (tačno) | Type | Opcije (svaka u novom redu) |
| --- | --- | --- |
| Segment | Dropdown | A1, A2, A3, A4, A6, B1, B2, B3 |
| Audience | Dropdown | INVESTOR, AGENCY |
| Grad | Text |
| Firma | Text |
| Izvor | Dropdown | 4zida, gradnja.rs, sajt, preporuka, landing, linkedin, sajam |
| Website | Website |
| Kontakt status | Dropdown | naci-kontakt, imam-broj, ne-javlja-se, pogresna-osoba |
| Kanal | Dropdown | viber, telefon, email, linkedin, instagram, forma-sajta |
| Pain | Text |
| Paket | Dropdown | starter, growth, scale, partner, nepoznato |
| PD sync | Checkbox | |

Polje `4zida` iz starog SETUP-a **nije** u CSV — ne moraš ga
praviti. Website je dovoljan.

---

## 6. Import 1 — leadovi (najvažnije)

1. Avatar (gore levo ili desno) → **Settings** → **Imports /
   Exports** → **Start import** → **Spreadsheets** / **CSV**.
   Alternativa: na listi **Leadovi** → **…** → **Import**.
2. Upload: `d:\propertydesk\docs\clickup\leads.csv`
3. **Import location:** Space `PropertyDesk` → Folder `01 Prodaja`
   → List **Leadovi**.
4. Mapiranje kolona (levo CSV, desno ClickUp):

| Kolona u CSV | Mapiraj na |
| --- | --- |
| Task Name | Task name |
| Status | Status |
| Priority | Priority |
| Due Date | Due date |
| Tags | Tags |
| Description | Description |
| Segment | Custom Field → Segment |
| Audience | Custom Field → Audience |
| Grad | Custom Field → Grad |
| Firma | Custom Field → Firma |
| Izvor | Custom Field → Izvor |
| Website | Custom Field → Website |
| Kontakt status | Custom Field → Kontakt status |
| Kanal | Custom Field → Kanal |
| Pain | Custom Field → Pain |
| Paket | Custom Field → Paket |

5. Status mapping: `NEW` → `NEW`, itd. Ako nudi **Create status**,
   potvrdi — ali bolje da si ih već napravio u koraku 4.
6. Priority: `high` → High, `normal` → Normal, `low` → Low,
   `urgent` → Urgent.
7. **Import**. Treba ~50 taskova.

Ako importer **preskoči custom fields** (poznat ClickUp bag):
taskovi i dalje stoje — otvori Table view i ručno popuni Segment/
Grad na prvih 8 (Due 28.09). Ostalo možeš kasnije. Ime taska već
sadrži segment i grad (`A1 · Beograd · …`).

---

## 7. Import 2 — ritam

Ponovi importer:

1. Fajl: `ritam.csv`
2. Lokacija: `03 Ritam` → **Nedelja**
3. Mapiraj Task Name, Status, Priority, Due Date, Tags, Description.
4. Ako su iz starog `ritam.csv` ostali mesec/kvartal/gate/SEF u
   **Nedelja** — obriši ih (idu u sledeći import).

---

## 7b. Import — mesec i kvartal

1. Fajl: `mesec-kvartal.csv`
2. Lokacija: `03 Ritam` → **Mesec i kvartal**
3. Isto mapiranje: Task Name, Status, Priority, Due Date, Tags,
   Description.
4. Recurring samo na mesečnim proverama: last weekday of month,
   15:00 — **ili** ostavi Due kako jeste (svaki mesec je već
   poseban task do sep 2027). Kvartali i Gate bez recurring.

---

## 8. Import 3 — onboarding šablon

1. Fajl: `onboarding-sablon.csv`
2. Lokacija: `02 Klijenti` → **Onboarding**
3. Otvori prvi task `ONBOARDING ŠABLON`. Gore desno **…** →
   **Template** → **Save as Template** (ime: `WON onboarding`).
4. Ostale redove iz CSV-a ostavi kao checklist / odvojene taskove
   ispod šablona, ili ih pretvori u **subtasks** tog šablona
   (otvori šablon → Add subtask → cut/paste imena).

Posle svakog WON-a: **+ New** → iz templejta `WON onboarding`,
preimenuj u `Onboard · ImeFirme`.

---

## 9. Import 4 — feature backlog

1. Fajl: `features.csv`
2. Lokacija: `04 Proizvod` → **Feature**
3. Mapiraj Status → `BACKLOG` (sve kreće tu).
4. U Q4 **ništa** ne prebacuj u `OVA NEDELJA` osim P0/P1 rupe
   (auto-zadaci, uvoz, white-label) i to tek kad ima klijenta ili
   bag sa demoa.

---

## 10. Pogledi (da se koristi, ne samo da stoji)

### Leadovi

1. Otvori **Leadovi**.
2. **+ View** → **Board**. Group by **Status**. Sačuvaj kao
   `Pipeline`.
3. **+ View** → **Table**. Uključi kolone: Due, Priority, Segment,
   Grad, Kontakt status, Kanal, PD sync. Ime view: `Tabela`.
4. Filter koji koristiš svaki dan (sačuvaj):
   - View `Danas` = Due date **is today** + Status **is not** WON/LOST.
5. Filter `Inbox NEW` = Status = NEW, sort Due date.

### Feature

Board by Status. To je backlog kanban.

---

## 11. Recurring (ručno, 2 min po tasku)

Otvori task → **Dates** → **Recurring** (ikonica ponavljanja pored due):

| Task (lista Nedelja) | Repeat |
| --- | --- |
| Dnevni outreach: 8 NEW + follow-up | Every weekday, 09:30 |
| Dnevno 17:00 — NEW stariji od 24h | Every weekday, 17:00 |
| Sentry + my. health | Every weekday, 09:15 |
| Nedeljni pregled 25 min | Every Monday, 09:00 |
| Petak 16:00 catch-up | Every Friday, 16:00 |

Lista **Mesec i kvartal**: svaki mesec/kvartal je već poseban task
sa Due. Recurring **nije** potreban. Kvartali i Gate ostaju
jednokratni.

---

## 12. Automacije (opciono, posle što pipeline živi)

Lista **Leadovi** → **Automate** (grom) → Create:

1. **When** Status changes to `CONTACTED` → **Then** Due date =
   2 days from now. (Follow-up +2.)
2. **When** Status changes to `QUALIFIED` → **Then** Create task
   in `Demoi i ponude`, name `Demo · {{task_name}}`, due in 7 days.
3. **When** Status changes to `WON` → **Then** Create task from
   template `WON onboarding` in `Onboarding`.

Ako neće da uhvati template, ručno dupliraj posle WON — nije
blokada.

---

## 13. Dodeli sebi i prvi dan

1. Lista Leadovi → Table → select all Due **2026-09-28** →
   **Assignee** = ti.
2. Isti dan (ili 28.09. u 09:30): view `Danas` → 8 NEW.
3. Za svaki:
   - Otvori 4zida/sajt iz polja Website.
   - Nađi telefon/Viber.
   - Pošalji poruku iz plana §9.3.
   - Komentar na tasku: gde je broj, šta si poslao.
   - Status → `CONTACTED`, Kontakt status → `imam-broj` (ili ostaje
     `naci-kontakt` ako nisi našao).
   - Due ručno +2 dana ako nemaš automatiku.
4. Ko se javi: PropertyDesk →
   `/administracija/property-desk/leadovi` → novi lead (pravi
   email) → u ClickUp čekiraj **PD sync**.

---

## 14. Provera da je gotovo

- [ ] Space `PropertyDesk`, 4 foldera, 8 listi
- [ ] Leadovi Board ima 8 kolona statusa
- [ ] ~50 lead taskova, prvih 8 Due 28.09
- [ ] Ritam taskovi + recurring
- [ ] Feature backlog uvezen
- [ ] Onboarding šablon snimljen
- [ ] View `Danas` sačuvan

Ako importer padne: napravi **jedan** lead ručno kao uzorak
(A1 · Beograd · Alterra), pa javi — ostatak možemo seći u manji
CSV ili uneti u batch.

Ne importuj `docs/clickup/SETUP.md` ni plan — to nije ClickUp
zadatak, to je uputstvo.
