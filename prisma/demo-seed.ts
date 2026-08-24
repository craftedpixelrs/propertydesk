/**
 * PropertyDesk — expanded DEMO seed.
 *
 * This complements the baseline `prisma/seed.ts` (plans + super admin +
 * two demo tenants + billing scaffolding). Where the baseline creates
 * *empty* organizations, this script fills them with realistic Serbian
 * demo data so a fresh install feels lived-in:
 *
 *   - 3 investor projects for "Gradnja Plus" with buildings, entrances,
 *     floors and ~65 units of mixed type (apartments, garages, retail)
 *   - Agency access + commission rule linking "Top Nekretnine" to the
 *     first project
 *   - ~16 buyers with realistic phones, preferences, statuses
 *   - Buyer activities + open sales-team tasks
 *   - 8 reservations across statuses (approved / expired / rejected)
 *   - 6 sales in different lifecycle stages (draft → paid)
 *   - Payment plans + installments + already-recorded payments
 *   - Commission snapshots for agency-sourced sales
 *   - Notifications for the investor owner
 *
 * The script is IDEMPOTENT: if it detects that the investor org already
 * has projects, it exits without touching anything. Delete the demo
 * projects (or run against a fresh database) to re-seed.
 *
 * We call `prisma.*.create` directly — the domain services are marked
 * `import "server-only"` (they need Next.js request headers for audit
 * logging) so we can't safely import them from a plain Node script.
 * Where domain invariants matter (unit status ↔ reservation/sale
 * lifecycle, `UnitStatusHistory`, `ReservationStatusHistory`), we
 * manually mirror what the services would do.
 *
 * Run:
 *   pnpm exec tsx prisma/demo-seed.ts
 * or, once the npm script is added:
 *   pnpm db:seed:demo
 */

import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createId } from "@paralleldrive/cuid2";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Neither DIRECT_URL nor DATABASE_URL is defined");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Constants & static demo content
// ---------------------------------------------------------------------------

const INVESTOR_SLUG = "gradnja-plus";
const AGENCY_SLUG = "top-nekretnine";

/** Owner / manager / agent emails must match the baseline seed. */
const OWNER_EMAIL = "vlasnik@gradnjaplus.test";
const MANAGER_EMAIL = "prodaja@gradnjaplus.test";
const AGENT_EMAIL = "agent@gradnjaplus.test";
const FINANCE_EMAIL = "finansije@gradnjaplus.test";
const AGENCY_AGENT_EMAIL = "agent@topnekretnine.test";

/** A stable "now" so repeated demo runs don't drift the dataset. */
const NOW = new Date("2026-07-18T10:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n: number): Date {
  return new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
}

