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
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
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
  billing: ["read", "subscription.read", "invoice.read", "payment.read"],
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
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
  billing: ["read", "subscription.read", "invoice.read", "payment.read"],
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
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
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
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
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
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
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
  // SUPER_ADMIN uvek zadržava sve Property Desk dozvole (Sloj C). Ove
  // dozvole se dodatno definišu per PD-role ispod, ali SA bypass gura
  // sve provere na svakom mestu.
  pd_team: ["view", "add_member", "manage_role", "manage_scope", "disable"],
  pd_lead: [
    "view_own",
    "view_team",
    "create",
    "reassign",
    "update_stage",
    "update_details",
    "update_classification",
    "reopen",
    "convert",
    "delete",
    "bulk",
  ],
  pd_lead_activity: ["read", "create"],
  pd_lead_task: ["read", "create", "assign", "complete"],
  pd_report: ["pipeline"],
});

// -----------------------------------------------------------------------------
// Property Desk internal-team roles (Sloj C).
//
// Ove uloge važe za članove interne SaaS marketing/sales ekipe. Ne
// dodeljuju se preko `Member.role` (tenant scope); dodeljuju se preko
// `property_desk_team_member.teamRole`. Semantiku i default matricu
// dokumentuje /administracija/role i docs/roles-and-plans.md.
// -----------------------------------------------------------------------------

export const SETTER = ac.newRole({
  // Setter prihvata dolazne lead-ove i vodi ih do kvalifikacije. Radi
  // isključivo u SOURCING levelu; ne sme reopen (to je MANAGER+SA).
  pd_lead: [
    "view_own",
    "create",
    "update_stage",
    "update_details",
    "update_classification",
  ],
  pd_lead_activity: ["read", "create"],
  pd_lead_task: ["read", "create", "complete"],
  pd_report: ["pipeline"],
});

export const CLOSER = ac.newRole({
  // Closer preuzima kvalifikovane lead-ove i zatvara posao (WON).
  pd_lead: [
    "view_own",
    "create",
    "update_stage",
    "update_details",
    "update_classification",
    "convert",
  ],
  pd_lead_activity: ["read", "create"],
  pd_lead_task: ["read", "create", "complete"],
  pd_report: ["pipeline"],
});

export const OPERATIONS = ac.newRole({
  // Operativa preuzima WON (L3): veže postojeći tenant ili pravi novi
  // org + vlasnika (INVESTOR_OWNER / AGENCY_OWNER) iz lead-a.
  pd_lead: [
    "view_own",
    "update_stage",
    "update_details",
    "update_classification",
    "convert",
  ],
  pd_lead_activity: ["read", "create"],
  pd_lead_task: ["read", "create", "complete"],
  pd_report: ["pipeline"],
});

export const MANAGER = ac.newRole({
  // Menadžer tima vidi ceo pipeline, preraspoređuje, radi bulk akcije i
  // jedini (uz SUPER_ADMIN) sme da vraća stage unazad kroz `pd_lead.reopen`.
  // Namerno NEMA `pd_team.add_member/manage_role/manage_scope/disable` —
  // to je SUPER_ADMIN-only da bi granice tima bile jasne.
  pd_team: ["view"],
  pd_lead: [
    "view_own",
    "view_team",
    "create",
    "reassign",
    "update_stage",
    "update_details",
    "update_classification",
    "reopen",
    "convert",
    "bulk",
  ],
  pd_lead_activity: ["read", "create"],
  pd_lead_task: ["read", "create", "assign", "complete"],
  pd_report: ["pipeline"],
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

/**
 * Property Desk internal team roles (Sloj C). Deklarisane su ovde tako da
 * dele infrastrukturu sa `organizationRoles` (matrix editor, override-i,
 * audit), ali se dodeljuju preko `property_desk_team_member.teamRole`, a
 * NE preko tenant `Member.role`.
 */
export const propertyDeskTeamRoles = {
  SETTER,
  CLOSER,
  OPERATIONS,
  MANAGER,
} as const;

export type InvestorRole = keyof typeof investorRoles;
export type AgencyRole = keyof typeof agencyRoles;
export type OrganizationRole = InvestorRole | AgencyRole;
export type PlatformRole = keyof typeof platformRoles;
export type PropertyDeskRole = keyof typeof propertyDeskTeamRoles;

export const INVESTOR_ROLE_NAMES = Object.keys(investorRoles) as InvestorRole[];
export const AGENCY_ROLE_NAMES = Object.keys(agencyRoles) as AgencyRole[];
export const ALL_ORG_ROLE_NAMES = Object.keys(organizationRoles) as OrganizationRole[];
export const PROPERTY_DESK_ROLE_NAMES = Object.keys(
  propertyDeskTeamRoles,
) as PropertyDeskRole[];

/**
 * Given an organization type, return the roles valid for that org.
 * Used when inviting members: an INVESTOR org may only assign investor roles.
 */
export function rolesForOrgType(type: "INVESTOR" | "AGENCY"): OrganizationRole[] {
  return type === "INVESTOR" ? INVESTOR_ROLE_NAMES : AGENCY_ROLE_NAMES;
}
