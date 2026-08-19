# Environments

Hosts, databases, and how you work locally. Mail:
[`email.md`](./email.md). Env shape:
[`deploy/env.app.template`](../deploy/env.app.template).

## Hosts

| Host | Container | Database | What it serves |
|------|-----------|----------|----------------|
| `propertydesk.app` | `app` | production (unused for landing) | Marketing only |
| `my.propertydesk.app` | `app` | **new** production Supabase | App only (plans + super-admin) |
| `demo.propertydesk.app` | `app-demo` | seeded demo Supabase | App only (stable walkthrough) |
| `staging.propertydesk.app` | `app-staging` | **same DB + files as demo** | App only (WIP preview) |
| `localhost:3000` | `pnpm dev` | demo DB — **never** `my.` | App + marketing on one origin |

`demo.` and `staging.` never serve the landing. `/` goes to `/sign-in`;
marketing slugs 308 to `propertydesk.app`. Public share links `/p/…`
stay on the app host (needed for the demo).

Staging reuses demo's `DATABASE_URL` and the `app_demo_storage` volume
so a feature you try on `staging.` sees the same tenants and uploads.
Cookies are host-scoped, so a session on `demo.` does not carry to
`staging.`. Deploy WIP images to `app-staging`; leave `app-demo` on a
known-good digest during a client session.

## VPS files

| File | Used by |
|------|---------|
| `/opt/propertydesk/.env` | `app` (`my.` + apex) |
| `/opt/propertydesk/.env.demo` | `app-demo` |
| `/opt/propertydesk/.env.staging` | `app-staging` (same DB URLs as `.env.demo`, host `staging.`) |
| `/opt/propertydesk/.env.deploy` | `IMAGE=ghcr.io/…@sha256:…` |

Never commit filled env files.

## Production database (done)

`my.` uses a **new** Supabase project. Direct `db.<ref>.supabase.co`
does not resolve over IPv4 from typical networks — use the **shared
pooler** in the project's region (`aws-1-eu-west-1` for the current
prod project):

- `DATABASE_URL` — pooler **6543** (transaction), user
  `postgres.<project-ref>`
- `DIRECT_URL` — pooler **5432** (session), same user
- Append `?sslmode=require&uselibpqcompat=true`

Bootstrapped with `prisma migrate deploy` (22 migrations) and
`pnpm db:seed:platform`: four plans + one `SUPER_ADMIN`
(`marko.banovic@craftedpixel.rs`). No demo tenants.

To rebuild another empty project, copy gitignored
`.env.production.local` and run:

```powershell
node --env-file=.env.production.local ./node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.production.local ./node_modules/tsx/dist/cli.mjs prisma/seed.ts --platform
```

Do not paste connection strings into chat. Do not run full `db:seed`
on this database.

## VPS cutover

1. Cloudflare: `demo` and `staging` A (or CNAME) → same as `my.`
   (orange cloud is OK if `my.` already works that way).
2. On the VPS, **before** starting `app-demo`:

   ```bash
   cd /opt/propertydesk
   cp .env .env.demo
   ```

   Edit `.env.demo`: set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to
   `https://demo.propertydesk.app`. Leave `DATABASE_URL` as the **old**
   (seeded) project. Set `EMAIL_PROVIDER=console` unless you need live
   mail during a walkthrough.

3. Replace `.env` with the **new** production project URLs,
   `BETTER_AUTH_URL=https://my.propertydesk.app`, Resend key, and the
   same `SEED_SUPER_ADMIN_*` you used in `.env.production.local`.
   Generate a **new** `BETTER_AUTH_SECRET` for production (do not reuse
   the demo secret).

4. Reload:

   ```bash
   docker compose --env-file .env --env-file .env.deploy \
     up -d --no-build --remove-orphans app app-demo caddy
   docker compose exec app npx prisma migrate deploy
   docker compose exec app-demo npx prisma migrate deploy
   ```

5. Check `https://my.propertydesk.app/sign-in` (empty product,
   super-admin only) and `https://demo.propertydesk.app/sign-in`
   (Gradnja Plus).

## Local

Keep `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` as `http://localhost:3000`.
Point `DATABASE_URL` at **demo or staging**, never at `my.`.

```bash
pnpm db:seed              # full demo tenants
pnpm db:seed:platform     # plans + admin only
pnpm db:seed:demo         # rich inventory on top of full seed
```

`NODE_ENV=production` blocks seed unless `ALLOW_SEED_IN_PRODUCTION=true`.

## Deploy

Push to `main` builds one image and rolls out `app` + `app-demo` +
`app-staging` when those env files exist. Pin demo to an older digest
before a client walkthrough; put the new image on staging first.

## Related

- [`development.md`](./development.md)
- [`email.md`](./email.md)
- [`deploy/vps.md`](./deploy/vps.md)
- [`deploy/github-actions.md`](./deploy/github-actions.md)
