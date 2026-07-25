import { View, Text } from "@react-pdf/renderer";

import { PropertyDeskDocument, formatDate } from "../layout";
import { pdfStyles } from "../theme";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";

export interface CommissionStatementPdfData {
  organizationName: string;
  documentNumber?: string;
  issuedAt?: Date;
  agency: {
    name: string;
    address?: string | null;
    taxNumber?: string | null;
  };
  periodStart?: Date | null;
  periodEnd?: Date | null;
  currency: SupportedCurrency;
  rows: Array<{
    id: string;
    saleUnitCode: string;
    projectName: string;
    contractDate?: Date | null;
    salePrice: string;
    ruleDescription: string;
    calculatedAmount: string;
    adjustedAmount?: string | null;
    status: string;
  }>;
  totals: {
    calculated: string;
    approved: string;
    paid: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  CALCULATED: "Kalkulisano",
  APPROVED: "Odobreno",
  INVOICED: "Fakturisano",
  DUE: "Dospelo",
  PAID: "Isplaćeno",
  DISPUTED: "Sporno",
  CANCELED: "Otkazano",
};

export function CommissionStatementPdf(data: CommissionStatementPdfData) {
  const currency = data.currency;
  return (
    <PropertyDeskDocument
      title="Obračun provizije"
      subtitle={data.agency.name}
      organizationName={data.organizationName}
      documentNumber={data.documentNumber}
      issuedAt={data.issuedAt}
    >
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Agencija</Text>
        <Text>{data.agency.name}</Text>
        {data.agency.address ? <Text>{data.agency.address}</Text> : null}
        {data.agency.taxNumber ? <Text>PIB: {data.agency.taxNumber}</Text> : null}
      </View>

      {data.periodStart || data.periodEnd ? (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Period</Text>
          <Text>
            {data.periodStart ? formatDate(data.periodStart) : "—"} —{" "}
            {data.periodEnd ? formatDate(data.periodEnd) : "—"}
          </Text>
        </View>
      ) : null}

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Stavke</Text>
        <View style={pdfStyles.row} fixed>
          <Text style={[pdfStyles.th, { flex: 1.2 } as never]}>Datum</Text>
          <Text style={[pdfStyles.th, { flex: 2 } as never]}>Projekat / jed.</Text>
          <Text style={[pdfStyles.th, { flex: 2 } as never]}>Pravilo</Text>
          <Text style={[pdfStyles.th, { flex: 1.4, textAlign: "right" } as never]}>
            Cena prodaje
          </Text>
          <Text style={[pdfStyles.th, { flex: 1.2, textAlign: "right" } as never]}>Provizija</Text>
          <Text style={[pdfStyles.th, { flex: 1 } as never]}>Status</Text>
        </View>
        {data.rows.length === 0 ? (
          <Text style={pdfStyles.td}>Nema stavki u obračunskom periodu.</Text>
        ) : (
          data.rows.map((r) => (
            <View key={r.id} style={pdfStyles.row} wrap={false}>
              <Text style={[pdfStyles.td, { flex: 1.2 } as never]}>
                {r.contractDate ? formatDate(r.contractDate) : "—"}
              </Text>
              <Text style={[pdfStyles.td, { flex: 2 } as never]}>
                {r.projectName} · {r.saleUnitCode}
              </Text>
              <Text style={[pdfStyles.td, { flex: 2 } as never]}>{r.ruleDescription}</Text>
              <Text style={[pdfStyles.tdRight, { flex: 1.4 } as never]}>
                {formatMoney(r.salePrice, currency)}
              </Text>
              <Text style={[pdfStyles.tdRight, { flex: 1.2 } as never]}>
                {formatMoney(r.adjustedAmount ?? r.calculatedAmount, currency)}
              </Text>
              <Text style={[pdfStyles.td, { flex: 1 } as never]}>
                {STATUS_LABELS[r.status] ?? r.status}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={pdfStyles.section}>
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Kalkulisano</Text>
          <Text style={pdfStyles.totalValue}>{formatMoney(data.totals.calculated, currency)}</Text>
        </View>
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Odobreno</Text>
          <Text style={pdfStyles.totalValue}>{formatMoney(data.totals.approved, currency)}</Text>
        </View>
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Isplaćeno</Text>
          <Text style={pdfStyles.totalValue}>{formatMoney(data.totals.paid, currency)}</Text>
        </View>
      </View>
    </PropertyDeskDocument>
  );
}
