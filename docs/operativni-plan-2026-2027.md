# Operativni plan PropertyDesk — 28.09.2026 → 28.09.2027

Radni dokument za narednih **6 i 12 meseci**. Nije prezentacija.
Svaka sekcija ima cilj, meru, TODO, ritam provere i šta se menja ako
brojka ne stoji.

**Početak:** ponedeljak **28. septembar 2026.** (27.09. je nedelja —
prvi radni dan je 28.09.)
**6 meseci:** do nedelje 28.03.2027.
**12 meseci:** do ponedeljka 28.09.2027.

Vlasnik ovog dokumenta: Marko. Ažurira se na svakoj mesečnoj proveri
(poslednja sekcija). Ciljne grupe i GTM redosled ostaju iz
[`ciljne-grupe.md`](./ciljne-grupe.md). Role / planovi / PD pipeline:
[`roles-and-plans.md`](./roles-and-plans.md). Deploy disciplina:
[`releases/fix-bugs-v1.md`](./releases/fix-bugs-v1.md).
ClickUp (liste, CSV, kontakt): [`clickup/SETUP.md`](./clickup/SETUP.md).

---

## 0. Kako se ovo koristi

1. **Ponedeljak 09:00** — nedeljni pregled (15–25 min). Brojke + 3
   obaveze nedelje. Ne širi scope.
2. **Poslednji radni dan meseca** — mesečna provera (60–90 min).
   Paketi, churn, proizvod, novac. Upisati odluku u §18.
3. **Poslednji radni dan kvartala** — kvartalna korekcija. Menja se
   prioritet feature-a i cilj prihoda ako realnost nije plan.
4. **Sredina plana (28.03.2027)** — 6-mesečni gate. Ako nismo na
   70% 6m cilja, sečemo sve što nije A1/B1 prodaja ili zadržavanje.

Pravilo: nijedan feature ne ulazi u nedelju ako nema ime klijenta
kome rešava bol, ili ako nije blokada naplate / uptime-a.

---

## 1. North star

**Jedna rečenica:** do 28.09.2027. PropertyDesk je podrazumevani
operativni sistem za prodaju novogradnje u Srbiji — plaćaju ga
investitori, agencije ga vuku organski, proizvod se meri satima
ušteđenim na rezervaciji / cenovniku / proviziji, ne brojem ekrana.

Četiri ishoda, istog ranga:

| Ishod | 6 meseci (28.03.2027) | 12 meseci (28.09.2027) |
| --- | --- | --- |
| **Zarada** | MRR €1.200–2.000 · 8–15 plaćenih investitora | MRR €4.500–8.000 · 25–40 plaćenih |
| **Prodaja** | 40 kvalifikovanih leadova u PD pipeline-u, 12 demoa, 8 WON | 120 kvalifikovanih, 40 demoa, 25+ WON |
| **Proizvod** | `my.` na trenutnom kodu, 0 P0 bagova >48h, SEF odluka | 3 stvari koje klijenti sami zovu „ne mogu bez“ |
| **Rad** | jedan ritam (nedelja/mesec/kvartal), lista leadova nije Excel | svaki WON ima onboarding checklist i 30-dnevni health check |

Anti-ciljevi (svesno ne radimo):

- regionalna ekspanzija (CG/BiH/HR/MK) pre 12. meseca;
- rental / sekundarno tržište;
- solo-agent paket;
- marketplace kao glavni proizvod pre kritične mase (C3 ostaje Q3 2027);
- custom enterprise build pre 5 referenci iz A1/A2.

---

## 2. Početna tačka (28.09.2026)

Iskreno, da plan ne laže.

**Proizvod.** Faze 1–8 su u kodu: zalihe, CRM, rezervacije (interna +
online + IPS QR), prodaje, plan otplate, FIFO, ugovori, KYC, P&L,
microsite, referral, agencijski partner nalog, katalog mreže,
white-label + svetli logo, jezik SRB/EN, tema. SEF je **stub**.
Auto-zadaci (rata / rezervacija ističe) **nisu** u kodu.

**Hostovi.** `staging.` i `demo.` dele demo bazu (Gradnja Plus, Top
Nekretnine). `my.` je prazna produkcija (planovi + super-admin).
GHA deploy i dalje puca na SSH — promocija je ručna. `my.` sme da
zaostaje dok eksplicitno ne kažemo „idi na produkciju“.

**Paketi (trenutno u seed-u).**

| Plan | Cena / mes | Projekti | Jedinice | Članovi | Agencije | White-label |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Trial | 0 (30 dana) | 1 | 50 | 5 | 2 | ne |
| Starter | €49 | 3 | 250 | 10 | 5 | ne |
| Growth | €149 | 10 | 1.000 | 30 | 25 | da |
| Scale | €399 | ∞ | ∞ | ∞ | ∞ | da + impersonation |
| Partner (agencija) | 0 | — | — | 25 | — | ne |

Ciklus: mesečno / kvartalno / polugodišnje / godišnje. Agencija se
**ne naplaćuje**. Investitor plaća.

**Prodaja.** Interni PD pipeline postoji (SETTER / CLOSER / OPERATIONS
/ MANAGER, score, konverzija u tenant). Landing forma ide u
`marketing_lead`. Javni sign-in na marketing sajtu ostaje zatvoren
do **15.10.2026.** (pomereno sa 01.09.2026.). Pilot: 3–5
investitora/agencija pre javne prodaje.

**Ljudi.** Za sada jedan operator (vlasnik) + Cursor. PD role su
spremljene za tim; ne zapošljavamo dok nema 5 plaćenih i ritam
demoa >4 nedeljno.

---

## 3. Brojke koje se gledaju svake nedelje

Upisivati u `/administracija/property-desk` + ovaj dokument (§18).
Ako brojka nema izvor, nije KPI.

### 3.1 Prodaja (Sloj C)

