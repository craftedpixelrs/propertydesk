import QRCode from "qrcode";

import { DomainErrors } from "@/lib/errors";
import { toDecimal } from "@/lib/formatters/money";

import type { IpsQrProvider, IpsQrRequest, IpsQrResult } from "./provider";

/**
 * Concrete Serbian NBS IPS QR provider.
 *
 * Payload format (per the NBS "IPS QR" spec, v1.0):
 *
 *   K:PR|V:01|C:1|R:<account>|N:<receiver>|I:RSD<amount>|P:<payer>|SF:<purposeCode>|S:<description>|RO:<reference>
 *
 * where:
 *   - `K:PR`  identifier (PR = payment)
 *   - `V:01`  spec version
 *   - `C:1`   character set (1 = Latin)
 *   - `R:`    receiver account (18 chars, no dashes)
 *   - `N:`    receiver name
 *   - `I:`    amount, format `RSD<int>,<dec>` (e.g. `RSD1234,50`)
 *   - `P:`    payer name (optional)
 *   - `SF:`   payment purpose 3-digit code
 *   - `S:`    payment description (up to 35 chars)
 *   - `RO:`   reference number (with model prefix, e.g. `97 1234567890`)
 *
 * We intentionally keep the payload deterministic and short — the QR code
 * scales to Model 6 (ecc M) with typical inputs and remains scannable when
 * printed at 3 cm.
 */

const ACCOUNT_LEN = 18;
const MAX_NAME = 70;
const MAX_DESC = 35;
const MAX_REF = 35;

function sanitize(s: string, max: number): string {
  return s
    .replace(/[\r\n\t|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeAccount(raw: string): string {
  const trimmed = raw.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(trimmed)) {
    throw DomainErrors.badRequest(
      "IPS QR: primaočev račun mora sadržati samo cifre.",
    );
  }
  if (trimmed.length !== ACCOUNT_LEN) {
    throw DomainErrors.badRequest(
      `IPS QR: račun mora imati tačno ${ACCOUNT_LEN} cifara (dobijeno ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function formatAmount(raw: string | number): string {
  const dec = toDecimal(raw).toDecimalPlaces(2);
  if (dec.isNegative() || dec.isZero()) {
    throw DomainErrors.badRequest("IPS QR: iznos mora biti pozitivan.");
  }
  const [int, frac = "00"] = dec.toFixed(2).split(".");
  return `RSD${int},${frac.padEnd(2, "0")}`;
}

export class SerbianIpsQrProvider implements IpsQrProvider {
  isEnabled(): boolean {
    return true;
  }

  buildPayload(input: IpsQrRequest): string {
    const currency = input.currency ?? "RSD";
    if (currency !== "RSD") {
      throw DomainErrors.badRequest(
        "IPS QR: podržana je samo valuta RSD (dinar).",
      );
    }
    const account = normalizeAccount(input.receiverAccount);
    const receiver = sanitize(input.receiverName, MAX_NAME);
    if (!receiver) {
      throw DomainErrors.badRequest("IPS QR: primalac je obavezan.");
    }
    const amount = formatAmount(input.amount);
    const payer = input.payerName ? sanitize(input.payerName, MAX_NAME) : "";
    const description = input.description
      ? sanitize(input.description, MAX_DESC)
      : "";
    const reference = input.paymentReference
      ? sanitize(input.paymentReference, MAX_REF)
      : "";
    const purpose = (input.purposeCode ?? "289").replace(/[^0-9]/g, "").slice(0, 3);

    // Ordered per NBS spec.
    const parts: string[] = ["K:PR", "V:01", "C:1", `R:${account}`, `N:${receiver}`, `I:${amount}`];
    if (payer) parts.push(`P:${payer}`);
    if (purpose) parts.push(`SF:${purpose}`);
    if (description) parts.push(`S:${description}`);
    if (reference) parts.push(`RO:${reference}`);
    return parts.join("|");
  }

  async generate(input: IpsQrRequest): Promise<IpsQrResult> {
    const payload = this.buildPayload(input);
    const pngBuffer = await QRCode.toBuffer(payload, {
      errorCorrectionLevel: "M",
      type: "png",
      margin: 1,
      width: 320,
      color: { dark: "#111111", light: "#FFFFFF" },
    });
    return { payload, pngBuffer, contentType: "image/png" };
  }
}

export const serbianIpsQrProvider = new SerbianIpsQrProvider();
