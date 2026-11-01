/**
 * PropertyDesk seed.
 *
 * Always creates:
 *   - Standard SaaSPlan rows (trial / starter / growth / scale)
 *   - A SUPER_ADMIN user driven by `SEED_SUPER_ADMIN_EMAIL` /
 *     `SEED_SUPER_ADMIN_PASSWORD`
 *   - Global billing settings row (empty company profile is filled later
 *     in `/administracija`)
 *
 * `SEED_MODE=full` (default) also creates demo tenants:
 *   - Investor org `gradnja-plus` + team
 *   - Agency org `top-nekretnine` + team
 *   - AgencyConnection between them
 *   - Placeholder billing company profile + bank accounts
 *
 * Production / `my.` must use platform-only:
 *   `pnpm db:seed:platform`
 *   or `SEED_MODE=platform tsx prisma/seed.ts`
 *
 * Demo users share `PropertyDesk!2026` unless overridden.
 */

import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createId } from "@paralleldrive/cuid2";
import { deterministicModel97 } from "../src/lib/payments/model97";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Neither DIRECT_URL nor DATABASE_URL is defined");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "PropertyDesk!2026";
const SUPER_ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@propertydesk.test";
const SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
const SEED_MODE =
  process.argv.includes("--platform") || process.env.SEED_MODE === "platform" ? "platform" : "full";

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
    maxManagedBuildings?: number | null;
    maxManagedUnits?: number | null;
    audience?: "INVESTOR" | "AGENCY" | "MANAGER";
    features?: Record<string, unknown>;
    publiclyAvailable?: boolean;
    recommended?: boolean;
    sortOrder: number;
  },
) {
  // Idempotent seed: on repeat runs refresh pricing + limits + audience so
  // dev DBs match the committed seed. New rows get full data via `create`.
  const payload = {
    name: data.name,
    description: data.description ?? null,
    monthlyPrice: data.monthlyPrice,
    currency: "EUR",
    maxActiveProjects: data.maxActiveProjects,
    maxUnits: data.maxUnits,
    maxMembers: data.maxMembers,
    maxAgencyConnections: data.maxAgencyConnections,
    maxManagedBuildings: data.maxManagedBuildings ?? null,
    maxManagedUnits: data.maxManagedUnits ?? null,
    audience: data.audience ?? null,
    features: (data.features ?? {}) as Prisma.InputJsonValue,
    active: true,
    publiclyAvailable: data.publiclyAvailable ?? true,
    recommended: data.recommended ?? false,
    sortOrder: data.sortOrder,
  };
  return prisma.saaSPlan.upsert({
    where: { code },
    update: payload,
    create: { code, ...payload },
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
    if (input.platformRole && existing.role !== input.platformRole) {
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
  type: "INVESTOR" | "AGENCY" | "MANAGER";
  planCode: string;
  paymentAccountNumber?: string;
  paymentBankName?: string;
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

  // Agency ne koristi trial model — pristup je uvek aktivan dok traje
  // konekcija ka investitoru. Investor i Manager imaju 30 dana trial-a.
  const isAgency = spec.type === "AGENCY";
  const orgStatus = isAgency ? "ACTIVE" : "TRIAL";
  const subStatus = isAgency ? "ACTIVE" : "TRIAL";
  const trialEndsAt = isAgency ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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
        status: orgStatus,
        paymentAccountNumber: spec.paymentAccountNumber ?? null,
        paymentBankName: spec.paymentBankName ?? null,
        ...(isAgency ? { verificationStatus: "VERIFIED" as const, verifiedAt: new Date() } : {}),
      },
    });
    await prisma.organizationSubscription.create({
      data: {
        organizationId: org.id,
        planId: plan.id,
        status: subStatus,
        trialEndsAt,
      },
    });
  } else {
    await prisma.organizationProfile.update({
      where: { organizationId: org.id },
      data: {
        type: spec.type,
        ...(isAgency
          ? {
              status: "ACTIVE" as const,
              verificationStatus: "VERIFIED" as const,
              verifiedAt: new Date(),
            }
          : {}),
        ...(spec.paymentAccountNumber
          ? {
              paymentAccountNumber: spec.paymentAccountNumber,
              paymentBankName: spec.paymentBankName ?? null,
            }
          : {}),
      },
    });
    await prisma.organizationSubscription.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        planId: plan.id,
        status: subStatus,
        trialEndsAt,
      },
      update: {
        planId: plan.id,
        ...(isAgency ? { status: "ACTIVE" as const, trialEndsAt: null } : {}),
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
 * Billing bootstrap.
 *
 * Platform mode only ensures the singleton settings row so the admin UI
 * can open. Demo mode also drops in a placeholder company profile + bank
 * accounts — never run that on the real `my.` database.
 */
async function seedBilling(mode: "platform" | "full"): Promise<void> {
  const global = await prisma.globalBillingSettings.findFirst({ where: { active: true } });
  if (!global) {
    await prisma.globalBillingSettings.create({
      data: { id: createId(), active: true },
    });
  }

  if (mode === "platform") {
    console.log("Billing: global settings only (platform seed).");
    return;
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
  console.log(
    "Billing: bank accounts + company profile ready. Templates will seed on first admin visit.",
  );
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED_IN_PRODUCTION !== "true") {
    console.error(
      "Refusing to run seed in production. Set ALLOW_SEED_IN_PRODUCTION=true to override.",
    );
    process.exit(1);
  }

  console.log(`PropertyDesk seed: begin (mode=${SEED_MODE})`);

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

  const growth = await upsertPlan("growth", {
    name: "Growth",
    description: "Za profesionalne investitore u ekspanziji.",
    monthlyPrice: 149,
    maxActiveProjects: 10,
    maxUnits: 1000,
    maxMembers: 30,
    maxAgencyConnections: 25,
    features: { impersonation: false, agencySharing: true, whiteLabel: true },
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
    features: { impersonation: true, agencySharing: true, whiteLabel: true },
    sortOrder: 3,
  });

  const partner = await upsertPlan("partner", {
    name: "Partner",
    description: "Besplatan portal agencije. Pristup ide preko poziva investitora, bez pretplate.",
    monthlyPrice: 0,
    maxActiveProjects: 0,
    maxUnits: 0,
    maxMembers: 25,
    maxAgencyConnections: null,
    audience: "AGENCY",
    features: { audience: "agency", agencySharing: true, whiteLabel: false },
    publiclyAvailable: false,
    sortOrder: 20,
  });

  // Faza 11 — pretplate za upravnike zgrada. Audience fiksiran na MANAGER,
  // tako da super-admin ne može ovaj plan dodeliti investitoru ili agenciji.
  // Cene u prvoj iteraciji su placeholder (super-admin ih podesi u panelu).
  await upsertPlan("upravnik-start", {
    name: "Upravnik Start",
    description: "Za nove upravnike: do 3 zgrade i 200 posebnih delova.",
    monthlyPrice: 29,
    maxActiveProjects: 0,
    maxUnits: 0,
    maxMembers: 5,
    maxAgencyConnections: 0,
    maxManagedBuildings: 3,
    maxManagedUnits: 200,
    audience: "MANAGER",
    features: { audience: "manager", residentPortal: true, electronicVoting: true },
    sortOrder: 30,
  });

  await upsertPlan("upravnik-pro", {
    name: "Upravnik Pro",
    description: "Standardno za profesionalne upravnike: do 10 zgrada i 1000 delova.",
    monthlyPrice: 79,
    maxActiveProjects: 0,
    maxUnits: 0,
    maxMembers: 15,
    maxAgencyConnections: 0,
    maxManagedBuildings: 10,
    maxManagedUnits: 1000,
    audience: "MANAGER",
    features: {
      audience: "manager",
      residentPortal: true,
      electronicVoting: true,
      whiteLabel: false,
    },
    recommended: true,
    sortOrder: 31,
  });

  await upsertPlan("upravnik-biz", {
    name: "Upravnik Biz",
    description: "Za veće upravnike: neograničeno zgrada i delova.",
    monthlyPrice: 199,
    maxActiveProjects: 0,
    maxUnits: 0,
    maxMembers: null,
    maxAgencyConnections: 0,
    maxManagedBuildings: null,
    maxManagedUnits: null,
    audience: "MANAGER",
    features: {
      audience: "manager",
      residentPortal: true,
      electronicVoting: true,
      whiteLabel: true,
    },
    sortOrder: 32,
  });

  await ensureUser({
    email: SUPER_ADMIN_EMAIL,
    name: "PropertyDesk Admin",
    password: SUPER_ADMIN_PASSWORD,
    platformRole: "SUPER_ADMIN",
    emailVerified: true,
  });

  if (SEED_MODE === "platform") {
    await seedBilling("platform");
    console.log("PropertyDesk seed: done (platform — plans + super-admin only)");
    console.log(`  SUPER_ADMIN: ${SUPER_ADMIN_EMAIL}`);
    return;
  }

  const investorOrg = await ensureTenant({
    slug: "gradnja-plus",
    name: "Gradnja Plus d.o.o.",
    legalName: "Gradnja Plus d.o.o. Beograd",
    displayName: "Gradnja Plus",
    city: "Beograd",
    type: "INVESTOR",
    paymentAccountNumber: "265000000000123456",
    paymentBankName: "Banca Intesa",
    planCode: growth.code,
    members: [
      {
        email: "vlasnik@gradnjaplus.test",
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
    paymentAccountNumber: "160000000000654321",
    paymentBankName: "OTP banka",
    planCode: partner.code,
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

  // Faza 11 — demo upravnik. Prazna organizacija: zgrade, vlasnici i
  // zaduženja se dodaju u Fazi 10 (admin-docs-tests) kad bude pun seed.
  const managerOrg = await ensureTenant({
    slug: "upravnik-plus",
    name: "Upravnik Plus",
    legalName: "Upravnik Plus d.o.o. Beograd",
    displayName: "Upravnik Plus",
    city: "Beograd",
    type: "MANAGER",
    paymentAccountNumber: "165000000000987654",
    paymentBankName: "AIK Banka",
    planCode: "upravnik-pro",
    members: [
      {
        email: "vlasnik@upravnikplus.test",
        name: "Nenad Vlasnik",
        role: "MANAGER_OWNER",
        isOwner: true,
      },
      {
        email: "racuni@upravnikplus.test",
        name: "Jelena Računovođa",
        role: "MANAGER_ACCOUNTANT",
      },
      {
        email: "majstor@upravnikplus.test",
        name: "Stevan Tehničar",
        role: "MANAGER_TECHNICIAN",
      },
    ],
  });
  // Faza 11 — demo content for the manager org. Idempotent via upsert
  // and content filters so re-running seed is safe. Showcase rows cover
  // the statuses a manager walks on a demo (paid, partial, open ticket
  // stages, portal invite, notice, assembly).
  await seedManagerDemoContent(managerOrg.id);

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

  await seedBilling("full");

  console.log("PropertyDesk seed: done");
  console.log("");
  console.log("Login credentials (all use password PropertyDesk!2026 unless overridden):");
  console.log(`  SUPER_ADMIN: ${SUPER_ADMIN_EMAIL}`);
  console.log("  Investor Owner: vlasnik@gradnjaplus.test");
  console.log("  Investor Sales Manager: prodaja@gradnjaplus.test");
  console.log("  Agency Owner: vlasnik@topnekretnine.test");
  console.log("  Agency Agent: agent@topnekretnine.test");
  console.log("  Manager Owner: vlasnik@upravnikplus.test");
  console.log("  Manager Accountant: racuni@upravnikplus.test");
  console.log("  Manager Technician: majstor@upravnikplus.test");
}

// ---------------------------------------------------------------------------
// Faza 11 — Manager demo content
// ---------------------------------------------------------------------------

async function seedManagerDemoContent(organizationId: string) {
  // Building 1 — Bulevar oslobođenja 123
  const b1 = await upsertManagedBuilding(organizationId, {
    name: "Bulevar oslobođenja 123",
    address: "Bulevar oslobođenja 123",
    city: "Novi Sad",
    legalName: "SZ Bulevar oslobođenja 123",
    paymentAccountNumber: "265000000012345678",
    paymentBankName: "Raiffeisen Banka",
  });
  const b1Entrance = await ensureEntrance(b1.id, "A");

  // 2 units in building 1
  const unit1a = await upsertManagedUnit(organizationId, b1.id, b1Entrance.id, {
    code: "STAN-1A",
    type: "APARTMENT",
    floor: 1,
    totalArea: "62.50",
    participationShare: "1.0",
  });
  const unit1b = await upsertManagedUnit(organizationId, b1.id, b1Entrance.id, {
    code: "STAN-1B",
    type: "APARTMENT",
    floor: 2,
    totalArea: "48.00",
    participationShare: "0.8",
  });

  // Owners
  const owner1 = await upsertBuildingPerson(organizationId, b1.id, {
    firstName: "Milan",
    lastName: "Petrović",
    email: "milan.petrovic@stanari.test",
    phone: "+381641112233",
  });
  const owner2 = await upsertBuildingPerson(organizationId, b1.id, {
    firstName: "Ana",
    lastName: "Jovanović",
    email: "ana.jovanovic@stanari.test",
    phone: "+381604445566",
  });
  await upsertOwnership(unit1a.id, owner1.id);
  await upsertOwnership(unit1b.id, owner2.id);

  // Building 2 — Kneza Mihaila 45
  const b2 = await upsertManagedBuilding(organizationId, {
    name: "Kneza Mihaila 45",
    address: "Kneza Mihaila 45",
    city: "Beograd",
    legalName: "SZ Kneza Mihaila 45",
    paymentAccountNumber: "265000000087654321",
    paymentBankName: "Raiffeisen Banka",
  });
  const b2Entrance = await ensureEntrance(b2.id, "A");
  const unit2a = await upsertManagedUnit(organizationId, b2.id, b2Entrance.id, {
    code: "STAN-2A",
    type: "APARTMENT",
    floor: 3,
    totalArea: "75.00",
    participationShare: "1.2",
  });
  const owner3 = await upsertBuildingPerson(organizationId, b2.id, {
    firstName: "Jovana",
    lastName: "Nikolić",
    email: "jovana.nikolic@stanari.test",
    phone: "+381621234567",
  });
  await upsertOwnership(unit2a.id, owner3.id);

  // Tariffs — current maintenance + manager fee per m² for both buildings
  for (const b of [b1, b2]) {
    await upsertTariff(organizationId, b.id, {
      name: "Tekuće održavanje",
      kind: "CURRENT_MAINTENANCE",
      basis: "PER_SQUARE_METER",
      amount: "30.0000",
    });
    await upsertTariff(organizationId, b.id, {
      name: "Naknada upravniku",
      kind: "MANAGER_FEE",
      basis: "PER_UNIT",
      amount: "500.00",
    });
  }

  // One month of dues charges for both buildings
  const now = new Date();
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1;
  await seedDuesForUnit(organizationId, b1.id, unit1a.id, periodYear, periodMonth, {
    CURRENT_MAINTENANCE: 1875, // 62.5 × 30
    MANAGER_FEE: 500,
  });
  await seedDuesForUnit(organizationId, b1.id, unit1b.id, periodYear, periodMonth, {
    CURRENT_MAINTENANCE: 1440, // 48 × 30
    MANAGER_FEE: 500,
  });
  await seedDuesForUnit(organizationId, b2.id, unit2a.id, periodYear, periodMonth, {
    CURRENT_MAINTENANCE: 2250, // 75 × 30
    MANAGER_FEE: 500,
  });

  // One open maintenance ticket for building 1
  let liftTicket = await prisma.maintenanceTicket.findFirst({
    where: { organizationId, buildingId: b1.id, title: "Pokvaren lift" },
  });
  if (!liftTicket) {
    const ticketCount = await prisma.maintenanceTicket.count({
      where: { organizationId },
    });
    liftTicket = await prisma.maintenanceTicket.create({
      data: {
        organizationId,
        buildingId: b1.id,
        unitId: null,
        code: `BLD-${String(ticketCount + 1).padStart(5, "0")}`,
        title: "Pokvaren lift",
        description: "Lift se zaustavlja između spratova. Potreban servis.",
        status: "OPEN",
        priority: "HIGH",
        category: "ELEVATOR",
      },
    });
  }

  // One scheduled assembly for building 1
  let annualAssembly = await prisma.assembly.findFirst({
    where: { organizationId, buildingId: b1.id, title: "Redovna godišnja skupština" },
  });
  if (!annualAssembly) {
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    annualAssembly = await prisma.assembly.create({
      data: {
        organizationId,
        buildingId: b1.id,
        code: `GS-${periodYear}-${String(periodMonth).padStart(2, "0")}`,
        title: "Redovna godišnja skupština",
        type: "REGULAR",
        status: "SCHEDULED",
        scheduledAt: inTwoWeeks,
        location: "Hol zgrade",
        quorumNote: "Potrebno više od 50% vlasnika.",
        items: {
          create: [
            {
              sortOrder: 1,
              title: "Usvajanje godišnjeg finansijskog izveštaja",
              description: "Prikaz prihoda i rashoda za prošlu godinu.",
              voteKind: "DECISION",
              majority: "SIMPLE",
            },
            {
              sortOrder: 2,
              title: "Odluka o investiciji u LED rasvetu",
              description: "Zamena stepenišne rasvete LED panelima.",
              voteKind: "DECISION",
              majority: "ABSOLUTE",
            },
          ],
        },
      },
    });
  }

  await seedManagerShowcase({
    organizationId,
    b1,
    b2,
    unit1a,
    unit1b,
    unit2a,
    owner1,
    owner2,
    owner3,
    periodYear,
    periodMonth,
    liftTicket,
    annualAssembly,
  });
}

/**
 * Extra demo rows so the manager walk looks lived-in: several unit types,
 * payment states, ticket stages, a contractor, a portal invite, and notices.
 * Every insert is skipped when its natural key already exists, so a second
 * seed never doubles a payment or resets a status a person changed.
 */
async function seedManagerShowcase(input: {
  organizationId: string;
  b1: { id: string };
  b2: { id: string };
  unit1a: { id: string };
  unit1b: { id: string };
  unit2a: { id: string };
  owner1: { id: string; email: string | null };
  owner2: { id: string; email: string | null };
  owner3: { id: string; email: string | null };
  periodYear: number;
  periodMonth: number;
  liftTicket: { id: string; supplierId: string | null } | null;
  annualAssembly: { id: string } | null;
}) {
  const { organizationId, b1, b2 } = input;
  const entranceB = await ensureEntrance(b1.id, "B");

  const garage = await upsertManagedUnit(organizationId, b1.id, entranceB.id, {
    code: "GAR-01",
    type: "GARAGE",
    floor: -1,
    totalArea: "14.00",
    participationShare: "0.2",
  });
  const shop = await upsertManagedUnit(organizationId, b1.id, entranceB.id, {
    code: "LOK-01",
    type: "COMMERCIAL",
    floor: 0,
    totalArea: "36.00",
    participationShare: "0.6",
  });
  const parking = await upsertManagedUnit(
    organizationId,
    b2.id,
    (await ensureEntrance(b2.id, "A")).id,
    {
      code: "PG-01",
      type: "PARKING_SPACE",
      floor: -1,
      totalArea: "12.50",
      participationShare: "0.15",
    },
  );

  const garageOwner = await upsertBuildingPerson(organizationId, b1.id, {
    firstName: "Marko",
    lastName: "Ilić",
    email: "marko.ilic@stanari.test",
    phone: "+381631110001",
  });
  const shopOwner = await upsertBuildingPerson(organizationId, b1.id, {
    firstName: "Ivana",
    lastName: "Stojanović",
    email: "ivana.stojanovic@stanari.test",
    phone: "+381641110002",
  });
  const parkingOwner = await upsertBuildingPerson(organizationId, b2.id, {
    firstName: "Petar",
    lastName: "Kostić",
    email: "petar.kostic@stanari.test",
    phone: "+381651110003",
  });
  await upsertOwnership(garage.id, garageOwner.id);
  await upsertOwnership(shop.id, shopOwner.id);
  await upsertOwnership(parking.id, parkingOwner.id);

  await upsertTariff(organizationId, b1.id, {
    name: "Investicioni fond",
    kind: "INVESTMENT_FUND",
    basis: "PER_SQUARE_METER",
    amount: "15.0000",
  });
  await upsertTariff(organizationId, b1.id, {
    name: "Osiguranje zgrade",
    kind: "INSURANCE",
    basis: "PER_UNIT",
    amount: "180.00",
  });

  const prev =
    input.periodMonth === 1
      ? { year: input.periodYear - 1, month: 12 }
      : { year: input.periodYear, month: input.periodMonth - 1 };

  const paidGarage = await seedDuesForUnit(
    organizationId,
    b1.id,
    garage.id,
    prev.year,
    prev.month,
    {
      CURRENT_MAINTENANCE: 420,
      MANAGER_FEE: 500,
    },
  );
  await markChargeSettled(paidGarage, "PAID", "seed:garaza-placeno");

  const partialCurrent = await prisma.duesCharge.findFirst({
    where: {
      organizationId,
      unitId: input.unit1a.id,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
    },
  });
  await markChargeSettled(partialCurrent, "PARTIALLY_PAID", "seed:stan-1a-delimicno", 1000);

  await seedDuesForUnit(organizationId, b1.id, shop.id, input.periodYear, input.periodMonth, {
    CURRENT_MAINTENANCE: 1080,
    MANAGER_FEE: 500,
    INSURANCE: 180,
  });
  const writtenOff = await seedDuesForUnit(
    organizationId,
    b2.id,
    parking.id,
    prev.year,
    prev.month,
    {
      CURRENT_MAINTENANCE: 375,
      MANAGER_FEE: 500,
    },
  );
  await markChargeSettled(writtenOff, "WRITTEN_OFF", "seed:parking-otpis");

  const liftCo = await upsertSupplier(organizationId, {
    name: "Vertikal servis d.o.o.",
    category: "ELEVATOR",
    contactPerson: "Dragan Lazić",
    phone: "+381112000111",
    email: "servis@vertikal.test",
  });
  const plumber = await upsertSupplier(organizationId, {
    name: "Cev i ventil",
    category: "PLUMBING",
    contactPerson: "Nenad Babić",
    phone: "+381641002003",
    email: "info@ceviventil.test",
  });
  await upsertSupplier(organizationId, {
    name: "Struja plus",
    category: "ELECTRICAL",
    contactPerson: "Milica Ristić",
    phone: "+381631004005",
    email: "radovi@strujaplus.test",
  });

  const technician = await prisma.user.findUnique({
    where: { email: "majstor@upravnikplus.test" },
    select: { id: true },
  });

  if (input.liftTicket && !input.liftTicket.supplierId) {
    await prisma.maintenanceTicket.update({
      where: { id: input.liftTicket.id },
      data: { supplierId: liftCo.id, category: "ELEVATOR" },
    });
  }

  const leak = await ensureTicket(organizationId, {
    buildingId: b1.id,
    unitId: input.unit1a.id,
    code: "BLD-00002",
    title: "Curenje u kupatilu",
    description: "Voda se pojavljuje ispod kade. Stanar je prijavio sa portala.",
    category: "PLUMBING",
    priority: "URGENT",
    status: "TRIAGED",
    supplierId: plumber.id,
    reportedByPersonId: input.owner1.id,
    estimatedCost: "18000.00",
  });
  const heating = await ensureTicket(organizationId, {
    buildingId: b1.id,
    unitId: null,
    code: "BLD-00003",
    title: "Hladan radijator u holu",
    description: "Zajednički radijator na prizemlju ne greje.",
    category: "HEATING",
    priority: "NORMAL",
    status: "IN_PROGRESS",
    assignedToUserId: technician?.id ?? null,
    estimatedCost: "9500.00",
  });
  await ensureTicket(organizationId, {
    buildingId: b2.id,
    unitId: input.unit2a.id,
    code: "BLD-00004",
    title: "Čeka se ventil",
    description: "Deo je naručen, rad staje dok ne stigne.",
    category: "PLUMBING",
    priority: "LOW",
    status: "AWAITING_PARTS",
    supplierId: plumber.id,
  });
  const done = await ensureTicket(organizationId, {
    buildingId: b2.id,
    unitId: null,
    code: "BLD-00005",
    title: "Zamenjene sijalice u hodniku",
    description: "LED sijalice na drugom i trećem spratu.",
    category: "ELECTRICAL",
    priority: "LOW",
    status: "COMPLETED",
    actualCost: "4200.00",
    fund: "CURRENT_MAINTENANCE",
    completedAt: new Date(),
  });
  await ensureTicket(organizationId, {
    buildingId: b1.id,
    unitId: shop.id,
    code: "BLD-00006",
    title: "Otkazana prijava fasade",
    description: "Stanar je povukao prijavu. Nije bilo oštećenja.",
    category: "FACADE",
    priority: "LOW",
    status: "CANCELED",
  });

  await ensureWorkEntry(
    organizationId,
    heating.id,
    "Otvoren ventil i ispušten vazduh. Sutra provera pritiska.",
  );
  await ensureExpense(organizationId, {
    buildingId: b2.id,
    ticketId: done.id,
    supplierId: null,
    fund: "CURRENT_MAINTENANCE",
    description: "Kvar BLD-00005: Zamenjene sijalice u hodniku",
    amount: "4200.00",
  });

  await ensureNotice(organizationId, {
    buildingId: b1.id,
    originKey: "seed:b1:water",
    title: "Isključenje vode u četvrtak",
    body: "Voda će biti isključena u četvrtak od 09:00 do 13:00 zbog zamene ventila u podstanici.",
    channel: "PORTAL_AND_EMAIL",
    audience: "ALL",
    published: true,
  });
  await ensureNotice(organizationId, {
    buildingId: b1.id,
    originKey: "seed:b1:stan-1a",
    title: "Podsetnik za uplatu stana 1A",
    body: "Na stanu 1A ostala je delimična uplata za tekući mesec. Uplatnica je na portalu.",
    channel: "PORTAL_ONLY",
    audience: "SPECIFIC_UNITS",
    audienceParams: { unitIds: [input.unit1a.id] },
    published: true,
  });
  await ensureNotice(organizationId, {
    buildingId: b1.id,
    originKey: "seed:b1:draft",
    title: "Nacrt: skupljanje ključeva od podruma",
    body: "Nacrt koji još nije objavljen. Upravnik ga vidi, stanari ne.",
    channel: "PORTAL_ONLY",
    audience: "ALL",
    published: false,
  });
  if (input.liftTicket) {
    await ensureNotice(organizationId, {
      buildingId: b1.id,
      originKey: `ticket:${input.liftTicket.id}:opened`,
      title: "Prijavljen kvar: Pokvaren lift",
      body: "Lift se zaustavlja između spratova. Servis je obavešten.",
      channel: "PORTAL_AND_EMAIL",
      audience: "ALL",
      ticketId: input.liftTicket.id,
      published: true,
    });
  }
  if (input.annualAssembly) {
    await ensureNotice(organizationId, {
      buildingId: b1.id,
      originKey: `assembly:${input.annualAssembly.id}:invite`,
      title: "Skupština: Redovna godišnja skupština",
      body: "Poziv na redovnu godišnju skupštinu. Dnevni red je na portalu.",
      channel: "PORTAL_ONLY",
      audience: "ALL",
      assemblyId: input.annualAssembly.id,
      published: true,
    });
  }
  await ensureNotice(organizationId, {
    buildingId: b1.id,
    originKey: `ticket:${leak.id}:opened`,
    title: "Prijavljen kvar: Curenje u kupatilu",
    body: "Prijava je u trijaži. Izvođač je Cev i ventil.",
    channel: "PORTAL_ONLY",
    audience: "SPECIFIC_UNITS",
    audienceParams: { unitIds: [input.unit1a.id] },
    ticketId: leak.id,
    published: true,
  });

  await ensureResidentAccess({
    organizationId,
    personId: input.owner1.id,
    unitId: input.unit1a.id,
    email: input.owner1.email ?? "milan.petrovic@stanari.test",
    status: "ACTIVE",
  });
  await ensureResidentAccess({
    organizationId,
    personId: input.owner2.id,
    unitId: input.unit1b.id,
    email: input.owner2.email ?? "ana.jovanovic@stanari.test",
    status: "PENDING_INVITE",
  });
  await ensureResidentAccess({
    organizationId,
    personId: garageOwner.id,
    unitId: garage.id,
    email: "marko.ilic@stanari.test",
    status: "REVOKED",
  });
  await ensureResidentAccess({
    organizationId,
    personId: input.owner3.id,
    unitId: input.unit2a.id,
    email: input.owner3.email ?? "jovana.nikolic@stanari.test",
    status: "ACTIVE",
  });

  const votingAssembly = await prisma.assembly.findFirst({
    where: { organizationId, buildingId: b2.id, title: "Vanredna skupština o osiguranju" },
  });
  if (!votingAssembly) {
    const opens = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const closes = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await prisma.assembly.create({
      data: {
        organizationId,
        buildingId: b2.id,
        code: `VS-${input.periodYear}-KMH`,
        title: "Vanredna skupština o osiguranju",
        type: "EXTRAORDINARY",
        status: "OPEN_FOR_VOTING",
        scheduledAt: opens,
        votingOpensAt: opens,
        votingClosesAt: closes,
        location: "Portal stanara",
        quorumNote: "Glasanje je evidencija, ne overen zapisnik.",
        items: {
          create: [
            {
              sortOrder: 1,
              title: "Obnova polise osiguranja zgrade",
              description: "Isti osiguravač, viša premija za 8%.",
              voteKind: "DECISION",
              majority: "SIMPLE",
            },
          ],
        },
      },
    });
  }

  const canceled = await prisma.assembly.findFirst({
    where: { organizationId, title: "Odložena skupština o fasadi" },
  });
  if (!canceled) {
    await prisma.assembly.create({
      data: {
        organizationId,
        buildingId: b1.id,
        code: `ODL-${input.periodYear}-FAS`,
        title: "Odložena skupština o fasadi",
        type: "EXTRAORDINARY",
        status: "CANCELED",
        scheduledAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        location: "Hol zgrade",
        quorumNote: "Otkazano jer nije bilo kvoruma na prvoj zakazanoj.",
      },
    });
  }
}

async function upsertSupplier(
  organizationId: string,
  input: {
    name: string;
    category: "ELEVATOR" | "PLUMBING" | "ELECTRICAL";
    contactPerson: string;
    phone: string;
    email: string;
  },
) {
  const existing = await prisma.supplier.findFirst({
    where: { organizationId, name: input.name, archivedAt: null },
  });
  if (existing) return existing;
  return prisma.supplier.create({
    data: {
      organizationId,
      buildingId: null,
      name: input.name,
      category: input.category,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email,
    },
  });
}

async function ensureTicket(
  organizationId: string,
  input: {
    buildingId: string;
    unitId: string | null;
    code: string;
    title: string;
    description: string;
    category: "PLUMBING" | "HEATING" | "ELECTRICAL" | "FACADE";
    priority: "LOW" | "NORMAL" | "URGENT";
    status: "TRIAGED" | "IN_PROGRESS" | "AWAITING_PARTS" | "COMPLETED" | "CANCELED";
    supplierId?: string | null;
    reportedByPersonId?: string | null;
    assignedToUserId?: string | null;
    estimatedCost?: string;
    actualCost?: string;
    fund?: "CURRENT_MAINTENANCE";
    completedAt?: Date;
  },
) {
  const existing = await prisma.maintenanceTicket.findFirst({
    where: { organizationId, title: input.title },
  });
  if (existing) return existing;
  const codeOwner = await prisma.maintenanceTicket.findFirst({
    where: { organizationId, code: input.code },
    select: { id: true },
  });
  const code = codeOwner
    ? `BLD-${String(
        (await prisma.maintenanceTicket.count({ where: { organizationId } })) + 1,
      ).padStart(5, "0")}`
    : input.code;
  return prisma.maintenanceTicket.create({
    data: {
      organizationId,
      buildingId: input.buildingId,
      unitId: input.unitId,
      code,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: input.status,
      supplierId: input.supplierId ?? null,
      reportedByPersonId: input.reportedByPersonId ?? null,
      assignedToUserId: input.assignedToUserId ?? null,
      estimatedCost: input.estimatedCost ? new Prisma.Decimal(input.estimatedCost) : null,
      actualCost: input.actualCost ? new Prisma.Decimal(input.actualCost) : null,
      fund: input.fund ?? null,
      completedAt: input.completedAt ?? null,
    },
  });
}

async function ensureWorkEntry(organizationId: string, ticketId: string, body: string) {
  const existing = await prisma.maintenanceWorkEntry.findFirst({
    where: { ticketId, body },
  });
  if (existing) return existing;
  return prisma.maintenanceWorkEntry.create({
    data: { organizationId, ticketId, body, visibleToResident: true },
  });
}

async function ensureExpense(
  organizationId: string,
  input: {
    buildingId: string;
    ticketId: string;
    supplierId: string | null;
    fund: "CURRENT_MAINTENANCE";
    description: string;
    amount: string;
  },
) {
  const existing = await prisma.buildingExpense.findFirst({
    where: { organizationId, ticketId: input.ticketId, description: input.description },
  });
  if (existing) return existing;
  return prisma.buildingExpense.create({
    data: {
      organizationId,
      buildingId: input.buildingId,
      ticketId: input.ticketId,
      supplierId: input.supplierId,
      fund: input.fund,
      description: input.description,
      amount: new Prisma.Decimal(input.amount),
      currency: "RSD",
      spentAt: new Date(),
    },
  });
}

async function ensureNotice(
  organizationId: string,
  input: {
    buildingId: string;
    originKey: string;
    title: string;
    body: string;
    channel: "PORTAL_ONLY" | "PORTAL_AND_EMAIL" | "EMAIL_ONLY";
    audience: "ALL" | "SPECIFIC_UNITS";
    audienceParams?: { unitIds: string[] };
    ticketId?: string;
    assemblyId?: string;
    published: boolean;
  },
) {
  const existing = await prisma.buildingNotice.findFirst({
    where: { organizationId, originKey: input.originKey },
  });
  if (existing) return existing;
  return prisma.buildingNotice.create({
    data: {
      organizationId,
      buildingId: input.buildingId,
      title: input.title,
      body: input.body,
      channel: input.channel,
      audience: input.audience,
      audienceParams: (input.audienceParams ?? {}) as Prisma.InputJsonValue,
      ticketId: input.ticketId ?? null,
      assemblyId: input.assemblyId ?? null,
      originKey: input.originKey,
      publishedAt: input.published ? new Date() : null,
    },
  });
}

async function ensureResidentAccess(input: {
  organizationId: string;
  personId: string;
  unitId: string;
  email: string;
  status: "ACTIVE" | "PENDING_INVITE" | "REVOKED";
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.residentAccess.findUnique({
    where: { unitId_email: { unitId: input.unitId, email } },
  });
  if (existing) return existing;
  return prisma.residentAccess.create({
    data: {
      organizationId: input.organizationId,
      personId: input.personId,
      unitId: input.unitId,
      email,
      status: input.status,
      acceptedAt: input.status === "ACTIVE" ? new Date() : null,
      revokedAt: input.status === "REVOKED" ? new Date() : null,
      revokedReason: input.status === "REVOKED" ? "Demo: pristup povučen." : null,
      inviteToken: input.status === "PENDING_INVITE" ? createId() : null,
      inviteExpiresAt:
        input.status === "PENDING_INVITE" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
    },
  });
}

async function markChargeSettled(
  charge: {
    id: string;
    organizationId: string;
    totalAmount: Prisma.Decimal;
    status: string;
    reference: string | null;
  } | null,
  target: "PAID" | "PARTIALLY_PAID" | "WRITTEN_OFF",
  note: string,
  partialAmount?: number,
) {
  if (!charge) return;
  const already = await prisma.duesPayment.findFirst({
    where: { chargeId: charge.id, notes: note },
  });
  if (already || charge.status === "WRITTEN_OFF" || charge.status === "PAID") return;
  if (target === "WRITTEN_OFF") {
    if (charge.status !== "OPEN") return;
    await prisma.duesCharge.update({
      where: { id: charge.id },
      data: { status: "WRITTEN_OFF", notes: note },
    });
    return;
  }
  const payments = await prisma.duesPayment.count({ where: { chargeId: charge.id } });
  if (payments > 0) return;
  const total = new Prisma.Decimal(charge.totalAmount.toString());
  const amount = target === "PAID" ? total : new Prisma.Decimal(partialAmount ?? 0);
  if (amount.lte(0)) return;
  await prisma.duesPayment.create({
    data: {
      organizationId: charge.organizationId,
      chargeId: charge.id,
      amount,
      currency: "RSD",
      paidAt: new Date(),
      method: "BANK_TRANSFER",
      notes: note,
    },
  });
  await prisma.duesCharge.update({
    where: { id: charge.id },
    data: {
      paidAmount: amount,
      status: target,
      reference: charge.reference ?? chargeReference(charge.id),
    },
  });
}

function chargeReference(id: string) {
  let n = 0n;
  for (const ch of id) n = (n * 36n + BigInt(ch.charCodeAt(0))) % 10n ** 12n;
  return deterministicModel97(n.toString().padStart(12, "0")).compact;
}

async function upsertManagedBuilding(
  organizationId: string,
  input: {
    name: string;
    address: string;
    city: string;
    legalName: string;
    paymentAccountNumber: string;
    paymentBankName: string;
  },
) {
  const existing = await prisma.managedBuilding.findFirst({
    where: { organizationId, name: input.name },
  });
  if (existing) return existing;
  return prisma.managedBuilding.create({
    data: {
      organizationId,
      name: input.name,
      address: input.address,
      city: input.city,
      country: "RS",
      legalName: input.legalName,
      paymentAccountNumber: input.paymentAccountNumber,
      paymentBankName: input.paymentBankName,
      entranceCount: 1,
    },
  });
}

async function ensureEntrance(buildingId: string, code: string) {
  const existing = await prisma.buildingEntranceSection.findUnique({
    where: { buildingId_code: { buildingId, code } },
  });
  if (existing) return existing;
  return prisma.buildingEntranceSection.create({
    data: { buildingId, code, sortOrder: 0 },
  });
}

async function upsertManagedUnit(
  organizationId: string,
  buildingId: string,
  entranceId: string,
  input: {
    code: string;
    type: "APARTMENT" | "COMMERCIAL" | "GARAGE" | "PARKING_SPACE" | "STORAGE" | "OFFICE" | "OTHER";
    floor: number;
    totalArea: string;
    participationShare: string;
  },
) {
  const existing = await prisma.managedUnit.findUnique({
    where: { buildingId_code: { buildingId, code: input.code } },
  });
  if (existing) return existing;
  return prisma.managedUnit.create({
    data: {
      organizationId,
      buildingId,
      entranceId,
      code: input.code,
      type: input.type,
      floor: input.floor,
      totalArea: new Prisma.Decimal(input.totalArea),
      participationShare: new Prisma.Decimal(input.participationShare),
    },
  });
}

async function upsertBuildingPerson(
  organizationId: string,
  buildingId: string,
  input: { firstName: string; lastName: string; email: string; phone: string },
) {
  const existing = await prisma.buildingPerson.findFirst({
    where: { organizationId, buildingId, email: input.email },
  });
  if (existing) return existing;
  return prisma.buildingPerson.create({
    data: {
      organizationId,
      buildingId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      primaryRole: "OWNER",
    },
  });
}

async function upsertOwnership(unitId: string, personId: string) {
  const existing = await prisma.unitOwnership.findFirst({
    where: { unitId, personId, endedAt: null },
  });
  if (existing) return existing;
  return prisma.unitOwnership.create({
    data: {
      unitId,
      personId,
      role: "OWNER",
      sharePercent: new Prisma.Decimal("100"),
      isPrimary: true,
      startedAt: new Date(),
    },
  });
}

async function upsertTariff(
  organizationId: string,
  buildingId: string,
  input: {
    name: string;
    kind: "CURRENT_MAINTENANCE" | "INVESTMENT_FUND" | "MANAGER_FEE" | "INSURANCE" | "OTHER";
    basis: "PER_UNIT" | "PER_SQUARE_METER";
    amount: string;
  },
) {
  const existing = await prisma.duesTariff.findFirst({
    where: { organizationId, buildingId, name: input.name, active: true },
  });
  if (existing) return existing;
  return prisma.duesTariff.create({
    data: {
      organizationId,
      buildingId,
      name: input.name,
      kind: input.kind,
      basis: input.basis,
      amount: new Prisma.Decimal(input.amount),
      currency: "RSD",
      effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
      active: true,
    },
  });
}

async function seedDuesForUnit(
  organizationId: string,
  buildingId: string,
  unitId: string,
  year: number,
  month: number,
  breakdown: Record<string, number>,
) {
  const existing = await prisma.duesCharge.findFirst({
    where: { organizationId, unitId, periodYear: year, periodMonth: month },
  });
  if (existing) return existing;
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const dueDate = new Date(year, month - 1, 15);
  return prisma.duesCharge.create({
    data: {
      organizationId,
      buildingId,
      unitId,
      periodYear: year,
      periodMonth: month,
      dueDate,
      totalAmount: new Prisma.Decimal(total.toFixed(2)),
      paidAmount: new Prisma.Decimal("0"),
      currency: "RSD",
      status: "OPEN",
      breakdown: breakdown as unknown as Prisma.InputJsonValue,
    },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
