/**
 * PropertyDesk development seed.
 *
 * Creates:
 *   - Standard SaaSPlan rows (trial / starter / growth / scale)
 *   - A SUPER_ADMIN user driven by env vars
 *   - One demo investor organization + owner + team members
 *   - One demo agency organization + owner + agents
 *   - AgencyConnection linking the two
 *
 * Passwords for demo users are all the same:
 *   `PropertyDesk!2026`
 * Change them (or delete the demo tenants) before shipping to production.
 *
 * We call the Better Auth HTTP layer through `auth.api.signUpEmail(...)` for
 * user creation so passwords use Better Auth's hash pipeline. That's the
 * only safe way to bootstrap credentials outside the sign-up UI.
 */

import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createId } from "@paralleldrive/cuid2";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Neither DIRECT_URL nor DATABASE_URL is defined");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "PropertyDesk!2026";
const SUPER_ADMIN_EMAIL =
  process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@propertydesk.test";
const SUPER_ADMIN_PASSWORD =
  process.env.SEED_SUPER_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;

async function upsertPlan(
  code: string,
  data: {
    name: string;
    description?: string;
    monthlyPrice: number;
    maxActiveProjects: number | null;
    maxUnits: number | null;
    maxMembers: number | null;
    maxAgencyConnections: number | null;
    features?: Record<string, unknown>;
    sortOrder: number;
  },
) {
  return prisma.saaSPlan.upsert({
    where: { code },
    update: {},
    create: {
      code,
      name: data.name,
      description: data.description ?? null,
      monthlyPrice: data.monthlyPrice,
      currency: "EUR",
      maxActiveProjects: data.maxActiveProjects,
      maxUnits: data.maxUnits,
      maxMembers: data.maxMembers,
      maxAgencyConnections: data.maxAgencyConnections,
      features: (data.features ?? {}) as Prisma.InputJsonValue,
      active: true,
      sortOrder: data.sortOrder,
    },
  });
}

/**
 * Password hashing must match Better Auth's default `scrypt`-based scheme so
 * that the created user can sign in through the UI. Rather than reimplement
 * it, we import the exact function Better Auth uses. Prisma is already the
 * data layer Better Auth expects, so this is a supported pattern.
 */
async function hashPasswordCompat(password: string): Promise<string> {
  // Better Auth exports its default password hasher; use it directly.
  const mod = (await import("better-auth/crypto")) as {
    hashPassword?: (p: string) => Promise<string>;
  };
  if (!mod.hashPassword) {
    throw new Error(
      "Better Auth's hashPassword is not available. Update better-auth or seed users via the UI.",
    );
  }
  return mod.hashPassword(password);
}

async function ensureUser(input: {
  email: string;
  name: string;
  password: string;
  platformRole?: string | null;
  emailVerified?: boolean;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    if (
      input.platformRole &&
      existing.role !== input.platformRole
    ) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: input.platformRole },
      });
    }
    return existing;
  }

  const hashed = await hashPasswordCompat(input.password);
  const id = createId();

  const user = await prisma.user.create({
    data: {
      id,
      email: input.email,
      name: input.name,
      emailVerified: input.emailVerified ?? true,
      role: input.platformRole ?? null,
    },
  });

  await prisma.account.create({
    data: {
      id: createId(),
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: hashed,
    },
  });

  return user;
}

interface TenantSpec {
  slug: string;
  name: string;
  legalName: string;
  displayName: string;
  city: string;
  type: "INVESTOR" | "AGENCY";
  planCode: string;
  members: {
    email: string;
    name: string;
    role: string;
    isOwner?: boolean;
  }[];
}

