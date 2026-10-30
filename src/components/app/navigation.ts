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
  Compass,
  Inbox,
  CalendarDays,
  Radar,
  Wrench,
  Megaphone,
  Vote,
  CircleUser,
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

export type NavGroup =
  | "overview"
  | "property"
  | "crm"
  | "deals"
  | "finance"
  | "network"
  | "library"
  // Faza 11 — upravnici zgrada
  | "buildings"
  | "maintenance"
  | "community";

export const NAV_GROUP_ORDER: NavGroup[] = [
  "overview",
  "property",
  "buildings",
  "crm",
  "deals",
  "maintenance",
  "community",
  "finance",
  "network",
  "library",
];

export const NAV_GROUP_LABEL: Record<
  NavGroup,
  | "nav.groupOverview"
  | "nav.groupProperty"
  | "nav.groupCrm"
  | "nav.groupDeals"
  | "nav.groupFinance"
  | "nav.groupNetwork"
  | "nav.groupLibrary"
  | "nav.groupBuildings"
  | "nav.groupMaintenance"
  | "nav.groupCommunity"
> = {
  overview: "nav.groupOverview",
  property: "nav.groupProperty",
  crm: "nav.groupCrm",
  deals: "nav.groupDeals",
  finance: "nav.groupFinance",
  network: "nav.groupNetwork",
  library: "nav.groupLibrary",
  buildings: "nav.groupBuildings",
  maintenance: "nav.groupMaintenance",
  community: "nav.groupCommunity",
};

export interface NavItem {
  key: string;
  group: NavGroup;
  labelKey: `nav.${
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
    | "catalog"
    | "commissions"
    | "documents"
    | "reports"
    | "settings"
    | "signOut"
    | "more"
    | "platformAdmin"
    | "propertyDesk"
    // Faza 11 — upravnici
    | "buildings"
    | "dues"
    | "debtors"
    | "tickets"
    | "suppliers"
    | "assemblies"
    | "notices"
    | "residents"
    | "handovers"}`;
  href: string;
  icon: LucideIcon;
  /** Required permission to see the item. `undefined` == always visible. */
  permission?: PermissionString;
  /** If provided, only these org types see this item. */
  orgTypes?: ("INVESTOR" | "AGENCY" | "MANAGER")[];
  /** Only visible to platform SUPER_ADMIN. */
  platformOnly?: boolean;
  /**
   * Only visible to active Property Desk team members who are NOT
   * SUPER_ADMIN. Platform admins already reach the same surface through
   * `platform-admin` → tab „Property Desk (tim)“, so showing this item
   * for them would duplicate the same page in two places.
   */
  pdTeamOnly?: boolean;
}

