import type { TranslationKey } from "@/lib/i18n";

/**
 * Seeded walkthrough accounts shown on `demo.propertydesk.app` only.
 * Super-admin is intentionally omitted — that login is not for clients.
 * Password matches `DEFAULT_PASSWORD` in `prisma/seed.ts`.
 */
export const DEMO_LOGIN_PASSWORD = "PropertyDesk!2026";

export type DemoLoginOrg = "investor" | "agency";

export type DemoLoginAccount = {
  email: string;
  org: DemoLoginOrg;
  roleKey: TranslationKey;
};

export const DEMO_LOGIN_ACCOUNTS: readonly DemoLoginAccount[] = [
  {
    email: "vlasnik@gradnjaplus.test",
    org: "investor",
    roleKey: "admin.matrixRoles.INVESTOR_OWNER",
  },
  {
    email: "prodaja@gradnjaplus.test",
    org: "investor",
    roleKey: "admin.matrixRoles.SALES_MANAGER",
  },
  {
    email: "agent@gradnjaplus.test",
    org: "investor",
    roleKey: "admin.matrixRoles.SALES_AGENT",
  },
  {
    email: "finansije@gradnjaplus.test",
    org: "investor",
    roleKey: "admin.matrixRoles.FINANCE",
  },
  {
    email: "vlasnik@topnekretnine.test",
    org: "agency",
    roleKey: "admin.matrixRoles.AGENCY_OWNER",
  },
  {
    email: "agent@topnekretnine.test",
    org: "agency",
    roleKey: "admin.matrixRoles.AGENCY_AGENT",
  },
];
