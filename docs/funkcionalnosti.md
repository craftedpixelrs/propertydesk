# PropertyDesk — Kompletan katalog funkcionalnosti (v1)

Kompaktna lista svih funkcionalnosti aplikacije po modulu. Namenjena
prodajnim razgovorima, landing page-u i uvodu za nove korisnike.
Detaljan operativni tok je u [`demo-tok.md`](./demo-tok.md).

**Slide prezentacija:** otvori
[`prezentacija-funkcionalnosti.html`](./prezentacija-funkcionalnosti.html)
u browseru (`F` = fullscreen, `←`/`→` / Space = navigacija).

Verzija: **v1** · Datum lansiranja: **01.09.2026.**

---

## 1. Projekti i zalihe

- Hijerarhija: **Projekat → Objekat → Ulaz → Sprat → Jedinica**
  (sve razine osim projekta i jedinice su opcione).
- Vrste jedinica: `APARTMAN`, `LOKAL`, `GARAŽA`, `OSTAVA`, `STUDIO`,
  `PENTHOUSE`, `KUĆA`, `ZEMLJIŠTE`.
- Statusi jedinice: `PLANIRANA`, `DOSTUPNA`, `REZERVISANA`, `PRODATA`,
  `POVUČENA`, `ARHIVIRANA` — svaki prelaz ide kroz servisni sloj i
  ostavlja `UnitStatusHistory`.
- Cene: osnovna, konačna, cena po m², PDV stopa/uključen, valuta —
  svaka izmena ostavlja `UnitPriceHistory` sa aktorem i razlogom.
- **CSV/XLSX uvoz** — 3-korak wizard (šablon → upload → preview).
- **Duplikat projekta** (Faza 8) — kopira strukturu (Objekat/Ulaz/
  Sprat/Jedinica) sa `PLANIRANA` statusom; ne kopira prodaje.
- **Optimističko zaključavanje** (`version` kolona) — sprečava tiho
  gaženje istovremenih izmena.
- **Interaktivni floor-plan** — SVG poligoni preko rastera osnove
  sprata, klik na poligon vodi na jedinicu, boja po statusu.
- **Foto-galerije** — više fotografija po jedinici i projektu,
  redosled, naslovna slika za javnu ponudu i Open Graph.
- **Public microsite** (Faza 8) — javni sajt projekta na
  `/p/projekat/[slug]` sa listom dostupnih jedinica i mapom.

## 2. CRM (kupci)

- Fizička i pravna lica; stranci (bez JMBG-a, sa pasošem).
- KYC polja: JMBG, broj LK, PIB, entityType (`NATURAL`/`LEGAL`),
  legalName, kompletna adresa (address/city/postal/country).
- **KYC checklist** (Faza 8) — 4 flag-a (LK front, LK back, dokaz
  adrese, poreska potvrda) + notes + reviewer/timestamp. **Blokira
  generisanje ugovora dok nije kompletan.**
- Automatska **detekcija duplikata** (po normalizovanom telefonu i
  emailu) — non-blocking upozorenje, operator potvrđuje.
- Timeline aktivnosti (pozivi, mailovi, sastanci) + zadaci sa
  rokovima i prioritetima.
- Buyer protection (agencijska): 60 dana ekskluziva, drugoj agenciji
  daje anonimizovan `CONFLICT_REVIEW`.
- @mentions u komentarima na kupca i prodaju — in-app notifikacija.
- Anonimizacija (GDPR) — briše lične podatke, zadržava statistiku.

## 3. Rezervacije

- **Interna rezervacija** — iz detalja jedinice ili kupca, TTL 7
  dana (podesivo).
- **Online rezervacija sa kaparom** (Faza 8) — javna forma na
  `/p/[token]`, IPS QR PNG za kaparu automatski generisan, TTL 48h,
  rate-limit 10 zahteva/sat/IP.
- Statusi: `AKTIVNA`, `KONVERTOVANA`, `ISTEKLA`, `OTKAZANA`.
- Automatski cron `expire-reservations` (15 min) + podsetnici 2
  dana pre isteka.
- Kanban tabla (`/rezervacije?view=board`) — drag&drop između
  kolona sa FSM validacijom na serveru.