| KPI | Izvor | Nedeljno | 6m | 12m |
| --- | --- | --- | --- | --- |
| Novi leadovi | `marketing_lead` NEW | ≥5 | 80 kumulativno | 200 |
| Kontaktirani <24h | stage NEW→CONTACTED | 100% | 100% | 100% |
| Kvalifikovani | QUALIFIED | ≥2 | 40 | 120 |
| Demo održan | DEMO | ≥1 | 12 | 40 |
| Ponuda poslata | PROPOSAL | ≥1 / 2 nedelje | 10 | 30 |
| WON (plaćen ili trial→ACTIVE) | WON + faktura | — | 8–15 | 25–40 |
| LOST + razlog | LOST | svaki | analiza mesečno | analiza |
| Win rate (WON / (WON+LOST)) | pipeline | — | ≥25% | ≥30% |
| Sales cycle (QUALIFIED→WON) | datumi | — | ≤45 dana | ≤35 dana |

Kvalifikacija (mora sve da stoji inače nije QUALIFIED):

1. Ima aktivan projekat u prodaji ili kreće u ≤90 dana.
2. Broj jedinica ≥8 (inače je anti-persona, ne trošimo demo).
3. Donosilac odluke je na pozivu ili zakazan.
4. Danas radi Excel / Viber / papir — ima bol.
5. Nije rental / sekundarno / jedan stan.

### 3.2 Prihod i paketi

| KPI | 6m | 12m | Kako se računa |
| --- | --- | --- | --- |
| Plaćeni investitori (ACTIVE) | 8–15 | 25–40 | org `INVESTOR` + sub ACTIVE |
| Trial u toku | 3–6 | 6–12 | TRIAL, nije istekao |
| MRR | €1.200–2.000 | €4.500–8.000 | suma `monthlyPrice` ACTIVE |
| ARR (run-rate) | €14–24k | €54–96k | MRR × 12 |
| Mix paketa 6m | 70% Starter / 25% Growth / 5% Scale | 55 / 35 / 10 | broj org |
| Godišnji ciklus | ≥20% plaćenih | ≥35% | manje churn-a |
| Trial→paid | ≥40% | ≥50% | WON / (trial start) |
| Churn mesečni | <8% | <5% | otkazani / ACTIVE početak meseca |
| Expansion (upgrade) | 1 Growth | 4 Growth + 1 Scale | plan change audit |
| ARPU | ~€90–130 | ~€140–200 | MRR / plaćeni |
| DSO (dana do uplate fakture) | ≤14 | ≤10 | invoice paidAt − issuedAt |

### 3.3 Proizvod i rad

| KPI | Nedeljno / mesečno | Crvena linija |
| --- | --- | --- |
| P0 bag na `my.` | 0 otvorenih >48h | preko 48h = stop feature |
| P1 bag | ≤3 otvorena | preko 5 = samo bagovi |
| Uptime `my.` | ≥99.5% mesečno | health + Sentry |
| Vreme do prvog projekta (novi tenant) | <45 min uz nas | >90 min = onboarding bug |
| Podrška (odgovor) | <4h radnim danom | >1 dan = proces pukao |
| Deploy bez incidenta | svaka promocija | rollback checklist |
| Feature koji niko ne koristi 30 dana | 0 novih u tom stanju | seći ili naučiti |

---

## 4. Ritam provera

### 4.1 Dnevno (10 min, radnim danom)

- [ ] PD inbox: svi NEW stariji od 24h → CONTACTED ili LOST (razlog).
- [ ] `nextFollowUpAt` za danas — poziv / Viber / mail. Upis u timeline.
- [ ] Sentry + `/administracija/monitoring` — ima li FAIL.
- [ ] Ako ima plaćenog klijenta: 1 poruka „šta si danas radio u PD?“
      (ne feature, upotreba).

### 4.2 Nedeljno — ponedeljak 09:00 (25 min)

Obrazac (kopirati u §18):

```
Nedelja: YYYY-MM-DD →
Leadovi new / qual / demo / won / lost:
MRR / ACTIVE / TRIAL:
P0/P1:
3 obaveze ove nedelje:
1 blokada:
Odloženo (i zašto):
```

- [ ] Brojke iz §3.1 i §3.2.
- [ ] Tri obaveze: **jedna prodaja, jedna zarada/naplata, jedna
      proizvod/kvalitet.** Ne četiri.
- [ ] Lista demoa (ime, datum, paket, sledeći korak).
- [ ] Staging: ima li nešto što čeka „idi na staging/demo/produkciju“.
- [ ] Ako je nedelja bez jednog kvalificiranog razgovora — petak je
      outreach dan, ne coding dan.

### 4.3 Mesečno — poslednji radni dan (90 min)

- [ ] Funnel: landing → lead → demo → ponuda → WON. Gde curi >50%.
- [ ] Razlozi LOST (top 5). Ako 3× isti razlog = ticket u proizvod.
- [ ] Paketi: ko je na limitu kvote, kome treba upgrade, kome je
      Starter prevelik (predati godišnji ili ostaviti).
- [ ] Fakture: otvorene, PAST_DUE, DSO. Ručni poziv pre RESTRICTED.
- [ ] Churn / otkaz: exit razgovor, 3 pitanja (šta fali, šta smeta,
      bi li se vratio).
- [ ] Proizvod: 5 stvari koje su klijenti tražili; 2 ulaze u sledeći
      mesec, ostalo backlog.
- [ ] Cene: da li Starter €49 i dalje zatvara A1? Ne dirati cenu pre
      8 plaćenih osim ako 5+ kaže „preskupo“ *i* koriste proizvod.
- [ ] Upis odluke u §18 (datum, šta menjamo, šta ne).

### 4.4 Kvartalno (pola dana)

| Kvartal | Datumi | Pitanje koje mora da se zatvori |
| --- | --- | --- |
| Q4 2026 | 28.09–27.12.2026 | Imamo li plaćene klijente ili samo demo? |
| Q1 2027 | 28.12.2026–28.03.2027 | Da li proizvod zadržava posle 60 dana? |
| Q2 2027 | 29.03–27.06.2027 | Da li Growth/Scale i godišnji ciklus rade? |
| Q3 2027 | 28.06–28.09.2027 | Da li je ovo biznis od €5k+ MRR ili hobi? |

