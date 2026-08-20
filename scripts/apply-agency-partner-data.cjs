/* Idempotent data fix: partner plan + existing AGENCY orgs. No schema change. */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL / DIRECT_URL is not defined");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const PARTNER = {
  name: "Partner",
  description:
    "Besplatan portal agencije. Pristup ide preko poziva investitora, bez pretplate.",
  monthlyPrice: 0,
  maxActiveProjects: 0,
  maxUnits: 0,
  maxMembers: 25,
  maxAgencyConnections: null,
  features: { audience: "agency", agencySharing: true, whiteLabel: false },
  active: true,
  publiclyAvailable: false,
  sortOrder: 20,
};

async function main() {
  const partner = await prisma.saaSPlan.upsert({
    where: { code: "partner" },
    create: { code: "partner", currency: "EUR", ...PARTNER },
    update: PARTNER,
  });

  const agencies = await prisma.organizationProfile.findMany({
    where: { type: "AGENCY" },
    select: {
      organizationId: true,
      displayName: true,
      status: true,
      organization: { select: { name: true, slug: true } },
    },
  });

  const flipped = [];
  for (const agency of agencies) {
    const locked = agency.status === "SUSPENDED" || agency.status === "CLOSED";
    if (!locked && agency.status !== "ACTIVE") {
      await prisma.organizationProfile.update({
        where: { organizationId: agency.organizationId },
        data: { status: "ACTIVE" },
      });
    }

    const nextSubStatus =
      agency.status === "SUSPENDED"
        ? "SUSPENDED"
        : agency.status === "CLOSED"
          ? "CANCELED"
          : "ACTIVE";

    await prisma.organizationSubscription.updateMany({
      where: { organizationId: agency.organizationId },
      data: {
        planId: partner.id,
        status: nextSubStatus,
        trialStartsAt: null,
        trialEndsAt: null,
        autoRenew: false,
        nextBillingDate: null,
        price: 0,
        customPrice: false,
      },
    });

    flipped.push({
      name: agency.organization?.name ?? agency.displayName,
      slug: agency.organization?.slug ?? null,
      keptLock: locked,
      status: locked ? agency.status : "ACTIVE",
      subscription: nextSubStatus,
    });
  }

  const verify = await prisma.organizationProfile.findMany({
    where: { type: "AGENCY" },
    select: {
      displayName: true,
      status: true,
      organization: {
        select: {
          slug: true,
          subscription: { select: { status: true, trialEndsAt: true, plan: { select: { code: true } } } },
        },
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        partnerPlanId: partner.id,
        agencyCount: agencies.length,
        flipped,
        verify: verify.map((row) => ({
          name: row.displayName,
          slug: row.organization?.slug ?? null,
          orgStatus: row.status,
          plan: row.organization?.subscription?.plan.code ?? null,
          subStatus: row.organization?.subscription?.status ?? null,
          trialEndsAt: row.organization?.subscription?.trialEndsAt ?? null,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