export const navigation: NavItem[] = [
  {
    key: "dashboard",
    group: "overview",
    labelKey: "nav.dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    key: "projects",
    group: "property",
    labelKey: "nav.projects",
    href: "/projekti",
    icon: Building2,
    permission: "project.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "inventory",
    group: "property",
    labelKey: "nav.inventory",
    href: "/jedinice",
    icon: LayoutGrid,
    permission: "inventory.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "customers",
    group: "crm",
    labelKey: "nav.customers",
    href: "/kupci",
    icon: Contact,
    permission: "lead.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "tasks",
    group: "crm",
    labelKey: "nav.tasks",
    href: "/zadaci",
    icon: ClipboardCheck,
    permission: "lead.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "reservations",
    group: "deals",
    labelKey: "nav.reservations",
    href: "/rezervacije",
    icon: BadgeCheck,
    permission: "reservation.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "calendar",
    group: "deals",
    labelKey: "nav.calendar",
    href: "/kalendar",
    icon: CalendarDays,
    permission: "reservation.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "sales",
    group: "deals",
    labelKey: "nav.sales",
    href: "/prodaje",
    icon: Handshake,
    permission: "sale.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "payments",
    group: "finance",
    labelKey: "nav.payments",
    href: "/uplate",
    icon: Wallet,
    permission: "payment.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "agencies",
    group: "network",
    labelKey: "nav.agencies",
    href: "/agencije",
    icon: Users,
    permission: "agency.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "agency-registrations",
    group: "network",
    labelKey: "nav.agencyRegistrations",
    href: "/agencije/registracije",
    icon: Inbox,
    permission: "agency.manage",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "offer",
    group: "property",
    labelKey: "nav.offer",
    href: "/ponuda",
    icon: Store,
    permission: "agency.read",
    orgTypes: ["AGENCY"],
  },
  {
    key: "catalog",
    group: "property",
    labelKey: "nav.catalog",
    href: "/katalog",
    icon: Compass,
    permission: "agency.read",
    orgTypes: ["AGENCY"],
  },
  {
    key: "my-buyers",
    group: "crm",
    labelKey: "nav.myBuyers",
    href: "/moji-kupci",
    icon: Contact,
    permission: "agency.customer:register",
    orgTypes: ["AGENCY"],
  },
  {
    key: "agency-tasks",
    group: "crm",
    labelKey: "nav.tasks",
    href: "/zadaci",
    icon: ClipboardCheck,
    permission: "lead.read",
    orgTypes: ["AGENCY"],
  },
  {
    key: "my-reservations",
    group: "deals",
    labelKey: "nav.myReservations",
    href: "/moje-rezervacije",
    icon: BadgeCheck,
    permission: "reservation.read",
    orgTypes: ["AGENCY"],
  },
  {
    key: "my-commissions",
    group: "finance",
    labelKey: "nav.myCommissions",
    href: "/moje-provizije",
    icon: Wallet,
    permission: "commission.read",
    orgTypes: ["AGENCY"],
  },
  {
    key: "agents",
    group: "network",
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
    group: "network",
    labelKey: "nav.connections",
    href: "/agencija/konekcije",
    icon: Handshake,
    permission: "agency.read",
    orgTypes: ["AGENCY"],
  },
  {
    key: "commissions",
    group: "finance",
    labelKey: "nav.commissions",
    href: "/provizije",
    icon: Wallet,
    permission: "commission.read",
    orgTypes: ["INVESTOR"],
  },
  {
    key: "documents",
    group: "library",
    labelKey: "nav.documents",
    href: "/dokumenti",
    icon: FileText,
    permission: "document.read",
  },
  {
    key: "reports",
    group: "library",
    labelKey: "nav.reports",
    href: "/izvestaji",
    icon: BarChart3,
    permission: "report.read",
  },
  {
    key: "settings",
    group: "library",
    labelKey: "nav.settings",
    href: "/podesavanja",
    icon: Settings,
  },
  {
    key: "platform-admin",
    group: "library",
    labelKey: "nav.platformAdmin",
    href: "/administracija",
    icon: Shield,
    platformOnly: true,
  },
  {
    key: "property-desk",
    group: "library",
    labelKey: "nav.propertyDesk",
    href: "/administracija/property-desk",
    icon: Radar,
    pdTeamOnly: true,
  },

  // -------------------------------------------------------------------------
  // Faza 11 — Upravnici zgrada (MANAGER organizacije)
  // -------------------------------------------------------------------------
  {
    key: "buildings",
    group: "buildings",
    labelKey: "nav.buildings",
    href: "/zgrade",
    icon: Building2,
    permission: "building.read",
    orgTypes: ["MANAGER"],
  },
  {
    key: "building-dues",
    group: "buildings",
    labelKey: "nav.dues",
    href: "/zgrade/zaduzenja",
    icon: ReceiptText,
    permission: "dues.read",
    orgTypes: ["MANAGER"],
  },
  {
    key: "building-debtors",
    group: "buildings",
    labelKey: "nav.debtors",
    href: "/zgrade/duznici",
    icon: ReceiptText,
    permission: "dues.read",
    orgTypes: ["MANAGER"],
  },
  {
    key: "building-tickets",
    group: "maintenance",
    labelKey: "nav.tickets",
    href: "/zgrade/kvarovi",
    icon: Wrench,
    permission: "ticket.read",
    orgTypes: ["MANAGER"],
  },
  {
    key: "building-suppliers",
    group: "maintenance",
    labelKey: "nav.suppliers",
    href: "/zgrade/izvodjaci",
    icon: Users,
    permission: "ticket.manage",
    orgTypes: ["MANAGER"],
  },
  {
    key: "building-assemblies",
    group: "community",
    labelKey: "nav.assemblies",
    href: "/zgrade/skupstine",
    icon: Vote,
    permission: "assembly.read",
    orgTypes: ["MANAGER"],
  },
  {
    key: "building-notices",
    group: "community",
    labelKey: "nav.notices",
    href: "/zgrade/obavestenja",
    icon: Megaphone,
    permission: "notice.read",
    orgTypes: ["MANAGER"],
  },
  {
    key: "building-residents",
    group: "community",
    labelKey: "nav.residents",
    href: "/zgrade/stanari",
    icon: CircleUser,
    permission: "resident.read",
    orgTypes: ["MANAGER"],
  },
  {
    key: "building-handovers",
    group: "network",
    labelKey: "nav.handovers",
    href: "/zgrade/predaje",
    icon: Handshake,
    permission: "building.handover",
    orgTypes: ["MANAGER"],
  },
  // Investitor vidi pokrenute predaje svojih projekata upravnicima.
  {
    key: "investor-handovers",
    group: "network",
    labelKey: "nav.handovers",
    href: "/projekti/predaje",
    icon: Handshake,
    permission: "project.handover_manager",
    orgTypes: ["INVESTOR"],
  },
];