Na kvartalu se sme: promeniti mix paketa, ubiti feature, podići
godišnji popust, uzeti SETTER-a na % (ne platu) ako ima ≥8 demoa
mesečno. Ne sme: novi region, novi vertikal, rewrite.

### 4.5 Gate 28.03.2027 (obavezno)

Ako **nije** ispunjeno bar 2 od 3:

1. ≥8 ACTIVE investitora,
2. MRR ≥ €1.000,
3. trial→paid ≥35%,

onda Q2 nije „novi moduli“. Q2 je samo: outreach, onboarding,
bagovi koji ubijaju demo, jedan retention feature koji klijenti
već traže.

---

## 5. Q4 2026 (28.09–27.12) — prvi novac

**Cilj kvartala:** `my.` je stvaran proizvod. 5–8 plaćenih ili
čvrstih trial-a koji idu u januarske fakture. 3 reference koje smeju
da se imenuju.

### 5.1 Prodaja — TODO

- [ ] Otvoriti javni sign-in na `propertydesk.app` (skinuti
      „uskoro“) **tek** kad je `my.` na zdravom image-u + health 200.
- [ ] ClickUp Space po [`clickup/SETUP.md`](./clickup/SETUP.md). Import
      [`clickup/leads.csv`](./clickup/leads.csv) (50 javnih A1/A2/B1,
      Due 8/dan od 28.09). Telefon namerno prazan — prvi posao je naći
      kanal. Cilj do kraja oktobra: 80 imena (dopuni sa 4zida).
- [ ] Svaki radni dan: 8 first-touch (ClickUp Due today + NEW) i svi
      follow-up Due today. Sekvenca §9.7. Poruka §9.3. U PD
      (`marketing_lead`) tek kad imaš pravi email.
- [ ] Zakazati 12 demoa u kvartalu. Demo skripta §9.4. Posle demoa
      isti dan: recap mail + trial nalog ili datum odluke.
- [ ] 3–5 pilot ugovora: 30 dana trial, pomoć pri uvozu Excel-a,
      nedeljni check-in. Pilot **nije** večiti free — datum pretplate
      stoji u lead-u.
- [ ] Jedan javni walkthrough (snimak iz [`demo-snimanje.md`](./demo-snimanje.md))
      na landing + Loom za one koji neće sastanak.
- [ ] Landing: jedna poruka za A1 („Excel + Viber → jedna istina o
      stanu“), CTA u PD lead, kalendar (Google appointment URL već
      postoji).
- [ ] Anti-persona filter na formi: „prodajem jedan stan / izdavanje“
      → hvala, nije za nas. Štedi demo termine.

### 5.2 Proizvod — TODO

- [ ] Zatvoriti `fix-bugs-v1` promociju: staging proveren → demo →
      **produkcija** kad kažemo. Checklist u release fajlu.
- [ ] Onboarding na `my.`: org profil + logo (osnovni + svetli) +
      prvi projekat + uvoz šablona. Izmeriti vreme sa pravim Excelom.
- [ ] P0/P1 bagovi koje vidi demo klijent: rezervacija dupla, cena
      pogrešna, logo, prijava, faktura. Sve ostalo čeka.
- [ ] SEF: odluka do **15.11.2026.** — stub ostaje *ili* prvi pravi
      izlaz (potrebno čim ima 3+ domaće fakture mesečno).
- [ ] Email: Resend na `my.`, console na demo. Provera 14 šablona
      (trial, faktura, podsetnik, rezervacija).
- [ ] Backup verifier + Sentry alarm na telefon.
- [ ] Jedna stvar koju klijent vidi svaki dan: brži uvoz ili jasniji
      cenovnik. Ne novi modul.

### 5.3 Operativa — TODO

- [ ] Kalendar: pon 09:00 pregled, pet 16:00 outreach catch-up.
- [ ] Folder / Notion / ovaj MD: pipeline nije u glavi.
- [ ] Impersonation samo sa razlogom (audit).
- [ ] Cene i kvote ne dirati u Q4 osim greške u seed-u.
- [ ] Ugovor / predračun / IPS QR za SaaS: proći kao prvi klijent.
- [ ] Lista pristupa: VPS, GHCR, Supabase demo, Supabase prod,
      Resend, Sentry, Cloudflare, banka. 2FA svuda.

### 5.4 Zarada — TODO

- [ ] Prva Starter faktura u Q4 ili prvi tjedan Q1. Bez „kad stignemo“.
- [ ] Trial 30 dana, bez tihog produženja više od jednom, i to
      pisano u lead-u.
- [ ] Godišnji Starter (€49×10 = €490) nuditi posle 2. nedelje
      korišćenja, ne na prvom pozivu.
- [ ] Agencije ostaju free. Ne izmišljati „agency Pro“ u 2026.

**Izlaz Q4:** 5+ ACTIVE ili 8+ trial sa datumom aktivacije u januaru;
`my.` healthy; 3 imena za referencu.

---

## 6. Q1 2027 (28.12.2026–28.03.2027) — zadržavanje

**Cilj:** niko ko je platio u Q4 nije otišao. MRR ≥ €1.200. Gate
28.03. je realan.

### 6.1 Prodaja

- [ ] Isti outreach ritam. Kanal koji je doneo WON u Q4 dobija 70%
      vremena (ne „probajmo TikTok“).
- [ ] A2 (3–10 projekata) tek sa 3 A1 reference. Jedan ABM spisak
      od 20 imena, lični mail, ne ads.
- [ ] B1 agencije: svaki WON investitor mora da pozove ≥1 agenciju
      u prvih 14 dana (mi sedimo na pozivu ako treba).
- [ ] Case study ×3: pre (Excel), posle (1 broj: vreme cenovnika /
      0 duplih rezervacija / dane do provizije).
- [ ] Ponuda: pisani Starter vs Growth. Growth samo ako ima
      white-label ili >3 projekta ili >5 agencija.

### 6.2 Proizvod (samo što zadržava)

Redosled, ne paralelno:

