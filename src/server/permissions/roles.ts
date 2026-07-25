import { ac } from "./access-control";

/**
 * All roles that exist in the system.
 *
 * Platform role (used by the Better Auth `admin` plugin):
 *   - SUPER_ADMIN
 *
 * Organization roles (used by the Better Auth `organization` plugin).
 * The role string stored in the `member.role` column is one of these values.
 */

// -----------------------------------------------------------------------------
// Investor organization roles
// -----------------------------------------------------------------------------

export const INVESTOR_OWNER = ac.newRole({
  organization: ["manage", "members:manage", "suspend", "read"],
  project: ["create", "read", "update", "delete", "archive"],
  inventory: ["read", "manage", "price", "status", "reopen_sold", "import", "export", "bulk"],
  lead: ["read", "manage"],
  reservation: ["create", "approve", "cancel", "read"],
  sale: ["read", "manage"],
  payment: ["read", "manage"],
  agency: ["manage", "customer:register", "read"],
  commission: ["read", "manage"],
  document: ["read", "manage"],
  report: ["read"],
  audit: ["read"],
  // Tenants get read-only visibility on their own billing. Editing plans,
  // recording payments, and running billing jobs is SUPER_ADMIN-only.
  billing: ["read", "subscription.read", "invoice.read", "payment.read"],
});

export const INVESTOR_ADMIN = ac.newRole({
  organization: ["manage", "members:manage", "read"],
  project: ["create", "read", "update", "delete", "archive"],
  inventory: ["read", "manage", "price", "status", "reopen_sold", "import", "export", "bulk"],
  lead: ["read", "manage"],
  reservation: ["create", "approve", "cancel", "read"],
  sale: ["read", "manage"],
  payment: ["read", "manage"],
  agency: ["manage", "customer:register", "read"],
  commission: ["read", "manage"],
  document: ["read", "manage"],
  report: ["read"],
  audit: ["read"],
});

export const SALES_MANAGER = ac.newRole({
  organization: ["read"],
  project: ["read", "update"],
  // Sales managers change prices and statuses in normal operation but must
  // not reopen sold units — that's an owner/admin-only escape hatch.
  inventory: ["read", "manage", "price", "status", "export", "bulk"],
  lead: ["read", "manage"],
  reservation: ["create", "approve", "cancel", "read"],
  sale: ["read", "manage"],
  payment: ["read"],
  agency: ["read", "customer:register"],
  commission: ["read"],
  document: ["read", "manage"],
  report: ["read"],
});

export const SALES_AGENT = ac.newRole({
  organization: ["read"],
  project: ["read"],
  inventory: ["read"],
  lead: ["read", "manage"],
  reservation: ["create", "read"],
  sale: ["read"],
  payment: ["read"],
  agency: ["read"],
  commission: ["read"],
  document: ["read"],
});

export const FINANCE = ac.newRole({
  organization: ["read"],
  project: ["read"],
  inventory: ["read", "price", "export"],
  reservation: ["read"],
  sale: ["read"],
  payment: ["read", "manage"],
  commission: ["read", "manage"],
  document: ["read"],
  report: ["read"],
});

export const INVESTOR_VIEWER = ac.newRole({
  organization: ["read"],
  project: ["read"],
  inventory: ["read"],
  lead: ["read"],
  reservation: ["read"],
  sale: ["read"],
  payment: ["read"],
  agency: ["read"],
  commission: ["read"],
  document: ["read"],
  report: ["read"],
});

// -----------------------------------------------------------------------------
// Agency organization roles
// -----------------------------------------------------------------------------

export const AGENCY_OWNER = ac.newRole({
  organization: ["manage", "members:manage", "read"],
  project: ["read"],
  inventory: ["read"],
  lead: ["read", "manage"],
  reservation: ["create", "read"],
  agency: ["read", "customer:register"],
  commission: ["read"],
  document: ["read"],
  report: ["read"],
  billing: ["read", "subscription.read", "invoice.read", "payment.read"],
});