- Race-condition sigurnost: partial unique index u bazi ne dozvoljava
  dve aktivne rezervacije nad istom jedinicom.

## 4. Prodaje

- Wizard: konverzija rezervacije **ili** direktna prodaja.
- Popust (fiksan / %) i konačna cena decimal-safe računat.
- Statusi: `DRAFT`, `UGOVORENA`, `AKTIVNA`, `ZAVRŠENA`, `OTKAZANA`.
- **VAT/RPI mod** (Faza 8): `NEW_BUILD_10` (10% PDV, novogradnja) /
  `SECONDARY_MARKET_2_5` (2.5% porez na prenos apsolutnih prava) /
  `NONE`. Automatski obračun `taxAmount` i propagacija u ugovor.
- **Generator ugovora u PDF-u** (Faza 8) — reusable HTML šabloni sa
  `{{var}}` placeholder-ima, kind `PRE_CONTRACT` / `CONTRACT`,
  status flow `NONE → GENERATED → SENT → SIGNED`.
- Kanban tabla za prodaje.
- Optimističko zaključavanje na Sale, Unit, Reservation.

## 5. Plan otplate i uplate

- **Šabloni planova otplate** — org-level default + project-level
  override; procenti moraju da daju 100% (tolerancija 0.001%).
- **Manualni unos rata** — operator dodaje ratu u postojeći plan;
  upozorenje ako totalni iznos pređe finalnu cenu prodaje.
- Due-date anchors: `CONTRACT` (od datuma ugovora), `HANDOVER` (od
  primopredaje), `CUSTOM_OFFSET` (od kreiranja prodaje).
- **FIFO alokacija uplata** — automatsko raspoređivanje po
  najstarijoj otvorenoj rati; višak ostaje kao `unappliedAmount`.
- Ručna realokacija po rati (kad kupac napiše "ovo za ratu 3").
- Storniranje uplate — kreira paired negativnu alokaciju, ništa se
  ne briše, obavezan razlog.
- Cron `mark-installments-overdue` (dnevno) + email podsetnici 3
  nivoa (3 dana pre, na dan, 7 dana posle).

## 6. Agencijski portal

- Agencija je **besplatan partner nalog** (`saas_plan.code = partner`):
  nema Starter/Growth/Scale, nema trial lock, nema SaaS fakturu, nema
  istek paketa. Pristup inventaru ide isključivo preko poziva
  investitora. Nema javne self-registracije. Admin može
  `SUSPENDED` / `CLOSED`.
- **Poziv po emailu** (`/agencije`) — investitor unosi email (naziv
  opciono). Ne mora da zna da li agencija već ima nalog.
  - Novi email: partner org + `agencyPartnerInvitationEmail` →
    registracija (ime + lozinka) **i** popunjavanje profila agencije
    (sva polja sem sajta: naziv, PIB, MB, adresa, kontakt). Prvi setup
    aktivira pending konekcije.
  - Postojeća agencija: `agencyConnectionInvitationEmail` →
    `/agencija/konekcije` → **Prihvati poziv**. Kasniji pozivi ostaju
    `INVITED` dok se ne prihvate.
- **Access control po projektu i jedinici**: agencija vidi samo
  projekte za koje ima `AgencyProjectAccess`; per-unit override može
  sakriti dodatne.
- **Buyer protection** 60 dana (podesivo per-connection).
- **Provizijska pravila** — precedencija unit+agency → project+agency
  → connection default → project default; snapshot na momentu
  ugovora (immutable).
- **Referral kod** (Faza 8) — 8-char unique kod po konekciji, QR PNG
  + copy link, cookie 90 dana, atribucija u
  `/izvestaji/agencije`.
- Lifecycle provizije: `PENDING → APPROVED → READY_FOR_PAYOUT →
  PAID` (ili `CANCELED`).
- **Agency portal** — sopstveni sidebar: **Ponuda**, **Moji kupci**,
  **Moje rezervacije**, **Moje provizije**.

## 7. Dokumenti

