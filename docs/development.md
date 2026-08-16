# Development

## Prerequisites

- Node.js 22 LTS.
- pnpm 10 (`corepack enable && corepack prepare pnpm@10 --activate`).
- Docker Desktop (for local Postgres) **or** direct access to a Postgres 16 instance.

## Environment

Copy `.env.example` → `.env.local` and fill in secrets. The set of
required variables is validated by
[`src/lib/env.ts`](../src/lib/env.ts) with Zod on startup — missing
required vars crash the process.

Minimum required for `pnpm dev`:

- `DATABASE_URL`
- `DIRECT_URL`
- `BETTER_AUTH_SECRET` (at least 32 chars)
- `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`
- `CRON_SECRET`

## First-time setup

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy   # or `migrate dev` for a dev DB
pnpm prisma db seed          # creates super-admin + demo tenants
pnpm dev
```

The dev server listens on `http://localhost:3000`. Sign in with the
`SEED_SUPER_ADMIN_*` credentials or the demo tenant owners:

- `investor@propertydesk.test`
- `agency@propertydesk.test`

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
| `pnpm prisma studio` | DB browser. |

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
    auth/              Better Auth server config + context loader
    audit/             Append-only audit sink
    db/                Prisma client
    email/             Provider + Serbian templates
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
