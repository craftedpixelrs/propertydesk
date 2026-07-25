# Role, dozvole i planovi — administrativni vodič

Ovaj dokument opisuje kako super-admin uređuje **role i dozvole** i kako se
kreiraju/uređuju **SaaS planovi** za organizacije.

---

## 1. Uređivanje rola i dozvola

Stranica: **Administracija → Role i dozvole** (`/administracija/role`).

### Kako sistem radi

- Sve role imaju **podrazumevane dozvole** definisane u kodu (fajl
  `src/server/permissions/roles.ts`). Ove default-e ne treba menjati bez
  razloga — oni predstavljaju „bezbednu polaznu konfiguraciju".
- Ovaj sistem dodaje sloj **override-a**: za bilo koji par `(rola,
  dozvola)` možete eksplicitno odobriti ili zabraniti dozvolu, bez
  promene koda.
- Ako nema override-a, primenjuje se podrazumevana vrednost.
- Sve što izmenite se pamti u tabeli `role_permission_override` i može se
  u svakom trenutku obrisati (vraća stanje na podrazumevano).

### Kako izgleda ekran

- Padajući meni sa listom svih rola. Trenutno postoje:
  - `INVESTOR_OWNER`, `INVESTOR_ADMIN`, `SALES_MANAGER`, `SALES_AGENT`,
    `FINANCE`, `INVESTOR_VIEWER`
  - `AGENCY_OWNER`, `AGENCY_ADMIN`, `AGENCY_AGENT`, `AGENCY_VIEWER`
  - `SUPER_ADMIN` (platformska rola — `platform.*` dozvole su zaključane
    da super-admin ne bi mogao slučajno da izgubi pristup platformi).
- Tabela sa 4 kolone:
  - **Dozvola** — u formatu `resurs.akcija` (npr. `project.create`,
    `billing.invoice.manage`).
  - **Podrazumevano** — šta kod dodeljuje ovoj roli iz kutije.
  - **Trenutno** — efektivna vrednost (default + override, ako postoji).
    Žuta tačka pored teksta označava „ručno postavljeno".
  - **Akcija** — 3 dugmeta:
    - `Dozvoli` — override na `true`
    - `Zabrani` — override na `false`
    - `Podrazumevano` — obriši override (pojavljuje se samo ako postoji
      override)

### Tok rada

1. Izaberete rolu iz padajućeg menija.
2. Kliknete `Dozvoli`, `Zabrani` ili `Podrazumevano` po pojedinačnim
   dozvolama. Izmene se lokalno akumuliraju kao „nesnimljene".
3. Broj nesnimljenih izmena vidi se u zaglavlju. Kliknete
   `Sačuvaj izmene` — sve se šalje kao jedan PATCH zahtev.
4. Sistem pravi audit zapise (`role_override.set`) za svaku dozvolu.
5. Ako želite potpuni reset: `Vrati rolu na podrazumevano` — briše sve
   override-e ove role.

### Ograničenja

- `SUPER_ADMIN` **ne može** izgubiti `platform.*` dozvole. Sistem ih
  ignoriše da bi konzola za administraciju uvek ostala dostupna. Sve
  ostale dozvole SUPER_ADMIN-a se mogu suziti.
- Rola se dodeljuje članu organizacije prilikom pozivanja ili kroz
  „Podešavanja → Članovi" — ovaj ekran samo definiše šta koja rola
  MOŽE da radi, ne dodeljuje ih ljudima.

### Kako se dozvole efektivno primenjuju

- Serverska strana (API rute, server komponente) proverava dozvole preko
  `requirePermission("project.create")` i sličnih helper funkcija. One
  konsultuju override sloj pre nego što padnu na default.
- Frontend strana (navigacija, dugmad, PermissionGuard komponenta)
  koristi snapshot dozvola koji se učitava sa `loadUserContext()`. Cache
  se osvežava svakih 10 sekundi i odmah nakon izmene.

### Primer

„Želim da agent prodaje (`SALES_AGENT`) može da menja cene jedinica."

1. Otvori Administracija → Role i dozvole.
2. Padajući meni: `SALES_AGENT`.
3. Nađi u tabeli red `inventory.price`. Podrazumevano: Zabranjeno.
4. Klik na `Dozvoli`.
5. `Sačuvaj izmene`.

Od sledećeg zahteva svaki agent prodaje moći će da vidi i koristi dugme
za promenu cene na detalju jedinice.

---

## 2. Uređivanje SaaS planova

Stranica: **Administracija → Planovi** (`/administracija/planovi`).

### Kako sistem radi