/** Deterministic PRNG so demo layouts are reproducible run-to-run. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Users {
  owner: string;
  manager: string;
  agent: string;
  finance: string;
  agencyAgent: string;
}

interface OrgIds {
  investorId: string;
  agencyId: string;
  connectionId: string;
}

interface ProjectSeed {
  code: string;
  name: string;
  slug: string;
  address: string;
  municipality: string;
  postalCode: string;
  city: string;
  status:
    | "DRAFT"
    | "PRE_SALES"
    | "ACTIVE_SALES"
    | "CONSTRUCTION"
    | "COMPLETED"
    | "ARCHIVED";
  description: string;
  salesStartDate?: Date;
  constructionStartDate?: Date;
  expectedCompletionDate?: Date;
  defaultVatRate: string;
  visibleToAgencies: boolean;
  buildings: BuildingSeed[];
}

interface BuildingSeed {
  code: string;
  name: string;
  entrances: EntranceSeed[];
}
interface EntranceSeed {
  code: string;
  name: string;
  floors: FloorSeed[];
}
interface FloorSeed {
  number: number;
  label: string;
  units: UnitSeedInput[];
}
interface UnitSeedInput {
  code: string;
  type:
    | "APARTMENT"
    | "GARAGE"
    | "PARKING_SPACE"
    | "STORAGE"
    | "COMMERCIAL"
    | "HOUSE"
    | "OTHER";
  structure?: string; // "1.5", "2.0", ...
  roomCount?: number;
  totalArea: number;
  internalArea?: number;
  terraceArea?: number;
  orientation?: string;
  pricePerSqm: number;
  bedrooms?: number;
  bathrooms?: number;
  hasTerrace?: boolean;
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function buildProjects(): ProjectSeed[] {
  const projects: ProjectSeed[] = [];

  // ─── Project 1: Residence Park Novi Beograd (ACTIVE_SALES) ────────────
  projects.push({
    code: "NBG-01",
    name: "Residence Park Novi Beograd",
    slug: "residence-park-novi-beograd",
    address: "Bulevar Zorana Đinđića 145",
    municipality: "Novi Beograd",
    postalCode: "11070",
    city: "Beograd",
    status: "ACTIVE_SALES",
    description:
      "Moderna stambena zgrada A+ klase energetske efikasnosti u srcu Bloka 65. Podzemna garaža, prostrane terase, pametna kućica za dostave.",
    salesStartDate: daysAgo(180),
    constructionStartDate: daysAgo(360),
    expectedCompletionDate: daysFromNow(240),
    defaultVatRate: "10.00",
    visibleToAgencies: true,
    buildings: [
      {
        code: "A",
        name: "Lamela A",
        entrances: [
          {
            code: "A1",
            name: "Ulaz A1",
            floors: buildFloors(6, "A1", 2200, {
              apartmentsPerFloor: 4,
              structures: ["1.5", "2.0", "2.5", "3.0"],
            }),
          },
        ],
      },
    ],
  });

  // Add basement garages + ground-floor retail as "phantom" floor units on
  // Project 1 for a realistic mixed inventory.
  const nbg = projects[0]!;
  const groundFloor = nbg.buildings[0]!.entrances[0]!.floors[0]!;
  groundFloor.units.push(
    ...makeCommercial("NBG-A1-L01", 65, 1900),
    ...makeCommercial("NBG-A1-L02", 48, 2000),
  );
  const basementFloor: FloorSeed = {
    number: -1,
    label: "Suteren",
    units: [
      ...makeGarage("NBG-G01", 15),
      ...makeGarage("NBG-G02", 15),
      ...makeGarage("NBG-G03", 15),
      ...makeGarage("NBG-G04", 15),
      ...makeGarage("NBG-G05", 15),
      ...makeGarage("NBG-G06", 15),
      ...makeGarage("NBG-G07", 15),
      ...makeGarage("NBG-G08", 15),
    ],
  };
  nbg.buildings[0]!.entrances[0]!.floors.unshift(basementFloor);

  // ─── Project 2: Vračar Terraces (CONSTRUCTION) ────────────────────────
  projects.push({
    code: "VRC-01",
    name: "Vračar Terraces",
    slug: "vracar-terraces",
    address: "Krunska 78",
    municipality: "Vračar",
    postalCode: "11000",
    city: "Beograd",
    status: "CONSTRUCTION",
    description:
      "Butik zgrada od 12 stanova u zaštićenoj vračarskoj zoni. Duboke terase okrenute ka parku, klasična fasada u savremenom ključu.",
    salesStartDate: daysAgo(90),
    constructionStartDate: daysAgo(150),
    expectedCompletionDate: daysFromNow(420),
    defaultVatRate: "10.00",
    visibleToAgencies: false,
    buildings: [
      {
        code: "B",
        name: "Glavna zgrada",
        entrances: [
          {
            code: "B1",
            name: "Ulaz",
            floors: buildFloors(4, "B1", 3100, {
              apartmentsPerFloor: 3,
              structures: ["2.0", "2.5", "3.5"],
            }),
          },
        ],
      },
    ],
  });

  // ─── Project 3: Zemunska Vila (PRE_SALES) ────────────────────────────
  projects.push({
    code: "ZEM-01",
    name: "Zemunska Vila",
    slug: "zemunska-vila",
    address: "Karađorđeva 32",
    municipality: "Zemun",
    postalCode: "11080",
    city: "Beograd",
    status: "PRE_SALES",
    description:
      "Kamerna vila sa 8 stanova, pogled na Dunav sa gornjih nivoa. Očekivani početak radova jesen 2026.",
    salesStartDate: daysAgo(20),
    constructionStartDate: daysFromNow(60),
    expectedCompletionDate: daysFromNow(720),
    defaultVatRate: "10.00",
    visibleToAgencies: true,
    buildings: [
      {
        code: "V",
        name: "Vila",
        entrances: [
          {
            code: "V1",
            name: "Glavni ulaz",
            floors: buildFloors(3, "V1", 2500, {
              apartmentsPerFloor: 2,
              structures: ["3.0", "4.0"],
            }),
          },
        ],
      },
    ],
  });

  return projects;
}

function buildFloors(
  count: number,
  entrancePrefix: string,
  baseSqm: number,
  opts: { apartmentsPerFloor: number; structures: string[] },
): FloorSeed[] {
  const floors: FloorSeed[] = [];
  for (let i = 1; i <= count; i++) {
    const units: UnitSeedInput[] = [];
    for (let j = 0; j < opts.apartmentsPerFloor; j++) {
      const structure =
        opts.structures[j % opts.structures.length] ?? opts.structures[0]!;
      const roomCount = Number.parseFloat(structure);
      // Area grows with structure; small bump per floor for penthouse feel
      const area =
        (30 + roomCount * 15 + i * 0.5) *
        (opts.apartmentsPerFloor > 3 ? 1 : 1.1);
      const orientation = ["Istok", "Zapad", "Jug", "Sever"][j % 4] ?? "Istok";
      const priceBump = 1 + (i - 1) * 0.02; // 2% floor premium
      units.push({
        code: `${entrancePrefix}-${String(i).padStart(2, "0")}${String.fromCharCode(65 + j)}`,
        type: "APARTMENT",
        structure,
        roomCount,
        totalArea: round2(area),
        internalArea: round2(area * 0.88),
        terraceArea: roomCount >= 2 ? round2(area * 0.1) : undefined,
        orientation,
        pricePerSqm: Math.round(baseSqm * priceBump),
        bedrooms: Math.max(1, Math.floor(roomCount)),
        bathrooms: roomCount >= 2.5 ? 2 : 1,
        hasTerrace: roomCount >= 2,
      });
    }
    floors.push({
      number: i,
      label: floorLabel(i),
      units,
    });
  }
  return floors;
}

function floorLabel(n: number): string {
  if (n === 1) return "Prizemlje";
  if (n === 2) return "1. sprat";
  return `${n - 1}. sprat`;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function makeGarage(code: string, area: number): UnitSeedInput[] {
  return [
    {
      code,
      type: "GARAGE",
      totalArea: area,
      pricePerSqm: 800,
    },
  ];
}
function makeCommercial(
  code: string,
  area: number,
  pricePerSqm: number,
): UnitSeedInput[] {
  return [
    {
      code,
      type: "COMMERCIAL",
      totalArea: area,
      pricePerSqm,
    },
  ];
}

// ---------------------------------------------------------------------------
// Buyer fixtures
// ---------------------------------------------------------------------------

interface BuyerSeed {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  budgetMin?: number;
  budgetMax?: number;
  status:
    | "NEW"
    | "CONTACTED"
    | "QUALIFIED"
    | "VIEWING_SCHEDULED"
    | "OFFER_SENT"
    | "NEGOTIATION"
    | "RESERVATION"
    | "WON"
    | "LOST";
  source: string;
  notes?: string;
  assignee: keyof Users;
  desiredTypes?: Array<"APARTMENT" | "GARAGE" | "COMMERCIAL">;
  desiredRoomCounts?: string[];
}

const BUYERS: BuyerSeed[] = [
  {
    firstName: "Nikola",
    lastName: "Jovanović",
    email: "nikola.jovanovic@primer.rs",
    phone: "+381601234567",
    budgetMin: 90000,
    budgetMax: 130000,
    status: "WON",
    source: "Uputio kolega",
    notes: "Traži 2.0 stan na sunčanoj strani.",
    assignee: "manager",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["2.0", "2.5"],
  },
  {
    firstName: "Milica",
    lastName: "Petrović",
    email: "milica.petrovic@primer.rs",
    phone: "+381602345678",
    budgetMax: 220000,
    status: "NEGOTIATION",
    source: "Sajt investitora",
    notes: "Ima kredit odobren kod Raiffeisen banke.",
    assignee: "agent",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["3.0"],
  },
  {
    firstName: "Aleksandar",
    lastName: "Nikolić",
    email: "aca.nikolic@primer.rs",
    phone: "+381603456789",
    status: "OFFER_SENT",
    source: "Instagram oglas",
    notes: "Traži 1.5, spreman na avans.",
    assignee: "agent",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["1.5", "2.0"],
  },
  {
    firstName: "Jelena",
    lastName: "Marković",
    email: "jelena.markovic@primer.rs",
    phone: "+381604567890",
    budgetMax: 180000,
    status: "RESERVATION",
    source: "Preporuka klijenta",
    notes: "Prva kupovina — treba objasniti tok plaćanja.",
    assignee: "manager",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["2.0"],
  },
  {
    firstName: "Stefan",
    lastName: "Ilić",
    email: "stefan.ilic@primer.rs",
    phone: "+381605678901",
    budgetMax: 320000,
    status: "QUALIFIED",
    source: "Sajt investitora",
    notes: "Zainteresovan za penthaus u Vračaru.",
    assignee: "manager",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["3.5", "4.0"],
  },
  {
    firstName: "Maja",
    lastName: "Stanković",
    email: "maja.stankovic@primer.rs",
    phone: "+381606789012",
    status: "CONTACTED",
    source: "Agencija Top Nekretnine",
    notes: "Pitala za garažu uz stan.",
    assignee: "agent",
    desiredTypes: ["APARTMENT", "GARAGE"],
  },
  {
    firstName: "Luka",
    lastName: "Mitrović",
    email: "luka.mitrovic@primer.rs",
    phone: "+381607890123",
    status: "VIEWING_SCHEDULED",
    source: "Sajt investitora",
    notes: "Termin obilaska zakazan za 22.07.",
    assignee: "manager",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["2.0", "2.5"],
  },
  {
    firstName: "Ana",
    lastName: "Đorđević",
    email: "ana.djordjevic@primer.rs",
    phone: "+381608901234",
    status: "NEW",
    source: "Kontakt forma",
    assignee: "agent",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["1.5"],
  },
  {
    firstName: "Dejan",
    lastName: "Simić",
    email: "dejan.simic@primer.rs",
    phone: "+381609012345",
    budgetMax: 120000,
    status: "NEW",
    source: "Meta oglas",
    assignee: "manager",
    desiredTypes: ["APARTMENT"],
  },
  {
    firstName: "Ivana",
    lastName: "Radovanović",
    email: "ivana.radovanovic@primer.rs",
    phone: "+381641234567",
    status: "LOST",
    source: "Sajt investitora",
    notes: "Otišla kod konkurencije zbog dužih rokova gradnje.",
    assignee: "agent",
  },
  {
    firstName: "Vukašin",
    lastName: "Pavlović",
    email: "vukasin.pavlovic@primer.rs",
    phone: "+381642345678",
    budgetMin: 150000,
    budgetMax: 250000,
    status: "WON",
    source: "Agencija Top Nekretnine",
    notes: "Ugovoreno preko agencije.",
    assignee: "manager",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["3.0"],
  },
  {
    firstName: "Sanja",
    lastName: "Kovačević",
    email: "sanja.kovacevic@primer.rs",
    phone: "+381643456789",
    status: "WON",
    source: "Preporuka klijenta",
    notes: "Zatvorena prodaja u aprilu.",
    assignee: "manager",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["2.5"],
  },
  {
    firstName: "Marko",
    lastName: "Vasić",
    email: "marko.vasic@primer.rs",
    phone: "+381644567890",
    budgetMax: 95000,
    status: "OFFER_SENT",
    source: "Google oglas",
    notes: "Investitor sa dijaspore, plaća gotovinom.",
    assignee: "manager",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["1.5"],
  },
  {
    firstName: "Tijana",
    lastName: "Popović",
    email: "tijana.popovic@primer.rs",
    phone: "+381645678901",
    status: "QUALIFIED",
    source: "Kontakt forma",
    notes: "Traži lokal za novi kafić.",
    assignee: "agent",
    desiredTypes: ["COMMERCIAL"],
  },
  {
    firstName: "Bojan",
    lastName: "Todorović",
    email: "bojan.todorovic@primer.rs",
    phone: "+381646789012",
    status: "CONTACTED",
    source: "Instagram oglas",
    assignee: "agent",
  },
  {
    firstName: "Katarina",
    lastName: "Živković",
    email: "katarina.zivkovic@primer.rs",
    phone: "+381647890123",
    status: "RESERVATION",
    source: "Agencija Top Nekretnine",
    notes: "Preko agencije, rezervacija odobrena.",
    assignee: "manager",
    desiredTypes: ["APARTMENT"],
    desiredRoomCounts: ["2.0"],
  },
];

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

async function findUser(email: string): Promise<{ id: string; name: string | null }> {
  const u = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });
  if (!u) throw new Error(`Missing seeded user: ${email}. Run baseline seed first.`);
  return u;
}

async function findOrg(slug: string): Promise<string> {
  const o = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!o) throw new Error(`Missing seeded org: ${slug}. Run baseline seed first.`);
  return o.id;
}

async function findConnection(
  investorId: string,
  agencyId: string,
): Promise<string> {
  const c = await prisma.agencyConnection.findFirst({
    where: { investorOrganizationId: investorId, agencyOrganizationId: agencyId },
    select: { id: true },
  });
  if (!c) throw new Error("Missing seeded agency connection. Run baseline seed first.");
  return c.id;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/**
 * Set a unit's status and append a `UnitStatusHistory` row, mirroring
 * what `changeUnitStatus` does in the service layer. Safe to call inside
 * a Prisma transaction if `tx` is passed.
 */
