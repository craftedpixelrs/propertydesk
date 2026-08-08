import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { computeFifoAllocations } from "./allocation.service";

function d(v: string | number) {
  return new Prisma.Decimal(v);
}

describe("computeFifoAllocations", () => {
  it("fully pays the first invoice when payment matches its due", () => {
    const invoices = [
      { id: "a", amountDue: d(100), currency: "EUR" },
      { id: "b", amountDue: d(50), currency: "EUR" },
    ];
    const { allocations, unapplied } = computeFifoAllocations(d(100), invoices, "EUR");
    expect(allocations).toEqual([{ invoiceId: "a", amount: d(100) }]);
    expect(unapplied.toString()).toBe("0");
  });

  it("splits across multiple invoices in FIFO order", () => {
    const invoices = [
      { id: "a", amountDue: d(60), currency: "EUR" },
      { id: "b", amountDue: d(60), currency: "EUR" },
    ];
    const { allocations, unapplied } = computeFifoAllocations(d(100), invoices, "EUR");
    expect(allocations.map((a) => [a.invoiceId, a.amount.toString()])).toEqual([
      ["a", "60"],
      ["b", "40"],
    ]);
    expect(unapplied.toString()).toBe("0");
  });

  it("returns leftover as unapplied when payment exceeds all invoices", () => {
    const invoices = [
      { id: "a", amountDue: d(50), currency: "EUR" },
    ];
    const { allocations, unapplied } = computeFifoAllocations(d(80), invoices, "EUR");
    expect(allocations).toEqual([{ invoiceId: "a", amount: d(50) }]);
    expect(unapplied.toString()).toBe("30");
  });

  it("only pays partially when payment is less than first invoice", () => {
    const invoices = [
      { id: "a", amountDue: d(100), currency: "EUR" },
      { id: "b", amountDue: d(100), currency: "EUR" },
    ];
    const { allocations, unapplied } = computeFifoAllocations(d(40), invoices, "EUR");
    expect(allocations).toEqual([{ invoiceId: "a", amount: d(40) }]);
    expect(unapplied.toString()).toBe("0");
  });

  it("skips invoices whose currency does not match the payment", () => {
    const invoices = [
      { id: "a", amountDue: d(50), currency: "RSD" },
      { id: "b", amountDue: d(50), currency: "EUR" },
    ];
    const { allocations, unapplied } = computeFifoAllocations(d(60), invoices, "EUR");
    expect(allocations.map((a) => a.invoiceId)).toEqual(["b"]);
    expect(unapplied.toString()).toBe("10");
  });

  it("skips invoices that already have amountDue <= 0", () => {
    const invoices = [
      { id: "a", amountDue: d(0), currency: "EUR" },
      { id: "b", amountDue: d(30), currency: "EUR" },
    ];
    const { allocations } = computeFifoAllocations(d(50), invoices, "EUR");
    expect(allocations.map((a) => a.invoiceId)).toEqual(["b"]);
  });

  it("returns unapplied = full amount when there are no matching invoices", () => {
    const { allocations, unapplied } = computeFifoAllocations(d(75), [], "EUR");
    expect(allocations).toEqual([]);
    expect(unapplied.toString()).toBe("75");
  });
});
