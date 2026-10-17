import { describe, expect, it } from "vitest";
import type { Invoice, ElectronicInvoiceRecord } from "@prisma/client";
import { getProvider } from "./providers";

const stubInvoice = { id: "inv_1", organizationId: "org_1" } as unknown as Invoice;
const context = {
  invoice: stubInvoice,
  organizationId: "org_1",
  record: null as ElectronicInvoiceRecord | null,
};

describe("ElectronicInvoiceProvider registry", () => {
  it("MANUAL provider returns SENT immediately with no error", async () => {
    const provider = getProvider("MANUAL");
    expect(provider.type).toBe("MANUAL");
    const result = await provider.submit(context);
    expect(result.status).toBe("SENT");
    expect(result.errorMessage ?? null).toBeNull();
  });

  it("SERBIAN_SEF fails closed until the real transport exists", async () => {
    const provider = getProvider("SERBIAN_SEF");
    expect(provider.type).toBe("SERBIAN_SEF");
    const result = await provider.submit(context);
    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toMatch(/SEF/);
    expect(result.providerReference ?? null).toBeNull();
  });

  it("SERBIAN_SEF cancel does not pretend the portal rejected the invoice", async () => {
    const provider = getProvider("SERBIAN_SEF");
    const result = await provider.cancel!(context, "duplicate");
    expect(result.status).toBe("FAILED");
    expect(result.responsePayload).toMatchObject({ reason: "duplicate", simulated: false });
  });
});
