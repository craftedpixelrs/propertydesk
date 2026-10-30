import "server-only";

import { prisma } from "@/server/db/prisma";
import { renderPdf } from "@/server/pdf/render";
import { AnnualActivityPdf } from "@/server/pdf/documents/annual-activity";
import { buildAnnualActivityReport } from "@/server/services/manager/reports.service";

/**
 * Faza 11 — Annual activity PDF generator.
 *
 * Pulls the manager organization name + the aggregate from
 * `buildAnnualActivityReport` and renders a single A4 PDF ready for the
 * `/api/v1/manager/reports/godisnji/pdf` route.
 */
export async function renderAnnualActivityPdf(input: {
  organizationId: string;
  year: number;
}): Promise<Buffer> {
  const [org, data] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: input.organizationId },
      select: { name: true },
    }),
    buildAnnualActivityReport(input),
  ]);

  return renderPdf(
    AnnualActivityPdf({
      managerName: org.name,
      year: data.year,
      buildings: data.buildings,
      dues: {
        chargedTotal: data.dues.chargedTotal,
        paidTotal: data.dues.paidTotal,
        outstanding: data.dues.outstanding,
        chargesCount: data.dues.chargesCount,
        currency: data.dues.currency,
      },
      expensesByFund: data.expensesByFund.map((f) => ({
        fund: f.fund,
        total: f.total,
        count: f.count,
      })),
      tickets: data.tickets,
      assemblies: data.assemblies,
      notices: data.notices,
    }),
  );
}
