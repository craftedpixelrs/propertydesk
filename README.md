# PropertyDesk

Operativna platforma za investitore u nekretnine i njihove partnerske
agencije. Multi-tenant SaaS koja obuhvata upravljanje projektima,
CRM za kupce, rezervacije, prodaje, plaćanja, komisije agencija,
izveštavanje i PDF generisanje — sve u srpskom jeziku (`sr-Latn`).

## Tech Stack

- **Next.js 16** (App Router, RSC, standalone build)
- **TypeScript 7**
- **Prisma 7 + Postgres 16** (Neon u produkciji, Compose lokalno)
- **Better Auth** (email + password, sesije, impersonation)
- **Tailwind 4 + shadcn primitives**
- **TanStack Query** (klijentski cache, po-org ključevi)
- **Vitest + Playwright** za testove
- **@react-pdf/renderer** za PDF izlaz
- **papaparse + exceljs** za CSV/XLSX

## Brzi start

```bash
pnpm install
cp .env.example .env.local  # popuni tajne, uključujući SEED_SUPER_ADMIN_*
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm dev
```

Sign in na `http://localhost:3000/sign-in` sa `SEED_SUPER_ADMIN_EMAIL`
/ `SEED_SUPER_ADMIN_PASSWORD`, ili demo nalozima:

- `investor@propertydesk.test` — investitor
- `agency@propertydesk.test` — agencija

## Dokumentacija

Ceo operator + developer runbook je u [`docs/`](./docs/):

- **[`demo-tok.md`](./docs/demo-tok.md)** — sveobuhvatni operator demo (od projekta do provizije)
- [`billing/`](./docs/billing/) — SaaS naplata (12 dokumenata)
- [`architecture.md`](./docs/architecture.md)
- [`database.md`](./docs/database.md)
- [`permissions.md`](./docs/permissions.md)
- [`api.md`](./docs/api.md)
- [`development.md`](./docs/development.md)
- [`deployment.md`](./docs/deployment.md)
- [`testing.md`](./docs/testing.md)
- [`business-rules.md`](./docs/business-rules.md)
- [`import-format.md`](./docs/import-format.md)
- [`security.md`](./docs/security.md)
- [`backup.md`](./docs/backup.md)
- [`restore.md`](./docs/restore.md)
- [`cron-jobs.md`](./docs/cron-jobs.md)
- [`incident-response.md`](./docs/incident-response.md)
- [`vps-migration.md`](./docs/vps-migration.md)
- [`release-checklist.md`](./docs/release-checklist.md)

## Skripte

| Komanda | Efekat |
|---------|--------|
| `pnpm dev` | Turbopack dev server. |
| `pnpm build` | Produkcijski standalone build. |
| `pnpm start` | Pokreće `.next/standalone/server.js`. |
| `pnpm lint` | ESLint. |
| `pnpm typecheck` | `tsc --noEmit` (strict). |
| `pnpm test` | Vitest unit + service testovi. |
| `pnpm test:e2e` | Playwright E2E. |
| `pnpm prisma studio` | Postgres GUI. |

## Sigurnosne beleške

- Bezbednosni headeri (CSP/HSTS/X-Frame-Options/…) su emitovani globalno
  iz `next.config.ts`.
- Rate-limiting je uključen na osetljivim rutama
  (`RATE_LIMIT_ENABLED=true` u prod).
- Nikad ne komitujte `.env`. `.env.example` dokumentuje samo *šemu*.
- Sve tajne (`BETTER_AUTH_SECRET`, `CRON_SECRET`, `IMPERSONATION_SECRET`)
  moraju imati ≥ 32 karaktera.

## Licenca

Proprietary. Sva prava zadržana. Za komercijalno korišćenje
kontaktirajte tim PropertyDesk.
