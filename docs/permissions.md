# Permissions

The permission model is defined once in
[`src/server/permissions/access-control.ts`](../src/server/permissions/access-control.ts)
and roles are declared in
[`src/server/permissions/roles.ts`](../src/server/permissions/roles.ts).
Do **not** hard-code role names in feature code — always ask
`requirePermission("resource.action")`.

## Resources & Actions

| Resource | Actions |
|----------|---------|
| `organization` | `manage`, `members:manage`, `suspend`, `read`, `export`, `templates` |
| `project` | `create`, `read`, `update`, `delete`, `archive` |
| `inventory` | `read`, `manage`, `price`, `status`, `reopen_sold`, `import`, `export`, `bulk` |
| `lead` | `read`, `manage` |
| `buyer` | `anonymize` |
| `reservation` | `create`, `approve`, `cancel`, `read` |
| `sale` | `read`, `manage`, `dossier`, `handover`, `buyer_link`, `settlement` |
| `payment` | `read`, `manage` |
| `agency` | `manage`, `customer:register`, `read` |
| `commission` | `read`, `manage`, `statement` |
| `document` | `read`, `manage` |
| `report` | `read` |
| `audit` | `read` |
| `platform` | `organization:manage`, `impersonate`, `user:manage` |

## Roles

| Role | Scope | Notes |
|------|-------|-------|
| `SUPER_ADMIN` | Platform (layer A) and every layer | Bypasses org-scoped checks in `requirePermission` (org still resolved for auditing). Defaults include the new evidence actions. |
| `INVESTOR_OWNER` | Investor org | Full manage, including the new evidence actions and `buyer.anonymize`. |
| `INVESTOR_ADMIN` | Investor org | Same evidence set as owner, without `organization.suspend`. |
| `SALES_MANAGER` | Investor org | Sales manage, handover, buyer link, settlement, dossier, commission statement. No anonymise, no email-template edit. |
| `SALES_AGENT` | Investor org | CRM, reservation create, sale read, dossier PDF/ZIP, commission statement. |
| `FINANCE` | Investor org | Payments, commissions, dossier, settlement lines, commission statement. No handover and no buyer link. |
| `INVESTOR_VIEWER` | Investor org | Read-only plus dossier PDF/ZIP and commission statement. |
| `AGENCY_OWNER` | Agency org | Agency portal, `organization.templates`, commission statement. Sale actions stay denied. |
| `AGENCY_ADMIN` | Agency org | Members and export, commission statement. No email-template edit. |
| `AGENCY_AGENT` | Agency org | Buyer registration, reservation create, commission statement. |
| `AGENCY_VIEWER` | Agency org | Read-only plus commission statement. |

## Role editor (three layers)

The screen is **Administracija → Uređivač uloga i dozvola**
(`/administracija/role`). The title is
„Uređivač uloga i dozvola (platforma · aplikacija · Property Desk)“.
`layerOfResource` in
[`role-matrix-editor.tsx`](../src/features/platform-admin/role-matrix-editor.tsx)
places each resource:

| Layer | Filter | Resources |
|-------|--------|-----------|
| A — Platforma | `platform`, `billing`, `user`, `session` | Account access, SaaS billing, Better Auth admin |
| B — Aplikacija | everything else | Tenant CRM, including the evidence actions below |
| C — Property Desk | `pd_*` | Internal SaaS sales team only |

New tenant features belong in layer B. Do not add `pd_*` keys for
investor or agency work. Labels come from `admin.resource.*` and
`admin.permHelp.*` (Serbian and English must stay in lockstep).

Compile-time defaults live in `roles.ts`. A cell with no row in
`role_permission_override` uses that default. Saving a cell writes one
override per `(role, permission)` and takes effect within the 10s
permission cache. `Podrazumevano` deletes the override.

## Evidence actions (layer B)

These split work that used to share `sale.read`, `sale.manage`,
`organization.manage`, `commission.read`, or `agency.read`. Defaults
match who could already do the parent action, with two tightenings:
`buyer.anonymize` is investor owner, investor admin, and super-admin
only (agency owner has `organization.manage` and still cannot wipe a
buyer), and finance records settlement lines without handover or the
buyer link.