async function ensureTenant(spec: TenantSpec) {
  const plan = await prisma.saaSPlan.findUnique({
    where: { code: spec.planCode },
  });
  if (!plan) throw new Error(`Plan ${spec.planCode} missing`);

  let org = await prisma.organization.findUnique({ where: { slug: spec.slug } });
  if (!org) {
    const orgId = createId();
    org = await prisma.organization.create({
      data: { id: orgId, name: spec.name, slug: spec.slug },
    });
    await prisma.organizationProfile.create({
      data: {
        organizationId: org.id,
        type: spec.type,
        legalName: spec.legalName,
        displayName: spec.displayName,
        city: spec.city,
        country: "RS",
        status: "TRIAL",
      },
    });
    await prisma.organizationSubscription.create({
      data: {
        organizationId: org.id,
        planId: plan.id,
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  for (const memberSpec of spec.members) {
    const user = await ensureUser({
      email: memberSpec.email,
      name: memberSpec.name,
      password: DEFAULT_PASSWORD,
    });
    const existingMember = await prisma.member.findFirst({
      where: { organizationId: org.id, userId: user.id },
    });
    if (!existingMember) {
      await prisma.member.create({
        data: {
          id: createId(),
          organizationId: org.id,
          userId: user.id,
          role: memberSpec.role,
        },
      });
    }
  }

  return org;
}

/**
 * Seed the billing subsystem: global settings row, company profile, two
 * bank accounts (RSD + EUR), and email templates. Guarded against production
 * accidents by refusing to run when NODE_ENV=production unless the caller
 * sets `ALLOW_SEED_IN_PRODUCTION=true`.
 */
async function seedBilling(): Promise<void> {
  const global = await prisma.globalBillingSettings.findFirst({ where: { active: true } });
  if (!global) {
    await prisma.globalBillingSettings.create({
      data: { id: createId(), active: true },
    });
  }

  const profile = await prisma.companyBillingProfile.findFirst({ where: { active: true } });
  if (!profile) {
    await prisma.companyBillingProfile.create({
      data: {
        id: createId(),
        active: true,
        legalName: "PropertyDesk d.o.o.",
        tradeName: "PropertyDesk",
        taxNumber: "112233445",
        registrationNumber: "21998877",
        addressLine1: "Bulevar Mihajla Pupina 165",
        city: "Beograd",
        postalCode: "11070",
        country: "RS",
        email: "podrska@propertydesk.rs",
        website: "https://propertydesk.rs",
        vatRegistered: true,
      },
    });
  }

  const rsdCount = await prisma.billingBankAccount.count({ where: { currency: "RSD" } });
  if (rsdCount === 0) {
    await prisma.billingBankAccount.create({
      data: {
        id: createId(),
        bankName: "UniCredit banka Srbija",
        accountNumber: "170003000000000000",
        iban: "RS35170003000000000000",
        swiftBic: "BACXRSBG",
        currency: "RSD",
        isDefault: true,
        isActive: true,
      },
    });
  }
  const eurCount = await prisma.billingBankAccount.count({ where: { currency: "EUR" } });
  if (eurCount === 0) {
    await prisma.billingBankAccount.create({
      data: {
        id: createId(),
        bankName: "Raiffeisen banka",
        accountNumber: "265700100000000000",
        iban: "RS35265700100000000000",
        swiftBic: "RZBSRSBG",
        currency: "EUR",
        isDefault: true,
        isActive: true,
      },
    });
  }

  // Email templates are seeded from the app itself on first admin visit
  // (see `/administracija/naplata/sabloni`). The seed script deliberately
  // does not import that module to avoid pulling in Next.js "server-only"
  // guards during a plain Node run.
  console.log("Billing: bank accounts + company profile ready. Templates will seed on first admin visit.");
}

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_SEED_IN_PRODUCTION !== "true"
  ) {
    console.error(
      "Refusing to run seed in production. Set ALLOW_SEED_IN_PRODUCTION=true to override.",
    );
    process.exit(1);
  }

  console.log("PropertyDesk seed: begin");

  await upsertPlan("trial", {
    name: "Probni plan",
    description: "30 dana besplatnog probnog perioda.",
    monthlyPrice: 0,
    maxActiveProjects: 1,
    maxUnits: 50,
    maxMembers: 5,
    maxAgencyConnections: 2,
    features: { impersonation: false, agencySharing: false },
    sortOrder: 0,
  });

  const starter = await upsertPlan("starter", {
    name: "Starter",
    description: "Za manje projekte i pojedinačne investitore.",
    monthlyPrice: 49,
    maxActiveProjects: 3,
    maxUnits: 250,
    maxMembers: 10,
    maxAgencyConnections: 5,
    features: { impersonation: false, agencySharing: true },
    sortOrder: 1,
  });

  await upsertPlan("growth", {
    name: "Growth",
    description: "Za profesionalne investitore u ekspanziji.",
    monthlyPrice: 149,
    maxActiveProjects: 10,
    maxUnits: 1000,
    maxMembers: 30,
    maxAgencyConnections: 25,
    features: { impersonation: false, agencySharing: true },
    sortOrder: 2,
  });

  await upsertPlan("scale", {
    name: "Scale",
    description: "Neograničeno za velike investitore.",
    monthlyPrice: 399,
    maxActiveProjects: null,
    maxUnits: null,
    maxMembers: null,
    maxAgencyConnections: null,
    features: { impersonation: true, agencySharing: true },
    sortOrder: 3,
  });

  await ensureUser({
    email: SUPER_ADMIN_EMAIL,
    name: "PropertyDesk Admin",
    password: SUPER_ADMIN_PASSWORD,
    platformRole: "SUPER_ADMIN",
    emailVerified: true,
  });

  const investorOrg = await ensureTenant({
    slug: "gradnja-plus",
    name: "Gradnja Plus d.o.o.",
    legalName: "Gradnja Plus d.o.o. Beograd",
    displayName: "Gradnja Plus",
    city: "Beograd",
    type: "INVESTOR",
    planCode: starter.code,
    members: [
      {
        email: "s",
        name: "Marko Vlasnik",
        role: "INVESTOR_OWNER",
        isOwner: true,
      },
      {
        email: "prodaja@gradnjaplus.test",
        name: "Ivana Prodaja",
        role: "SALES_MANAGER",
      },
      {
        email: "agent@gradnjaplus.test",
        name: "Nikola Agent",
        role: "SALES_AGENT",
      },
      {
        email: "finansije@gradnjaplus.test",
        name: "Ana Finansije",
        role: "FINANCE",
      },
    ],
  });

  const agencyOrg = await ensureTenant({
    slug: "top-nekretnine",
    name: "Top Nekretnine",
    legalName: "Top Nekretnine d.o.o.",
    displayName: "Top Nekretnine",
    city: "Novi Sad",
    type: "AGENCY",
    planCode: starter.code,
    members: [
      {
        email: "vlasnik@topnekretnine.test",
        name: "Petra Vlasnik",
        role: "AGENCY_OWNER",
        isOwner: true,
      },
      {
        email: "agent@topnekretnine.test",
        name: "Miloš Agent",
        role: "AGENCY_AGENT",
      },
    ],
  });

  // Link investor and agency (invited state)
  const inviter = await prisma.user.findUnique({
    where: { email: "vlasnik@gradnjaplus.test" },
  });
  if (inviter) {
    const existingConn = await prisma.agencyConnection.findFirst({
      where: {
        investorOrganizationId: investorOrg.id,
        agencyOrganizationId: agencyOrg.id,
      },
    });
    if (!existingConn) {
      await prisma.agencyConnection.create({
        data: {
          investorOrganizationId: investorOrg.id,
          agencyOrganizationId: agencyOrg.id,
          status: "ACTIVE",
          invitedByUserId: inviter.id,
          acceptedAt: new Date(),
          defaultProtectionDays: 30,
          notes: "Seed connection between demo investor and demo agency.",
        },
      });
    }
  }

  await seedBilling();

  console.log("PropertyDesk seed: done");
  console.log("");
  console.log("Login credentials (all use password PropertyDesk!2026 unless overridden):");
  console.log(`  SUPER_ADMIN: ${SUPER_ADMIN_EMAIL}`);
  console.log("  Investor Owner: vlasnik@gradnjaplus.test");
  console.log("  Investor Sales Manager: prodaja@gradnjaplus.test");
  console.log("  Agency Owner: vlasnik@topnekretnine.test");
  console.log("  Agency Agent: agent@topnekretnine.test");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
