# Billing settings resolution

Billing behaviour is configured at two levels: **global** (one row per
deployment) and **per-organization** (0 or 1 row per tenant). The resolver
in [`resolved.service.ts`](../../src/server/services/billing/settings/resolved.service.ts)
is the single source of truth for "what is enabled for this tenant right
now".

## The 3 layers

1. **Compile-time defaults** — the `DEFAULT_RESOLVED` constant. Guaranteed
   to be safe. Used when the DB has no `GlobalBillingSettings` row and no
   override. Tests can obtain them via `resolveDefaultBillingSettings()`.
2. **Global settings** — `GlobalBillingSettings` row where `active = true`.
   Owned exclusively by SUPER_ADMIN (`/administracija/naplata/podesavanja`).
3. **Per-org override** — `OrganizationBillingSettings.mode`:
   - `USE_GLOBAL_SETTINGS` (default): identical to global.
   - `CUSTOM_SETTINGS`: only non-null fields override global.
   - `BILLING_DISABLED`: hard off; jobs skip this tenant entirely.

## What can be overridden

Every automation toggle, all grace/due/restrict/suspend windows, the IPS QR
toggle, electronic invoice toggle, invoice footer note, and the reminder
schedule can be overridden per tenant. Numbering format is intentionally
global-only — invoice numbers are legally required to be sequential for
the operator, not the tenant.

## Reminder schedule shape

Persisted as JSON on `GlobalBillingSettings.reminderSchedule`:

```json
[
  { "offsetDays": -3, "templateKey": "reminder.pre_due", "channel": "both" },
  { "offsetDays":  0, "templateKey": "reminder.due_day", "channel": "both" },
  { "offsetDays":  3, "templateKey": "reminder.post_due", "channel": "both" },
  { "offsetDays":  7, "templateKey": "reminder.final_notice", "channel": "email" }
]
```

`channel` is one of `"email" | "notification" | "both"`. `templateKey`
must match a row in `BillingEmailTemplate`.

## Restricted-mode allowlist

When a subscription lands in `RESTRICTED`, the tenant keeps access to a
small allowlist of permissions (default: `organization.read`,
`billing.read`, `billing.subscription.read`, `billing.invoice.read`,
`billing.payment.read`, `document.read`). Any permission outside the
allowlist returns `403 Forbidden` at the middleware layer.

## How to change a setting

- **Global**: `/administracija/naplata/podesavanja`. Every save is
  audited under `billing.global_settings_updated`.
- **Per-org**: `/administracija/organizacije/{id}/naplata` → "Naplata
  postavke" tab. Also audited.

Never mutate `GlobalBillingSettings` directly from a migration or a Prisma
Studio session — the update-side hooks (email notification to super-admins,
audit trail) will be bypassed.