- Planovi su modele pretplate koje organizacije mogu da izaberu prilikom
  aktivacije (ili im ih dodeli super-admin).
- Svaki plan sadrži:
  - **Šifru** (kratka jedinstvena oznaka, npr. `starter`, `pro`,
    `enterprise`) — **ne menja se** posle kreiranja.
  - **Naziv** i opis.
  - **Cene** po ciklusima: mesečno (obavezno), kvartalno, polugodišnje,
    godišnje. Ako neka nije postavljena, sistem računa
    „N × mesečna cena".
  - **Onboarding fee** — jednokratna naknada za aktivaciju.
  - **Valutu** (3-slovni ISO kod, npr. `EUR`, `RSD`).
  - **Kvote** — max broj aktivnih projekata, jedinica, članova,
    konekcija sa agencijama. Prazno = neograničeno.
  - **Trajanje probnog perioda** (dani) — prazno znači koristi globalno
    podešavanje.
  - **Flag-ove**: aktivan, javno dostupan, preporučen.

### Kreiranje

1. Otvori Administracija → Planovi.
2. `+ Novi plan`.
3. Popuni formu i klikni `Kreiraj plan`. Vraća te na listu.

### Izmena

1. Otvori Administracija → Planovi.
2. Klik na `Izmeni` na kartici plana.
3. Menjaš šta hoćeš (osim šifre) i klikneš `Sačuvaj izmene`.

Sve izmene se audit-uju (`platform.plan_updated`).

### Arhiviranje / Brisanje

Na stranici za izmenu plana postoji **Opasna zona** sa dve akcije:

#### Arhiviraj (`platform.plan_archived`)

Postavlja `active=false` i `publiclyAvailable=false`. Efekat:

- Plan se ne prikazuje u listi za nove pretplate.
- Postojeće pretplate koje ga koriste **ostaju** — svi njihovi
  invoice-i, računi i istorija su netaknuti.
- U svakom trenutku možete vratiti plan u upotrebu klikom `Vrati u
  upotrebu`.

Ovo je **preporučeni način uklanjanja plana**.

#### Trajno obriši (`platform.plan_deleted`)

- Dostupno samo ako plan **nema ni jednu pretplatu ni jednu istorijsku
  fakturu**. U suprotnom je dugme onemogućeno.
- Fizički briše red iz tabele `saas_plan`. Nema povratka.
- Ako plan ima istoriju, morate ga arhivirati.

### Vidljivi vs. skriveni planovi

- `active=false` — plan se ne pojavljuje kao izborna opcija za nove
  pretplate.
- `publiclyAvailable=false` — plan se ne prikazuje na javnoj cenovnoj
  stranici, ali super-admin ga može ručno dodeliti organizaciji (npr.
  interni „custom enterprise" planovi).
- `recommended=true` — dodaje se „preporučeno" oznaka u prikazu za javne
  planove.

---

## 3. Audit trag

Sve akcije iz ovog dokumenta se pišu u `audit_log`:

| Akcija | Kada nastaje |
|--------|--------------|
| `role_override.set` | Bilo koja izmena dozvole za rolu |
| `role_override.reset` | Reset svih override-a za jednu rolu |
| `platform.plan_created` | Kreiran novi plan |
| `platform.plan_updated` | Izmenjen postojeći plan |
| `platform.plan_archived` | Plan arhiviran |
| `platform.plan_restored` | Plan vraćen u upotrebu |
| `platform.plan_deleted` | Plan trajno obrisan |

Zapisi se mogu videti na dashboardu (**Administracija → Kontrolna
tabla**, sekcija „Poslednje revizijske stavke") i, kada bude
implementiran filter, na dedikovanom auditu ekranu.

---

## 4. API pregled (za integracije / automatizaciju)

### Role & dozvole

```
GET    /api/v1/platform/roles/matrix
       → { data: { permissions[], roles[], cells: {role: {perm: {default, effective, hasOverride}}} } }

PATCH  /api/v1/platform/roles/{role}
       body: { changes: [{ permission: "project.create", granted: true | false | "default" }, ...] }
       → { data: { applied: number } }

POST   /api/v1/platform/roles/{role}/reset
       → { data: { removed: number } }
```

### Planovi

```
GET    /api/v1/platform/plans
POST   /api/v1/platform/plans           // create
PATCH  /api/v1/platform/plans/{id}      // update
DELETE /api/v1/platform/plans/{id}      // hard delete (only if no history)
POST   /api/v1/platform/plans/{id}/archive
       body: { action: "archive" | "restore" }
```

Sve rute traže SUPER_ADMIN sesiju.
