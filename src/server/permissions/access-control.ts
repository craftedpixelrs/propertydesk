import { createAccessControl } from "better-auth/plugins/access";

/**
 * Central permission matrix.
 *
 * A `statement` object maps a resource name to the actions that can be
 * performed on it. Roles (see ./roles.ts) then grant subsets of these
 * resource+action pairs.
 *
 * This is the ONLY place where permissions are defined. Do not scatter
 * role-name checks (`if (role === "SALES_MANAGER")`) throughout the codebase
 * — always ask "does this member have this permission?" via `requirePermission`.
 */
export const permissionStatement = {
  organization: [
    "manage",
    "members:manage",
    "suspend",
    "read",
  ],
  project: ["create", "read", "update", "delete", "archive"],
  // `inventory.price` and `inventory.status` split the manage right so that
  // a finance-focused role can update prices without moving units through
  // the sales pipeline (and vice versa). `inventory.manage` remains as an
  // umbrella "everything about inventory" grant.
  inventory: [
    "read",
    "manage",
    "price",
    "status",
    "reopen_sold",
    "import",
    "export",
    "bulk",
  ],
  lead: ["read", "manage"],
  reservation: ["create", "approve", "cancel", "read"],
  sale: ["read", "manage"],
  payment: ["read", "manage"],
  agency: ["manage", "customer:register", "read"],
  commission: ["read", "manage"],
  document: ["read", "manage"],
  report: ["read"],
  audit: ["read"],
  platform: [
    "organization:manage",
    "impersonate",
    "user:manage",
  ],
  // Billing resource: SaaS invoicing, subscriptions, payments, automation.
  // Actions map 1:1 to the surfaces documented in the billing spec — read
  // (view own tenant), settings.manage (global toggles), plan.manage,
  // subscription.{read,manage}, invoice.{read,manage,cancel}, payment.{read,record,reverse},
  // bank-statement.import/review, sef.manage, jobs.run, template.manage.
  billing: [
    "read",
    "settings.manage",
    "plan.manage",
    "subscription.read",
    "subscription.manage",
    "invoice.read",
    "invoice.manage",
    "invoice.cancel",
    "payment.read",
    "payment.record",
    "payment.reverse",
    "bankstatement.import",
    "bankstatement.review",
    "sef.manage",
    "jobs.run",
    "template.manage",
    "profile.manage",
    "bankaccount.manage",
  ],
  // These two resources mirror the Better Auth `admin` plugin's default
  // statements (see node_modules/better-auth/.../admin/access/statement.mjs).
  // We include them in our own `ac` so that its `hasPermission` check —
  // which is what the plugin uses when it enforces `user.impersonate`,
  // `user.ban`, `session.revoke`, etc. — resolves against our SUPER_ADMIN
  // role. Do not use these directly in application code; use the
  // `platform.*` resource for our own gates.
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "impersonate-admins",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const;

export const ac = createAccessControl(permissionStatement);

export type PermissionStatement = typeof permissionStatement;

/**
 * String tuple type of every valid permission in `resource.action` form.
 * Used to type `requirePermission("project.create")` etc.
 */
export type PermissionString = {
  [R in keyof PermissionStatement]: `${R & string}.${PermissionStatement[R][number] & string}`;
}[keyof PermissionStatement];

/**
 * Convert `"resource.action"` (or `"resource.action:subaction"`) into the
 * `{ resource: [action] }` shape expected by Better Auth's `hasPermission`.
 */
export function toPermissionRequest(permission: PermissionString): Record<string, string[]> {
  const [resource, ...actionParts] = permission.split(".") as [string, ...string[]];
  const action = actionParts.join(".");
  return { [resource]: [action] };
}