1. Auto-zadaci: rezervacija ističe, rata due, trial 7/3/1 dan —
   zadatak + zvono + mail. Ovo je rupa u katalogu.
2. Onboarding meren: gde odustanu (Sentry + pitanje).
3. Izveštaj koji vlasnik šalje sebi u ponedeljak (CSV/mail).
4. SEF pravi izlaz ako je odluka sa 15.11. bila „da“.
5. Sitnice iz LOST razloga (ako se ponove).

Ne u Q1: marketplace v2, mobilna native app, novi vertikal.

### 6.3 Paketi i naplata

- [ ] Prva provera kvota: ko je na 80% jedinica / agencija →
      razgovor o Growth pre lock-a.
- [ ] Restricted tok: klijent vidi lock + fakturu, ne „500“.
- [ ] Ručni poziv 5 dana pre RESTRICTED. Ne pulimo suspenziju bez
      čoveka.
- [ ] Godišnji popust: ostaje ~2 meseca gratis. Ne dirati €49/149/399
      dok nema 10 plaćenih i 3 izgubljena zbog cene.

### 6.4 Operativa

- [ ] 30-dnevni health: 2. i 4. nedelja posle WON — 20 min poziv.
- [ ] Impersonate log pregled mesečno.
- [ ] Jedan restore test backup-a (ne samo verify liste).

**Izlaz Q1 / gate:** §4.5.

---

## 7. Q2 2027 (29.03–27.06) — rast paketa

**Cilj:** ARPU ide gore. Growth postoji u prirodi, ne samo na sajtu.
MRR €2.500–4.000.

### 7.1 Prodaja

- [ ] A2 + B2: 10 razgovora. Duži ciklus, dva donosioca.
- [ ] A4 boutique samo ako vizuelni sloj (galerija, microsite,
      PDF, floor-plan) prolazi njihov test na jednom projektu.
- [ ] Partner kanal: jedna računovodstvena / jedna pravna kancelarija
      koja vodi investitore — 10% godišnje ili fixed finder’s fee.
      Nije affiliate spam.
- [ ] Sajam / događaj: jedan u Srbiji. Cilj 15 razgovora, 5 demoa.

### 7.2 Proizvod

- [ ] White-label rupe: login, PDF, mail footer, favicon — Growth/Scale
      mora da izgleda kao njihov alat.
- [ ] Katalog mreže v1.5: bolji teaser, verifikacija agencija u
      praksi (koliko PENDING stoji >7 dana).
- [ ] Mobilni PWA: 3 najčešće akcije agenta (slobodno, rezerviši,
      kupac) za <30s. Meriti na pravom telefonu.
- [ ] API ključ za 1 klijenta koji pita integraciju — ne javni
      marketplace API.
- [ ] Performance: liste >1.000 jedinica (Scale priča).

### 7.3 Paketi — prva ozbiljna revizija (april 2027)

Sastanak 90 min. Ulaz: 10+ plaćenih, churn razlozi, kvote.

Moguće odluke (izabrati, ne sve):

- Godišnji Scale sa 2.5 meseca popusta.
- „Starter+“ samo ako Starter klijenti stalno udaraju u 3 projekta —
  radije gurati Growth.
- Agency i dalje 0€. Ako agencija hoće svoje investitore bez njih
  — to je Starter za investitora, ne fee na portal.
- Enterprise custom (iznad Scale): samo pismeni SOW, min €800/mes,
  SLA 8h, nije u self-serve.

Cene se menjaju **samo za nove** + 60 dana najave postojećima.

---

## 8. Q3 2027 (28.06–28.09) — da li je ovo firma

**Cilj:** MRR €4.500–8.000. Odluka: ostajemo bootstrap / uzimamo
prve ruke (setter na %) / sečemo.

### 8.1 Prodaja

- [ ] Ponoviti što radi. Ubiti kanal <5% WON.
- [ ] A3 enterprise: 3 sastanka max. Ako hoće custom 6 meseci —
      Scale + queued integracija, ne gradimo unapred.
- [ ] C3 marketplace: samo ako ima ≥20 ACTIVE investitora i ≥40
      verifikovanih agencija. Inače ostaje teaser.
- [ ] Banke (C4): jedan razgovor o potvrdi rezervacije za kredit.
      Nije roadmap dok nema 2 banke koje to traže imenom.

### 8.2 Proizvod (12-mesečni backlog, birati 2)

- Post-sale / primopredaja / garancije (C2) — upsell, veći LTV.
- Dublji matching agencija–projekat.
- Potvrda za banku (PDF + pečat / kvalifikovani potpis kasnije).
- Višejezični javni microsite (en za strance-kupce, ne za UI tima).
- Native app — **ne** osim ako PWA padne na 10+ agenata.

### 8.3 Zarada i ljudi

- [ ] Ako ≥8 demoa / mesec i vlasnik je bottleneck: setter na
      proviziju (npr. 10% prve godine), ne plata.
- [ ] Ako MRR < €3.000 u avgustu: nema zapošljavanja, samo prodaja.
- [ ] Godišnji close: ponuda u avgustu za sve mesečne (lock cene
      12 meseci).

**Izlaz 28.09.2027:** tabela §1. Ako MRR < €3.000 — plan B: uski
proizvod (samo A1, samo Starter/Growth), 4 dana prodaja / 1 dan kod.

---

## 9. Prodaja — playbook i zadaci

### 9.1 Ko kome prodaje

| Segment | Paket | Ciklus | Ko zatvara |
| --- | --- | --- | --- |
| A1 1–3 projekta | Starter, godišnji ako može | 2–4 nedelje | vlasnik |
| A6 bez agencija | Starter | 1–2 nedelje | vlasnik |
| A2 3–10 projekata | Growth | 4–8 nedelja | vlasnik + referenca |
| A4 boutique | Growth (white-label) | 4–6 | vlasnik, vizuelni demo |
| A3 portfolio | Scale / custom | 3–6 meseci | posle 5 referenci |
| B1/B2 agencija | €0 partner | — | preko investitora |

### 9.2 Pipeline disciplina

