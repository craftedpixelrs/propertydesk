# GitHub Actions → GHCR → VPS deploy

Automatski workflow (`.github/workflows/deploy.yml`) na svaki push u
`main` granu:

1. Gradi Docker image na GitHub-ovom runneru (16GB RAM, brzi CPU).
2. Gura image u GitHub Container Registry (GHCR).
3. SSH-om se prijavljuje na VPS, povlači svež image i restartuje kontejner.

Rezultat: VPS ne troši svoj RAM na build (build je otišao off-host), downtime je ~5–10 s (samo koliko traje `docker compose up`).

## Prvi setup (jednokratno)

### 1. Napravi VPS deploy folder (na VPS-u)

```bash
ssh root@159.89.104.12
mkdir -p /opt/propertydesk
cd /opt/propertydesk
# Prvo pushuj .env fajl sa lokala (rsync ili scp), NE stavljaj u git.
```

### 2. Postavi `.env` na VPS-u

Kopiraj sadržaj `.env.example` i popuni sve tajne vrednosti (Postgres, `BETTER_AUTH_SECRET`, Loops API, itd.).

Bitni novi ključevi:

```bash
NEXT_PUBLIC_GOOGLE_APPOINTMENT_URL=https://calendar.app.google/MvRGU5Kajmpawhnd6
NEXT_PUBLIC_PRODUCT_VIDEO_URL=
```

### 3. Kopiraj `docker-compose.yml` i `Caddyfile` u `/opt/propertydesk/`

```powershell
scp docker-compose.yml Caddyfile root@159.89.104.12:/opt/propertydesk/
```

### 4. Dodaj GitHub Secrets

Otvori `https://github.com/craftedpixelrs/propertydesk/settings/secrets/actions` i dodaj:

| Secret               | Vrednost                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `SSH_HOST`           | `159.89.104.12`                                                          |
| `SSH_USER`           | `root` (ili non-root deploy user)                                        |
| `SSH_PRIVATE_KEY`    | Ceo sadržaj privatnog ključa (`~/.ssh/demopropertydesk`) - PEM format    |
| `SSH_KNOWN_HOSTS`    | (opciono) Output `ssh-keyscan 159.89.104.12` - jače security             |

**GHCR autentifikacija je automatska** - koristi `GITHUB_TOKEN` koji je već ubačen u workflow.

### 5. Napravi package public (opcionalno, ali preporučeno)

Prvi build će napraviti GHCR package `ghcr.io/craftedpixelrs/propertydesk`. Da bi VPS mogao da povuče image bez autentifikacije, otvori:

`https://github.com/users/craftedpixelrs/packages/container/propertydesk/settings`

I promeni `Visibility` u **Public**. (Alternativa: dodaj `GHCR_PULL_TOKEN` secret sa read-only PAT-om.)

### 6. Pripremi VPS za GHCR pull

Ako je package **public**:

```bash
# Nista dodatno nije potrebno
```

Ako je **private**, na VPS-u:

```bash
echo "GHCR_PAT_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
```

## Deploy

Sada svaki `git push origin main` automatski:

1. Build image (5–8 min sa GHA cache-om).
2. Push u GHCR.
3. SSH → VPS pull image → restart.

Praćenje: `https://github.com/craftedpixelrs/propertydesk/actions`.

## Rollback

Svaki build je tag-ovan sa `latest` i `sha-XXXXXXX`. Za rollback na
konkretnu verziju:

```bash
ssh root@159.89.104.12
cd /opt/propertydesk
# Pronađi digest starog build-a u GHCR:
#   https://github.com/craftedpixelrs/propertydesk/pkgs/container/propertydesk
# Nalep digest ovde:
IMAGE="ghcr.io/craftedpixelrs/propertydesk@sha256:XXX" \
  docker compose --env-file .env --env-file .env.deploy up -d --no-build app
```

## Manuelno pokretanje

Actions → Build & Deploy → "Run workflow" — trigger sa bilo koje grane
(radi se build i deploy iz te grane, ali samo `main` gura `:latest`
tag).
