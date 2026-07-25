import { describe, expect, it } from "vitest";

import { renderPdf } from "./render";
import { UnitOfferPdf } from "./documents/unit-offer";
import { PriceListPdf } from "./documents/price-list";
import { SaleSummaryPdf } from "./documents/sale-summary";
import { CommissionStatementPdf } from "./documents/commission-statement";

/**
 * PDF smoke tests.
 *
 * We render each of the four Section 26 PDF templates to a Buffer and
 * assert the result is a valid PDF (starts with the `%PDF-` magic bytes).
 * This is a snapshot in intent — a regression that produces an empty or
 * malformed document fails here without needing a byte-for-byte pixel
 * diff, which would be too brittle across `@react-pdf/renderer` upgrades.
 */

function assertPdf(buffer: Buffer): void {
  const header = buffer.slice(0, 5).toString("utf-8");
  expect(header).toBe("%PDF-");
  expect(buffer.byteLength).toBeGreaterThan(500);
}

describe("PropertyDesk PDF documents", () => {
  it("renders a unit-offer PDF", async () => {
    const buffer = await renderPdf(
      UnitOfferPdf({
        organizationName: "Investitor doo",
        unit: {
          code: "A-101",
          type: "APARTMENT",
          area: "62.5",
          rooms: "2.5",
          floor: "3",
          projectName: "Aleksandar",
          buildingName: "Objekat A",
          price: "125000",
          currency: "EUR",
          description: "Dvosoban stan, orijentacija istok.",
        },
        buyer: {
          fullName: "Ivan Petrović",
          email: "ivan@example.com",
          phone: "+381641234567",
        },
      }),
    );
    assertPdf(buffer);
  }, 20_000);

  it("renders a price-list PDF for a project", async () => {
    const buffer = await renderPdf(
      PriceListPdf({
        organizationName: "Investitor doo",
        projectName: "Aleksandar",
        units: [
          {
            code: "A-101",
            type: "APARTMENT",
            area: "60",
            rooms: "2",
            floor: "1",
            status: "AVAILABLE",
            price: "120000",
            currency: "EUR",
          },
          {
            code: "A-102",
            type: "APARTMENT",
            area: "75",
            rooms: "3",
            floor: "1",
            status: "RESERVED",
            price: "150000",
            currency: "EUR",
          },
        ],
      }),
    );
    assertPdf(buffer);
  }, 20_000);

  it("renders a sale-summary PDF", async () => {
    const buffer = await renderPdf(
      SaleSummaryPdf({
        organizationName: "Investitor doo",
        sale: {
          id: "sale-1",
          unitCode: "A-101",
          projectName: "Aleksandar",
          contractDate: new Date("2026-03-15"),
          listPrice: "130000",
          finalPrice: "125000",
          currency: "EUR",
          status: "PAYMENT_IN_PROGRESS",
        },
        buyer: {
          fullName: "Ivan Petrović",
          email: "ivan@example.com",
          phone: "+381641234567",
        },
        installments: [
          {
            name: "Kapara",
            dueDate: new Date("2026-03-15"),
            amount: "12500",
            paid: "12500",
            status: "PAID",
          },
          {
            name: "Rata 1",
            dueDate: new Date("2026-06-15"),
            amount: "37500",
            paid: "0",
            status: "UPCOMING",
          },
        ],
        payments: [
          {
            paymentDate: new Date("2026-03-15"),
            amount: "12500",
            method: "BANK_TRANSFER",
            reversed: false,
          },
        ],
        totals: {
          contracted: "125000",
          paid: "12500",
          outstanding: "112500",
        },
      }),
    );
    assertPdf(buffer);
  }, 20_000);

  it("renders a commission-statement PDF", async () => {
    const buffer = await renderPdf(
      CommissionStatementPdf({
        organizationName: "Investitor doo",
        agency: {
          name: "Agencija A",
          address: "Beograd, ulica primer 1",
          taxNumber: "123456789",
        },
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-03-31"),
        currency: "EUR",
        rows: [
          {
            id: "c1",
            saleUnitCode: "A-101",
            projectName: "Aleksandar",
            contractDate: new Date("2026-02-10"),
            salePrice: "125000",
            ruleDescription: "3%",
            calculatedAmount: "3750",
            adjustedAmount: null,
            status: "APPROVED",
          },
        ],
        totals: {
          calculated: "3750",
          approved: "3750",
          paid: "0",
        },
      }),
    );
    assertPdf(buffer);
  }, 20_000);
});