export interface NavContext {
  organizationType: "INVESTOR" | "AGENCY" | "MANAGER" | null;
  hasPermission: (perm: PermissionString) => boolean;
  isSuperAdmin: boolean;
  /** True when the caller is an enabled Property Desk team member. */
  hasPropertyDeskAccess: boolean;
}

// Nav keys that are safe for a SUPER_ADMIN without an active organization.
// Tenant dashboard is hidden: `/dashboard` always redirects SUPER_ADMIN
// to `/administracija`.
const PLATFORM_ONLY_SAFE_KEYS = new Set(["platform-admin"]);

// Nav keys that a Property Desk team member without a tenant sees.
// Dashboard and tenant Settings are omitted: both just bounce them
// (settings → /dashboard → property-desk).
const PD_ONLY_SAFE_KEYS = new Set(["property-desk"]);

export function filterNavigation(items: NavItem[], ctx: NavContext): NavItem[] {
  const superAdminWithoutOrg = ctx.isSuperAdmin && !ctx.organizationType;
  // A user whose only relationship to the platform is Property Desk team
  // membership (not SUPER_ADMIN, not a tenant member). They shouldn't see
  // any tenant-scoped items — those would all bounce them back to
  // `/dashboard` anyway.
  const pdOnlyUser = !ctx.isSuperAdmin && !ctx.organizationType && ctx.hasPropertyDeskAccess;
  return items.filter((item) => {
    if (item.platformOnly && !ctx.isSuperAdmin) return false;
    if (item.pdTeamOnly && (ctx.isSuperAdmin || !ctx.hasPropertyDeskAccess)) {
      return false;
    }
    // `/dashboard` always redirects SUPER_ADMIN → administracija and
    // PD-only users → property-desk. Don't show a dead home link.
    if (item.key === "dashboard" && (ctx.isSuperAdmin || pdOnlyUser)) {
      return false;
    }
    if (item.key === "settings" && !ctx.organizationType) {
      return false;
    }
    if (superAdminWithoutOrg && !PLATFORM_ONLY_SAFE_KEYS.has(item.key)) {
      return false;
    }
    if (pdOnlyUser && !PD_ONLY_SAFE_KEYS.has(item.key)) {
      return false;
    }
    if (item.orgTypes && (!ctx.organizationType || !item.orgTypes.includes(ctx.organizationType))) {
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
  "offer",
  "buildings",
  "customers",
  "my-buyers",
  "reservations",
  "my-reservations",
  "building-dues",
  "building-tickets",
] as const;

export const MoreIcon = Grid3x3;

export function groupNavigation(items: NavItem[]): { group: NavGroup; items: NavItem[] }[] {
  const buckets = new Map<NavGroup, NavItem[]>();
  for (const item of items) {
    const list = buckets.get(item.group) ?? [];
    list.push(item);
    buckets.set(item.group, list);
  }
  return NAV_GROUP_ORDER.filter((group) => buckets.has(group)).map((group) => ({
    group,
    items: buckets.get(group) ?? [],
  }));
}

/** Longest matching href wins, so /agencije stays quiet on /agencije/registracije. */
export function activeNavHref(pathname: string, items: { href: string }[]): string | null {
  let best: string | null = null;
  for (const item of items) {
    const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!hit) continue;
    if (!best || item.href.length > best.length) best = item.href;
  }
  return best;
}