async function setUnitStatus(
  tx: Prisma.TransactionClient,
  args: {
    organizationId: string;
    unitId: string;
    from: string;
    to: string;
    actorUserId: string;
    reason?: string;
    at?: Date;
  },
): Promise<void> {
  await tx.unit.update({
    where: { id: args.unitId },
    data: { status: args.to as never, version: { increment: 1 } },
  });
  await tx.unitStatusHistory.create({
    data: {
      id: createId(),
      organizationId: args.organizationId,
      unitId: args.unitId,
      previousStatus: args.from as never,
      newStatus: args.to as never,
      reason: args.reason ?? null,
      changedByUserId: args.actorUserId,
      changedAt: args.at ?? new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------------------

async function seedProjectsAndUnits(
  orgIds: OrgIds,
  users: Users,
): Promise<Map<string, { projectId: string; unitId: string }>> {
  const unitLookup = new Map<string, { projectId: string; unitId: string }>();
  const projects = buildProjects();

  for (const spec of projects) {
    console.log(`  · Project: ${spec.code} — ${spec.name}`);
    const project = await prisma.project.create({
      data: {
        id: createId(),
        organizationId: orgIds.investorId,
        code: spec.code,
        name: spec.name,
        slug: spec.slug,
        description: spec.description,
        address: spec.address,
        city: spec.city,
        municipality: spec.municipality,
        postalCode: spec.postalCode,
        projectStatus: spec.status as never,
        salesStartDate: spec.salesStartDate ?? null,
        constructionStartDate: spec.constructionStartDate ?? null,
        expectedCompletionDate: spec.expectedCompletionDate ?? null,
        defaultCurrency: "EUR",
        defaultVatRate: spec.defaultVatRate,
        isActive: true,
        publicMicrositeEnabled: spec.visibleToAgencies,
        publicMicrositeSlug: spec.visibleToAgencies ? spec.slug : null,
        createdByUserId: users.owner,
      },
    });

    for (const bSpec of spec.buildings) {
      const building = await prisma.building.create({
        data: {
          id: createId(),
          projectId: project.id,
          code: bSpec.code,
          name: bSpec.name,
        },
      });

      for (const eSpec of bSpec.entrances) {
        const entrance = await prisma.entrance.create({
          data: {
            id: createId(),
            buildingId: building.id,
            code: eSpec.code,
            name: eSpec.name,
          },
        });

        let sortOrder = 0;
        for (const fSpec of eSpec.floors) {
          const floor = await prisma.floor.create({
            data: {
              id: createId(),
              entranceId: entrance.id,
              number: fSpec.number,
              label: fSpec.label,
              sortOrder: sortOrder++,
            },
          });

          for (const uSpec of fSpec.units) {
            const basePrice = round2(uSpec.totalArea * uSpec.pricePerSqm);
            const unit = await prisma.unit.create({
              data: {
                id: createId(),
                organizationId: orgIds.investorId,
                projectId: project.id,
                buildingId: building.id,
                entranceId: entrance.id,
                floorId: floor.id,
                code: uSpec.code,
                type: uSpec.type as never,
                status: "AVAILABLE",
                structure: uSpec.structure ?? null,
                roomCount:
                  uSpec.roomCount !== undefined
                    ? new Prisma.Decimal(uSpec.roomCount)
                    : null,
                totalArea: new Prisma.Decimal(uSpec.totalArea),
                internalArea:
                  uSpec.internalArea !== undefined
                    ? new Prisma.Decimal(uSpec.internalArea)
                    : null,
                terraceArea:
                  uSpec.terraceArea !== undefined
                    ? new Prisma.Decimal(uSpec.terraceArea)
                    : null,
                orientation: uSpec.orientation ?? null,
                basePrice: new Prisma.Decimal(basePrice),
                finalPrice: new Prisma.Decimal(basePrice),
                pricePerSquareMeter: new Prisma.Decimal(uSpec.pricePerSqm),
                currency: "EUR",
                vatRate: spec.defaultVatRate,
                bedrooms: uSpec.bedrooms ?? null,
                bathrooms: uSpec.bathrooms ?? null,
                hasTerrace: uSpec.hasTerrace ?? false,
                isVisibleToAgencies: spec.visibleToAgencies,
              },
            });
            unitLookup.set(uSpec.code, {
              projectId: project.id,
              unitId: unit.id,
            });
          }
        }
      }
    }
  }

  return unitLookup;
}

async function seedAgencyAccess(orgIds: OrgIds): Promise<void> {
  // Grant Top Nekretnine access to project 1 (Residence Park), with a 3%
  // commission rule so agency-sourced sales snapshot deterministically.
  const nbg = await prisma.project.findFirstOrThrow({
    where: { organizationId: orgIds.investorId, code: "NBG-01" },
    select: { id: true },
  });
  const zem = await prisma.project.findFirstOrThrow({
    where: { organizationId: orgIds.investorId, code: "ZEM-01" },
    select: { id: true },
  });

  await prisma.agencyProjectAccess.create({
    data: {
      id: createId(),
      agencyConnectionId: orgIds.connectionId,
      projectId: nbg.id,
      status: "ACTIVE",
      canViewPrices: true,
      canViewFloorPlans: true,
      canRequestReservations: true,
      showOnlyAgencyVisibleUnits: false,
    },
  });
  await prisma.agencyProjectAccess.create({
    data: {
      id: createId(),
      agencyConnectionId: orgIds.connectionId,
      projectId: zem.id,
      status: "ACTIVE",
      canViewPrices: true,
      canViewFloorPlans: true,
      canRequestReservations: true,
      showOnlyAgencyVisibleUnits: false,
    },
  });

  await prisma.agencyCommissionRule.create({
    data: {
      id: createId(),
      investorOrganizationId: orgIds.investorId,
      agencyConnectionId: orgIds.connectionId,
      projectId: nbg.id,
      calculationType: "PERCENTAGE",
      rate: new Prisma.Decimal("3.000"),
      currency: "EUR",
      validFrom: daysAgo(180),
      internalNote:
        "Standardni ugovor sa Top Nekretninama — 3% od finalne prodajne cene.",
      agencyVisibleNote:
        "Provizija se obračunava po zatvaranju predugovora, isplata u roku od 15 dana.",
    },
  });
}

async function seedBuyers(
  orgIds: OrgIds,
  users: Users,
): Promise<Map<string, string>> {
  const buyerIds = new Map<string, string>();
  const userMap: Record<string, string> = {
    owner: users.owner,
    manager: users.manager,
    agent: users.agent,
    finance: users.finance,
    agencyAgent: users.agencyAgent,
  };
  for (const b of BUYERS) {
    const created = await prisma.buyer.create({
      data: {
        id: createId(),
        organizationId: orgIds.investorId,
        firstName: b.firstName,
        lastName: b.lastName,
        email: b.email,
        normalizedEmail: normalizeEmail(b.email),
        phone: b.phone,
        normalizedPhone: normalizePhone(b.phone),
        preferredContactMethod: "ANY",
        budgetMin:
          b.budgetMin !== undefined ? new Prisma.Decimal(b.budgetMin) : null,
        budgetMax:
          b.budgetMax !== undefined ? new Prisma.Decimal(b.budgetMax) : null,
        preferredCurrency: "EUR",
        desiredUnitTypes: (b.desiredTypes ?? []) as never,
        desiredRoomCounts: b.desiredRoomCounts ?? [],
        status: b.status as never,
        source: b.source,
        notes: b.notes ?? null,
        assignedUserId: userMap[b.assignee] ?? users.manager,
      },
    });
    buyerIds.set(`${b.firstName} ${b.lastName}`, created.id);
  }
  return buyerIds;
}

async function seedActivitiesAndTasks(
  orgIds: OrgIds,
  users: Users,
  buyerIds: Map<string, string>,
  unitLookup: Map<string, { projectId: string; unitId: string }>,
): Promise<void> {
  const A = orgIds.investorId;
  const managerId = users.manager;
  const agentId = users.agent;

  const buyerId = (name: string) => buyerIds.get(name)!;
  const nbg = unitLookup.get("A1-03B")!;

  const activities: Array<{
    buyer: string;
    type: "CALL" | "EMAIL" | "MEETING" | "VIEWING" | "OFFER" | "NOTE";
    description: string;
    actorId: string;
    ago: number;
  }> = [
    {
      buyer: "Nikola Jovanović",
      type: "CALL",
      description: "Prvi razgovor — zainteresovan za NBG projekat, budžet do 130k.",
      actorId: managerId,
      ago: 45,
    },
    {
      buyer: "Nikola Jovanović",
      type: "VIEWING",
      description: "Obilazak modela stana A1-03B na licu mesta.",
      actorId: managerId,
      ago: 32,
    },
    {
      buyer: "Nikola Jovanović",
      type: "OFFER",
      description: "Poslata pisana ponuda sa 5% popusta.",
      actorId: managerId,
      ago: 25,
    },
    {
      buyer: "Milica Petrović",
      type: "EMAIL",
      description: "Poslat prospekt Vračar Terraces + tehnički opis.",
      actorId: agentId,
      ago: 12,
    },
    {
      buyer: "Milica Petrović",
      type: "MEETING",
      description: "Sastanak u kancelariji, pregovori oko cene i uslova.",
      actorId: agentId,
      ago: 5,
    },
    {
      buyer: "Aleksandar Nikolić",
      type: "CALL",
      description: "Follow-up poziv — potvrdio da razmišlja o A1-02A.",
      actorId: agentId,
      ago: 8,
    },
    {
      buyer: "Jelena Marković",
      type: "OFFER",
      description: "Ponuda potpisana, čeka se uplata kapare.",
      actorId: managerId,
      ago: 3,
    },
    {
      buyer: "Stefan Ilić",
      type: "VIEWING",
      description: "Obilazak Vračar Terraces gradilišta.",
      actorId: managerId,
      ago: 14,
    },
    {
      buyer: "Luka Mitrović",
      type: "NOTE",
      description: "Zakazan obilazak za sledeći utorak u 15h.",
      actorId: managerId,
      ago: 2,
    },
    {
      buyer: "Vukašin Pavlović",
      type: "MEETING",
      description: "Potpisan predugovor sa agencijom Top Nekretnine.",
      actorId: managerId,
      ago: 60,
    },
    {
      buyer: "Sanja Kovačević",
      type: "NOTE",
      description: "Prodaja zaključena, čeka se primopredaja.",
      actorId: managerId,
      ago: 90,
    },
  ];

  for (const a of activities) {
    await prisma.activity.create({
      data: {
        id: createId(),
        organizationId: A,
        actorUserId: a.actorId,
        type: a.type as never,
        description: a.description,
        buyerId: buyerId(a.buyer),
        projectId: nbg.projectId,
        occurredAt: daysAgo(a.ago),
      },
    });
  }

  // Open tasks — spread across sales team
  const tasks: Array<{
    title: string;
    assignee: string;
    creator: string;
    dueInDays: number;
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    buyer?: string;
    description?: string;
    status?: "OPEN" | "IN_PROGRESS" | "COMPLETED";
    completedAgo?: number;
  }> = [
    {
      title: "Pozvati Aleksandra Nikolića radi potvrde ponude",
      assignee: agentId,
      creator: managerId,
      dueInDays: 1,
      priority: "HIGH",
      buyer: "Aleksandar Nikolić",
      description: "Ponuda ističe u ponedeljak. Ponovo prezentovati opcije 1.5 i 2.0.",
    },
    {
      title: "Pripremiti kontraponudu za Milicu Petrović",
      assignee: agentId,
      creator: managerId,
      dueInDays: 3,
      priority: "HIGH",
      buyer: "Milica Petrović",
    },
    {
      title: "Zakazati obilazak sa Lukom Mitrovićem",
      assignee: managerId,
      creator: managerId,
      dueInDays: 4,
      priority: "NORMAL",
      buyer: "Luka Mitrović",
    },
    {
      title: "Poslati sve marketing materijale za Ana Đorđević",
      assignee: agentId,
      creator: managerId,
      dueInDays: 2,
      priority: "NORMAL",
      buyer: "Ana Đorđević",
    },
    {
      title: "Proveriti status kredita — Vukašin Pavlović",
      assignee: managerId,
      creator: managerId,
      dueInDays: 7,
      priority: "NORMAL",
      buyer: "Vukašin Pavlović",
    },
    {
      title: "Prezentacija Zemunske Vile na sastanku tima",
      assignee: managerId,
      creator: users.owner,
      dueInDays: 10,
      priority: "LOW",
    },
    {
      title: "Follow-up sa Katarinom Živković o rezervaciji",
      assignee: managerId,
      creator: managerId,
      dueInDays: 0,
      priority: "URGENT",
      buyer: "Katarina Živković",
      description: "Rezervacija ističe za 3 dana ako se ne uplati kapara.",
    },
    {
      title: "Poslati dokumentaciju za Nikolu Jovanovića",
      assignee: managerId,
      creator: managerId,
      dueInDays: -3,
      priority: "NORMAL",
      buyer: "Nikola Jovanović",
      status: "COMPLETED",
      completedAgo: 2,
    },
    {
      title: "Ažurirati cenovnik NBG projekta za jul",
      assignee: users.owner,
      creator: users.owner,
      dueInDays: -10,
      priority: "NORMAL",
      status: "COMPLETED",
      completedAgo: 9,
    },
  ];

  for (const t of tasks) {
    await prisma.task.create({
      data: {
        id: createId(),
        organizationId: A,
        title: t.title,
        description: t.description ?? null,
        assignedUserId: t.assignee,
        buyerId: t.buyer ? buyerId(t.buyer) : null,
        projectId: nbg.projectId,
        dueAt: daysFromNow(t.dueInDays),
        priority: t.priority as never,
        status: (t.status ?? "OPEN") as never,
        completedAt:
          t.completedAgo !== undefined ? daysAgo(t.completedAgo) : null,
        createdByUserId: t.creator,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Reservations & sales
// ---------------------------------------------------------------------------

interface ReservationPlan {
  buyer: string;
  unitCode: string;
  status: "APPROVED" | "REQUESTED" | "EXPIRED" | "REJECTED" | "CANCELED";
  source: "INTERNAL" | "AGENCY";
  requestedDaysAgo: number;
  approvedDaysAgo?: number;
  expiresDaysAhead?: number; // relative to NOW; if in the past → expired
  amount: number;
  notes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
}

interface SalePlan {
  buyer: string;
  unitCode: string;
  reservation?: {
    source: "INTERNAL" | "AGENCY";
    approvedDaysAgo: number;
    requestedDaysAgo: number;
    amount: number;
  };
  status: "PRE_CONTRACT" | "CONTRACTED" | "PAYMENT_IN_PROGRESS" | "PAID";
  responsible: keyof Users;
  discountPct?: number;
  depositAmount?: number;
  preContractDaysAgo?: number;
  contractDaysAgo?: number;
  plannedHandoverInDays?: number;
  paymentPlan?: {
    installments: Array<{
      name: string;
      percentage: number;
      dueInDays: number;
      paid?: {
        amount: number;
        daysAgo: number;
        method:
          | "BANK_TRANSFER"
          | "CASH"
          | "CARD"
          | "LOAN"
          | "COMPENSATION"
          | "OTHER";
        reference?: string;
      };
    }>;
  };
}

const RESERVATIONS: ReservationPlan[] = [
  {
    buyer: "Jelena Marković",
    unitCode: "A1-02A",
    status: "APPROVED",
    source: "INTERNAL",
    requestedDaysAgo: 10,
    approvedDaysAgo: 9,
    expiresDaysAhead: 4,
    amount: 3000,
    notes: "Kapara stigla u nastavku poste, ostatak preko banke.",
  },
  {
    buyer: "Katarina Živković",
    unitCode: "A1-04B",
    status: "APPROVED",
    source: "AGENCY",
    requestedDaysAgo: 5,
    approvedDaysAgo: 4,
    expiresDaysAhead: 10,
    amount: 3500,
    notes: "Preko agencije Top Nekretnine. Klijent traži 1 sedmicu dodatno.",
  },
  {
    buyer: "Marko Vasić",
    unitCode: "A1-03A",
    status: "APPROVED",
    source: "INTERNAL",
    requestedDaysAgo: 7,
    approvedDaysAgo: 6,
    expiresDaysAhead: 8,
    amount: 2500,
    notes: "Klijent iz Bečke potvrdio kaparu bankarskim transferom.",
  },
  {
    buyer: "Luka Mitrović",
    unitCode: "A1-05C",
    status: "APPROVED",
    source: "INTERNAL",
    requestedDaysAgo: 3,
    approvedDaysAgo: 2,
    expiresDaysAhead: 12,
    amount: 3500,
    notes: "Kapara najavljena za sledeću sedmicu.",
  },
  {
    buyer: "Stefan Ilić",
    unitCode: "B1-04A",
    status: "APPROVED",
    source: "INTERNAL",
    requestedDaysAgo: 6,
    approvedDaysAgo: 5,
    expiresDaysAhead: 14,
    amount: 5000,
    notes: "Penthaus Vračar Terraces — potpisan predugovor u pripremi.",
  },
  {
    buyer: "Milica Petrović",
    unitCode: "B1-02B",
    status: "REJECTED",
    source: "INTERNAL",
    requestedDaysAgo: 20,
    amount: 2500,
    rejectionReason:
      "Klijent tražio popust preko okvira; jedinica ostala dostupna.",
  },
  {
    buyer: "Ivana Radovanović",
    unitCode: "A1-06A",
    status: "EXPIRED",
    source: "INTERNAL",
    requestedDaysAgo: 60,
    approvedDaysAgo: 58,
    expiresDaysAhead: -30,
    amount: 3000,
    notes: "Kapara nije uplaćena u roku, rezervacija istekla.",
  },
  {
    buyer: "Bojan Todorović",
    unitCode: "A1-05B",
    status: "CANCELED",
    source: "INTERNAL",
    requestedDaysAgo: 15,
    approvedDaysAgo: 14,
    expiresDaysAhead: -1,
    amount: 3000,
    cancellationReason: "Klijent odustao — kupio drugi projekat.",
  },
];

const SALES: SalePlan[] = [
  {
    buyer: "Nikola Jovanović",
    unitCode: "A1-04A",
    reservation: {
      source: "INTERNAL",
      requestedDaysAgo: 55,
      approvedDaysAgo: 54,
      amount: 3000,
    },
    status: "PAID",
    responsible: "manager",
    discountPct: 5,
    depositAmount: 15000,
    preContractDaysAgo: 45,
    contractDaysAgo: 30,
    plannedHandoverInDays: 210,
    paymentPlan: {
      installments: [
        {
          name: "Kapara pri rezervaciji",
          percentage: 3,
          dueInDays: -55,
          paid: {
            amount: 3000,
            daysAgo: 54,
            method: "BANK_TRANSFER",
            reference: "REF-2026-014",
          },
        },
        {
          name: "Prva rata — 30%",
          percentage: 30,
          dueInDays: -30,
          paid: {
            amount: 34290, // will be adjusted to match actual final price
            daysAgo: 29,
            method: "BANK_TRANSFER",
            reference: "REF-2026-042",
          },
        },
        {
          name: "Druga rata — 40%",
          percentage: 40,
          dueInDays: -10,
          paid: {
            amount: 45720,
            daysAgo: 9,
            method: "BANK_TRANSFER",
            reference: "REF-2026-088",
          },
        },
        {
          name: "Ostatak — pri primopredaji",
          percentage: 27,
          dueInDays: -2,
          paid: {
            amount: 30861,
            daysAgo: 1,
            method: "BANK_TRANSFER",
            reference: "REF-2026-121",
          },
        },
      ],
    },
  },
  {
    buyer: "Sanja Kovačević",
    unitCode: "A1-06B",
    reservation: {
      source: "INTERNAL",
      requestedDaysAgo: 100,
      approvedDaysAgo: 99,
      amount: 3000,
    },
    status: "PAYMENT_IN_PROGRESS",
    responsible: "manager",
    depositAmount: 10000,
    preContractDaysAgo: 85,
    contractDaysAgo: 70,
    plannedHandoverInDays: 300,
    paymentPlan: {
      installments: [
        {
          name: "Kapara",
          percentage: 3,
          dueInDays: -99,
          paid: {
            amount: 3000,
            daysAgo: 98,
            method: "BANK_TRANSFER",
            reference: "REF-2026-005",
          },
        },
        {
          name: "Uplata pri predugovoru",
          percentage: 27,
          dueInDays: -85,
          paid: {
            amount: 32130,
            daysAgo: 84,
            method: "BANK_TRANSFER",
            reference: "REF-2026-018",
          },
        },
        {
          name: "Rata 1 od 4 — pri gradnji",
          percentage: 17,
          dueInDays: -50,
          paid: {
            amount: 20230,
            daysAgo: 49,
            method: "BANK_TRANSFER",
            reference: "REF-2026-051",
          },
        },
        {
          name: "Rata 2 od 4",
          percentage: 17,
          dueInDays: -15,
          paid: {
            amount: 20230,
            daysAgo: 14,
            method: "BANK_TRANSFER",
            reference: "REF-2026-095",
          },
        },
        {
          name: "Rata 3 od 4",
          percentage: 17,
          dueInDays: 15,
        },
        {
          name: "Rata 4 — pri primopredaji",
          percentage: 19,
          dueInDays: 300,
        },
      ],
    },
  },
  {
    buyer: "Vukašin Pavlović",
    unitCode: "A1-05A",
    reservation: {
      source: "AGENCY",
      requestedDaysAgo: 70,
      approvedDaysAgo: 69,
      amount: 4000,
    },
    status: "CONTRACTED",
    responsible: "manager",
    depositAmount: 15000,
    preContractDaysAgo: 60,
    contractDaysAgo: 45,
    plannedHandoverInDays: 240,
    paymentPlan: {
      installments: [
        {
          name: "Kapara pri agencijskoj rezervaciji",
          percentage: 3,
          dueInDays: -69,
          paid: {
            amount: 4000,
            daysAgo: 68,
            method: "BANK_TRANSFER",
            reference: "REF-2026-011",
          },
        },
        {
          name: "Uplata pri predugovoru",
          percentage: 22,
          dueInDays: -60,
          paid: {
            amount: 33000,
            daysAgo: 58,
            method: "BANK_TRANSFER",
            reference: "REF-2026-025",
          },
        },
        {
          name: "Rata pri ugovoru",
          percentage: 25,
          dueInDays: -45,
          paid: {
            amount: 37500,
            daysAgo: 44,
            method: "BANK_TRANSFER",
            reference: "REF-2026-035",
          },
        },
        {
          name: "Rata pri gradnji",
          percentage: 25,
          dueInDays: 60,
        },
        {
          name: "Ostatak pri primopredaji",
          percentage: 25,
          dueInDays: 240,
        },
      ],
    },
  },
  {
    buyer: "Aleksandar Nikolić",
    unitCode: "A1-02B",
    status: "PRE_CONTRACT",
    responsible: "agent",
    depositAmount: 3000,
    preContractDaysAgo: 4,
    plannedHandoverInDays: 260,
    paymentPlan: {
      installments: [
        {
          name: "Kapara",
          percentage: 3,
          dueInDays: -4,
          paid: {
            amount: 3000,
            daysAgo: 3,
            method: "BANK_TRANSFER",
            reference: "REF-2026-115",
          },
        },
        { name: "Uplata pri predugovoru", percentage: 22, dueInDays: 10 },
        { name: "Ugovor", percentage: 25, dueInDays: 40 },
        { name: "Gradnja", percentage: 25, dueInDays: 130 },
        { name: "Primopredaja", percentage: 25, dueInDays: 260 },
      ],
    },
  },
  {
    buyer: "Milica Petrović",
    unitCode: "B1-03B",
    status: "CONTRACTED",
    responsible: "manager",
    depositAmount: 10000,
    preContractDaysAgo: 22,
    contractDaysAgo: 10,
    plannedHandoverInDays: 400,
    paymentPlan: {
      installments: [
        {
          name: "Kapara",
          percentage: 3,
          dueInDays: -22,
          paid: {
            amount: 3000,
            daysAgo: 21,
            method: "BANK_TRANSFER",
            reference: "REF-2026-070",
          },
        },
        {
          name: "Predugovor",
          percentage: 27,
          dueInDays: -10,
          paid: {
            amount: 51840,
            daysAgo: 9,
            method: "BANK_TRANSFER",
            reference: "REF-2026-089",
          },
        },
        { name: "Kredit pri ugovoru", percentage: 70, dueInDays: 25 },
      ],
    },
  },
];

async function seedReservations(
  orgIds: OrgIds,
  users: Users,
  buyerIds: Map<string, string>,
  unitLookup: Map<string, { projectId: string; unitId: string }>,
): Promise<void> {
  for (const r of RESERVATIONS) {
    const unit = unitLookup.get(r.unitCode);
    if (!unit) {
      console.warn(`  ! Skipping reservation: unit ${r.unitCode} not found`);
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const now = daysAgo(r.requestedDaysAgo);
      const initialStatus: string = "REQUESTED";
      const targetStatus = r.status;
      const expiresAt =
        r.expiresDaysAhead !== undefined
          ? daysFromNow(r.expiresDaysAhead)
          : null;

      const reservation = await tx.reservation.create({
        data: {
          id: createId(),
          organizationId: orgIds.investorId,
          projectId: unit.projectId,
          unitId: unit.unitId,
          buyerId: buyerIds.get(r.buyer)!,
          createdByUserId:
            r.source === "AGENCY" ? users.agencyAgent : users.manager,
          assignedUserId: users.manager,
          sourceType: r.source as never,
          agencyOrganizationId:
            r.source === "AGENCY" ? orgIds.agencyId : null,
          agencyAgentUserId:
            r.source === "AGENCY" ? users.agencyAgent : null,
          status: targetStatus as never,
          requestedAt: now,
          approvedAt:
            r.approvedDaysAgo !== undefined ? daysAgo(r.approvedDaysAgo) : null,
          rejectedAt:
            r.status === "REJECTED" ? daysAgo(r.requestedDaysAgo - 1) : null,
          expiresAt: expiresAt,
          canceledAt: r.status === "CANCELED" ? daysAgo(1) : null,
          reservationAmount: new Prisma.Decimal(r.amount),
          currency: "EUR",
          notes: r.notes ?? null,
          rejectionReason: r.rejectionReason ?? null,
          cancellationReason: r.cancellationReason ?? null,
        },
      });

      // Status history — mirror lifecycle in append-only history.
      if (targetStatus !== initialStatus) {
        await tx.reservationStatusHistory.create({
          data: {
            id: createId(),
            organizationId: orgIds.investorId,
            reservationId: reservation.id,
            previousStatus: initialStatus as never,
            newStatus: targetStatus as never,
            reason: r.rejectionReason ?? r.cancellationReason ?? null,
            changedByUserId: users.manager,
            changedAt:
              r.approvedDaysAgo !== undefined
                ? daysAgo(r.approvedDaysAgo)
                : daysAgo(r.requestedDaysAgo - 1),
          },
        });
      }

      // Unit status update — only active APPROVED reservations claim the
      // unit. REJECTED/EXPIRED/CANCELED leave it AVAILABLE.
      if (r.status === "APPROVED") {
        await setUnitStatus(tx, {
          organizationId: orgIds.investorId,
          unitId: unit.unitId,
          from: "AVAILABLE",
          to: "RESERVED",
          actorUserId: users.manager,
          reason: `Rezervacija ${reservation.id}`,
          at: daysAgo(r.approvedDaysAgo ?? r.requestedDaysAgo),
        });
      }
    });
  }
}

async function seedSales(
  orgIds: OrgIds,
  users: Users,
  buyerIds: Map<string, string>,
  unitLookup: Map<string, { projectId: string; unitId: string }>,
): Promise<void> {
  for (const s of SALES) {
    const unit = unitLookup.get(s.unitCode);
    if (!unit) {
      console.warn(`  ! Skipping sale: unit ${s.unitCode} not found`);
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const unitRow = await tx.unit.findUniqueOrThrow({
        where: { id: unit.unitId },
        select: { basePrice: true, status: true },
      });
      const listPrice = Number(unitRow.basePrice);
      const discountValue =
        s.discountPct !== undefined
          ? round2((listPrice * s.discountPct) / 100)
          : 0;
      const finalPrice = round2(listPrice - discountValue);

      const responsibleId =
        s.responsible === "owner"
          ? users.owner
          : s.responsible === "manager"
            ? users.manager
            : s.responsible === "agent"
              ? users.agent
              : users.manager;

      // Optional reservation feeding this sale.
      let reservationId: string | null = null;
      if (s.reservation) {
        const resv = await tx.reservation.create({
          data: {
            id: createId(),
            organizationId: orgIds.investorId,
            projectId: unit.projectId,
            unitId: unit.unitId,
            buyerId: buyerIds.get(s.buyer)!,
            createdByUserId:
              s.reservation.source === "AGENCY"
                ? users.agencyAgent
                : users.manager,
            assignedUserId: responsibleId,
            sourceType: s.reservation.source as never,
            agencyOrganizationId:
              s.reservation.source === "AGENCY" ? orgIds.agencyId : null,
            agencyAgentUserId:
              s.reservation.source === "AGENCY" ? users.agencyAgent : null,
            status: "CONVERTED",
            requestedAt: daysAgo(s.reservation.requestedDaysAgo),
            approvedAt: daysAgo(s.reservation.approvedDaysAgo),
            convertedAt: daysAgo(s.preContractDaysAgo ?? 1),
            reservationAmount: new Prisma.Decimal(s.reservation.amount),
            currency: "EUR",
            notes: null,
          },
        });
        reservationId = resv.id;

        // Status history: REQUESTED → APPROVED → CONVERTED
        await tx.reservationStatusHistory.createMany({
          data: [
            {
              id: createId(),
              organizationId: orgIds.investorId,
              reservationId: resv.id,
              previousStatus: "REQUESTED" as never,
              newStatus: "APPROVED" as never,
              changedByUserId: users.manager,
              changedAt: daysAgo(s.reservation.approvedDaysAgo),
            },
            {
              id: createId(),
              organizationId: orgIds.investorId,
              reservationId: resv.id,
              previousStatus: "APPROVED" as never,
              newStatus: "CONVERTED" as never,
              changedByUserId: users.manager,
              changedAt: daysAgo(s.preContractDaysAgo ?? 1),
            },
          ],
        });
      }

      const sale = await tx.sale.create({
        data: {
          id: createId(),
          organizationId: orgIds.investorId,
          projectId: unit.projectId,
          unitId: unit.unitId,
          buyerId: buyerIds.get(s.buyer)!,
          reservationId,
          sourceType: (s.reservation?.source ?? "INTERNAL") as never,
          agencyOrganizationId:
            s.reservation?.source === "AGENCY" ? orgIds.agencyId : null,
          agencyAgentUserId:
            s.reservation?.source === "AGENCY" ? users.agencyAgent : null,
          responsibleUserId: responsibleId,
          createdByUserId: users.manager,
          status: s.status as never,
          listPrice: new Prisma.Decimal(listPrice),
          discountType: s.discountPct !== undefined ? "PERCENTAGE" : null,
          discountValue:
            s.discountPct !== undefined
              ? new Prisma.Decimal(s.discountPct)
              : null,
          finalPrice: new Prisma.Decimal(finalPrice),
          currency: "EUR",
          depositAmount:
            s.depositAmount !== undefined
              ? new Prisma.Decimal(s.depositAmount)
              : null,
          preContractDate:
            s.preContractDaysAgo !== undefined
              ? daysAgo(s.preContractDaysAgo)
              : null,
          contractDate:
            s.contractDaysAgo !== undefined ? daysAgo(s.contractDaysAgo) : null,
          plannedHandoverDate:
            s.plannedHandoverInDays !== undefined
              ? daysFromNow(s.plannedHandoverInDays)
              : null,
          actualHandoverDate: null,
        },
      });

      // Sale status history — walk from DRAFT to target.
      const path: Array<{ prev: string; next: string; ago: number }> = [];
      if (s.preContractDaysAgo !== undefined) {
        path.push({
          prev: "DRAFT",
          next: "PRE_CONTRACT",
          ago: s.preContractDaysAgo,
        });
      }
      if (s.contractDaysAgo !== undefined) {
        path.push({
          prev: "PRE_CONTRACT",
          next: "CONTRACTED",
          ago: s.contractDaysAgo,
        });
      }
      if (
        s.status === "PAYMENT_IN_PROGRESS" ||
        s.status === "PAID"
      ) {
        path.push({
          prev: "CONTRACTED",
          next: "PAYMENT_IN_PROGRESS",
          ago: (s.contractDaysAgo ?? 5) - 1,
        });
      }
      if (s.status === "PAID") {
        path.push({
          prev: "PAYMENT_IN_PROGRESS",
          next: "PAID",
          ago: 1,
        });
      }
      for (const step of path) {
        await tx.saleStatusHistory.create({
          data: {
            id: createId(),
            organizationId: orgIds.investorId,
            saleId: sale.id,
            previousStatus: step.prev as never,
            newStatus: step.next as never,
            changedByUserId: users.manager,
            changedAt: daysAgo(step.ago),
          },
        });
      }

      // Unit status: keep it in sync with sale phase.
      const currentUnitStatus = unitRow.status as string;
      const targetUnitStatus =
        s.status === "PAID"
          ? "SOLD"
          : s.status === "CONTRACTED" || s.status === "PAYMENT_IN_PROGRESS"
            ? "CONTRACTED"
            : "DEPOSIT_PAID";
      if (currentUnitStatus !== targetUnitStatus) {
        await setUnitStatus(tx, {
          organizationId: orgIds.investorId,
          unitId: unit.unitId,
          from: currentUnitStatus,
          to: targetUnitStatus,
          actorUserId: users.manager,
          reason: `Prodaja ${sale.id}`,
          at: daysAgo(s.contractDaysAgo ?? s.preContractDaysAgo ?? 1),
        });
      }

      // Payment plan + installments + payments
      if (s.paymentPlan) {
        const totalPercent = s.paymentPlan.installments.reduce(
          (acc, i) => acc + i.percentage,
          0,
        );
        const planStatus: "ACTIVE" | "COMPLETED" =
          s.status === "PAID" ? "COMPLETED" : "ACTIVE";
        const plan = await tx.paymentPlan.create({
          data: {
            id: createId(),
            organizationId: orgIds.investorId,
            saleId: sale.id,
            name: `Plan otplate za ${s.unitCode}`,
            totalAmount: new Prisma.Decimal(finalPrice),
            currency: "EUR",
            status: planStatus as never,
          },
        });

        let seq = 1;
        const remainderAdjust = 100 / totalPercent;
        for (const ins of s.paymentPlan.installments) {
          const amount = round2(
            (finalPrice * ins.percentage * remainderAdjust) / 100,
          );
          const paid = ins.paid;
          const installmentStatus: string =
            paid && paid.amount >= amount
              ? "PAID"
              : paid
                ? "PARTIALLY_PAID"
                : ins.dueInDays < 0
                  ? "OVERDUE"
                  : "UPCOMING";

          const inst = await tx.paymentInstallment.create({
            data: {
              id: createId(),
              paymentPlanId: plan.id,
              sequenceNumber: seq++,
              name: ins.name,
              amount: new Prisma.Decimal(amount),
              percentage: new Prisma.Decimal(ins.percentage),
              dueDate: daysFromNow(ins.dueInDays),
              status: installmentStatus as never,
              paidAmount: paid ? new Prisma.Decimal(paid.amount) : new Prisma.Decimal(0),
              paidAt: paid ? daysAgo(paid.daysAgo) : null,
            },
          });

          if (paid) {
            await tx.payment.create({
              data: {
                id: createId(),
                organizationId: orgIds.investorId,
                saleId: sale.id,
                installmentId: inst.id,
                amount: new Prisma.Decimal(paid.amount),
                currency: "EUR",
                paymentDate: daysAgo(paid.daysAgo),
                paymentMethod: paid.method as never,
                referenceNumber: paid.reference ?? null,
                note: null,
                createdByUserId: users.finance,
              },
            });
          }
        }
      }

      // Commission snapshot for agency-sourced contracted+ sales.
      if (
        s.reservation?.source === "AGENCY" &&
        (s.status === "CONTRACTED" ||
          s.status === "PAYMENT_IN_PROGRESS" ||
          s.status === "PAID")
      ) {
        const rate = 3;
        const calculated = round2((finalPrice * rate) / 100);
        const commissionStatus =
          s.status === "PAID"
            ? "PAID"
            : s.status === "PAYMENT_IN_PROGRESS"
              ? "INVOICED"
              : "APPROVED";
        await tx.commission.create({
          data: {
            id: createId(),
            investorOrganizationId: orgIds.investorId,
            agencyOrganizationId: orgIds.agencyId,
            agencyAgentUserId: users.agencyAgent,
            saleId: sale.id,
            calculationType: "PERCENTAGE",
            rate: new Prisma.Decimal(rate),
            baseAmount: new Prisma.Decimal(finalPrice),
            calculatedAmount: new Prisma.Decimal(calculated),
            currency: "EUR",
            status: commissionStatus as never,
            approvedAt: daysAgo((s.contractDaysAgo ?? 1) - 1),
            invoicedAt:
              commissionStatus === "INVOICED" || commissionStatus === "PAID"
                ? daysAgo((s.contractDaysAgo ?? 1) - 3)
                : null,
            paidAt: commissionStatus === "PAID" ? daysAgo(1) : null,
            dueDate: daysFromNow(15),
            invoiceNumber:
              commissionStatus === "INVOICED" || commissionStatus === "PAID"
                ? `PROV-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`
                : null,
            notes: null,
          },
        });
      }
    });
  }
}

async function seedNotifications(
  orgIds: OrgIds,
  users: Users,
): Promise<void> {
  const notes: Array<{
    userId: string;
    category:
      | "RESERVATION"
      | "SALE"
      | "PAYMENT"
      | "AGENCY"
      | "COMMISSION"
      | "TASK"
      | "BUYER"
      | "SYSTEM";
    title: string;
    message: string;
    ago: number;
    read?: boolean;
  }> = [
    {
      userId: users.owner,
      category: "SALE",
      title: "Nova prodaja zaključena",
      message: "Nikola Jovanović — jedinica A1-04A. Ukupan iznos: 114.171,00 EUR.",
      ago: 30,
      read: true,
    },
    {
      userId: users.owner,
      category: "RESERVATION",
      title: "Rezervacija ističe za 4 dana",
      message: "Jelena Marković — jedinica A1-02A. Preporučuje se follow-up.",
      ago: 0,
    },
    {
      userId: users.owner,
      category: "PAYMENT",
      title: "Uplata primljena",
      message: "Milica Petrović — 51.840,00 EUR za jedinicu B1-03B (predugovor).",
      ago: 9,
      read: true,
    },
    {
      userId: users.owner,
      category: "AGENCY",
      title: "Agencijska rezervacija",
      message:
        "Top Nekretnine je rezervisala jedinicu A1-04B za Katarinu Živković.",
      ago: 4,
    },
    {
      userId: users.owner,
      category: "COMMISSION",
      title: "Provizija odobrena",
      message: "Provizija 3% za prodaju Vukašin Pavlović — 3.428,10 EUR.",
      ago: 43,
      read: true,
    },
    {
      userId: users.manager,
      category: "TASK",
      title: "Zadatak dospeva danas",
      message: "Pozvati Aleksandra Nikolića radi potvrde ponude.",
      ago: 0,
    },
    {
      userId: users.manager,
      category: "BUYER",
      title: "Novi kupac na sajtu",
      message: "Ana Đorđević — traži 1.5 stan, budžet do 90.000 EUR.",
      ago: 6,
    },
  ];

  for (const n of notes) {
    await prisma.notification.create({
      data: {
        id: createId(),
        organizationId: orgIds.investorId,
        userId: n.userId,
        category: n.category as never,
        title: n.title,
        message: n.message,
        readAt: n.read ? daysAgo(n.ago - 1) : null,
        createdAt: daysAgo(n.ago),
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_SEED_IN_PRODUCTION !== "true"
  ) {
    console.error(
      "Refusing to run demo seed in production. Set ALLOW_SEED_IN_PRODUCTION=true to override.",
    );
    process.exit(1);
  }

  console.log("PropertyDesk demo seed: begin");

  const investorId = await findOrg(INVESTOR_SLUG);
  const agencyId = await findOrg(AGENCY_SLUG);
  const connectionId = await findConnection(investorId, agencyId);

  const [owner, manager, agent, finance, agencyAgent] = await Promise.all([
    findUser(OWNER_EMAIL),
    findUser(MANAGER_EMAIL),
    findUser(AGENT_EMAIL),
    findUser(FINANCE_EMAIL),
    findUser(AGENCY_AGENT_EMAIL),
  ]);

  const users: Users = {
    owner: owner.id,
    manager: manager.id,
    agent: agent.id,
    finance: finance.id,
    agencyAgent: agencyAgent.id,
  };
  const orgIds: OrgIds = { investorId, agencyId, connectionId };

  await prisma.organizationProfile.update({
    where: { organizationId: investorId },
    data: {
      paymentAccountNumber: "265000000000123456",
      paymentBankName: "Banca Intesa",
    },
  });
  await prisma.organizationProfile.update({
    where: { organizationId: agencyId },
    data: {
      paymentAccountNumber: "160000000000654321",
      paymentBankName: "OTP banka",
    },
  });

  // Idempotency: skip if investor already has projects.
  const projectCount = await prisma.project.count({
    where: { organizationId: investorId },
  });
  if (projectCount > 0) {
    console.log(
      `  · Investor '${INVESTOR_SLUG}' already has ${projectCount} project(s). Skipping demo seed.`,
    );
    console.log("  · Delete existing projects to re-seed:");
    console.log(`      pnpm prisma db execute --stdin < /dev/null  # (see docs)`);
    return;
  }

  // Silence the makeRng warning — we keep it available for future
  // randomised extensions but demo currently uses fixed content.
  void makeRng(42);

  console.log("PropertyDesk demo seed: projekti + jedinice");
  const unitLookup = await seedProjectsAndUnits(orgIds, users);
  console.log(`  → ${unitLookup.size} jedinica kreirano`);

  console.log("PropertyDesk demo seed: pristup agenciji + provizijsko pravilo");
  await seedAgencyAccess(orgIds);

  console.log("PropertyDesk demo seed: kupci");
  const buyerIds = await seedBuyers(orgIds, users);
  console.log(`  → ${buyerIds.size} kupaca kreirano`);

  console.log("PropertyDesk demo seed: aktivnosti + zadaci");
  await seedActivitiesAndTasks(orgIds, users, buyerIds, unitLookup);

  console.log("PropertyDesk demo seed: rezervacije");
  await seedReservations(orgIds, users, buyerIds, unitLookup);

  console.log("PropertyDesk demo seed: prodaje + planovi otplate + uplate + provizije");
  await seedSales(orgIds, users, buyerIds, unitLookup);

  console.log("PropertyDesk demo seed: notifikacije");
  await seedNotifications(orgIds, users);

  console.log("");
  console.log("PropertyDesk demo seed: done");
  console.log("");
  console.log("Log in:");
  console.log(`  Investor owner:  ${OWNER_EMAIL}`);
  console.log(`  Sales manager:   ${MANAGER_EMAIL}`);
  console.log(`  Sales agent:     ${AGENT_EMAIL}`);
  console.log(`  Finance:         ${FINANCE_EMAIL}`);
  console.log(`  Agency agent:    ${AGENCY_AGENT_EMAIL}`);
  console.log("  Password:        PropertyDesk!2026");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