Svaki lead u PD ima: segment (A1…), `budgetTier`, `timelineHorizon`,
`nextFollowUpAt`, `painPoint`, `competitor`, donosioca odluke.

Stage bez datuma sledećeg koraka = LOST za 7 dana (nurture ili
zatvori). Reopen samo sa razlogom.

Konverzija WON: iz lead-a napraviti tenant (postoji u UI). Plan
odmah Starter ili Growth, trial 30 dana, `trialEndsAt` vidljiv.

### 9.3 Outreach (kratko)

> Vidio sam da [projekat] još ide preko Excel-a / agencija na Viberu.
> PropertyDesk drži jednu istinu: šta je slobodno, ko je rezervisao,
> koja je cena, ko duguje kaparu. 25 min — pokažem na pravom
> projektu, ne slajdovima. Ako nije to bol, nećemo se čuti.

Ne pričati o Fazi 8. Pričati o duploj rezervaciji i kasnoj proviziji.

### 9.4 Demo (25–40 min)

1. Njihov bol (5 min). Ako nema, prekid.
2. Jedinica + rezervacija + promena cene + audit (8 min).
3. Agencija vidi samo svoje / buyer protection (5 min) — preskočiti
   za A6.
4. Plan otplate + FIFO + jedna faktura/IPS ako pitaju naplatu (5).
5. Njihov Excel: „sledeći korak je uvoz, ja sedim“. Trial danas.
6. Paket: Starter default. Growth samo ako sami traže logo u app-u
   ili 4. projekat.

Posle: recap, link `my.`, 2 termina za uvoz, datum odluke.

### 9.5 Ponuda / ugovor SaaS

- Predmet: pretplata Starter/Growth/Scale, ciklus, kvote.
- Trial 30 dana, zatim faktura + IPS QR.
- Otkaz: do kraja perioda, bez refund-a za iskorišćen mesec.
- Podaci ostaju X dana posle SUSPENDED (napisati, npr. 30), export
   CSV na zahtev.
- Ne obećavati SEF / custom / native app u ugovoru ako nije u
   kvartalu.

### 9.6 Nedeljni sales TODO (ponavlja se)

- [ ] 8 first-touch / radni dan (Due today, NEW) = 40/nedelju.
- [ ] Svi follow-up Due today (CONTACTED +2 / +5 / +10).
- [ ] NEW sa komentarom kontakta ne sme da ostane NEW preko 24h.
- [ ] 1 demo ili 3 zakazana.
- [ ] 1 recap / 1 lost razlog upisan.
- [ ] Petak: ako 0 QUALIFIED, subota nije coding.

### 9.7 Kontakt leadova (ClickUp + PD)

Lista za start: [`clickup/leads.csv`](./clickup/leads.csv) — 50 firmi
sa 4zida/sajta (BG, NS, Niš, KG). Nisu kupljeni kontakti. Broj i ime
osobe se popunjavaju na Dan 0.

| Dan | Šta radiš | ClickUp status | Due |
| --- | --- | --- | --- |
| 0 | Nađi Viber/telefon/formu. Pošalji §9.3. Komentar: gde si našao broj. | `CONTACTED` | danas |
| +2 | Isti kanal, kratko. | `CONTACTED` | +2 |
| +5 | Drugi kanal (LinkedIn / IG projekta / forma). | `CONTACTED` | +5 |
| +10 | Zadnji pokušaj → `NURTURING` (+30d) ili `LOST` + razlog. | — | +10 |

Kvalifikacija (sve ili nije QUALIFIED): projekat ≤90 dana, ≥8
jedinica, bol Excel/Viber, donosilac na vezi.

Kad se jave: isti dan red u
`/administracija/property-desk/leadovi` i checkbox `PD sync` u
ClickUp. ClickUp je dnevni rad; PD je izvor za score/WON/tenant.

Anti-persona odmah `LOST` (`lost-nema-projekta`): jedan stan,
izdavanje, sekundarno.

---

## 10. Future i napredovanje app-a

§10.0–10.1 su **rupe u v1** (mora da radi što već imamo).
§10.2 je **kako postojeći proizvod da postane bolji** (isto
ekrane, manje trenja).
§10.3–10.6 su **nove ideje** (moduli kojih nema). Q4 2026 ne
otvara 10.3 dok nema plaćenog klijenta. ClickUp lista Feature:
[`clickup/features.csv`](./clickup/features.csv).

Svaki P2+ i dalje traži: ime klijenta, meru, kvartal.

### 10.0 P0 — blokira novac ili poverenje

- Produkcija na dogovorenom image-u, health, backup restore.
- Dupla rezervacija / pogrešna cena / nestala uplata.
- Prijava, lock, mail ne stiže.
- Faktura / IPS / status pretplate laže.
- Gubitak podataka.

### 10.1 P1 — rupe koje ubijaju demo i zadržavanje

- Auto-zadaci i podsetnici (rezervacija ističe, rata due, trial
  7/3/1). U katalogu piše da **nisu** u kodu.
- Uvoz Excel-a na pravom fajlu <30 min (mapiranje kolona, greške
  po redu, ponovi samo fail).
- Onboarding lock: jedna lista „šta fali“, ne slepa 403.
- White-label do kraja (login, PDF, mail footer, favicon) na
  Growth/Scale.
- SEF pravi izlaz kad ima ≥3 domaće fakture/mesec (odluka 15.11).
- Ponedeljak mail vlasniku: KPI + 5 stavki koje čekaju njega.
- 2FA na nalog (posle prvog plaćenog koji pita).

### 10.2 Napredovanje onoga što već postoji

Ne novi meni. Iste rute, manje klika, merljivo.

