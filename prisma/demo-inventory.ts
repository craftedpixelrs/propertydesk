import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL missing");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const investor = await prisma.organization.findUnique({
    where: { slug: "gradnja-plus" },
  });
  if (!investor) {
    console.log("No investor org.");
    return;
  }

  const projects = await prisma.project.findMany({
    where: { organizationId: investor.id },
    select: { id: true, code: true, name: true, projectStatus: true, createdAt: true },
  });
  console.log(`Projects (${projects.length}):`);
  for (const p of projects) {
    console.log(`  ${p.code}  ${p.name}  [${p.projectStatus}]  ${p.createdAt.toISOString()}`);
  }

  const [units, buyers, reservations, sales, payments, tasks, activities] = await Promise.all([
    prisma.unit.count({ where: { organizationId: investor.id } }),
    prisma.buyer.count({ where: { organizationId: investor.id } }),
    prisma.reservation.count({ where: { organizationId: investor.id } }),
    prisma.sale.count({ where: { organizationId: investor.id } }),
    prisma.payment.count({ where: { organizationId: investor.id } }),
    prisma.task.count({ where: { organizationId: investor.id } }),
    prisma.activity.count({ where: { organizationId: investor.id } }),
  ]);
  console.log("");
  console.log("Counts (investor org):");
  console.log(`  units:        ${units}`);
  console.log(`  buyers:       ${buyers}`);
  console.log(`  reservations: ${reservations}`);
  console.log(`  sales:        ${sales}`);
  console.log(`  payments:     ${payments}`);
  console.log(`  tasks:        ${tasks}`);
  console.log(`  activities:   ${activities}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