- Kategorije: `PROJECT`, `UNIT`, `BUYER`, `RESERVATION`, `SALE`,
  `PAYMENT`, `AGENCY`, `COMMISSION`, `INVOICE`, **`KYC`** (Faza 8).
- Vidljivost: `INTERNAL` / `AGENCY` — agencijski dokument mora imati
  i `AGENCY` visibility **i** projekat na koji agencija ima pristup.
- MIME allowlist dokumenata: PDF, JPEG, PNG, DOCX, XLSX. Max 20 MB.
- Logo organizacije: PNG/JPEG/WebP **i sanitizovani SVG**
  (`src/lib/images/svg.ts`). Javni stream ima CSP. SVG nije dozvoljen
  kao običan dokument u galeriji.
- Signed URL download (5 min lifetime). S3 download ruta radi
  302 na signed URL (galerija / `<a href>`).
- Brisanje u UI-ju je soft-delete: red nestaje iz app-a, fajl ostaje
  u bucketu 45 dana, pa ga `purge-deleted-documents` obriše.
- **Sale document upload** — investorska i kupčeva strana
  dokumentacije za ugovor (Faza 7).
- **Floor plan upload** — direktno iz forme za sprat, PNG/JPG.

## 8. Dashboard i izveštaji

- **Kontrolna tabla** — KPI kartice: ukupna vrednost jedinica,
  ugovoreno, naplaćeno, preostalo, aktivne rezervacije, zadaci
  danas, top prodavci.
- **Grafikoni na dashboardu i u izveštajima**:
  - Donut po statusu (zalihe, rezervacije, prodaje).
  - Funnel: rezervacija → ugovor → naplaćeno.
  - Trend linija: mesečne prodaje i uplate.
- Izveštaji (svi sa CSV/XLSX export-om i share link-om):
  - Prodaje (po mesecu, projektu, prodavcu, statusu).
  - **Zalihe** — dostupno/rezervisano/prodato + **time-to-sale**
    (Faza 8, prosečan broj dana do prodaje po projektu i tipu).
  - Uplate + **cash-flow projekcija 12 meseci** (Faza 8).
  - Rezervacije (konverzija, prosečno trajanje).
  - Kupci (izvor, kanal, ROI marketinga).
  - Agencije — prodaje po agenciji, provizije, **referral atribucija**.
- **Project P&L** (Faza 8): finalna cena − (landCost +
  constructionCost + marketingCost + otherCost) = marža po projektu.

## 9. Kalendar i pretraga

- **Kalendar** (`/kalendar`) — mesečna mreža sa 4 tipa događaja:
  rokovi rezervacija, dospele rate, zadaci, planirane primopredaje.
  Filter dugmad na vrhu, klik na traku vodi na entitet.
- **Global search (Cmd+K / Ctrl+K)** — pretraga projekata, jedinica,
  kupaca; poštuje RBAC (agent nikad ne vidi kupce drugog investitora).
- **Sortiranje i filtri** u URL-u — link se može podeliti sa timom.

## 10. Onboarding i deljenje

- **Onboarding wizard** — pri prvom logovanju vlasnika investitor
  organizacije, kroz 5 koraka (org profil, prvi projekat, pozivanje
  člana, prva jedinica, prvi kupac).
- **Vodič stranice** — na svakoj stavci sidebara (i karticama
  podešavanja) kratak wizard: čemu služi, kako se koristi,
  Previous/Next. Prva poseta otvara jednom; dugme „Kako se koristi“
  vraća vodič. sr / en.
- **Agencija, prvi nalog** — posle pozivnice vlasnik mora da popuni
  profil agencije pre portala. Kasniji pozivi drugih investitora su
  samo Prihvati na `/agencija/konekcije`.
- **Lokacija projekta** — predlog grada/adrese/opštine (Srbija) +
  automatski PTT i koordinate. Naslovna slika ide na S3.
- **Datumi u formama** — `DateInput` prati jezik UI-ja (`dd.mm.yyyy`
  / `mm/dd/yyyy`). Headeri šablona uvoza jedinica isto prate jezik.
- **Public share linkovi** (`/p/[token]`) — 192-bit token, opciono
  sakrivanje cena, opciono expiry, opozivanje trenutno.