| Šta | Zašto | Mera uspeha |
| --- | --- | --- |
| Liste >500 jedinica (virtualizacija, filter bez reload-a) | Scale priča i A2 demo | p95 liste <400 ms |
| Uvoz: pametni headeri + „sačuvaj mapiranje“ po org | svaki Excel je drugačiji | 2. uvoz <10 min |
| Floor-plan: crtanje poligona u app-u (sad je upload + ručni JSON) | A4 ne kupuje bez ovoga | 1 sprat za <15 min |
| Microsite: EN jezik za kupca-stranca, isti slug | BG/NS premium | 1 klijent koristi |
| Share link: WhatsApp/Viber kartica (OG + kratak tekst) | agent šalje sa telefona | share sa moba > desktop |
| Kanban rezervacija/prodaja: razlog na drag, undo 10s | greške na tabletu | 0 „pogrešna kolona“ ticket/mes |
| Izveštaji: jedan PDF „za vlasnika“ (1 strana) | Excel i dalje živi pored nas | otvoren bez nas |
| P&L: scenario „šta ako popust 5%“ | zatvara Growth demo | 1 klijent sačuva scenario |
| Kalendar: iCal feed + reminder 24h | zaborave rate | manje overdue |
| Pretraga: jedinica po šifri / broju parcele / JMBG | finance pita | 0 „ne mogu da nađem“ |
| Audit: export CSV za knjigovođu (cene, statusi) | poverenje | 1 export/mesec |
| Mobilni PWA: 3 akcije <30s (slobodno, rezerviši, kupac) | B1 agent | mereno na Androidu |
| In-app changelog + „novo na tvom planu“ | manje impersonate | impersonate pada posle 3. ned |
| Usage (anonimno po org): koji ekran 0× u 30 dana | seći ili naučiti | 0 mrtvih novih ekrana |

Ritam napretka (proizvod, ne prodaja):

- Posle svakog demoa: 1 red „šta je zapelo“ → P1 ili backlog.
- 30 dana posle WON: 3 pitanja (šta koristiš, šta preskačeš, šta
  te nervira). To je mapa za 10.2, ne za novi modul.
- KPI proizvoda: vreme do prve rezervacije na novom nalogu;
  broj impersonate/nedelja; isti P1 se ne vraća.

### 10.3 Nove ideje — prodaja i zalihe

| Ideja | Bol | Kad |
| --- | --- | --- |
| **Paket jedinica** (stan + garaža + ostava, jedna cena) | sad se vežu ručno, lako se raspadne | P2 |
| **Lista čekanja** na rezervisanoj jedinici | drugi kupac nestane kad istekne rezervacija | P2 |
| **Zakazana promena cene** (od datuma, sa razlogom) | „od 1. u mesecu +5%“ ide u Excel | P2 |
| **Uporedi 2–3 jedinice** (PDF za kupca) | agent pravi u Wordu | P2 |
| **Embed widget** (iframe slobodnih stanova na sajt investitora) | microsite je naš URL, oni hoće svoj .rs | P2, Growth |
| **Matterport / YouTube tour** po jedinici na javnoj ponudi | A4 | P2 |
| **„Slične jedinice“** na `/p/[token]` | kupac ode sa sajta | P2 |
| **Broj parcele / etažni list** polja + export za notara | pred ugovor | P2 |

### 10.4 Nove ideje — rezervacija, ugovor, novac

| Ideja | Bol | Kad |
| --- | --- | --- |
| **Portal kupca** (svoj plan, sledeća rata, IPS QR, dokumenti) | sad sve ide preko agenta/Vibera | P2 posle 8 paid |
| **Su-vlasnici** na prodaji (2 fizička, % ) | KYC i ugovor pucaju na jednog | P2 |
| **Produženje rezervacije** + dodatna kapara | ručno, bez traga | P1 ako 2 klijenta pitaju |
| **Penal / odustanak** (kalkulator + status) | svađa na Viberu | P2 |
| **Checklist primopredaje** (ključevi, brojila, nedostaci) | datum postoji, tok ne | P2 → ulaz u C2 |
| **Napredak gradnje** (% po objektu) + mail kupcima | „kad useljavamo?“ | P2 |
| **e-potpis** ugovora (kvalifikovani kasnije, sad bar OTP) | print-scan-Viber | P2/P3 |
| **PIB autofill** (APR) na org i kupca-pravno lice | kucanje PIB-a | P2 |
| **Rata u mešovitom EUR/RSD** | čest slučaj u RS | P2, pažljivo |
| **SMS/Viber biznis** podsetnik rate | mail ne čitaju | P2, trošak po SMS |
| **Predplata / popust za raniju otplatu** | ručni Excel | P2 |
| **Potvrda za banku** (cena, rezervacija, pečat PDF) | C4, kredit | P2 kad 2 banke traže |

### 10.5 Nove ideje — agencije i mreža

| Ideja | Bol | Kad |
| --- | --- | --- |
| **Šta je slobodno danas** (jedan ekran, filter projekat) | agent kopa 4 menija | P2, PWA |
| **Split provizije** 2 agenta / 2 agencije | jedan snapshot ne staže | P2 |
| **Prognoza isplate** za ownera agencije | „kad ću dobiti pare“ | P2 |
| **Ekskluziva vs otvoren listing** po projektu | buyer protection nije isto | P2 |
| **Matching** (agencija vidi teaser po gradu/ceni) | katalog je statik | C3, Q3 2027 |
| **Default provizija mreže** kad investitor uključi katalog | svaka konekcija ručno | C3 |
| **Verifikacija agencije** (rok 7 dana, checklist) | PENDING stoji zauvek | P1 operativa |

### 10.6 Nove ideje — platforma, AI, LTV

| Ideja | Pravilo | Kad |
| --- | --- | --- |
| **AI mapiranje Excel kolona** | samo njihov fajl, potvrda čoveka | P2 |
| **AI draft ugovora** iz Sale + šablon | ne chatbot, diff pre save | P2 |
| **Anomalija cene** (m² 30% van projekta) | upozorenje, ne blok | P2 |
| **C2 post-sale** (reklamacije, garancija 2+3, takse) | upsell, veći LTV | P3, posle 12m |
| **Native app** | samo ako PWA padne na 10+ agenata | P3 |
| **Region CG/BiH/HR** | drugi porez, nema samo prevod | P3 |
| **Agency Pro** (plaćen portal) | default ne; agencija ostaje 0€ | P3 |
| **Javni API + webhook** (nova rezervacija → njihov CRM) | 1 klijent, ključ, rate limit | P2 |
| **Feature flag po planu** sitnije od whiteLabel | da Starter ne vuče Scale UI | P2 |

