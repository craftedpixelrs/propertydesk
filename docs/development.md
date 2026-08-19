# Development

## Prerequisites

- Node.js 22 LTS.
- pnpm 10 (`corepack enable && corepack prepare pnpm@10 --activate`).
- Docker Desktop (for local Postgres) **or** direct access to a Postgres 16 instance.

## Environment

Copy `.env.example` → `.env` or `.env.local` and fill in secrets. The
set of required variables is validated by
[`src/lib/env.ts`](../src/lib/env.ts) with Zod on startup — missing
required vars crash the process.

Hosts and which database to use:
[`environments.md`](./environments.md).

| You work on | `DATABASE_URL` points at | Auth URL |
|-------------|--------------------------|----------|
| Daily local | **demo** (or a personal) Supabase | `http://localhost:3000` |
| Feature preview | staging Supabase (when it exists) | `http://localhost:3000` |
| Real customers | never from the laptop | `https://my.propertydesk.app` |

Mail (console locally, Resend on `my.`):
[`email.md`](./email.md). Leave `EMAIL_PROVIDER=console` on your
laptop so nothing leaves stdout.

Minimum required for `pnpm dev`:

- `DATABASE_URL`
- `DIRECT_URL`
- `BETTER_AUTH_SECRET` (at least 32 chars)
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` (`http://localhost:3000`)
- `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`
- `CRON_SECRET`

Never put the `my.` production URLs in local `.env`. A
`prisma migrate reset` against that project would wipe real data.

## First-time setup

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy   # or `migrate dev` for a disposable DB
pnpm db:seed                 # super-admin + Gradnja Plus / Top Nekretnine
pnpm db:seed:demo            # optional rich inventory
pnpm dev
```

The dev server listens on `http://localhost:3000`. Sign in with
`SEED_SUPER_ADMIN_*` or the seeded tenant owners (password
`PropertyDesk!2026` unless overridden):

- `vlasnik@gradnjaplus.test` — investor owner
- `vlasnik@topnekretnine.test` — agency owner

Production (`my.`) is a **different** database. It was bootstrapped with
`pnpm db:seed:platform` (plans + one super-admin only). Do not run
full `db:seed` there.

## Common scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Turbopack dev server. |
| `pnpm build` | Production build. |
| `pnpm start` | Serves the standalone `.next/standalone` build. |
| `pnpm lint` | ESLint (Next presets + accessibility). |
| `pnpm typecheck` | `tsc --noEmit` — strict. |
| `pnpm test` | Vitest unit + service tests. |
| `pnpm test:e2e` | Playwright e2e (needs `pnpm build && pnpm start` running or auto-start via config). |
| `pnpm prisma studio` | DB browser (uses whatever `DATABASE_URL` is in `.env`). |
| `pnpm db:seed` | Full seed: plans + super-admin + demo tenants. |
| `pnpm db:seed:platform` | Plans + super-admin only. Used for `my.`. |
| `pnpm db:seed:demo` | Rich demo inventory on top of a full seed. |

## Code style

- All UI copy is Serbian Latin (`sr-Latn`). Never introduce English UI
  strings.
- Money values pass through the helpers in
  [`src/lib/formatters/money.ts`](../src/lib/formatters/money.ts).
- Phone numbers pass through
  [`src/lib/formatters/phone.ts`](../src/lib/formatters/phone.ts) for
  normalization.

## Directory layout

```
src/
  app/                 App Router pages + /api/v1
  components/          Shared UI (app-wide) primitives
  features/            Feature-specific UI (per domain)
  lib/                 Framework-agnostic utils (env, i18n, formatters, query keys, api client)
  server/
    auth/              Better Auth + email provider (`auth/email.ts`)
    audit/             Append-only audit sink
    db/                Prisma client
    email/             Serbian domain-event templates

    jobs/              Cron registry + guard
    logger/            Structured JSON logger
    monitoring/        Sentry facade
    permissions/       Access-control + require()
    pdf/               Shared PDF layout + document renderers
    rate-limit/        In-memory limiter + enforce helper
    services/          Domain services (transactional business logic)
    storage/           StorageProvider (local / S3; 45-day purge after soft-delete)
prisma/                Schema + migrations + seed
docs/                  Operator + developer documentation (this folder)
e2e/                   Playwright tests
```