- **Javna ponuda jedinice** — brand, foto galerija, floor plan,
  opciono kapara sa IPS QR-om.
- **Public microsite** projekta (Faza 8).

## 11. Notifikacije i saradnja

- Zvono u header-u + `/obavestenja` sa filterima po kategoriji.
- Email + in-app — kategorija se određuje po događaju.
- Per-user opt-out po kategoriji + "ne šalji van radnog vremena".
- **Komentari sa @mentions** na kupca i prodaju; soft-delete.
- **Zadaci** — Danas / Prekoračeni / Nadolazeći / Završeni;
  prioritet, dodela, veza sa entitetom.
- **Auto-generisani zadaci** — rezervacija ističe za 2 dana,
  rata dospela, ugovor za potpisivanje, depozit vraćen.

## 12. SaaS naplata (za investitorske plate)

- Plans: Starter, Growth, Scale + custom Enterprise.
- Cikli: mesečno / kvartalno / polugodišnje / godišnje.
- Trial 30 dana + trial-expiration email.
- Automatska generacija faktura + slanje sa **IPS QR** kodom.
- FIFO alokacija SaaS uplata; postpaid transitions
  (`PAYMENT_DUE → PAST_DUE → RESTRICTED → SUSPENDED`).
- **Bankarski izvodi** — CSV/XLSX upload, 5-signal matcher
  automatski povezuje uplate sa fakturama.
- **SEF integracija** (stub — pripremljeno za produkciju).
- 14 gotovih email šablona (izdavanje, podsetnik, prekid, reactivate).

## 13. Multi-tenant + platforma

- Better Auth za sesije + organizations plugin (multi-tenant).
- Impersonate od super-admina — trakica na vrhu, sve akcije
  auditovane sa `impersonatedBy` metapodatkom.
- **Audit log** cross-tenant (`/administracija/revizija`) — filter po
  datumu, tenant-u, akciji, korisniku, entitetu; immutable.
- **Role editor** (`/administracija/role`) — super-admin može
  toggle-ovati bilo koju dozvolu za bilo koju rolu bez izmene koda.
- **Plan editor** (`/administracija/planovi`) — pun CRUD SaaS
  planova sa iz UI-ja.
- 9 rola (INVESTOR_OWNER/ADMIN/…, SALES_MANAGER/AGENT, FINANCE,
  INVESTOR_VIEWER, AGENCY_OWNER/ADMIN/AGENT/VIEWER, SUPER_ADMIN).

## 14. Automatizacija (cron jobs)

- `expire-reservations` (15 min)
- `expire-reservation-requests` (15 min, Faza 8)
- `expire-buyer-protection` (hourly)
- `mark-installments-overdue` (dnevno 01:15)
- `due-soon-notifications` (dnevno 07:00)
- `trial-expiration-notifications` (dnevno 06:30)
- `backup-verify` (nedeljno pon 03:00, Faza 8)
- `purge-deleted-documents` (dnevno 04:00) — objekat sa S3/local se
  briše 45 dana nakon soft-delete-a u aplikaciji
- 7 billing cron-ova (invoice generation, sending, reminders,
  overdue transitions, subscription extension, SEF sync, payment
  matching).

## 15. Monitoring i backup

- **Sentry** (Faza 8) — client + server + edge runtime,
  PII scrubbing (auth headers, cookies, cron secret), source-map
  upload, environment tagging.
- **Backup verifier** (Faza 8) — nedeljno preuzima najnoviji
  `pg_dump`, izvršava `pg_restore --list`, upisuje
  `SystemHealthCheck` red, email alert nakon 2 uzastopna FAIL-a.
- **`/administracija/monitoring`** — timeline zdravstvenih provera,
  ručno pokretanje "Pokreni proveru sada".
- Health endpoints: `/api/v1/health`, `/api/v1/ready` (sa DB ping).

## 16. Sigurnost

- Rate limiting na sve `/public/*` rute + login + sensitive actions.
- CSRF preko Better Auth + `SameSite=Lax` cookies.
- Passwordless magic link (dozvoljeno je i lozinkama).
- Encrypted at rest (Postgres AES) + TLS in transit.
- `.env` validacija sa Zod na startu — mismatch krešuje proces
  odmah da ne rade sa polovinom secreta.
