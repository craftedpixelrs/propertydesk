export const PAGE_GUIDE_KEYS = [
  "dashboard",
  "projects",
  "inventory",
  "customers",
  "tasks",
  "reservations",
  "calendar",
  "sales",
  "payments",
  "agencies",
  "agencyRegistrations",
  "commissions",
  "documents",
  "reports",
  "settingsOrg",
  "settingsAccount",
  "settingsMembers",
  "settingsSubscription",
  "settingsInvoices",
  "settingsPaymentPlans",
  "settingsContracts",
  "settings",
  "offer",
  "catalog",
  "myBuyers",
  "myReservations",
  "myCommissions",
  "agents",
  "connections",
  "platformAdmin",
  "propertyDesk",
] as const;

export type PageGuideKey = (typeof PAGE_GUIDE_KEYS)[number];

export interface PageGuideDef {
  key: PageGuideKey;
  /** Longest prefix wins. */
  prefixes: string[];
  steps: 3 | 4;
}

/**
 * One guided walkthrough per sidebar (and settings) surface.
 * More specific prefixes must be listed first.
 */
export const PAGE_GUIDES: PageGuideDef[] = [
  { key: "agencyRegistrations", prefixes: ["/agencije/registracije"], steps: 3 },
  { key: "agencies", prefixes: ["/agencije"], steps: 4 },
  { key: "projects", prefixes: ["/projekti"], steps: 4 },
  { key: "inventory", prefixes: ["/jedinice", "/spratovi"], steps: 4 },
  { key: "customers", prefixes: ["/kupci"], steps: 4 },
  { key: "tasks", prefixes: ["/zadaci"], steps: 3 },
  { key: "reservations", prefixes: ["/rezervacije"], steps: 4 },
  { key: "calendar", prefixes: ["/kalendar"], steps: 3 },
  { key: "sales", prefixes: ["/prodaje"], steps: 4 },
  { key: "payments", prefixes: ["/uplate"], steps: 4 },
  { key: "commissions", prefixes: ["/provizije"], steps: 3 },
  { key: "documents", prefixes: ["/dokumenti"], steps: 3 },
  { key: "reports", prefixes: ["/izvestaji"], steps: 3 },
  { key: "offer", prefixes: ["/ponuda"], steps: 4 },
  { key: "catalog", prefixes: ["/katalog"], steps: 3 },
  { key: "myBuyers", prefixes: ["/moji-kupci"], steps: 4 },
  { key: "myReservations", prefixes: ["/moje-rezervacije"], steps: 3 },
  { key: "myCommissions", prefixes: ["/moje-provizije"], steps: 3 },
  { key: "agents", prefixes: ["/agencija/agenti"], steps: 3 },
  { key: "connections", prefixes: ["/agencija/konekcije"], steps: 4 },
  { key: "settingsAccount", prefixes: ["/podesavanja/profil"], steps: 3 },
  { key: "settingsOrg", prefixes: ["/podesavanja/organizacija", "/agencija/podesavanja"], steps: 3 },
  { key: "settingsMembers", prefixes: ["/podesavanja/korisnici"], steps: 3 },
  { key: "settingsSubscription", prefixes: ["/podesavanja/pretplata"], steps: 3 },
  { key: "settingsInvoices", prefixes: ["/podesavanja/fakture"], steps: 3 },
  { key: "settingsPaymentPlans", prefixes: ["/podesavanja/planovi-placanja"], steps: 3 },
  { key: "settingsContracts", prefixes: ["/podesavanja/ugovori-sabloni"], steps: 3 },
  { key: "settings", prefixes: ["/podesavanja"], steps: 3 },
  { key: "propertyDesk", prefixes: ["/administracija/property-desk"], steps: 3 },
  { key: "platformAdmin", prefixes: ["/administracija"], steps: 3 },
  { key: "dashboard", prefixes: ["/dashboard", "/prvi-koraci"], steps: 4 },
];

export function resolvePageGuide(pathname: string): PageGuideDef | null {
  const path = pathname.split("?")[0] ?? pathname;
  for (const guide of PAGE_GUIDES) {
    if (guide.prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return guide;
    }
  }
  return null;
}

export const PAGE_GUIDE_STORAGE_KEY = "pd.page-guide.v1";
