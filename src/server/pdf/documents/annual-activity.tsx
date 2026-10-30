import { View, Text } from "@react-pdf/renderer";

import { PropertyDeskDocument } from "../layout";
import { pdfStyles } from "../theme";

/**
 * Faza 11 — Annual activity report for a MANAGER organization.
 *
 * Printable one-pager (two if there are many buildings) that the manager
 * hands to the chairman of each building. Numbers come straight from
 * `buildAnnualActivityReport`.
 */
export interface AnnualActivityPdfData {
  managerName: string;
  year: number;
  buildings: Array<{ id: string; name: string; address: string; units: number }>;
  dues: {
    chargedTotal: string;
    paidTotal: string;
    outstanding: string;
    chargesCount: number;
    currency: string;
  };
  expensesByFund: Array<{ fund: string; total: string; count: number }>;
  tickets: {
    reported: number;
    completed: number;
    canceled: number;
    stillOpen: number;
  };
  assemblies: {
    scheduled: number;
    completed: number;
    canceled: number;
  };
  notices: {
    publishedCount: number;
    totalDeliveries: number;
  };
}

const FUND_LABEL: Record<string, string> = {
  CURRENT_MAINTENANCE: "Tekuće održavanje",
  INVESTMENT_FUND: "Investicioni fond",
  OTHER: "Ostalo",
};

export function AnnualActivityPdf(data: AnnualActivityPdfData) {
  return (
    <PropertyDeskDocument
      title={`Godišnji izveštaj o radu — ${data.year}`}
      organizationName={data.managerName}
      issuedAt={new Date()}
    >
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Zajedničke takse</Text>
        <Row label="Zaduženo (ukupno)" value={`${data.dues.chargedTotal} ${data.dues.currency}`} />
        <Row label="Naplaćeno" value={`${data.dues.paidTotal} ${data.dues.currency}`} />
        <Row label="Preostalo" value={`${data.dues.outstanding} ${data.dues.currency}`} />
        <Row label="Broj zaduženja" value={String(data.dues.chargesCount)} />
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Troškovi po fondu</Text>
        {data.expensesByFund.length === 0 ? (
          <Text>Nema evidentiranih troškova za ovu godinu.</Text>
        ) : (
          data.expensesByFund.map((f) => (
            <Row
              key={f.fund}
              label={FUND_LABEL[f.fund] ?? f.fund}
              value={`${f.total} RSD · ${f.count}×`}
            />
          ))
        )}
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Kvarovi i radovi</Text>
        <Row label="Prijavljeno" value={String(data.tickets.reported)} />
        <Row label="Rešeno" value={String(data.tickets.completed)} />
        <Row label="Nerešeno" value={String(data.tickets.stillOpen)} />
        <Row label="Otkazano" value={String(data.tickets.canceled)} />
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Skupštine</Text>
        <Row label="Zakazano" value={String(data.assemblies.scheduled)} />
        <Row label="Održano" value={String(data.assemblies.completed)} />
        <Row label="Otkazano" value={String(data.assemblies.canceled)} />
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Obaveštenja stanarima</Text>
        <Row label="Objavljeno" value={String(data.notices.publishedCount)} />
        <Row label="Email obaveštenja" value={String(data.notices.totalDeliveries)} />
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Održavane zgrade ({data.buildings.length})</Text>
        {data.buildings.map((b) => (
          <Text key={b.id} style={{ marginBottom: 2 }}>
            {b.name} — {b.address} ({b.units} delova)
          </Text>
        ))}
      </View>
    </PropertyDeskDocument>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={pdfStyles.row}>
      <Text style={[pdfStyles.td, { flex: 2 }]}>{label}</Text>
      <Text style={[pdfStyles.tdRight, { flex: 1 }]}>{value}</Text>
    </View>
  );
}
