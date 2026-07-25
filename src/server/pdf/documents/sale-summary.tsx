import { View, Text } from "@react-pdf/renderer";

import { PropertyDeskDocument, formatDate } from "../layout";
import { pdfStyles } from "../theme";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";

export interface SaleSummaryPdfData {
  organizationName: string;
  documentNumber?: string;
  issuedAt?: Date;
  sale: {
    id: string;
    unitCode: string;
    projectName: string;
    contractDate?: Date | null;
    listPrice: string;
    finalPrice: string;
    depositAmount?: string | null;
    currency: SupportedCurrency;
    status: string;
  };
  buyer: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
  };
  agency?: {
    name: string;
    agentName?: string | null;
  } | null;
  installments: Array<{
    name: string;
    dueDate: Date;
    amount: string;
    paid: string;
    status: string;
  }>;
  payments: Array<{
    paymentDate: Date;
    amount: string;
    method: string;
    reversed: boolean;
  }>;
  totals: {
    contracted: string;
    paid: string;
    outstanding: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nacrt",
  PRE_CONTRACT: "Predugovor",
  CONTRACTED: "Ugovorena",
  PAYMENT_IN_PROGRESS: "Plaćanje u toku",
  PAID: "Plaćena",
  HANDED_OVER: "Primopredato",
  CANCELED: "Otkazana",
};
const INSTALLMENT_LABELS: Record<string, string> = {
  UPCOMING: "Predstoji",
  DUE: "Dospela",
  PARTIALLY_PAID: "Delimično",
  PAID: "Plaćena",
  OVERDUE: "Kasni",
};
const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Nalog",
  CASH: "Gotovina",
  CARD: "Kartica",
  CHECK: "Ček",
  OTHER: "Ostalo",
};

export function SaleSummaryPdf(data: SaleSummaryPdfData) {
  const currency = data.sale.currency;
  return (
    <PropertyDeskDocument
      title="Pregled prodaje"
      subtitle={`${data.sale.projectName} · ${data.sale.unitCode}`}
      organizationName={data.organizationName}
      documentNumber={data.documentNumber}
      issuedAt={data.issuedAt}
    >
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Osnovni podaci</Text>
        <View style={pdfStyles.row}>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Status</Text>
            <Text style={pdfStyles.cardValue}>
              {STATUS_LABELS[data.sale.status] ?? data.sale.status}
            </Text>
          </View>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Datum ugovora</Text>
            <Text style={pdfStyles.cardValue}>
              {data.sale.contractDate ? formatDate(data.sale.contractDate) : "—"}
            </Text>
          </View>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Ugovorena cena</Text>
            <Text style={pdfStyles.cardValue}>
              {formatMoney(data.sale.finalPrice, currency)}
            </Text>
          </View>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Kupac</Text>
        <Text>{data.buyer.fullName}</Text>
        {data.buyer.email ? <Text>{data.buyer.email}</Text> : null}
        {data.buyer.phone ? <Text>{data.buyer.phone}</Text> : null}
      </View>

      {data.agency ? (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Agencija</Text>
          <Text>{data.agency.name}</Text>
          {data.agency.agentName ? <Text>Agent: {data.agency.agentName}</Text> : null}
        </View>
      ) : null}

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Plan plaćanja</Text>
        <View style={pdfStyles.row}>
          <Text style={[pdfStyles.th, { flex: 2 } as never]}>Rata</Text>
          <Text style={[pdfStyles.th, { flex: 1 } as never]}>Rok</Text>
          <Text style={[pdfStyles.th, { flex: 1.2, textAlign: "right" } as never]}>Iznos</Text>
          <Text style={[pdfStyles.th, { flex: 1.2, textAlign: "right" } as never]}>Uplaćeno</Text>
          <Text style={[pdfStyles.th, { flex: 1 } as never]}>Status</Text>
        </View>
        {data.installments.length === 0 ? (
          <Text style={pdfStyles.td}>Nema plana plaćanja.</Text>
        ) : (
          data.installments.map((i, idx) => (
            <View key={idx} style={pdfStyles.row} wrap={false}>
              <Text style={[pdfStyles.td, { flex: 2 } as never]}>{i.name}</Text>
              <Text style={[pdfStyles.td, { flex: 1 } as never]}>{formatDate(i.dueDate)}</Text>
              <Text style={[pdfStyles.tdRight, { flex: 1.2 } as never]}>
                {formatMoney(i.amount, currency)}
              </Text>
              <Text style={[pdfStyles.tdRight, { flex: 1.2 } as never]}>
                {formatMoney(i.paid, currency)}
              </Text>
              <Text style={[pdfStyles.td, { flex: 1 } as never]}>
                {INSTALLMENT_LABELS[i.status] ?? i.status}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Uplate</Text>
        {data.payments.length === 0 ? (
          <Text style={pdfStyles.td}>Nema evidentiranih uplata.</Text>
        ) : (
          data.payments.map((p, idx) => (
            <View key={idx} style={pdfStyles.row} wrap={false}>
              <Text style={[pdfStyles.td, { flex: 1 } as never]}>{formatDate(p.paymentDate)}</Text>
              <Text style={[pdfStyles.tdRight, { flex: 1.2 } as never]}>
                {formatMoney(p.amount, currency)}
              </Text>
              <Text style={[pdfStyles.td, { flex: 1 } as never]}>
                {METHOD_LABELS[p.method] ?? p.method}
              </Text>
              <Text style={[pdfStyles.td, { flex: 1 } as never]}>{p.reversed ? "Storno" : "Aktivno"}</Text>
            </View>
          ))
        )}
      </View>

      <View style={pdfStyles.section}>
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Ugovoreno</Text>
          <Text style={pdfStyles.totalValue}>{formatMoney(data.totals.contracted, currency)}</Text>
        </View>
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Uplaćeno</Text>
          <Text style={pdfStyles.totalValue}>{formatMoney(data.totals.paid, currency)}</Text>
        </View>
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Preostalo</Text>
          <Text style={pdfStyles.totalValue}>{formatMoney(data.totals.outstanding, currency)}</Text>
        </View>
      </View>
    </PropertyDeskDocument>
  );
}
