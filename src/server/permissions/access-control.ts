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
  // Property Desk internal team (Sloj C) — sve dozvole vezane za rad
  // internog SaaS marketing/sales tima. Ova sekcija je odvojena od
  // aplikacionih (Sloj B) resursa da bi jasno razgraničila tenant CRM
  // (`lead.*`) od SaaS marketing CRM (`pd_lead.*`).
  pd_team: [
    "view", // pregled liste članova tima
    "add_member", // dodavanje/uklanjanje osobe iz tima (samo SUPER_ADMIN po defaultu)
    "manage_role", // promena teamRole člana
    "manage_scope", // promena leadScope člana
    "disable", // enabled=true/false na članu
  ],
  pd_lead: [
    "view_own", // vidi lead-ove u okviru sopstvenog leadScope
    "view_team", // vidi lead-ove svih ostalih (nadskup view_own)
    "create", // manuelno kreiranje lead-a
    "reassign", // promena assignedToUserId
    "update_stage", // pomeranje kroz pipeline (forward-only tranzicije)
    "update_details", // ime/prezime/telefon/grad/audience/source/note/lostReason + kompanija/kontakt
    "update_classification", // priority/temperature/timeline/leadScore/nextFollowUpAt
    "reopen", // vraćanje unazad ili preskakanje stage-a (obavezan razlog)
    "convert", // WON + veza sa organizacijom
    "delete", // trajno brisanje reda
    "bulk", // bulk operacije nad selekcijom
  ],
  pd_lead_activity: [
    "read", // čitanje timeline-a lead-a
    "create", // ručno dodavanje aktivnosti (poziv/email/meeting/note)
  ],
  pd_lead_task: [
    "read", // čitanje taskova
    "create", // pravljenje novog taska
    "assign", // dodela taska drugom članu tima
    "complete", // označavanje taska kao završenog
  ],
  pd_report: [
    "pipeline", // pipeline i konverzioni izveštaji
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
  // Better Auth `organization` plugin gates (createInvitation, cancel,
  // update/remove member). Our app uses `organization.members:manage` for
  // the same UX, but the plugin's `hasPermission({ invitation: ["create"] })`
  // only resolves if these resources exist on `ac` and are granted to the
  // member's role. Do not use these in application code.
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
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
