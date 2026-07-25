# Billing security posture

## Secrets

Two categories of secret material are stored in the billing schema:

1. **SEF API key** — `CompanyBillingProfile.sefApiKeyEncrypted`.
2. **Bank credentials for import** (future) — same encryption path.

Both are encrypted using AES-256-GCM through
[`secrets.ts`](../../src/server/security/secrets.ts). Encryption uses:

- 32-byte key derived from `BILLING_SECRET_KEY` (env var, required at
  boot in production; the boot code refuses to start without it).
- Fresh 12-byte IV per record.
- 16-byte GCM auth tag.
- Concatenated as `iv | tag | ciphertext`, then base64.

Rotation is done by:
1. Set both `BILLING_SECRET_KEY_PREVIOUS` and a new `BILLING_SECRET_KEY`.
2. Run `scripts/rotate-billing-secrets.ts` (todo — reads all encrypted
   fields, decrypts with previous key, re-encrypts with new one).
3. Remove the previous key.

## RBAC

Billing gates use the `billing.*` permission tree. See
[../permissions.md](../permissions.md) for the full matrix.

Enforcement points:

- Every server action in `naplata/**` calls `requireSuperAdmin()` or
  `requirePermission('billing.<action>')`.
- Every route in `/api/v1/billing/**` calls the same primitive.
- Tenant-facing pages (`podesavanja/pretplata`, `podesavanja/fakture`)
  enforce that the resource's `organizationId` equals the caller's
  active organization.

## Restricted-mode enforcement

Middleware short-circuits requests from users whose active org is in
`RESTRICTED` unless the permission is in
`resolved.restrictedModeAllowedPermissions`. The list defaults to a
read-only allowlist (see [settings.md](./settings.md)). This is enforced
in `src/server/permissions/require.ts` — every service call passes
through it.

## Audit

Every mutation writes an `AuditLog` row via
[`recordAudit`](../../src/server/audit/audit.ts). Billing extends the
`AuditAction` union with 20+ dedicated actions (see the source for the
full list). We deliberately do not truncate `previousValues` /
`newValues` for billing rows — the trail is a legal requirement.

## PII

- Invoice PDFs contain payer name and reference. They're served through
  a signed, short-lived route protected by RBAC — never stored in
  publicly-readable cloud storage.
- Bank statement imports may include third-party personal names (payer
  side). Retention is 7 years (Serbian bookkeeping law); everything is
  deleted when the parent `BankStatementImport` row is purged.

## Idempotent side effects

All mutating routes are idempotent by construction:

- Payment recording uses a client-supplied `externalReference` (unique)
  or hashes `(invoiceId, amount, paidAt, reference)`.
- Bank statement lines hash to `(importId, bookingDate, amount, reference)`.
- Invoice generation is bounded by
  `invoice_subscription_period_automatic_unique`.

This eliminates the "user clicked twice" and "cron ran twice" bug
categories.
