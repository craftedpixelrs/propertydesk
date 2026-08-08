/**
 * IPS QR provider interface.
 *
 * IPS ("Instant Payment Serbia") is the NBS (National Bank of Serbia) domestic
 * instant-payment scheme. A payment QR code contains a pipe-delimited payload
 * that mobile banking apps parse to prefill the transfer form.
 *
 * The interface is split from the concrete Serbian implementation so unit
 * tests can inject a fake and users of the abstraction remain provider-agnostic.
 */

export interface IpsQrRequest {
  /**
   * Receiver (payee) identity. Serbian legal name, up to 70 characters. The
   * NBS spec caps K/N/I/PU/RO fields at defined widths — the provider will
   * truncate rather than fail.
   */
  receiverName: string;
  /** Receiver Serbian domestic account number (18 chars, no dashes). */
  receiverAccount: string;
  /** Amount in dinars with 2 decimals. Provider will normalize formatting. */
  amount: string | number;
  /** Payer name (buyer). Empty string is legal when unknown at print time. */
  payerName?: string;
  /** Payment reference / model + reference number, e.g. `97 1234567890`. */
  paymentReference?: string;
  /** Payer identifier (PIB, JMBG, or arbitrary tag). Optional. */
  payerIdentifier?: string;
  /** Currency code. Only `RSD` is currently supported by NBS IPS. */
  currency?: "RSD";
  /** Description shown in the payee's banking app. */
  description?: string;
  /** Payment purpose code (NBS 3-digit). Default "289" (subscription/fee). */
  purposeCode?: string;
  /** Payment code (NBS numeric shifra plaćanja). Default "221" (usluge). */
  paymentCode?: string;
}

export interface IpsQrResult {
  payload: string;
  pngBuffer: Buffer;
  contentType: "image/png";
}

export interface IpsQrProvider {
  isEnabled(): boolean;
  generate(input: IpsQrRequest): Promise<IpsQrResult>;
}
