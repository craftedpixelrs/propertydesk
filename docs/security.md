# Security

## Threat model summary

- **Multi-tenant leakage**: every service call is scoped to
  `organizationId`. Cross-tenant IDOR is asserted in
  `e2e/security-flow.spec.ts`.
- **Auth**: Better Auth handles sessions with HTTP-only cookies, CSRF
  tokens on state-changing routes, and its own rate limiter.
- **Injection**: Prisma parameterizes everything. No raw string SQL is
  executed with user input.

## Headers

Global headers emitted by [`next.config.ts`](../next.config.ts):

- `Content-Security-Policy` — locked down to `'self'` with allowances
  for Next hydration inline scripts.
- `Strict-Transport-Security` — production only; 2 years, includes
  subdomains, preload.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — camera, mic, geolocation, USB, payment all `()`.

## Rate limiting

- Better Auth's built-in limiter covers `/api/auth/*`.
- App-level bucket (`src/server/rate-limit/index.ts`) applied to:
  - `POST /api/v1/reservations` (10 / min / user)
  - `POST /api/v1/agency/reservations` (10 / min / user)
  - `POST /api/v1/agency/registrations` (20 / min / user)
  - `GET /api/public/share/[token]/image/[documentId]` (120 / min / token+doc)
- Toggle via `RATE_LIMIT_ENABLED=false` for local dev only.

## Public share tokens

- `ShareLink` rows expose one specific unit through an unauthenticated
  `/p/[token]` page. Tokens are generated with
  `crypto.randomBytes(24).toString("base64url")` (~192 bits of entropy)
  so URL guessing is not feasible.
- Every shared URL is served with `robots: { index: false }` metadata
  plus `X-Robots-Tag: noindex` — anonymous unit offers must never appear
  in a public search engine.
- `showPrice=false` on a `ShareLink` server-side strips the price from
  the whitelisted projection *before* rendering; the client never sees
  a hidden price to leak via view-source.
- `expiresAt` (optional) and `revokedAt` are checked on every request.
  A revoked or expired link returns `404`, matching an unknown token —
  the response body never distinguishes the two.
- Images on the public page load through
  `GET /api/public/share/[token]/image/[documentId]`, which re-verifies
  the token owns the document, streams via `StorageProvider`, and hits
  the rate limiter above. The route has no `requirePermission` call
  because the token *is* the capability.

## Secrets

Required secrets (see [`docs/deployment.md`](./deployment.md#env-vars-in-production)):

- `BETTER_AUTH_SECRET` (≥ 32 chars)
- `IMPERSONATION_SECRET` (≥ 32 chars)
- `CRON_SECRET` (≥ 32 chars) — injected as `x-cron-secret` header.
- `S3_*` when `STORAGE_PROVIDER=s3`.

Never commit secrets. `.env.example` documents the *shape*, not values.

## Passwords

Better Auth uses argon2id via its default password hasher. Password
policy: min 12 chars, at least one number, one letter. Password reset
uses email tokens with 15-minute TTL.

## Impersonation

Platform admin can impersonate any tenant via
`POST /api/v1/platform/organizations/:id/impersonate`. Both start and
end are logged into the immutable audit log with the source admin id
+ target org/user id + timestamp.

## Storage

Uploaded documents are stored via `StorageProvider`. The local provider
writes to `./storage/`. In production use S3 with a private bucket:

- Bucket policy denies `s3:GetObject` for anyone but the app's IAM role.
- Reads always go through the service-level signed URL emitter,
  authenticated + tenant-scoped.
- MIME + size validation runs before the upload, then again by the
  provider on write.

## Email

Providers: `console` (dev), `smtp` (self-hosted), `resend` (managed).
Templates never render raw user HTML. Notification links point at the
canonical `NEXT_PUBLIC_APP_URL`.

## Logging & monitoring

- Structured JSON logger (`src/server/logger/`) always redacts known
  sensitive fields (`password`, `token`, `secret`, `authorization`).
- The Sentry facade (`src/server/monitoring/`) forwards 5xx exceptions
  when `SENTRY_DSN` is set. Never blocks a response.

## Incident response

See [`docs/incident-response.md`](./incident-response.md).
