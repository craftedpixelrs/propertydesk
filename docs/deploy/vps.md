# VPS deployment (`159.89.104.12`)

DigitalOcean droplet, Ubuntu 24.04 LTS, 1 vCPU / 1 GB RAM / 33 GB disk,
Frankfurt region. Everything runs in Docker: Next.js 16 standalone
behind a Caddy reverse proxy. Postgres stays on Supabase.

Hosts and the `my.` / `demo.` / `staging.` split:
[`docs/environments.md`](../environments.md). Mail:
[`docs/email.md`](../email.md). Staging shares the demo database.

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

## Regular deploy (from GitHub)

`/opt/propertydesk` is a git checkout of
[craftedpixelrs/propertydesk](https://github.com/craftedpixelrs/propertydesk),
so production always runs a commit that exists on the remote. Push
first, then:

```powershell
powershell -File deploy\git-deploy.ps1
```

Pipeline:

1. `git-deploy.sh` on the server: kill any leftover build, back up `.env`
   to `/root/env-backups/`, `git fetch --depth=1` + `git reset --hard
   origin/main`, seed `.env` from `deploy/env.production.template` on
   first run, then kick off a detached `docker compose up -d --build`
   followed by `prisma migrate deploy`.
2. Poll `/tmp/build.log` until the `===BUILD-DONE===` marker appears
   (~10 min on this droplet; the webpack stage alone is ~5 min of
   silence).
3. Prune dangling images, print the deployed commit and compose status.
4. Poll `https://my.propertydesk.app/api/health` until it returns 200.

`.env` is gitignored, so the hard reset never touches it. Uploaded files
live in the `propertydesk_app_storage` Docker volume, not in the
checkout, so they survive too.

## Legacy deploy (tarball upload)

Kept for deploying uncommitted local work:

```powershell
powershell -File deploy\deploy.ps1
```

Same pipeline, except the source is a `tar` of the local working tree
`scp`-ed to `/tmp/payload.tar.gz` and unpacked by `remote-deploy.sh`.
Note this overwrites the git checkout's files, leaving `git status`
dirty until the next `git-deploy.ps1` run resets it.

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

## Environment files

Never committed. Shape: [`deploy/env.app.template`](../../deploy/env.app.template).
Full map: [`docs/environments.md`](../environments.md).

| File | Container | Hosts |
|------|-----------|--------|
| `/opt/propertydesk/.env` | `app` | `propertydesk.app` + `my.propertydesk.app` |
| `/opt/propertydesk/.env.demo` | `app-demo` | `demo.propertydesk.app` |
| `/opt/propertydesk/.env.staging` | `app-staging` | `staging.propertydesk.app` (same DB as demo) |

After editing an env file, recreate **that** container
(`docker compose up -d --no-build --force-recreate app`).

Key entries on **production** (`.env`):

- `NODE_ENV=production`
- `BETTER_AUTH_URL=https://my.propertydesk.app`
- `NEXT_PUBLIC_APP_URL=https://my.propertydesk.app`
- `EMAIL_PROVIDER=resend` — From `noreply@propertydesk.app`, Reply-To
  `hello@propertydesk.app`. See [`docs/email.md`](../email.md).
- `DATABASE_URL` / `DIRECT_URL` — **new** production Supabase
  (`aws-1-eu-west-1` pooler). Platform seed only (plans + one
  super-admin). Not the demo project.

Key entries on **demo** (`.env.demo`):

- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` =
  `https://demo.propertydesk.app`
- Same `DATABASE_URL` as the former single-stack project (Gradnja Plus)
- `EMAIL_PROVIDER=console` unless a live walkthrough needs Resend

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

`git-deploy.ps1` runs `prisma migrate deploy` automatically after every
build. To run it by hand:

```bash
cd /opt/propertydesk
docker compose --env-file .env --env-file .env.deploy exec app \
  npx prisma migrate deploy
docker compose --env-file .env --env-file .env.deploy exec app-demo \
  npx prisma migrate deploy
```

Each command hits **that container's** database. Never run
`migrate reset` against `my.` or the shared demo project from a
laptop.

If a migration was applied by hand (e.g. the SQL was pasted into the
Supabase console), `migrate deploy` fails with `P3018` / `already
exists`. Verify the objects really are complete, then record it:

```powershell
pnpm exec prisma migrate resolve --applied <migration_name>
```

Skipping migrations breaks the app in a way that looks like an auth
problem: Prisma throws `The column X does not exist`, the session-create
hook that reads `member.findFirst` fails, and sign-in returns 401.

## Seeding (fresh Supabase project only)

`prisma/seed.ts` creates SaaS plans, a super-admin, **and** the demo
tenants (`gradnja-plus`, `top-nekretnine`). Refuse to run it on a
real-customer database. `NODE_ENV=production` blocks seed unless
`ALLOW_SEED_IN_PRODUCTION=true`.

```bash
cd /opt/propertydesk
docker compose exec app node_modules/.bin/tsx prisma/seed.ts
```

Planned: a platform-only seed (plans + super-admin) for `my.`. See
[`docs/environments.md`](../environments.md).

## Rollback

Every provisioning + deploy leaves tarballs in `/root/backups/`. Restore
by hand:

```bash
tar -xzf /root/backups/prodaja-stanova-app-YYYYMMDD-HHMMSS.tar.gz -C /var/www
```
