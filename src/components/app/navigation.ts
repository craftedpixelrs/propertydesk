import type { LucideIcon } from "lucide-react";
import {
  Home,
  Building2,
  LayoutGrid,
  Users,
  Contact,
  ClipboardCheck,
  BadgeCheck,
  Wallet,
  ReceiptText,
  FileText,
  Handshake,
  BarChart3,
  Settings,
  Shield,
  Grid3x3,
  Store,
  Inbox,
  CalendarDays,
} from "lucide-react";
import type { PermissionString } from "@/server/permissions/access-control";

/**
 * Navigation is centralised here so it can be filtered consistently by
 * organization type (INVESTOR vs AGENCY) and by permissions. The same
 * data drives:
 *   - the desktop sidebar
 *   - the mobile bottom navigation
 *   - the mobile "Više" secondary menu
 */

export interface NavItem {
  key: string;
  labelKey:
    | `nav.${
        | "dashboard"
        | "home"
        | "projects"
        | "inventory"
        | "customers"
        | "leads"
        | "activities"
        | "tasks"
        | "reservations"
        | "calendar"
        | "sales"
        | "paymentPlans"
        | "payments"
        | "agencies"
        | "agents"
        | "agencyRegistrations"
        | "offer"
        | "myBuyers"
        | "myReservations"
        | "myCommissions"
        | "connections"
        | "commissions"
        | "documents"
        | "reports"
        | "settings"
        | "signOut"
        | "more"
        | "platformAdmin"}`;
  href: string;
  icon: LucideIcon;
  /** Required permission to see the item. `undefined` == always visible. */
  permission?: PermissionString;
  /** If provided, only these org types see this item. */
  orgTypes?: ("INVESTOR" | "AGENCY")[];
  /** Only visible to platform SUPER_ADMIN. */
  platformOnly?: boolean;
}

export const navigation: NavItem[] = [
  { key: "dashboard", labelKey: "nav.dashboard", href: "/dashboard", icon: Home },
  {
    key: "projects",
    labelKey: "nav.projects",
    href: "/projekti",
    icon: Building2,
    permission: "project.read",
  },
  {
    key: "inventory",
    labelKey: "nav.inventory",
    href: "/jedinice",
    icon: LayoutGrid,
    permission: "inventory.read",
  },
  {
    key: "customers",
    labelKey: "nav.customers",
    href: "/kupci",
    icon: Contact,
    permission: "lead.read",
  },
  {
    key: "tasks",
    labelKey: "nav.tasks",
    href: "/zadaci",
    icon: ClipboardCheck,
    permission: "lead.read",
  },
  {
    key: "reservations",
    labelKey: "nav.reservations",
    href: "/rezervacije",
    icon: BadgeCheck,
    permission: "reservation.read",
  },
  {
    key: "calendar",
    labelKey: "nav.calendar",
    href: "/kalendar",
    icon: CalendarDays,
    permission: "reservation.read",
  },
  {
    key: "sales",
    labelKey: "nav.sales",
    href: "/prodaje",
    icon: Handshake,
    permission: "sale.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "payments",
    labelKey: "nav.payments",
    href: "/uplate",
    icon: Wallet,
    permission: "payment.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "agencies",
    labelKey: "nav.agencies",
    href: "/agencije",
    icon: Users,
    permission: "agency.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "agency-registrations",
    labelKey: "nav.agencyRegistrations",
    href: "/agencije/registracije",
    icon: Inbox,
    permission: "agency.manage",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "offer",
    labelKey: "nav.offer",
    href: "/ponuda",
    icon: Store,
    permission: "agency.read",
    orgTypes: ["AGENCY"],
  },
  {
    key: "my-buyers",
    labelKey: "nav.myBuyers",
    href: "/moji-kupci",
    icon: Contact,
    permission: "agency.customer:register",
    orgTypes: ["AGENCY"],
  },
  {
    key: "my-reservations",
    labelKey: "nav.myReservations",
    href: "/moje-rezervacije",
    icon: BadgeCheck,
    permission: "reservation.read",
    orgTypes: ["AGENCY"],
  },
  {
    key: "my-commissions",
    labelKey: "nav.myCommissions",
    href: "/moje-provizije",
    icon: Wallet,
    permission: "commission.read",
    orgTypes: ["AGENCY"],
  },
  {
    key: "agents",
    labelKey: "nav.agents",
    href: "/agencija/agenti",
    icon: Users,
    // Managing agents = inviting / promoting / removing members. Only
    // AGENCY_OWNER and AGENCY_ADMIN have `organization.members:manage`.
    permission: "organization.members:manage",
    orgTypes: ["AGENCY"],
  },
  {
    key: "connections",
    labelKey: "nav.connections",
    href: "/agencija/konekcije",
    icon: Handshake,
    permission: "agency.read",
    orgTypes: ["AGENCY"],
  },
  {
    key: "commissions",
    labelKey: "nav.commissions",
    href: "/provizije",
    icon: Wallet,
    permission: "commission.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "documents",
    labelKey: "nav.documents",
    href: "/dokumenti",
    icon: FileText,
    permission: "document.read",
  },
  {
    key: "reports",
    labelKey: "nav.reports",
    href: "/izvestaji",
    icon: BarChart3,
    permission: "report.read",
  },
  {
    key: "settings",
    labelKey: "nav.settings",
    href: "/podesavanja",
    icon: Settings,
  },
  {
    key: "platform-admin",
    labelKey: "nav.platformAdmin",
    href: "/administracija",
    icon: Shield,
    platformOnly: true,
  },
];

export interface NavContext {
  organizationType: "INVESTOR" | "AGENCY" | null;
  hasPermission: (perm: PermissionString) => boolean;
  isSuperAdmin: boolean;
}

// Nav keys that are safe for a SUPER_ADMIN without an active organization —
// they either don't require a tenant scope (platform admin) or are trivial
// landing/settings-like pages. Every other tenant page bounces the caller
// back to /dashboard when no active org is set, so we hide them.
const PLATFORM_ONLY_SAFE_KEYS = new Set(["dashboard", "platform-admin"]);

export function filterNavigation(
  items: NavItem[],
  ctx: NavContext,
): NavItem[] {
  const superAdminWithoutOrg = ctx.isSuperAdmin && !ctx.organizationType;
  return items.filter((item) => {
    if (item.platformOnly && !ctx.isSuperAdmin) return false;
    if (superAdminWithoutOrg && !PLATFORM_ONLY_SAFE_KEYS.has(item.key)) {
      return false;
    }
    if (item.orgTypes && ctx.organizationType && !item.orgTypes.includes(ctx.organizationType)) {
      return false;
    }
    if (item.permission && !ctx.hasPermission(item.permission)) return false;
    return true;
  });
}

/**
 * Keys that appear in the mobile bottom navigation. Everything else falls
 * under the "Više" (More) drawer/page.
 */
export const MOBILE_BOTTOM_NAV_KEYS = [
  "dashboard",
  "projects",
  "customers",
  "reservations",
] as const;

export const MoreIcon = Grid3x3;