| Permission | What it unlocks | Default roles |
|------------|-----------------|---------------|
| `sale.dossier` | Sale dossier PDF (`GET /pdf/sale-summary/:id`) and ZIP (`GET /sales/:id/documents-zip`) | Owner, admin, sales manager, sales agent, finance, investor viewer, super-admin |
| `sale.handover` | Save the handover checklist (`PUT /sales/:id/handover`). `GET` stays `sale.read` | Owner, admin, sales manager, super-admin |
| `sale.buyer_link` | Public buyer page link (`POST /sales/:id/buyer-link` → `/p/kupac/[token]`) | Owner, admin, sales manager, super-admin |
| `sale.settlement` | Final settlement lines (`POST /sales/:id/settlement`, `DELETE …/settlement/:lineId`) | Owner, admin, sales manager, finance, super-admin |
| `commission.statement` | PDF statement for the developer (`GET /pdf/commission-statement`) and the agency (`GET /pdf/agency-commission-statement`) | Every role that has `commission.read`, including all four agency roles, plus super-admin |
| `organization.templates` | Extra paragraphs on buyer emails (`PUT /organization/message-templates`). `GET` stays `organization.read` | Investor owner, investor admin, agency owner, super-admin |
| `buyer.anonymize` | GDPR wipe (`POST /buyers/:id/anonymize`) | Investor owner, investor admin, super-admin |

Agency roles see `sale.*` and `buyer.anonymize` as denied. That is the
default: the sale stays on the investor tenant. An agency still
downloads its own commission statement via `commission.statement`.

The sale page shows dossier and ZIP when `sale.dossier` is granted,
the handover editor when `sale.handover` is granted, the buyer-link
button when `sale.buyer_link` is granted, and an editable settlement
when `sale.settlement` is granted. Organization settings show the
message-template card only for `organization.templates`. The buyer
card shows anonymise only for `buyer.anonymize`.

`demo.propertydesk.app` and `staging.propertydesk.app` run this matrix
against the shared demo database. `my.propertydesk.app` keeps the
production database. A permission override saved on demo does not
exist on production, and the reverse is also true.

## Route protection

Every API route calls `requirePermission("resource.action")` from
[`src/server/permissions/require.ts`](../src/server/permissions/require.ts).
It throws `AuthError("FORBIDDEN")` when the caller lacks the right,
which the `apiHandler` converts to a Serbian `403 FORBIDDEN` envelope.

For UI, `<PermissionGuard permission="…">` renders children only when
the current user context grants the permission.

## Navigation and settings tabs

Sidebar items in
[`src/components/app/navigation.ts`](../src/components/app/navigation.ts)
are filtered by **org type and permission**. Investor CRM
(`/projekti`, `/jedinice`, `/kupci`, `/rezervacije`,
`/kalendar`, `/prodaje`, `/uplate`, `/agencije`, `/provizije`) is
`orgTypes: ["INVESTOR"]`. `/zadaci` is `lead.read` for **both**
investor and agency (agency nav key `agency-tasks`). Agency portal
(`/ponuda`, `/moji-kupci`, `/moje-rezervacije`, `/moje-provizije`,
`/agencija/agenti`, `/agencija/konekcije`) is `orgTypes: ["AGENCY"]`.
Items with `orgTypes` are hidden when there is no active org.
Owner/admin (`organization.members:manage`) see the **Tim** tab on
`/zadaci` and can assign a task to another member.

Those investor list pages also call `requireTenantPage` in
[`src/server/auth/context.ts`](../src/server/auth/context.ts): no
session → `/sign-in`; wrong org type or missing permission →
`/dashboard` (not a refresh loop on the same URL).

Settings tabs (`/podesavanja/layout.tsx`):

| Tab | Who sees it |
|-----|-------------|
| Moj nalog | Any signed-in user (`/podesavanja/profil`) |
| Organizacija | Any member of the active org |
| Korisnici | `organization.members:manage` |
| Pretplata | Investor org only |
| Fakture | Investor + `billing.invoice.read` (owner, admin, finance) |
| Planovi plaćanja | Investor + `payment.manage` |
| Ugovori | Investor + `sale.manage` |

