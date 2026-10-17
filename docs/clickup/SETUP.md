# ClickUp — PropertyDesk 2026–27

Sve spremno za import. Leadovi su **javne firme sa 4zida / gradnja.rs**
(A1/A2 + nekoliko B1). Telefon i ime osobe **namerno prazni** — to je
prvi posao kontakta, ne izmišljamo brojeve.

Pun operativni plan: [`../operativni-plan-2026-2027.md`](../operativni-plan-2026-2027.md).
**Radi sada, klik po klik:** [`KORAK-PO-KORAK.md`](./KORAK-PO-KORAK.md).

---

## 1. Napravi Space (jednom, 15 min)

**Space name:** `PropertyDesk`

Click **+ Space** → Everything (ili Sales). Zatim ručno:

### Folderi i Listovi

| Folder | List | View | Statusi (isti redosled) |
| --- | --- | --- | --- |
| `01 Prodaja` | `Leadovi` | Board + Table | `NEW` `CONTACTED` `QUALIFIED` `NURTURING` `DEMO` `PROPOSAL` `WON` `LOST` |
| `01 Prodaja` | `Demoi i ponude` | List | `TO DO` `ZAKAZANO` `ODRŽANO` `RECAP` `DONE` |
| `02 Klijenti` | `Onboarding` | List | `TO DO` `U TOKU` `BLOKADA` `DONE` |
| `02 Klijenti` | `Naplata` | List | `TO DO` `ČEKA UPLATU` `PAST DUE` `DONE` |
| `03 Ritam` | `Nedelja` | List | `TO DO` `U TOKU` `DONE` |
| `03 Ritam` | `Mesec i kvartal` | List | `TO DO` `U TOKU` `DONE` |
| `04 Proizvod` | `Bagovi` | List | `P0` `P1` `P2` `DONE` |
| `04 Proizvod` | `Feature` | List | `BACKLOG` `OVA NEDELJA` `STAGING` `DONE` |

Na listi **Leadovi** uključi Board view, grupiši po Status. To je
pipeline (isto kao PD: NEW → … → WON/LOST).

---

## 2. Custom fields (Space level, pa nasleđuju liste)

Napravi na Space `PropertyDesk` da važe svuda:

| Field | Tip | Opcije / format |
| --- | --- | --- |
| Segment | Dropdown | `A1` `A2` `A3` `A4` `A6` `B1` `B2` `B3` |
| Audience | Dropdown | `INVESTOR` `AGENCY` |
| Grad | Text | |
| Firma | Text | |
| Izvor | Dropdown | `4zida` `gradnja.rs` `sajt` `preporuka` `landing` `linkedin` `sajam` |
| Website | Website | |
| 4zida | Website | |
| Kontakt status | Dropdown | `naci-kontakt` `imam-broj` `ne-javlja-se` `pogresna-osoba` |
| Kanal | Dropdown | `viber` `telefon` `email` `linkedin` `instagram` `forma-sajta` |
| Pain | Text | |
| Paket | Dropdown | `starter` `growth` `scale` `partner` `nepoznato` |
| PD sync | Checkbox | da li je upisan u `/administracija/property-desk/leadovi` |

---

## 3. Import CSV

ClickUp: **Settings → Imports / Exports → Spreadsheets importer**
(ili Space → Import).

1. Prvo importuj [`leads.csv`](./leads.csv) **u listu Leadovi**.
   - `Task Name` → Task Name
   - `Status` → Status (dozvoli kreiranje `NEW` itd. ako nisi već)
   - `Priority` → Priority (`urgent` / `high` / `normal` / `low`)
   - `Due Date` → Due Date
   - `Tags` → Tags
   - ostalo → Custom Field (tip iz tabele gore)
   - `Description` → Description
2. Importuj [`ritam.csv`](./ritam.csv) **u listu Nedelja**.
2b. Importuj [`mesec-kvartal.csv`](./mesec-kvartal.csv) **u listu
    Mesec i kvartal**. Ne prevlači iz Nedelje.
3. Importuj [`onboarding-sablon.csv`](./onboarding-sablon.csv) u
   **Onboarding** — to je šablon. Posle svakog WON-a: duplicate.
4. Importuj [`features.csv`](./features.csv) u listu **Feature**.
   Statusi `BACKLOG` / `OVA NEDELJA` / `STAGING` / `DONE`. U Q4
   u „ova nedelja“ ide samo P0/P1 rupa, ne novi modul.

Due date na leadovima je **prvi kontakt** (8 dnevno od 28.09.2026).

---

## 4. Automacije (ClickUp Automations)

Na listi **Leadovi**:

1. Status `NEW` + Due date is today → dodeli sebi, prioritet High.
2. Status menja se u `CONTACTED` → Due date = today + 2 days
   (prvi follow-up).
3. Status `QUALIFIED` → kreiraj task u `Demoi i ponude`:
   `Demo · {task name}`, due +7 dana.
4. Status `WON` → kreiraj task u `Onboarding` iz šablona + checkbox
   PD sync.
5. Status `LOST` → traži komentar (lost reason). Ručno: tag
   `lost-skupo` / `lost-nema-projekta` / `lost-kasnije` / `lost-alat`.

Na listi **Nedelja**:

6. Svaki ponedeljak 08:50 — task „Nedeljni pregled 25 min“ (ako
   ne koristiš recurring iz CSV-a).

---

## 5. Kontakt — pravilo (isti kao plan §9.7)

| Dan | Akcija | Status posle |
| --- | --- | --- |
| 0 | Nađi telefon/Viber/formu na sajtu ili 4zida. Pošalji §9.3. | `CONTACTED` ili ostaje `NEW` ako nema kanala |
| +2 | Follow-up istim kanalom. | `CONTACTED` |
| +5 | Drugi kanal (LinkedIn / Instagram projekta). | `CONTACTED` |
| +10 | Zadnji pokušaj ili `NURTURING` (datum +30d) ili `LOST`. | — |

**Dnevno:** 8 first-touch (Due today, status NEW) + svi follow-up Due
today. NEW stariji od 24h posle prvog kanala = greška ritma.

Kad se jave: isti dan upis u PropertyDesk
`/administracija/property-desk/leadovi` (email obavezan u PD) i
čekiraj `PD sync`.

Ne kvalifikuj bez: aktivan projekat ≤90 dana, ≥8 jedinica, bol
(Excel/Viber), donosilac odluke.

---

## 6. Recurring (ručno u ClickUp posle importa)

Na taskovima iz `ritam.csv` označi **Recurring**:

| Task | Repeat |
| --- | --- |
| Dnevni outreach 8 + follow-up | Every weekday 09:30 |
| NEW stariji od 24h | Every weekday 17:00 |
| Nedeljni pregled | Every Monday 09:00 |
| Petak catch-up | Every Friday 16:00 |
| Mesečna provera | Last weekday of month 15:00 |
| Kvartalna korekcija | Last weekday of quarter |

---

## 7. Šta ne ide u ClickUp

- Produkcijski tenant podaci, lozinke, impersonate.
- Kupci iz demo baze (Gradnja Plus) — to nije SaaS lead.
- Izmišljeni email-ovi. PD `marketing_lead.email` je unique; čeka
  pravi kontakt.
