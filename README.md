# PropertyDesk

Operativna platforma za investitore u nekretnine i njihove partnerske
agencije. Multi-tenant SaaS koja obuhvata upravljanje projektima,
CRM za kupce, rezervacije, prodaje, plaćanja, komisije agencija,
izveštavanje i PDF generisanje — sve u srpskom jeziku (`sr-Latn`).

## Tech Stack

- **Next.js 16** (App Router, RSC, standalone build)
- **TypeScript 7**
- **Prisma 7 + Postgres 16** (Supabase na VPS-u; lokal preko `DATABASE_URL`)
- **Better Auth** (email + password, sesije, impersonation)
- **Tailwind 4 + shadcn primitives**
- **TanStack Query** (klijentski cache, po-org ključevi)
- **Vitest + Playwright** za testove
- **@react-pdf/renderer** za PDF izlaz
- **papaparse + exceljs** za CSV/XLSX

## Brzi start

Lokalni `.env` gleda u **demo** (ili ličnu) bazu, nikad u `my.`
produkciju. Hostovi: [`docs/environments.md`](./docs/environments.md).

```bash
pnpm install
cp .env.example .env.local  # popuni tajne, uključujući SEED_SUPER_ADMIN_*
pnpm prisma generate
pnpm prisma migrate deploy
pnpm db:seed                # demo tenant-i; za prazan prod: pnpm db:seed:platform
pnpm dev
```

Sign in na `http://localhost:3000/sign-in` sa `SEED_SUPER_ADMIN_EMAIL`
/ `SEED_SUPER_ADMIN_PASSWORD`, ili seed nalozima:

- `vlasnik@gradnjaplus.test` — investitor (lozinka `PropertyDesk!2026`)
- `vlasnik@topnekretnine.test` — agencija (ista lozinka)

## Dokumentacija

Ceo operator + developer runbook je u [`docs/`](./docs/):

- **[`releases/fix-bugs-v1.md`](./docs/releases/fix-bugs-v1.md)** — trenutni train (šta je urađeno, šta čeka deploy)
- **[`demo-tok.md`](./docs/demo-tok.md)** — sveobuhvatni operator demo (od projekta do provizije)
- **[`funkcionalnosti.md`](./docs/funkcionalnosti.md)** — kompaktan katalog svih funkcionalnosti (feature cheat-sheet)
- **Help Center** — [`public/help-center.html`](./public/help-center.html) (živi na `/help-center.html`); izvorna kopija [`docs/help-center.html`](./docs/help-center.html)
- **[`prezentacija-funkcionalnosti.html`](./docs/prezentacija-funkcionalnosti.html)** — slide deck (otvori u browseru, F = fullscreen, ←/→ navigacija)
- **[`demo-snimanje.md`](./docs/demo-snimanje.md)** — scenario za snimanje video demoa (10-min investitor + 4-min agencija + 6 mikro-videa)
- [`ciljne-grupe.md`](./docs/ciljne-grupe.md) — GTM / ciljne grupe
- [`billing/`](./docs/billing/) — SaaS naplata (12 dokumenata)
- [`architecture.md`](./docs/architecture.md)
- [`database.md`](./docs/database.md)
- [`permissions.md`](./docs/permissions.md)
- [`api.md`](./docs/api.md)
- [`environments.md`](./docs/environments.md) — local / `my.` / planirani `demo.` i `staging.`
- [`email.md`](./docs/email.md) — Google Workspace (`hello@`) + Resend (`noreply@`)
- [`development.md`](./docs/development.md)
- [`deployment.md`](./docs/deployment.md)
- [`deploy/vps.md`](./docs/deploy/vps.md) — droplet, Caddy, VPS `.env`
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

### Faza 8 (v1 launch closer)

- [`reservation-requests.md`](./docs/reservation-requests.md) — online rezervacija sa IPS QR kaparom
- [`sale-contracts.md`](./docs/sale-contracts.md) — generator ugovora / predugovora u PDF-u
- [`kyc.md`](./docs/kyc.md) — KYC modul za kupce (JMBG, PIB, checklist)
- [`microsite.md`](./docs/microsite.md) — javni sajt projekta (`/p/projekat/[slug]`)
- [`referral.md`](./docs/referral.md) — referral kod za agencije + atribucija
- [`monitoring.md`](./docs/monitoring.md) — Sentry + backup verifier + `/administracija/monitoring`

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