export const AGENCY_ADMIN = ac.newRole({
  organization: ["members:manage", "read"],
  project: ["read"],
  inventory: ["read"],
  lead: ["read", "manage"],
  reservation: ["create", "read"],
  agency: ["read", "customer:register"],
  commission: ["read"],
  document: ["read"],
  report: ["read"],
});

export const AGENCY_AGENT = ac.newRole({
  organization: ["read"],
  project: ["read"],
  inventory: ["read"],
  lead: ["read", "manage"],
  reservation: ["create", "read"],
  agency: ["customer:register", "read"],
  commission: ["read"],
  document: ["read"],
});

export const AGENCY_VIEWER = ac.newRole({
  organization: ["read"],
  project: ["read"],
  inventory: ["read"],
  lead: ["read"],
  reservation: ["read"],
  agency: ["read"],
  commission: ["read"],
  document: ["read"],
});

// -----------------------------------------------------------------------------
// Platform role — used by the Better Auth `admin` plugin
// -----------------------------------------------------------------------------

export const SUPER_ADMIN = ac.newRole({
  organization: ["manage", "members:manage", "suspend", "read"],
  project: ["create", "read", "update", "delete", "archive"],
  inventory: ["read", "manage", "price", "status", "reopen_sold", "import", "export", "bulk"],
  lead: ["read", "manage"],
  reservation: ["create", "approve", "cancel", "read"],
  sale: ["read", "manage"],
  payment: ["read", "manage"],
  agency: ["manage", "customer:register", "read"],
  commission: ["read", "manage"],
  document: ["read", "manage"],
  report: ["read"],
  audit: ["read"],
  platform: ["organization:manage", "impersonate", "user:manage"],
  // Grants required by the Better Auth `admin` plugin for its own gates
  // (impersonate-user, ban, revoke sessions, etc.). Only SUPER_ADMIN gets
  // these. Note: we intentionally do NOT grant `user.impersonate-admins`
  // — impersonating another SUPER_ADMIN must remain impossible.
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
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
});

// -----------------------------------------------------------------------------
// Role maps — passed to Better Auth plugin config, and used by our own
// authorization helpers as the single source of truth.
// -----------------------------------------------------------------------------

export const investorRoles = {
  INVESTOR_OWNER,
  INVESTOR_ADMIN,
  SALES_MANAGER,
  SALES_AGENT,
  FINANCE,
  INVESTOR_VIEWER,
} as const;

export const agencyRoles = {
  AGENCY_OWNER,
  AGENCY_ADMIN,
  AGENCY_AGENT,
  AGENCY_VIEWER,
} as const;

/**
 * All organization-level roles (union of investor + agency).
 * These are the values Better Auth will accept as `member.role`.
 */
export const organizationRoles = {
  ...investorRoles,
  ...agencyRoles,
} as const;

export const platformRoles = {
  SUPER_ADMIN,
} as const;

export type InvestorRole = keyof typeof investorRoles;
export type AgencyRole = keyof typeof agencyRoles;
export type OrganizationRole = InvestorRole | AgencyRole;
export type PlatformRole = keyof typeof platformRoles;

export const INVESTOR_ROLE_NAMES = Object.keys(investorRoles) as InvestorRole[];
export const AGENCY_ROLE_NAMES = Object.keys(agencyRoles) as AgencyRole[];
export const ALL_ORG_ROLE_NAMES = Object.keys(organizationRoles) as OrganizationRole[];

/**
 * Given an organization type, return the roles valid for that org.
 * Used when inviting members: an INVESTOR org may only assign investor roles.
 */
export function rolesForOrgType(type: "INVESTOR" | "AGENCY"): OrganizationRole[] {
  return type === "INVESTOR" ? INVESTOR_ROLE_NAMES : AGENCY_ROLE_NAMES;
}
