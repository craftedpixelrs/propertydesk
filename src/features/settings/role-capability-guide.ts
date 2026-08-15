import type { PermissionString } from "@/server/permissions/access-control";
import {
  rolesForOrgType,
  type OrganizationRole,
} from "@/server/permissions/roles";

export const ORG_ROLE_LABEL: Record<string, string> = {
  INVESTOR_OWNER: "Vlasnik",
  INVESTOR_ADMIN: "Administrator",
  SALES_MANAGER: "Menadžer prodaje",
  SALES_AGENT: "Agent prodaje",
  FINANCE: "Finansije",
  INVESTOR_VIEWER: "Pregled",
  AGENCY_OWNER: "Vlasnik agencije",
  AGENCY_ADMIN: "Administrator",
  AGENCY_AGENT: "Agent",
  AGENCY_VIEWER: "Pregled",
};

export type CapabilityLevel = "yes" | "read" | "no";

export interface CapabilityRowDef {
  id: string;
  section: string;
  label: string;
  /** Any of these → full access (✓). */
  yes: PermissionString[];
  /** If `yes` fails, any of these → pregled. */
  read?: PermissionString[];
}

export interface RoleCapabilityGuide {
  roles: Array<{ key: OrganizationRole; label: string }>;
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      label: string;
      cells: Record<string, CapabilityLevel>;
    }>;
  }>;
}

const INVESTOR_CAPABILITIES: CapabilityRowDef[] = [
  {
    id: "members",
    section: "Organizacija",
    label: "Korisnici (poziv, uloge, uklanjanje)",
    yes: ["organization.members:manage"],
  },
  {
    id: "org-settings",
    section: "Organizacija",
    label: "Podešavanja organizacije",
    yes: ["organization.manage"],
    read: ["organization.read"],
  },
  {
    id: "projects-full",
    section: "Projekti i jedinice",
    label: "Projekti (kreiranje, brisanje, arhiva)",
    yes: ["project.create"],
    read: ["project.read"],
  },
  {
    id: "projects-edit",
    section: "Projekti i jedinice",
    label: "Projekti (izmena)",
    yes: ["project.update"],
    read: ["project.read"],
  },
  {
    id: "inventory-price",
    section: "Projekti i jedinice",
    label: "Jedinice — cene i statusi",
    yes: ["inventory.price", "inventory.status", "inventory.manage"],
    read: ["inventory.read"],
  },
  {
    id: "inventory-reopen",
    section: "Projekti i jedinice",
    label: "Vraćanje prodate jedinice",
    yes: ["inventory.reopen_sold"],
  },
  {
    id: "inventory-import",
    section: "Projekti i jedinice",
    label: "Uvoz jedinica",
    yes: ["inventory.import"],
  },
  {
    id: "leads",
    section: "Prodaja",
    label: "Kupci",
    yes: ["lead.manage"],
    read: ["lead.read"],
  },
  {
    id: "reservations-approve",
    section: "Prodaja",
    label: "Rezervacije (odobravanje / otkazivanje)",
    yes: ["reservation.approve", "reservation.cancel"],
    read: ["reservation.read"],
  },
  {
    id: "reservations-create",
    section: "Prodaja",
    label: "Rezervacije (kreiranje)",
    yes: ["reservation.create"],
    read: ["reservation.read"],
  },
  {
    id: "sales",
    section: "Prodaja",
    label: "Prodaje",
    yes: ["sale.manage"],
    read: ["sale.read"],
  },
  {
    id: "payments",
    section: "Prodaja",
    label: "Uplate",
    yes: ["payment.manage"],
    read: ["payment.read"],
  },
  {
    id: "agencies",
    section: "Saradnja",
    label: "Agencije",
    yes: ["agency.manage"],
    read: ["agency.read"],
  },
  {
    id: "commissions",
    section: "Saradnja",
    label: "Provizije",
    yes: ["commission.manage"],
    read: ["commission.read"],
  },
  {
    id: "documents",
    section: "Ostalo",
    label: "Dokumenti (upload, brisanje)",
    yes: ["document.manage"],
    read: ["document.read"],
  },
  {
    id: "reports",
    section: "Ostalo",
    label: "Izveštaji",
    yes: ["report.read"],
  },
  {
    id: "audit",
    section: "Ostalo",
    label: "Revizija",
    yes: ["audit.read"],
  },
  {
    id: "billing",
    section: "Ostalo",
    label: "Pretplata i fakture (pregled)",
    yes: ["billing.read"],
  },
];

const AGENCY_CAPABILITIES: CapabilityRowDef[] = [
  {
    id: "members",
    section: "Organizacija",
    label: "Korisnici (poziv, uloge, uklanjanje)",
    yes: ["organization.members:manage"],
  },
  {
    id: "org-settings",
    section: "Organizacija",
    label: "Podešavanja organizacije",
    yes: ["organization.manage"],
    read: ["organization.read"],
  },
  {
    id: "inventory",
    section: "Ponuda",
    label: "Pregled projekata i jedinica",
    yes: ["inventory.read", "project.read"],
  },
  {
    id: "leads",
    section: "Prodaja",
    label: "Kupci",
    yes: ["lead.manage"],
    read: ["lead.read"],
  },
  {
    id: "reservations",
    section: "Prodaja",
    label: "Rezervacije (kreiranje)",
    yes: ["reservation.create"],
    read: ["reservation.read"],
  },
  {
    id: "customer-register",
    section: "Prodaja",
    label: "Registracija kupca",
    yes: ["agency.customer:register"],
  },
  {
    id: "commissions",
    section: "Ostalo",
    label: "Provizije",
    yes: ["commission.manage"],
    read: ["commission.read"],
  },
  {
    id: "documents",
    section: "Ostalo",
    label: "Dokumenti",
    yes: ["document.manage"],
    read: ["document.read"],
  },
  {
    id: "reports",
    section: "Ostalo",
    label: "Izveštaji",
    yes: ["report.read"],
  },
  {
    id: "billing",
    section: "Ostalo",
    label: "Pretplata i fakture (pregled)",
    yes: ["billing.read"],
  },
];

function cellLevel(
  role: OrganizationRole,
  def: CapabilityRowDef,
  has: (role: OrganizationRole, permission: PermissionString) => boolean,
): CapabilityLevel {
  if (def.yes.some((p) => has(role, p))) return "yes";
  if (def.read?.some((p) => has(role, p))) return "read";
  return "no";
}

export function buildRoleCapabilityGuide(
  orgType: "INVESTOR" | "AGENCY",
  has: (role: OrganizationRole, permission: PermissionString) => boolean,
): RoleCapabilityGuide {
  const roles = rolesForOrgType(orgType).map((key) => ({
    key,
    label: ORG_ROLE_LABEL[key] ?? key,
  }));
  const defs =
    orgType === "AGENCY" ? AGENCY_CAPABILITIES : INVESTOR_CAPABILITIES;

  const sectionMap = new Map<
    string,
    RoleCapabilityGuide["sections"][number]["rows"]
  >();
  for (const def of defs) {
    const rows = sectionMap.get(def.section) ?? [];
    const cells: Record<string, CapabilityLevel> = {};
    for (const role of roles) {
      cells[role.key] = cellLevel(role.key, def, has);
    }
    rows.push({ id: def.id, label: def.label, cells });
    sectionMap.set(def.section, rows);
  }

  return {
    roles,
    sections: [...sectionMap.entries()].map(([title, rows]) => ({
      title,
      rows,
    })),
  };
}
