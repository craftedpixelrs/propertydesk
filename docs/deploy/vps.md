# VPS deployment (`159.89.104.12`)

DigitalOcean droplet, Ubuntu 24.04 LTS, 1 vCPU / 1 GB RAM / 33 GB disk,
Frankfurt region. Everything runs in Docker: Next.js 16 standalone
behind a Caddy reverse proxy. Postgres stays on Supabase.

## One-time provisioning

Wipes any previous stack (nginx, PM2, certbot, system Node), keeps a
timestamped backup in `/root/backups/*.tar.gz`, then installs Docker
Engine, docker-compose plugin, UFW rules, and prepares
`/opt/propertydesk`.

From the local workstation (PowerShell):

```powershell
Get-Content deploy/provision.sh -Raw `
  | ssh -i "$env:USERPROFILE\.ssh\demopropertydesk" root@159.89.104.12 "bash -s"
```

The 1 GiB RAM droplet needs a bigger swap for `next build` to fit:

```powershell
(Get-Content deploy/increase-swap.sh -Raw) -replace "`r","" `
  | ssh -i "$env:USERPROFILE\.ssh\demopropertydesk" root@159.89.104.12 "bash -s"
```

## Regular deploy

```powershell
powershell -File deploy\deploy.ps1
```

Pipeline:

1. `tar` the source tree into `deploy/payload-<stamp>.tar.gz`
   (excludes `node_modules`, `.next`, `.env*`, `.git`, `storage/uploads`,
   old payloads). Result is ~0.7 MiB.
2. `scp` upload to `/tmp/payload.tar.gz`.
3. `remote-deploy.sh` on the server: seed `.env` from
   `deploy/env.production.template` on first run, replace source under
   `/opt/propertydesk`, `docker compose up -d --build`.
4. Poll `/api/health` until it returns 200.

## DNS + Cloudflare

Both A records point to `159.89.104.12` behind Cloudflare orange-cloud
(the resolver returns `104.21.28.151 / 172.67.170.227`, not the origin
IP). This works today because:

- Cloudflare is in **Full** SSL mode: it accepts Caddy's self-signed
  fallback certificate on the origin.
- Recommended next step: switch to **Full (strict)** once Caddy has a
  real Let's Encrypt certificate. For that to work through Cloudflare's
  HTTP-01 challenge, either
  1. temporarily grey-cloud the DNS record until Caddy provisions the
     cert, then flip back to orange, **or**
  2. issue a Cloudflare Origin CA certificate and mount it into Caddy
     (skip ACME).

`www.propertydesk.app` is 301-redirected to the apex by Caddy.

## Environment file

Server-side `/opt/propertydesk/.env` (never committed) — copied from
`deploy/env.production.template` on first deploy. Rotate secrets with a
`docker compose restart app` after editing.

Key entries in production:

- `NODE_ENV=production`
- `BETTER_AUTH_URL=https://my.propertydesk.app`
- `NEXT_PUBLIC_APP_URL=https://my.propertydesk.app`
- `EMAIL_PROVIDER=console` (switch to `smtp` / `resend` in production —
  templates are ready).
- `DATABASE_URL` / `DIRECT_URL` — reuses Supabase Postgres, so migrations
  and existing sessions carry over from local dev.

## Build gotchas (baked into the Dockerfile)

Encountered and worked around during initial deploy. Documented here so
they don't come back to bite us:

1. **pnpm store portability** — pin `PNPM_STORE_DIR` inside `/app/` in
   *both* the `deps` and `builder` stages, and use
   `pnpm config set node-linker hoisted`. Otherwise pnpm records an
   absolute store path outside the image and later stages hit
   `ERR_PNPM_UNEXPECTED_STORE`.
2. **Turbopack crashes** — Next 16's default builder panics with
   `Option::unwrap() on a None value` on this project (reproduced with
   6 GiB of swap → not OOM). Build with `next build --webpack` instead.
3. **`baseUrl` + explicit `webpack` alias** — Webpack in Next 16 does
   not honour tsconfig `paths` reliably when the project uses
   `moduleResolution: "bundler"` without `baseUrl`. `tsconfig.json` now
   sets `"baseUrl": "."`, and `next.config.ts` adds an explicit
   `@ -> src/*` alias in `webpack()`.
4. **TypeScript 7 vs Next's internal typing** — the project uses TS 7
   (native compiler) for `pnpm typecheck`, but Next 16's internal
   type-collection pass (server actions, route params) still calls the
   TS 5.x JS API. The Dockerfile drops in TypeScript 5.7.2 via plain
   `npm install` before running `next build` (the shipped standalone
   runtime doesn't care).
5. **Prisma `env()` throws at build time** — `prisma.config.ts` uses
   `env("DIRECT_URL")` which is strict. The Dockerfile injects
   placeholder DB URLs during build; the real ones come from `.env` at
   runtime.
6. **Prisma CLI needs its WASM neighbours** — copying only
   `.bin/prisma` breaks `prisma migrate deploy` in the runner
   (`ENOENT ... prisma_schema_build_bg.wasm`). The Dockerfile copies the
   whole `.bin/` folder into the final image.

## Diagnostics

```bash
# Container status
docker compose -f /opt/propertydesk/docker-compose.yml ps

# App logs (live)
docker compose -f /opt/propertydesk/docker-compose.yml logs -f app

# Caddy logs (TLS provisioning etc.)
docker compose -f /opt/propertydesk/docker-compose.yml logs -f caddy

# Health check from inside the network
docker compose -f /opt/propertydesk/docker-compose.yml exec app \
  wget -qO- http://127.0.0.1:3000/api/health
```

## Database migrations

Run inside the `app` container so it uses the same `DATABASE_URL`:

```bash
cd /opt/propertydesk
docker compose exec app node_modules/.bin/prisma migrate deploy
```

## Seeding (fresh Supabase project only)

```bash
cd /opt/propertydesk
docker compose exec app node_modules/.bin/tsx prisma/seed.ts
```

## Rollback

Every provisioning + deploy leaves tarballs in `/root/backups/`. Restore
by hand:

```bash
tar -xzf /root/backups/prodaja-stanova-app-YYYYMMDD-HHMMSS.tar.gz -C /var/www
```
