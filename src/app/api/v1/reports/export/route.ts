import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  buildInventoryReport,
  buildSalesReport,
  buildBuyerPipelineReport,
  buildReservationsReport,
  buildPaymentsReport,
  buildAgencyReport,
} from "@/server/services/reports/reports.service";
import {
  rowsToCsv,
  rowsToXlsx,
  csvResponseHeaders,
  xlsxResponseHeaders,
  type Column,
} from "@/server/services/reports/exporters";
import { ApiError } from "@/lib/api/errors";

/**
 * Streaming report export endpoint. Query parameters:
 *   - report: inventory | sales | buyers | reservations | payments | agency
 *   - format: csv | xlsx
 *   - projectId, from, to (all optional, applied server-side)
 *
 * The permission for reports is `report.read`; exports are the same right.
 */
export const GET = apiHandler({}, async ({ searchParams }): Promise<Response> => {
  const ctx = await requirePermission("report.read");
  const organizationId = ctx.organization.organizationId;

  const report = (searchParams.get("report") ?? "").toLowerCase();
  const format = (searchParams.get("format") ?? "csv").toLowerCase();
  if (format !== "csv" && format !== "xlsx") {
    throw new ApiError("BAD_REQUEST", "Format izveštaja mora biti csv ili xlsx.");
  }

  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const projectId = searchParams.get("projectId") ?? undefined;

  const filters = { organizationId, projectId, from, to };

  let filename: string;
  let columns: Column<Record<string, unknown>>[];
  let rows: Array<Record<string, unknown>>;

  switch (report) {
    case "inventory": {
      const data = await buildInventoryReport(filters);
      filename = `zalihe-${today()}`;
      columns = [
        { key: "projectName", label: "Projekat" },
        { key: "code", label: "Šifra" },
        { key: "status", label: "Status" },
        { key: "area", label: "Površina (m²)" },
        { key: "price", label: "Cena" },
        { key: "currency", label: "Valuta" },
      ];
      rows = data.detail;
      break;
    }
    case "sales": {
      const data = await buildSalesReport(filters);
      filename = `prodaje-${today()}`;
      columns = [
        { key: "createdAt", label: "Datum", format: (v) => new Date(String(v)).toISOString() },
        { key: "status", label: "Status" },
        { key: "projectName", label: "Projekat" },
        { key: "unitCode", label: "Jedinica" },
        { key: "buyerName", label: "Kupac" },
        { key: "agencyName", label: "Agencija" },
        { key: "finalPrice", label: "Cena" },
        { key: "paid", label: "Uplaćeno" },
        { key: "outstanding", label: "Preostalo" },
        { key: "currency", label: "Valuta" },
      ];
      rows = data.rows as unknown as Array<Record<string, unknown>>;
      break;
    }
    case "buyers": {
      const data = await buildBuyerPipelineReport(filters);
      filename = `kupci-${today()}`;
      columns = [
        { key: "status", label: "Status" },
        { key: "count", label: "Broj" },
      ];
      rows = data.byStatus as unknown as Array<Record<string, unknown>>;
      break;
    }
    case "reservations": {
      const data = await buildReservationsReport(filters);
      filename = `rezervacije-${today()}`;
      columns = [
        { key: "createdAt", label: "Datum", format: (v) => new Date(String(v)).toISOString() },
        { key: "status", label: "Status" },
        { key: "projectName", label: "Projekat" },
        { key: "unitCode", label: "Jedinica" },
        { key: "buyerName", label: "Kupac" },
        { key: "source", label: "Izvor" },
      ];
      rows = data.rows as unknown as Array<Record<string, unknown>>;
      break;
    }
    case "payments": {
      const data = await buildPaymentsReport(filters);
      filename = `uplate-${today()}`;
      columns = [
        { key: "paymentDate", label: "Datum uplate", format: (v) => new Date(String(v)).toISOString() },
        { key: "unitCode", label: "Jedinica" },
        { key: "amount", label: "Iznos" },
        { key: "currency", label: "Valuta" },
        { key: "method", label: "Metoda" },
        { key: "reversed", label: "Storno", format: (v) => (v ? "Da" : "Ne") },
      ];
      rows = data.rows as unknown as Array<Record<string, unknown>>;
      break;
    }
    case "agency": {
      const data = await buildAgencyReport(filters);
      filename = `agencije-${today()}`;
      columns = [
        { key: "agencyName", label: "Agencija" },
        { key: "reservations", label: "Rezervacije" },
        { key: "salesCount", label: "Prodaje" },
        { key: "salesTotal", label: "Vrednost prodaja" },
        { key: "referralSalesCount", label: "Referral prodaje" },
        { key: "referralSalesTotal", label: "Referral prihod" },
        { key: "commissionCalculated", label: "Provizija (kalk.)" },
        { key: "commissionPaid", label: "Provizija (isplaćena)" },
        { key: "currency", label: "Valuta" },
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

function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @swagger
 * /api/v1/reports/export:
 *   get:
 *     tags:
 *       - reports
 *     summary: List / read reports
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
