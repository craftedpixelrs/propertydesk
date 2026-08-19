# Billing module documentation

This directory contains the technical documentation for the PropertyDesk
Serbian billing module. Every document is intentionally short and
opinionated: it describes _how the code works today_, not what "should be"
built at some future point. If you change a rule described here, please
update the corresponding doc in the same pull request.

| Topic | File |
| --- | --- |
| High-level architecture, boundaries, module map | [billing-architecture.md](./billing-architecture.md) |
| Settings resolution (global + per-org) | [settings.md](./settings.md) |
| Cron jobs, manual runs, feature toggles | [automation.md](./automation.md) |
| Invoice lifecycle (draft → issued → paid → canceled) | [invoice-lifecycle.md](./invoice-lifecycle.md) |
| Subscription lifecycle (trial → active → past_due → suspended) | [subscription-lifecycle.md](./subscription-lifecycle.md) |
| Payment allocation math (FIFO, reversal, methods) | [payments.md](./payments.md) |
| Manually recording, splitting, and reversing payments | [manual-payments.md](./manual-payments.md) |
| Bank statement import + auto-matching | [bank-statement-import.md](./bank-statement-import.md) |
| Serbian SEF integration (electronic invoicing) | [sef-integration.md](./sef-integration.md) |
| IPS QR code generation | [ips-qr.md](./ips-qr.md) |
| Exchange rates (EUR/RSD) and dinarska invoices | [exchange-rates.md](./exchange-rates.md) |
| Email templates, preview, test send | [email-templates.md](./email-templates.md) |
| Security posture, encryption, RBAC | [security.md](./security.md) |
| Background jobs registration + concurrency | [jobs.md](./jobs.md) |
| Super-admin operator guide | [super-admin.md](./super-admin.md) |

See also:

- [../email.md](../email.md) — Resend + Workspace (`noreply@` / `hello@`).
- [../cron-jobs.md](../cron-jobs.md) — non-billing cron jobs.
- [../permissions.md](../permissions.md) — RBAC matrix.
- [../database.md](../database.md) — Prisma schema conventions.