Agency members therefore see Organizacija, plus Korisnici only for
owner/admin. Finance sees Planovi, not Ugovori or Korisnici. Tests:
`src/components/app/navigation.test.ts`.

## Cross-tenant guarantees

- Agency members can never call investor-manage permissions and vice
  versa; roles are declared on separate role objects and cannot alias.
- Agencies see investor data only through **agency-safe DTOs** which
  explicitly strip `internalNotes`, price/status history, other
  agencies' rows, and (when `canViewPrices=false`) prices.

## Faza 8 feature → permission mapping

Faza 8 intentionally reuses existing resource+action pairs rather
than sprouting new ones. This keeps role definitions stable and
avoids granting-drift.

| Feature | Endpoint | Permission required |
|---------|----------|---------------------|
| Buyer comments | `/comments` (`entityType=Buyer`) | `lead.read` |
| Buyer KYC read | `GET /buyers/:id/kyc` | `lead.read` |
| Buyer KYC update | `PATCH /buyers/:id/kyc` | `lead.manage` |
| Sale contract templates CRUD | `/sale-contract-templates/*` | `sale.manage` |
| Generate / mark sent / mark signed | `/sales/:id/contract/*` | `sale.manage` |
| Sale tax mode | `PATCH /sales/:id/tax` | `sale.manage` |
| Payment plan templates CRUD | `/payment-plan-templates/*` | `payment.manage` |
| Add manual installment | `POST /sales/:id/payment-plan/installments` | `payment.manage` |
| Apply template to plan | `POST /sales/:id/payment-plan/apply-template` | `payment.manage` |
| Project clone | `POST /projects/:id/clone` | `project.create` |
| Unit CSV/XLSX import wizard | `POST /projects/:id/units/import` | `inventory.import` |
| Project cost fields | `PATCH /projects/:id` (subset of body) | `project.update` |
| Microsite toggle + slug | `PATCH /projects/:id` (subset of body) | `project.update` |
| Network catalog toggle | `PATCH /projects/:id` (`networkCatalogEnabled`) | `project.update` |
| Agency self-register | `POST /public/agencies/register` | *No auth* — rate limit |
| Network catalog | `GET /agency/network-catalog` | `agency.read` (AGENCY) |
| Send connection request | `POST /agency/connection-requests` | `organization.members:manage` + VERIFIED |
| Review connection request | `POST /agencies/connection-requests/:id/respond` | `agency.manage` (INVESTOR) |
| Verify agency | `POST /platform/organizations/:id/verification` | `SUPER_ADMIN` |
| Rotate agency referral code | `POST /agency/referral/rotate` | `agency.read` (agent's own connection) |
| Reservation-request confirm / decline | `/reservation-requests/:id/*` | `reservation.approve` (confirm), `reservation.cancel` (decline) |
| Manual backup-verify trigger | `POST /platform/monitoring/backup-verify` | `SUPER_ADMIN` only (`requireSuperAdmin`) |
| Public share reserve | `POST /public/share/:token/reserve` | *No auth* — token validity + rate limit |
| Sale dossier PDF | `GET /pdf/sale-summary/:id` | `sale.dossier` |
| Sale document ZIP | `GET /sales/:id/documents-zip` | `sale.dossier` |
| Handover read | `GET /sales/:id/handover` | `sale.read` |
| Handover save | `PUT /sales/:id/handover` | `sale.handover` |
| Buyer portal link | `POST /sales/:id/buyer-link` | `sale.buyer_link` |
| Settlement lines | `POST/DELETE /sales/:id/settlement` | `sale.settlement` |
| Buyer email paragraphs | `PUT /organization/message-templates` | `organization.templates` |
| Commission statement PDF | `GET /pdf/commission-statement` and `GET /pdf/agency-commission-statement` | `commission.statement` |
| Buyer anonymise | `POST /buyers/:id/anonymize` | `buyer.anonymize` |

If you add a Faza 8+ feature that needs a permission that doesn't map
cleanly to the table above, add the new action to
`permissionStatement` in `access-control.ts` and update this table in
the same PR. Do **not** shortcut with `requireSuperAdmin` unless the
feature is genuinely platform-scoped.
