/**
 * Wipe investor-tenant demo data so `demo-seed.ts` can produce a clean
 * dataset. Deletes rows in FK-safe order for the "Gradnja Plus" org and
 * the "Top Nekretnine" agency mirror (commissions, agency access,
 * commission rules). Leaves users, org, subscription, and billing
 * scaffolding untouched — those come from the baseline `seed.ts`.
 *
 * SAFETY: refuses to run in production unless
 * `ALLOW_SEED_IN_PRODUCTION=true`, matching the pattern used by
 * `seed.ts` and `demo-seed.ts`.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL missing");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_SEED_IN_PRODUCTION !== "true"
  ) {
    console.error("Refusing to run cleanup in production without ALLOW_SEED_IN_PRODUCTION=true");
    process.exit(1);
  }

  const investor = await prisma.organization.findUnique({
    where: { slug: "gradnja-plus" },
    select: { id: true },
  });
  const agency = await prisma.organization.findUnique({
    where: { slug: "top-nekretnine" },
    select: { id: true },
  });
  if (!investor || !agency) {
    console.log("Investor or agency org missing — nothing to clean.");
    return;
  }

  console.log("Cleaning demo data for investor + agency…");

  await prisma.$transaction(async (tx) => {
    // Order matters — start from leaf entities that are FK targets from
    // multiple sides (payments, commissions, notifications, tasks…).
    await tx.notification.deleteMany({
      where: { organizationId: { in: [investor.id, agency.id] } },
    });
    await tx.commission.deleteMany({
      where: { investorOrganizationId: investor.id },
    });
    await tx.agencyCommissionRule.deleteMany({
      where: { investorOrganizationId: investor.id },
    });
    await tx.agencyBuyerRegistration.deleteMany({
      where: { agencyOrganizationId: agency.id },
    });
    await tx.agencyUnitAccessOverride.deleteMany({});
    await tx.agencyProjectAccess.deleteMany({});
    await tx.payment.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.paymentInstallment.deleteMany({
      where: { paymentPlan: { organizationId: investor.id } },
    });
    await tx.paymentPlan.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.saleStatusHistory.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.sale.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.reservationStatusHistory.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.reservation.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.task.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.activity.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.buyerInterest.deleteMany({
      where: { buyer: { organizationId: investor.id } },
    });
    await tx.buyer.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.unitStatusHistory.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.unitPriceHistory.deleteMany({
      where: { unit: { organizationId: investor.id } },
    });
    await tx.unit.deleteMany({
      where: { organizationId: investor.id },
    });
    await tx.floor.deleteMany({
      where: { entrance: { building: { project: { organizationId: investor.id } } } },
    });
    await tx.entrance.deleteMany({
      where: { building: { project: { organizationId: investor.id } } },
    });
    await tx.building.deleteMany({
      where: { project: { organizationId: investor.id } },
    });
    await tx.project.deleteMany({
      where: { organizationId: investor.id },
    });
  });

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