### 10.7 Šta svesno ne radimo u ovih 12 meseci

- Chatbot „pitaj PropertyDesk“.
- Rental / sekundarno tržište kao proizvod.
- Rewrite frontenda.
- Marketplace kao glavni pitch pre 20 ACTIVE + 40 agencija.
- Custom enterprise build bez SOW i min Scale.

---

## 11. Operativa zadataka (kako se radi bolje)

### 11.1 Jedna nedelja ima 3 obaveze

Format: Prodaja / Naplata / Proizvod. Sve ostalo je backlog.
Ako uđe hitan P0, izbacuje se Proizvod, ne Prodaja.

### 11.2 Definisanje „gotovo“

| Tip | Gotovo znači |
| --- | --- |
| Feature | na `staging.` proveren sa demo nalogom, pa promo po pravilu |
| Bag | reprodukcija + fix + provera na hostu gde boli |
| Demo | recap + sledeći datum + lead stage |
| WON | tenant postoji, plan stoji, oni su se ulogovali |
| Faktura | poslata, QR, status u naplati |

### 11.3 Deploy

Kao u `fix-bugs-v1`: push gradi image; **nijedan host** se ne diže
dok se ne kaže staging / demo / produkcija / oba. `my.` se ne dira
usput. Migracija additive prvo na demo bazi (već radimo sa laptopa).

### 11.4 Podrška

- Kanal: Viber/WhatsApp + mail. Ne 5 kanala.
- SLA: 4h radnim danom, 24h vikend za P1, 4h za P0 (naplata/data).
- Impersonate: razlog u audit. Posle sesije — 2 rečenice šta je bilo.
- Isti bag 2× = ticket, ne „još jednom ću ja“.

### 11.5 Kvalitet rada (vlasnik)

- Deep work 10:00–13:00: ili kod ili demo, ne oba u tabovima.
- Popodne: outreach i follow-up.
- Petak popodne: nedeljni zapis + backup svesti u §18.
- Jednom mesečno: dan bez featura — samo klijenti i brojke.

---

## 12. Promene paketa — pravila

Menja se na **mesečnoj** ili **aprilskoj** reviziji, ne ad-hoc.

### 12.1 Šta sme u Q4 2026

- Ispravka greške (pogrešna kvota, partner vidljiv kao plaćen).
- Trial dužina 30 dana — ne dirati.
- Godišnji kao opcija, ista lista cena.

### 12.2 Šta se gleda svakog meseca

- Broj org na ≥80% `maxUnits` / `maxActiveProjects` /
  `maxAgencyConnections`.
- Broj zahteva za upgrade vs downgrade.
- „Preskupo“ u LOST — samo ako su videli proizvod.
- „Prejeftino“ — koriste Scale feature na Starter (white-label
  zaobilaznica) = rupa, zatvoriti, ne dizati cenu prvo.

### 12.3 Upgrade / downgrade tok

1. Klijent ili mi predlažemo. Audit `organization.updated` / billing.
2. Upgrade odmah, proration po postojećem billing servisu.
3. Downgrade od sledećeg perioda, kvote se moraju stati (projekti
   preko limita — oni arhiviraju, mi ne brišemo).
4. Scale impersonation samo na Scale.

### 12.4 April 2027 — agenda paketa

1. Da li Starter (€49, 3 projekta, 250 jedinica) i dalje zatvara A1?
2. Da li Growth (€149) ima 2+ plaćena ili je mrtav red na sajtu?
3. Godišnji udeo. Ako <15%, loše se nudi, ne loša cena.
4. Agency i dalje 0? Default da.
5. Nova cena samo za nove + 60 dana najave.

---

## 13. Napredovanje — kako znamo da idemo gore

### 13.1 Lično / firma

| Mesec | Mora biti tačno |
| --- | --- |
| Kraj okt 2026 | 15+ razgovora, `my.` live, 3 trial |
| Kraj nov 2026 | 6+ trial ili 2 plaćena, 1 case draft |
| Kraj dec 2026 | 4+ plaćena ili 8 trial sa januarom |
| Kraj jan 2027 | prva faktura naplaćena, churn 0 |
| Kraj mar 2027 | gate §4.5 |
| Kraj jun 2027 | MRR ≥ €2.500 ili sečemo scope |
| Kraj sep 2027 | MRR ≥ €4.500 ili plan B |

### 13.2 Proizvod napreduje ako

- vreme do prve rezervacije na novom nalogu pada;
- broj impersonate sesija po klijentu pada posle 3. nedelje
  (sami rade);
- isti P1 se ne vraća;
- klijent otvori izveštaj bez nas.

### 13.3 Zarada napreduje ako

- MRR raste 3 meseca zaredom;
- ARPU ne pada (nismo davali sve kao Starter);
- DSO pada;
- nijedan „večiti trial“.

---

## 14. Prvih 12 nedelja — TODO po nedelji

Prva radna nedelja počinje **ponedeljak 28.09.2026.**

### N1 · 28.09–04.10 · temelj

- [ ] `my.` health + odluka: ostaje stari image ili promo (samo ako
      staging/demo prošli i nema live klijentskog demoa).
- [ ] Ovaj dokument odštampan u glavi: 3 KPI-ja na zid.
- [ ] PD tim: sebe kao MANAGER/CLOSER. Pipeline prazan = ružno.
- [ ] ClickUp import leadova + ritma. 8 first-touch 28.09 (Due today).
- [ ] 80 imena A1 — CSV ima ~50, dopuni 30 sa 4zida (A6 placeholderi).
- [ ] 8×5 outreach (kratka nedelja: 40).
- [ ] Resend + 1 test faktura na sebe.
- [ ] Sentry / backup / 2FA lista.

### N2 · 05.10–11.10 · prvi razgovori

- [ ] 8×5 outreach. Cilj 5 kvalifikovanih.
- [ ] 2 demoa. Recap isti dan.
- [ ] 1 trial nalog klijentu, uvoz njihovog Excel-a.
- [ ] Lista P0 sa tog uvoza — ništa drugo u kodu.

