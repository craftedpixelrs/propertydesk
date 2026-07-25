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
  cancel?(context: ElectronicInvoiceContext, reason: string): Promise<ElectronicInvoiceSubmitResult>;
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

/**
 * Serbian SEF provider stub.
 *
 * The real transport requires an API key configured via
 * `CompanyBillingProfile.sefApiKeyEncrypted` and env-specific base URLs. For
 * now we simulate a successful accept: this keeps the retry loop working and
 * lets the UI exercise all state transitions until the transport is wired up.
 */
class SerbianSefProvider implements ElectronicInvoiceProvider {
  readonly type = "SERBIAN_SEF" as const;
  async submit(context: ElectronicInvoiceContext): Promise<ElectronicInvoiceSubmitResult> {
    // TODO(billing/sef): call SEF `/api/publicApi/sales-invoice/ubl` with
    // the encrypted API key. Retry with exponential backoff. Persist the
    // response envelope in `responsePayload`.
    return {
      status: "ACKNOWLEDGED",
      providerReference: `sef:pending:${context.invoice.id}`,
      responsePayload: { simulated: true },
      errorMessage: null,
    };
  }
  async cancel(context: ElectronicInvoiceContext, reason: string): Promise<ElectronicInvoiceSubmitResult> {
    return {
      status: "REJECTED",
      providerReference: context.record?.providerReference ?? null,
      responsePayload: { simulated: true, reason },
      errorMessage: null,
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