- Audit trail immutable — kritične akcije uvek zapisane.
- Signed URLs za dokumente (5 min).
- KYC dokumenti nikad ne izlaze u agencijske DTO.

## 17. UX i mobilna upotreba

- **PWA** — instalabilna na mobilni telefon (Add to Home Screen).
- Bottom nav bar na < 768px, hamburger za dodatne stavke.
- Vodič stranice (floating „Kako se koristi“) iznad bottom nav-a.
- Swipe akcije na listama (Rezerviši / Označi kao završen).
- Fixed "+" dugme za najčešće akcije (Nova rezervacija / Nova
  uplata / Novi kupac).
- Offline read-only za već cache-ovane stranice.
- Sve poruke i UI na srpskom (Latinica), formatovanje datuma,
  brojeva i valuta prema `sr-Latn` locale.

## 18. Integracije

- **IPS QR** — NBS specifikacija, na SaaS fakturama i na online
  rezervacijama sa kaparom (Faza 8).
- **SEF** (stub) — Sistem elektronskih faktura Srbije,
  produkcijski gateway pripremljen.
- **S3-kompatibilan storage** — StorageProvider abstraction
  (Local disk / AWS S3 / Cloudflare R2 / MinIO / Wasabi).
  Brisanje u app-u je soft-delete; objekat ostaje u bucketu 45 dana,
  zatim ga cron `purge-deleted-documents` ukloni.
- **Email provideri** — konzola (dev), SMTP, Resend.
- **Sentry** — error + performance monitoring.

## 19. API i integracija

- REST `/api/v1/*` — svi endpointi enveloped sa
  `{ data, error, requestId, meta }`.
- OpenAPI dokumentacija u [`docs/api.md`](./api.md).
- 8 novih Faza 8 grupa endpointa: reservation-requests,
  sale-contract-templates, sales/contract, sales/tax, buyers/kyc,
  projects/clone, agency/referral, platform/monitoring.
- Public API (bez auth): `/public/share/:token/reserve`,
  `/public/reservation-requests/:id/qr`.

---

## Faza 8 delta (šta je novo u v1)

Ako trebaš da nekome brzo objasniš šta je stiglo u v1 iznad "obične
CRM aplikacije":

1. **Online rezervacija sa IPS QR kaparom** — kupac plati skeniranjem,
   bez prekucavanja.
2. **Generator ugovora u PDF-u** — reusable šabloni sa placeholder-ima,
   audit trag statusa (Generisan → Poslat → Potpisan).
3. **KYC modul za kupce** — JMBG/PIB/LK checklist, obavezno pre
   ugovora.
4. **Cash-flow projekcija 12 meseci** — po mesecu, priliv/odliv.
5. **Time-to-sale metrika** — prosečan broj dana do prodaje po
   projektu i tipu jedinice.
6. **Project P&L** — marža po projektu (prihod − landCost −
   constructionCost − marketingCost − otherCost).
7. **CSV/XLSX importer za jedinice** — 3-korak wizard.
8. **Duplikat projekta** — jednoklik kopija strukture.
9. **VAT/RPI mod na Sale** — 10% PDV za novogradnju / 2.5% PPAP za
   sekundarno tržište, propagacija u PDF ugovor.
10. **Public microsite projekta** — brendirani javni sajt na
    `/p/projekat/[slug]`.
11. **Referral kod za agencije** — jedinstveni link + QR, cookie 90
    dana, atribucija u izveštaju.
12. **@sentry/nextjs integracija** — client/server/edge sa PII
    scrubbing i source-map upload-om.
13. **Automatski backup verifier** — nedeljno + email alerti nakon 2
    uzastopna FAIL-a.

Detalji svakog Faza 8 modula u odvojenim dokumentima:
- [`reservation-requests.md`](./reservation-requests.md)
- [`sale-contracts.md`](./sale-contracts.md)
- [`kyc.md`](./kyc.md)
- [`microsite.md`](./microsite.md)
- [`referral.md`](./referral.md)
- [`monitoring.md`](./monitoring.md)