### N3 · 12.10–18.10 · ritam

- [ ] 2 demoa. 1 follow-up na N2 trial.
- [ ] Landing CTA + kalendar rade. Javni sign-in samo ako je `my.` OK.
- [ ] Snimak 8–10 min walkthrough.

### N4 · 19.10–25.10 · prva odluka

- [ ] 2 trial ili 1 plaćen.
- [ ] Mesečna provera (rano, jer je kraj oktobra u N5).
- [ ] LOST razlozi: prva tabela.

### N5 · 26.10–01.11

- [ ] Isti sales ritam.
- [ ] Ako 0 trial: cela nedelja je outreach, 0 feature-a.
- [ ] Pilot datum pretplate upisan.

### N6 · 02.11–08.11

- [ ] 1 case draft (sa / bez imena).
- [ ] Agencija na jednom pilotu pozvana.
- [ ] SEF odluka u kalendar za 15.11.

### N7 · 09.11–15.11

- [ ] **15.11 SEF odluka.**
- [ ] 4+ aktivna trial/paid ukupno.
- [ ] Health check pozivi.

### N8 · 16.11–22.11

- [ ] Godišnji Starter ponuđen onima koji koriste >2 nedelje.
- [ ] P1 iz demoa, ne iz mašte.

### N9 · 23.11–29.11

- [ ] Mesečna provera novembar.
- [ ] 6+ razgovora u toku.

### N10 · 30.11–06.12

- [ ] Q4 cilj na pola: 3 plaćena ili 6 trial.
- [ ] Ako ne: spisak 40 novih imena, ne novi landing.

### N11 · 07.12–13.12

- [ ] Januarski datumi aktivacije za trial-e.
- [ ] Reference: pitati 2 klijenta za ime.

### N12 · 14.12–20.12

- [ ] Kvartalna provera Q4. Brojke u §18.
- [ ] Plan N13–N16 (januar) samo prodaja + zadržavanje.
- [ ] 21–27.12: lagani follow-up, ne launch.

Od N13 (28.12) važi §6. Isti nedeljni obrazac, bez novog 12-week
romana — kopira se N2 ritam.

---

## 15. Mesec po mesec posle prvih 12 nedelja

| Mesec | Fokus | Mora |
| --- | --- | --- |
| Jan 2027 | naplata + 30d health | prva uplata, churn 0 |
| Feb 2027 | isti kanal, auto-zadaci | 2 nova paid |
| Mar 2027 | gate | §4.5 odluka |
| Apr 2027 | revizija paketa | zapisana odluka |
| Maj 2027 | A2 / Growth | 1 Growth |
| Jun 2027 | sajam ili partner | MRR €2.5k ili sečenje |
| Jul 2027 | white-label / PWA | 1 stvar koju A2/A4 oseća |
| Avg 2027 | godišnji close | 35% na godinu ako ide |
| Sep 2027 | 12m obračun | §1 tabela, plan B ili skala |

---

## 16. Budžet i zarada (grub okvir)

Ne mešati MRR sa kešom.

**Trošak (reda veličine, držati nisko):** VPS, 2× Supabase, S3,
Resend, Sentry, domen, banka, knjigovodstvo, sajam. Cilj: < €400/mes
fiksno u Q4, < €800/mes u Q3 2027 bez plata.

**Keš pravilo:** ne trošiti na ads više od 20% MRR. Prvih 6 meseci
ads samo ako 2 nedelje merimo CAC < 1 mesečne pretplate. Default:
ruke i telefon.

**Cilj keša 12m:** MRR €4.5–8k, trošak < €1.5k (sa jednim setterom
na %), ostatak je plata / rezerva / porez — knjigovođa, ne ovaj MD.

---

## 17. Rizici i potez

| Rizik | Signal | Potez |
| --- | --- | --- |
| Niko ne plaća | 0 ACTIVE do 15.12 | svaki dan 8 poziva, feature freeze |
| Plaćaju pa odlaze | churn >10% | 30d health, seći novi kod |
| `my.` nestabilan | P0 >48h | samo incident |
| Cena niska, rad veliki | ARPU <€60, sati podrške veliki | upgrade priča, ne novi Starter popust |
| Cena visoka | 5+ LOST „skupo“ posle demoa | godišnji, ne odmah −€20 |
| Jedan klijent jede vreme | >4h/nedelja | naplatiti onboarding ili Scale |
| GHA/SSH | deploy ručno | ne blokira prodaju |
| SEF / poreska | klijent ne može knjižiti | ubrzati SEF ili PDF+knjigovođa uputstvo |
| Pravni | ugovor/KYC | šablon + advokat, ne feature sprint |

---

## 18. Dnevnik odluka (upisivati ovde)

| Datum | Tip | Odluka | Sledeća provera |
| --- | --- | --- | --- |
| 2026-09-21 | plan | Dokument otvoren. Start 28.09.2026. Cene 49/149/399. Agency 0. | N1 28.09 |
|  | nedeljna |  |  |
|  | mesečna |  |  |
|  | kvartalna |  |  |
|  | paketi |  |  |

Šablon nedelje (lepi ispod):

```
### YYYY-MM-DD (pon)
Lead: n=  q=  d=  w=  l=
MRR:     ACTIVE:     TRIAL:
P0/P1:
3 obaveze: 1)  2)  3)
Blokada:
Odloženo:
```

---

## 19. Prva strana za 28.09. u 09:00

1. ClickUp lista Leadovi: 8 taskova Due 28.09. Nađi kanal, 8 poruka §9.3.
2. Ko se javi — isti dan PD lead + `PD sync`.
3. Proveri `my.` health. Zapiši: promo ili ne.
4. Tri obaveze N1: outreach / health-naplata / lista P0 sa produkcije.
5. Zaključi do 09:25. Ostatak dana je izvršenje, ne planiranje.

Veći goal se ne postiže dužim dokumentom. Postiže se time što
ponedeljkom stoje brojke, a petkom stoje razgovori.
