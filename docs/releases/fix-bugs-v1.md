# Fix bugs v.1

Train za ispravke pre prodaje. **Nema novih feature-a.** Testiramo,
popravljamo, pa tek onda dižemo demo i produkciju.

## Pravilo

Radimo za **staging train**. Kod se commituje / gura, image se
bilduje na GHCR. **Nijedan host se ne redeplojuje** dok eksplicitno
ne kažemo koji.

| Host | Kada se dira |
|------|----------------|
| `staging.propertydesk.app` | Samo kada kažemo „idi na staging“. |
| `demo.propertydesk.app` | Samo kada kažemo „idi na demo“. |
| `my.propertydesk.app` + `propertydesk.app` | Samo kada kažemo „idi na produkciju“. |
| demo + produkcija | Samo kada kažemo „idi na oba“ (demo i produkcija). |

Staging i demo dele **istu bazu i fajlove**. Sesije su odvojene po hostu.

## Šta je u ovom trainu

| Stavka | Status | Staging | Demo | Produkcija |
|--------|--------|---------|------|------------|
| SEO: indeks samo `propertydesk.app` | urađeno ranije | da | da | da |
| Demo login tabela (bez super-admina) | urađeno ranije | ne (samo `demo.`) | da | ne |
| `/izvestaji/prodaje` — P&L je zvao nepostojeće `commission.paidAmount` | urađeno | da | čeka odluku | čeka odluku |
| Logo kompanije ne menja sidebar (white-label Growth/Scale) | urađeno | da | čeka odluku | čeka odluku |
| Logo u sidebaru 429 / ne učitava se — služi se sa S3 kao ostali dokumenti | urađeno | da | čeka odluku | čeka odluku |
| White-label sidebar: samo logo, bez naziva organizacije pored | urađeno | da | čeka odluku | čeka odluku |
| Mobile bottom nav: „Kontrolna tabla“ nije centrirana | urađeno | da | čeka odluku | čeka odluku |
| Date input: sr `dd.mm.yyyy`, en `mm/dd/yyyy`, konverzija pri promeni jezika | urađeno | da | čeka odluku | čeka odluku |
| Uvoz jedinica: headeri šablona na jeziku aplikacije (sr/en) | urađeno | da | čeka odluku | čeka odluku |
| Vlasnik ne može da komentariše kupca — API je tražio nepostojeće `buyer.read` | urađeno | da | čeka odluku | čeka odluku |
| Logo kompanije: dozvoli SVG (vektor, sanitizacija) | urađeno | da | čeka odluku | čeka odluku |
| Projekat: predlog grada/adrese/opštine + auto PTT/koordinate | urađeno | da | čeka odluku | čeka odluku |
| Projekat: naslovna slika na S3 + javni preview | urađeno | da | čeka odluku | čeka odluku |
| Agencija: free partner, bez pretplate / isteka paketa | urađeno | da | čeka odluku | čeka odluku |
| Poziv agencije: email umesto org ID (pravi partner nalog ako ne postoji) | urađeno | da | čeka odluku | čeka odluku |
| Poziv agencije: prvi put profil (ime, PIB adresa…), postojeća = samo Prihvati | urađeno | da | čeka odluku | čeka odluku |

**Baza (podaci, ne migracija):** plan `partner` je upsert-ovan na demo/staging i na `my.` (`scripts/apply-agency-partner-data.cjs`). Nema nove Prisma migracije. Top Nekretnine na demo bazi je ACTIVE + partner. Na `my.` još nema agencija.

Kad se pojavi sledeći bug, dodaj red ovde. Ne otvaraj novi train dok
ovaj ne završimo ili ga svesno zatvorimo.

## Promocija (kad odlučimo)

Image je već na GHCR (`ghcr.io/craftedpixelrs/propertydesk:latest` +
sha). GHA deploy job i dalje puca na SSH — promocija je ručni pull na
VPS-u.

### 1. Staging (samo kada kažemo „idi na staging“)

Sa lokala (PowerShell). **Samo** `app-staging`. Ne diraj `.env.deploy`
koji drži pin za demo/produkciju.

```powershell
# sačuvaj skriptu ili nalepi u SSH:
# docker pull ghcr.io/craftedpixelrs/propertydesk:latest
# DIGEST=$(docker image inspect --format '{{index .RepoDigests 0}}' ghcr.io/craftedpixelrs/propertydesk:latest)
# cd /opt/propertydesk
# IMAGE="$DIGEST" docker compose --env-file .env --env-file .env.deploy up -d --no-build app-staging
```

Provera: `https://staging.propertydesk.app/izvestaji/prodaje` kao
`vlasnik@gradnjaplus.test`. Posle ovog deploya: otpremi logo na
`/podesavanja/organizacija` i proveri da sidebar više nije PropertyDesk
(Gradnja Plus je na Growth).

### 2. Demo (walkthrough)

Tek kad je staging OK i nema klijentske sesije uživo.

```bash
cd /opt/propertydesk
DIGEST=$(docker image inspect --format '{{index .RepoDigests 0}}' ghcr.io/craftedpixelrs/propertydesk:latest)
# pin koji će koristiti i naredni full up
grep -v '^IMAGE=' .env.deploy > .env.deploy.tmp || true
printf 'IMAGE=%s\n' "$DIGEST" >> .env.deploy.tmp
mv .env.deploy.tmp .env.deploy
IMAGE="$DIGEST" docker compose --env-file .env --env-file .env.deploy up -d --no-build app-demo
```

Provera: `https://demo.propertydesk.app/izvestaji/prodaje` + login tabela.

### 3. Produkcija (`my.` + landing)

Tek kad je demo OK.

```bash
cd /opt/propertydesk
IMAGE="$(grep '^IMAGE=' .env.deploy | cut -d= -f2-)"
IMAGE="$IMAGE" docker compose --env-file .env --env-file .env.deploy up -d --no-build app
# migracije samo ako ovaj train ima novu Prisma migraciju
docker compose --env-file .env --env-file .env.deploy exec -T app npx prisma migrate deploy
```

Provera: `https://my.propertydesk.app/api/health`, prijava super-admin,
`/izvestaji/prodaje` kad bude prvih prodaja.

## Pre promocije — kratka lista

- [ ] Staging ručno proveren (prijava + izveštaj prodaje + jedna rezervacija)
- [ ] Nema otvorenog klijentskog demoa u toku
- [ ] Ovaj fajl ažuriran (status kolone)
- [ ] Nema nove migracije, ili je migracija additive i već prošla na staging/demo bazi (ista baza)

## Nije u ovom trainu

Novi moduli, redesign, nove integracije. To čeka posle v.1, kad
krenemo sa prodajom.
