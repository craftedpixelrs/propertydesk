import { describe, expect, it } from "vitest";
import { SerbianIpsQrProvider } from "./serbian-provider";

const provider = new SerbianIpsQrProvider();

const baseInput = {
  receiverName: "PropertyDesk d.o.o.",
  receiverAccount: "160005400000009999",
  amount: "1234.5",
  payerName: "Marko Marković",
  paymentReference: "97 1234567890",
  description: "Pretplata mesečna",
};

describe("SerbianIpsQrProvider.buildPayload", () => {
  it("builds a payload with all documented NBS segments", () => {
    const payload = provider.buildPayload(baseInput);
    expect(payload).toMatch(/^K:PR\|V:01\|C:1\|R:160005400000009999\|N:PropertyDesk d\.o\.o\.\|I:RSD1234,50\|P:Marko Marković\|SF:289\|S:Pretplata mesečna\|RO:97 1234567890$/);
  });

  it("formats fractional amount to 2 decimals with comma", () => {
    expect(provider.buildPayload({ ...baseInput, amount: 1000 })).toContain("I:RSD1000,00");
    expect(provider.buildPayload({ ...baseInput, amount: "42.1" })).toContain("I:RSD42,10");
  });

  it("rejects non-RSD currency", () => {
    // @ts-expect-error – intentionally invalid
    expect(() => provider.buildPayload({ ...baseInput, currency: "EUR" })).toThrow(/RSD/);
  });

  it("rejects malformed receiver account", () => {
    expect(() => provider.buildPayload({ ...baseInput, receiverAccount: "abc" })).toThrow(/cifre|cifara/);
    expect(() => provider.buildPayload({ ...baseInput, receiverAccount: "12345" })).toThrow(/cifara/);
  });

  it("rejects non-positive amount", () => {
    expect(() => provider.buildPayload({ ...baseInput, amount: 0 })).toThrow(/pozitivan/);
    expect(() => provider.buildPayload({ ...baseInput, amount: -1 })).toThrow(/pozitivan/);
  });

  it("truncates over-long names/descriptions/references instead of throwing", () => {
    const long = "x".repeat(500);
    const payload = provider.buildPayload({
      ...baseInput,
      receiverName: long,
      description: long,
      paymentReference: long,
      payerName: long,
    });
    // No segment should be longer than its NBS cap.
    const n = payload.match(/N:([^|]+)/)![1]!;
    const s = payload.match(/S:([^|]+)/)![1]!;
    const ro = payload.match(/RO:([^|]+)/)![1]!;
    const p = payload.match(/P:([^|]+)/)![1]!;
    expect(n.length).toBeLessThanOrEqual(70);
    expect(p.length).toBeLessThanOrEqual(70);
    expect(s.length).toBeLessThanOrEqual(35);
    expect(ro.length).toBeLessThanOrEqual(35);
  });

  it("omits optional segments when not supplied", () => {
    const payload = provider.buildPayload({
      receiverName: "PD",
      receiverAccount: "160005400000009999",
      amount: 1,
    });
    expect(payload).not.toContain("|P:");
    expect(payload).not.toContain("|S:");
    expect(payload).not.toContain("|RO:");
    expect(payload).toContain("|SF:289");
  });

  it("normalizes account by stripping spaces and dashes", () => {
    const payload = provider.buildPayload({
      ...baseInput,
      receiverAccount: "160-0054-000000-09999",
    });
    expect(payload).toContain("R:160005400000009999");
  });
});

describe("SerbianIpsQrProvider.generate", () => {
  it("produces a PNG buffer", async () => {
    const out = await provider.generate(baseInput);
    expect(out.contentType).toBe("image/png");
    expect(Buffer.isBuffer(out.pngBuffer)).toBe(true);
    expect(out.pngBuffer.byteLength).toBeGreaterThan(100);
    expect(out.payload).toContain("K:PR");
  });
});
