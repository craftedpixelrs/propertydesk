# Fix bugs v.1

Train za ispravke pre prodaje. **Nema novih feature-a.** Testiramo,
popravljamo, pa tek onda dižemo demo i produkciju.

## Pravilo

Sve što radimo prvo ide na **staging**. Demo i produkcija se ne diraju
dok eksplicitno ne odlučimo da promoviramo ovaj train.

| Host | Kada se dira |
|------|----------------|
| `staging.propertydesk.app` | Uvek prvi. Svaki bugfix / polish. |
| `demo.propertydesk.app` | Samo kada kažemo „idi na demo“. Stabilan walkthrough za klijente. |
| `my.propertydesk.app` + `propertydesk.app` | Samo kada kažemo „idi na produkciju“. |

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
| Mobile bottom nav: „Kontrolna tabla“ nije centrirana | **sada** | čeka ovaj deploy | čeka odluku | čeka odluku |

Kad se pojavi sledeći bug, dodaj red ovde. Ne otvaraj novi train dok
ovaj ne završimo ili ga svesno zatvorimo.

## Promocija (kad odlučimo)

Image je već na GHCR (`ghcr.io/craftedpixelrs/propertydesk:latest` +
sha). GHA deploy job i dalje puca na SSH — promocija je ručni pull na
VPS-u.

### 1. Staging (default, posle svakog pusha na `main`)

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
