# Testing Strategy

## Layers

| Layer | Tool | Location |
|-------|------|----------|
| Unit + service integration | Vitest | `src/**/*.test.ts(x)` |
| End-to-end | Playwright | `e2e/*.spec.ts` |
| Type safety | `tsc --noEmit` | `pnpm typecheck` |
| Lint | ESLint | `pnpm lint` |
| Build gate | `next build` | `pnpm build` |

## Vitest

Set up in [`vitest.config.ts`](../vitest.config.ts). Tests import
services directly and use fixture-driven data. Prisma is stubbed at the
module boundary (`vi.mock("@/server/db/prisma", …)`) for service tests
that don't need a live DB.

## Playwright

Config: [`playwright.config.ts`](../playwright.config.ts). Two projects:

- **desktop** — Chromium at 1440×900.
- **mobile** — iPhone 13 viewport.

Specs:

- `e2e/smoke.spec.ts` — sanity smoke.
- `e2e/investor-flow.spec.ts` — the full investor happy path (Section
  38 of the plan).
- `e2e/agency-flow.spec.ts` — agency portal + buyer protection.
- `e2e/security-flow.spec.ts` — cross-tenant IDOR probes; each attempt
  must return 404/403 with an empty body.

Playwright expects the app running at
`http://localhost:3000`. Use `pnpm build && pnpm start` or configure
`webServer` in `playwright.config.ts` for CI.

## What every domain service test must cover

1. **Tenant scoping** — mixing two org IDs must never yield another's data.
2. **Concurrency** — reservations & sales have partial-index conflict
   tests. Fire two concurrent `Promise.all` calls and assert only one
   wins.
3. **Decimal fidelity** — assert `.toFixed(2)` on Decimal outputs;
   never compare `.toNumber()` to a JS number directly.
4. **Audit** — every mutation records a `AuditLog` row with the actor.

## CI gates (in order)

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Failing any one of the above must block the merge.
