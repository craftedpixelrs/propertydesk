import "server-only";
import type {
  ElectronicInvoiceProviderType,
  ElectronicInvoiceRecord,
  ElectronicInvoiceStatus,
  Invoice,
} from "@prisma/client";

/**
 * Provider abstraction for electronic invoice delivery.
 *
 * PropertyDesk supports two concrete providers today:
 *   - MANUAL — passthrough that always marks the record as ACCEPTED; used
 *     when the operator submits e-invoices outside the platform.
 *   - SERBIAN_SEF — stub implementation of the Serbian Sistem Elektronskih
 *     Faktura (SEF) API. Real transport is added later; the stub simulates
 *     accept/reject and exercises the retry loop.
 */

export interface ElectronicInvoiceContext {
  invoice: Invoice;
  organizationId: string;
  record?: ElectronicInvoiceRecord | null;
}

export interface ElectronicInvoiceSubmitResult {
  status: ElectronicInvoiceStatus;
  providerReference?: string | null;
  responsePayload?: Record<string, unknown> | null;
  errorMessage?: string | null;
}

export interface ElectronicInvoiceProvider {
  readonly type: ElectronicInvoiceProviderType;
  submit(context: ElectronicInvoiceContext): Promise<ElectronicInvoiceSubmitResult>;
  cancel?(
    context: ElectronicInvoiceContext,
    reason: string,
  ): Promise<ElectronicInvoiceSubmitResult>;
}

class ManualElectronicInvoiceProvider implements ElectronicInvoiceProvider {
  readonly type = "MANUAL" as const;
  async submit(): Promise<ElectronicInvoiceSubmitResult> {
    return {
      status: "SENT",
      providerReference: null,
      responsePayload: { note: "Manual passthrough — operator submits externally." },
      errorMessage: null,
    };
  }
}

const SEF_NOT_WIRED =
  "Automatsko slanje u SEF nije uključeno. Pošaljite fakturu ručno preko SEF portala i ostavite provajdera na MANUAL.";

/**
 * Serbian SEF provider.
 *
 * Transport is not wired. Submit and cancel fail closed: they must not
 * report ACKNOWLEDGED, because that would look like the state portal
 * accepted an invoice that was never sent.
 */
class SerbianSefProvider implements ElectronicInvoiceProvider {
  readonly type = "SERBIAN_SEF" as const;
  async submit(context: ElectronicInvoiceContext): Promise<ElectronicInvoiceSubmitResult> {
    return {
      status: "FAILED",
      providerReference: null,
      responsePayload: { simulated: false, invoiceId: context.invoice.id },
      errorMessage: SEF_NOT_WIRED,
    };
  }
  async cancel(
    context: ElectronicInvoiceContext,
    reason: string,
  ): Promise<ElectronicInvoiceSubmitResult> {
    return {
      status: "FAILED",
      providerReference: context.record?.providerReference ?? null,
      responsePayload: { simulated: false, reason },
      errorMessage: SEF_NOT_WIRED,
    };
  }
}

const PROVIDERS: Record<ElectronicInvoiceProviderType, ElectronicInvoiceProvider> = {
  MANUAL: new ManualElectronicInvoiceProvider(),
  SERBIAN_SEF: new SerbianSefProvider(),
};

export function getProvider(type: ElectronicInvoiceProviderType): ElectronicInvoiceProvider {
  return PROVIDERS[type];
}
