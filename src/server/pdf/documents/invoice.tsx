import { View, Text, Image } from "@react-pdf/renderer";

import { PropertyDeskDocument, formatDate } from "../layout";
import { pdfStyles } from "../theme";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";

export interface InvoicePdfData {
  organizationName: string;
  invoiceNumber: string;
  status: string;
  issueDate: Date | null;
  dueDate: Date | null;
  language: string;
  currency: SupportedCurrency;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  note: string | null;
  servicePeriodStart: Date | null;
  servicePeriodEnd: Date | null;
  billingCycle: string | null;
  issuer: {
    legalName: string;
    taxNumber: string;
    registrationNumber: string | null;
    vatId: string | null;
    vatRegistered: boolean;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    postalCode: string;
    country: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    invoiceNote: string | null;
  };
  customer: {
    legalName: string;
    taxNumber: string | null;
    registrationNumber: string | null;
    addressLine1: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
  };
  bankAccount: {
    bankName: string;
    accountNumber: string;
    iban: string | null;
    swiftBic: string | null;
    currency: string;
    holderName: string | null;
  } | null;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    amount: string;
  }>;
  ipsQrPngBase64: string | null;
  /**
   * When the invoice was priced in one currency and issued in another
   * (typical: EUR → RSD for domestic clients), these fields carry the
   * pre-conversion totals + the applied middle rate. `null` means no
   * conversion happened.
   */
  fx: {
    baseCurrency: SupportedCurrency;
    baseSubtotal: string;
    baseTaxAmount: string;
    baseTotalAmount: string;
    rate: string;
    rateDate: Date;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nacrt",
  ISSUED: "Izdato",
  SENT: "Poslato",
  PARTIALLY_PAID: "Delimično plaćeno",
  PAID: "Plaćeno",
  OVERDUE: "U kašnjenju",
  CANCELED: "Otkazano",
  VOID: "Poništeno",
};

