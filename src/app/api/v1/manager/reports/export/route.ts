import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requirePermission } from "@/server/permissions/require";
import {
  buildManagerFinancialReport,
  buildManagerExpensesReport,
} from "@/server/services/manager/reports.service";
import { listDebtors } from "@/server/services/manager/dues.service";
import {
  rowsToCsv,
  rowsToXlsx,
  csvResponseHeaders,
  xlsxResponseHeaders,
  type Column,
} from "@/server/services/reports/exporters";

/**
 * Faza 11 — manager report exports.
 *
 * Query parameters:
 *   - report: manager-financial | manager-debtors | manager-expenses
 *   - format: csv | xlsx
 *   - year, month, buildingId (interpreted per report)
 */
export const GET = apiHandler({}, async ({ searchParams }): Promise<Response> => {
  const ctx = await requirePermission("report.read");
  const organizationId = ctx.organization.organizationId;
  const report = (searchParams.get("report") ?? "").toLowerCase();
  const format = (searchParams.get("format") ?? "csv").toLowerCase();
  if (format !== "csv" && format !== "xlsx") {
    throw new ApiError("BAD_REQUEST", "Format mora biti csv ili xlsx.");
  }

  const now = new Date();
  const yearStr = searchParams.get("year");
  const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
  const monthStr = searchParams.get("month");
  const month = monthStr ? parseInt(monthStr, 10) : null;
  const buildingId = searchParams.get("buildingId") || null;

  let filename: string;
  let columns: Column<Record<string, unknown>>[];
  let rows: Array<Record<string, unknown>>;

  switch (report) {
    case "manager-financial": {
      const data = await buildManagerFinancialReport({
        organizationId,
        year,
        month,
        buildingId,
      });
      filename = `finansije-${year}${month ? `-${String(month).padStart(2, "0")}` : ""}`;
      columns = [
        { key: "buildingName", label: "Zgrada" },
        { key: "chargedTotal", label: "Zaduženo" },
        { key: "paidTotal", label: "Naplaćeno" },
        { key: "outstanding", label: "Preostalo" },
        { key: "chargesCount", label: "Broj" },
      ];
      rows = data.rows as unknown as Array<Record<string, unknown>>;
      break;
    }
    case "manager-debtors": {
      const data = await listDebtors({
        organizationId,
        buildingId: buildingId ?? undefined,
      });
      filename = `duznici-${new Date().toISOString().slice(0, 10)}`;
      columns = [
        { key: "buildingName", label: "Zgrada" },
        { key: "unitCode", label: "Deo" },
        { key: "primaryOwner", label: "Vlasnik" },
        { key: "contactEmail", label: "Email" },
        { key: "contactPhone", label: "Telefon" },
        {
          key: "oldestDueDate",
          label: "Najstariji rok",
          format: (v) => (v ? new Date(String(v)).toISOString().slice(0, 10) : ""),
        },
        { key: "outstanding", label: "Dug" },
      ];
      rows = data as unknown as Array<Record<string, unknown>>;
      break;
    }
    case "manager-expenses": {
      const from = new Date(Date.UTC(year, 0, 1));
      const to = new Date(Date.UTC(year + 1, 0, 1));
      const data = await buildManagerExpensesReport({
        organizationId,
        from,
        to,
        buildingId,
      });
      filename = `troskovi-${year}`;
      columns = [
        { key: "buildingName", label: "Zgrada" },
        { key: "fund", label: "Fond" },
        { key: "total", label: "Iznos" },
        { key: "count", label: "Broj" },
      ];
      rows = data.rows as unknown as Array<Record<string, unknown>>;
      break;
    }
    default:
      throw new ApiError("BAD_REQUEST", "Nepoznat izveštaj.");
  }

  if (format === "csv") {
    const csv = rowsToCsv(columns, rows);
    return new NextResponse(csv, { headers: csvResponseHeaders(filename) });
  }
  const xlsx = await rowsToXlsx(report, columns, rows);
  return new NextResponse(new Uint8Array(xlsx), { headers: xlsxResponseHeaders(filename) });
});

/**
 * @swagger
 * /api/v1/manager/reports/export:
 *   get:
 *     tags: [manager]
 *     summary: Export manager report as CSV or XLSX
 *     description: |
 *       **Auth:** `requirePermission("report.read")`
 */
