# Email

Transactional mail (password reset, invites, reservation confirmations,
billing notices) goes out from the app. Human mail stays in Google
Workspace. Those are **two different systems** — do not point MX at
Resend or you will break `hello@`.

Billing *copy* (the 14 Serbian templates) is documented in
[`billing/email-templates.md`](./billing/email-templates.md). This page
is the **provider, DNS, and env** runbook.

## Live setup (production VPS, August 2026)

| Address | System | Purpose |
|---------|--------|---------|
| `hello@propertydesk.app` | Google Workspace inbox | People write here; marketing/contact; **Reply-To** on app mail |
| `noreply@propertydesk.app` | Resend (eu-west-1) | Envelope From for app mail. Not a mailbox. |
| `podrska@propertydesk.app` | (optional / unused as From) | Do not use as the app sender |

MX for `propertydesk.app` stays on **Google**. Resend only needs the
DNS records it shows for **domain verification** (typically SPF include,
DKIM CNAMEs, optional DMARC). Those do not replace Google MX.

Resend dashboard: domain `propertydesk.app` is verified, sending
enabled. The API key lives only in `/opt/propertydesk/.env` on the VPS
(`RESEND_API_KEY`). Never commit it. Rotate it if it has appeared in
chat or a ticket.

VPS env (authoritative values — not in git):

```
EMAIL_PROVIDER=resend
EMAIL_FROM_NAME=PropertyDesk
EMAIL_FROM_ADDRESS=noreply@propertydesk.app
EMAIL_REPLY_TO=hello@propertydesk.app
RESEND_API_KEY=re_…
```

After editing `/opt/propertydesk/.env`: recreate the **prod**
container. Confirm with a password-reset from
`https://my.propertydesk.app` — From should be
`PropertyDesk <noreply@propertydesk.app>`, Reply-To `hello@`.

Demo (`.env.demo`) stays on `EMAIL_PROVIDER=console` so walkthrough
data does not email real inboxes. Staging should do the same.

## Local development

Leave `EMAIL_PROVIDER=console` (the `.env.example` default). Mail is
printed to the `pnpm dev` terminal. No Resend key, no risk of emailing
a real buyer.

To send a real message from your laptop (rare):

```
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_…
EMAIL_FROM_ADDRESS=noreply@propertydesk.app
EMAIL_REPLY_TO=hello@propertydesk.app
```

Use your own inbox as the recipient. Do not point local at production
`DATABASE_URL` while doing this.

## Code

| Piece | Path |
|-------|------|
| Provider switch + Resend/SMTP send | [`src/server/auth/email.ts`](../src/server/auth/email.ts) |
| From header helper | `emailFromHeader()` in [`src/lib/env.ts`](../src/lib/env.ts) |
| Auth templates (reset, verify, invite) | same `email.ts` file |
| Agency partner invite (new email) | `agencyPartnerInvitationEmail()` in `email.ts` |
| Agency connection invite (existing) | `agencyConnectionInvitationEmail()` in `email.ts` — link `/agencija/konekcije` |
| Domain event templates (sr-Latn) | [`src/server/email/templates.ts`](../src/server/email/templates.ts) |
| Billing templates | [`src/server/services/billing/emails/`](../src/server/services/billing/emails/) |
| Env schema | `EMAIL_*`, `RESEND_API_KEY`, `SMTP_*` in `src/lib/env.ts` |

Callers use `sendEmail({ to, subject, text, html? })`. They must not
import Resend or nodemailer themselves.

`EMAIL_PROVIDER=resend` without `RESEND_API_KEY` (or `smtp` without
`SMTP_HOST`) **falls back to console**. That is silent in production
logs as `[email:console]` — treat it as a misconfiguration, not a
successful send.

## Env vars

| Variable | Default | Notes |
|----------|---------|--------|
| `EMAIL_PROVIDER` | `console` | `console` \| `smtp` \| `resend` |
| `EMAIL_FROM_NAME` | `PropertyDesk` | Display name |
| `EMAIL_FROM_ADDRESS` | `noreply@propertydesk.app` | Must be on a domain Resend has verified |
| `EMAIL_REPLY_TO` | `hello@propertydesk.app` | Human inbox. Workspace, not Resend |
| `RESEND_API_KEY` | empty | Required when provider is `resend` |
| `SMTP_*` | empty | Only when provider is `smtp` |

Notification and billing links use `NEXT_PUBLIC_APP_URL`. On the VPS
that is `https://my.propertydesk.app`. Locally it must stay
`http://localhost:3000` so reset links open on the machine that sent
them.

## Per environment

When [`environments.md`](./environments.md) is implemented:

| Env | Provider | From | Recipients |
|-----|----------|------|------------|
| Local | `console` | n/a | stdout |
| Staging | `console` | n/a | stdout (container not started by default) |
| Demo (`demo.`) | `console` | n/a | stdout — flip to Resend only for a filmed walkthrough |
| Production (`my.`) | Resend | `noreply@propertydesk.app` | real users; Reply-To `hello@` |

Do not give staging/demo the production Resend key if you can avoid it
(create a second key, or use Resend’s test/sandbox). Cron jobs that
email buyers (`overdue-installments`, reservation reminders) will fire
on any env that has a real provider and a seeded calendar — disable or
point them at fake `@primer.rs` / `@*.test` data on demo.

## What not to do

- Do **not** change MX for `propertydesk.app` to Resend.
- Do **not** send as `hello@` from the app (that would need a Workspace
  SMTP seat and mixes human + robot mail).
- Do **not** commit `RESEND_API_KEY` or
  `deploy/env.production.template` secrets into a new file.
- Do **not** seed production with `vlasnik@gradnjaplus.test` and then
  turn Resend on — those addresses are not real inboxes.

## Smoke test

1. Sign in → forgot password for an inbox you control.
2. Message arrives from `noreply@propertydesk.app`.
3. Reply goes to `hello@propertydesk.app` (Workspace).
4. Super-admin: *Send test* on a billing template
   (`/administracija/naplata/sabloni`) — subject prefixed `[TEST]`.
5. On the VPS, `docker compose logs app` must **not** show
   `[email:console]` for that send.