export function InvoicePdf(data: InvoicePdfData) {
  const currency = data.currency;
  return (
    <PropertyDeskDocument
      title={`Faktura br. ${data.invoiceNumber}`}
      subtitle={data.billingCycle ? `Ciklus: ${data.billingCycle}` : undefined}
      organizationName={data.issuer.legalName}
      documentNumber={data.invoiceNumber}
      issuedAt={data.issueDate ?? new Date()}
    >
      {/* Issuer + Customer blocks */}
      <View style={pdfStyles.section}>
        <View style={pdfStyles.row}>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Izdavalac</Text>
            <Text style={pdfStyles.cardValue}>{data.issuer.legalName}</Text>
            <Text>PIB: {data.issuer.taxNumber}</Text>
            {data.issuer.registrationNumber ? (
              <Text>Matični broj: {data.issuer.registrationNumber}</Text>
            ) : null}
            {data.issuer.vatId ? <Text>PDV: {data.issuer.vatId}</Text> : null}
            <Text>
              {data.issuer.addressLine1}
              {data.issuer.addressLine2 ? `, ${data.issuer.addressLine2}` : ""}
            </Text>
            <Text>
              {data.issuer.postalCode} {data.issuer.city}, {data.issuer.country}
            </Text>
            {data.issuer.email ? <Text>{data.issuer.email}</Text> : null}
            {data.issuer.phone ? <Text>{data.issuer.phone}</Text> : null}
          </View>

          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Primalac</Text>
            <Text style={pdfStyles.cardValue}>{data.customer.legalName}</Text>
            {data.customer.taxNumber ? <Text>PIB: {data.customer.taxNumber}</Text> : null}
            {data.customer.registrationNumber ? (
              <Text>Matični broj: {data.customer.registrationNumber}</Text>
            ) : null}
            {data.customer.addressLine1 ? <Text>{data.customer.addressLine1}</Text> : null}
            {data.customer.city ? (
              <Text>
                {data.customer.postalCode ?? ""} {data.customer.city},{" "}
                {data.customer.country ?? "RS"}
              </Text>
            ) : null}
            {data.customer.email ? <Text>{data.customer.email}</Text> : null}
            {data.customer.phone ? <Text>{data.customer.phone}</Text> : null}
          </View>
        </View>
      </View>

      {/* Meta row */}
      <View style={pdfStyles.section}>
        <View style={pdfStyles.row}>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Status</Text>
            <Text style={pdfStyles.cardValue}>
              {STATUS_LABELS[data.status] ?? data.status}
            </Text>
          </View>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Datum izdavanja</Text>
            <Text style={pdfStyles.cardValue}>
              {data.issueDate ? formatDate(data.issueDate) : "—"}
            </Text>
          </View>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Rok plaćanja</Text>
            <Text style={pdfStyles.cardValue}>
              {data.dueDate ? formatDate(data.dueDate) : "—"}
            </Text>
          </View>
        </View>
      </View>

      {data.servicePeriodStart && data.servicePeriodEnd ? (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>
            Period usluge: {formatDate(data.servicePeriodStart)} –{" "}
            {formatDate(
              new Date(data.servicePeriodEnd.getTime() - 24 * 60 * 60 * 1000),
            )}
          </Text>
        </View>
      ) : null}

      {/* Items */}
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Stavke</Text>
        <View style={pdfStyles.row}>
          <Text style={[pdfStyles.th, { flex: 3 } as never]}>Opis</Text>
          <Text style={[pdfStyles.th, { flex: 0.8, textAlign: "right" } as never]}>Kol.</Text>
          <Text style={[pdfStyles.th, { flex: 1.4, textAlign: "right" } as never]}>Cena</Text>
          <Text style={[pdfStyles.th, { flex: 0.8, textAlign: "right" } as never]}>PDV %</Text>
          <Text style={[pdfStyles.th, { flex: 1.4, textAlign: "right" } as never]}>Iznos</Text>
        </View>
        {data.items.map((item, idx) => (
          <View key={idx} style={pdfStyles.row} wrap={false}>
            <Text style={[pdfStyles.td, { flex: 3 } as never]}>{item.description}</Text>
            <Text style={[pdfStyles.tdRight, { flex: 0.8 } as never]}>{item.quantity}</Text>
            <Text style={[pdfStyles.tdRight, { flex: 1.4 } as never]}>
              {formatMoney(item.unitPrice, currency)}
            </Text>
            <Text style={[pdfStyles.tdRight, { flex: 0.8 } as never]}>{item.taxRate}</Text>
            <Text style={[pdfStyles.tdRight, { flex: 1.4 } as never]}>
              {formatMoney(item.amount, currency)}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals + payment box */}
      <View style={pdfStyles.section}>
        <View style={pdfStyles.row}>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Način plaćanja</Text>
            {data.bankAccount ? (
              <>
                <Text>{data.bankAccount.bankName}</Text>
                <Text>Račun: {data.bankAccount.accountNumber}</Text>
                {data.bankAccount.iban ? <Text>IBAN: {data.bankAccount.iban}</Text> : null}
                {data.bankAccount.swiftBic ? <Text>SWIFT/BIC: {data.bankAccount.swiftBic}</Text> : null}
                <Text>Poziv na broj: {data.invoiceNumber}</Text>
              </>
            ) : (
              <Text>—</Text>
            )}
          </View>
          <View style={pdfStyles.col}>
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Osnovica</Text>
              <Text style={pdfStyles.totalValue}>
                {formatMoney(data.subtotal, currency)}
              </Text>
            </View>
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>PDV</Text>
              <Text style={pdfStyles.totalValue}>
                {formatMoney(data.taxAmount, currency)}
              </Text>
            </View>
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Ukupno</Text>
              <Text style={pdfStyles.totalValue}>
                {formatMoney(data.totalAmount, currency)}
              </Text>
            </View>
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Uplaćeno</Text>
              <Text style={pdfStyles.totalValue}>
                {formatMoney(data.amountPaid, currency)}
              </Text>
            </View>
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Za plaćanje</Text>
              <Text style={pdfStyles.totalValue}>
                {formatMoney(data.amountDue, currency)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {data.fx ? (
        <View style={pdfStyles.section}>
          <Text>
            {`Obračunato po srednjem kursu na dan ${formatDate(data.fx.rateDate)}: 1 ${data.fx.baseCurrency} = ${data.fx.rate} ${currency}.`}
          </Text>
          <Text>
            {`Osnovica u ${data.fx.baseCurrency}: ${formatMoney(data.fx.baseSubtotal, data.fx.baseCurrency)} • PDV: ${formatMoney(data.fx.baseTaxAmount, data.fx.baseCurrency)} • Ukupno: ${formatMoney(data.fx.baseTotalAmount, data.fx.baseCurrency)}.`}
          </Text>
        </View>
      ) : null}

      {data.ipsQrPngBase64 ? (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>IPS QR — brzo plaćanje</Text>
          <View style={pdfStyles.row}>
            <View style={pdfStyles.col}>
              <Image src={`data:image/png;base64,${data.ipsQrPngBase64}`} style={{ width: 140, height: 140 } as never} />
            </View>
            <View style={pdfStyles.col}>
              <Text>Skenirajte kod u aplikaciji Vaše banke da automatski popunite nalog za plaćanje.</Text>
            </View>
          </View>
        </View>
      ) : null}

      {(data.note || data.issuer.invoiceNote) ? (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Napomena</Text>
          {data.note ? <Text>{data.note}</Text> : null}
          {data.issuer.invoiceNote ? <Text>{data.issuer.invoiceNote}</Text> : null}
        </View>
      ) : null}
    </PropertyDeskDocument>
  );
}
