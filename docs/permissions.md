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
| `organization` | `manage`, `members:manage`, `suspend`, `read` |
| `project` | `create`, `read`, `update`, `delete`, `archive` |
| `inventory` | `read`, `manage`, `price`, `status`, `reopen_sold`, `import`, `export`, `bulk` |
| `lead` | `read`, `manage` |
| `reservation` | `create`, `approve`, `cancel`, `read` |
| `sale` | `read`, `manage` |
| `payment` | `read`, `manage` |
| `agency` | `manage`, `customer:register`, `read` |
| `commission` | `read`, `manage` |
| `document` | `read`, `manage` |
| `report` | `read` |
| `audit` | `read` |
| `platform` | `organization:manage`, `impersonate`, `user:manage` |

## Roles

| Role | Scope | Notes |
|------|-------|-------|
| `SUPER_ADMIN` | Platform | Bypasses org-scoped checks in `requirePermission` (org still resolved for auditing). |
| `INVESTOR_OWNER` | Investor org | Full manage on all investor resources incl. members. |
| `SALES_MANAGER` | Investor org | Everything below FINANCE + commission read. |
| `SALES_AGENT` | Investor org | CRM + reservation + sale read. |
| `FINANCE` | Investor org | Payments + commissions + reports. |
| `AGENCY_OWNER` | Agency org | Full agency-portal manage incl. connection response. |
| `AGENCY_ADMIN` | Agency org | Manage without connection response. |
| `AGENCY_AGENT` | Agency org | Buyer registration + reservation create. |
| `AGENCY_VIEWER` | Agency org | Read-only. |

## Route protection

Every API route calls `requirePermission("resource.action")` from
[`src/server/permissions/require.ts`](../src/server/permissions/require.ts).
It throws `AuthError("FORBIDDEN")` when the caller lacks the right,
which the `apiHandler` converts to a Serbian `403 FORBIDDEN` envelope.

For UI, `<PermissionGuard permission="…">` renders children only when
the current user context grants the permission.

## Cross-tenant guarantees

- Agency members can never call investor-manage permissions and vice
  versa; roles are declared on separate role objects and cannot alias.
- Agencies see investor data only through **agency-safe DTOs** which
  explicitly strip `internalNotes`, price/status history, other
  agencies' rows, and (when `canViewPrices=false`) prices.
