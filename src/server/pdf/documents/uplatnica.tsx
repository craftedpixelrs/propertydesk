import { View, Text, Image } from "@react-pdf/renderer";

import { PropertyDeskDocument, formatDate } from "../layout";
import { pdfStyles } from "../theme";
import { formatMoney } from "@/lib/formatters/money";

/**
 * Faza 11 — "Uplatnica" PDF for monthly dues (zajednička taksa).
 *
 * This is the slip (nalog za uplatu) sent to building residents. The
 * NBS IPS QR embeds the model-97 reference so Serbian banking apps
 * prefill the transfer form on scan.
 */
export interface UplatnicaPdfData {
  managerName: string;
  buildingName: string;
  buildingAddress: string;
  unitCode: string;
  periodLabel: string; // e.g. "Jul 2026"
  dueDate: Date;
  totalAmount: string;
  outstandingAmount: string;
  currency: "RSD";
  reference: string | null; // formatted "97 CC-XXXXXXXXXXXX"
  payeeAccount: string;
  payeeBankName: string | null;
  payeeLegalName: string;
  breakdown: Array<{ label: string; amount: string }>;
  ipsQrPngBase64: string | null;
  payerLabel: string;
  footerNote?: string | null;
}

export function UplatnicaPdf(data: UplatnicaPdfData) {
  return (
    <PropertyDeskDocument
      title={`Uplatnica · ${data.buildingName} · ${data.unitCode}`}
      subtitle={`Period: ${data.periodLabel}`}
      organizationName={data.managerName}
      documentNumber={data.reference ?? "—"}
      issuedAt={new Date()}
    >
      <View style={pdfStyles.section}>
        <View style={pdfStyles.row}>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Primalac</Text>
            <Text style={pdfStyles.cardValue}>{data.payeeLegalName}</Text>
            <Text>{data.buildingAddress}</Text>
            {data.payeeBankName ? <Text>{data.payeeBankName}</Text> : null}
            <Text>Račun: {data.payeeAccount}</Text>
          </View>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Uplatilac</Text>
            <Text style={pdfStyles.cardValue}>{data.payerLabel}</Text>
            <Text>Posebni deo: {data.unitCode}</Text>
          </View>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <View style={pdfStyles.row}>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Period</Text>
            <Text style={pdfStyles.cardValue}>{data.periodLabel}</Text>
          </View>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Rok plaćanja</Text>
            <Text style={pdfStyles.cardValue}>{formatDate(data.dueDate)}</Text>
          </View>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Poziv na broj</Text>
            <Text style={pdfStyles.cardValue}>{data.reference ?? "—"}</Text>
          </View>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Specifikacija</Text>
        <View style={pdfStyles.row}>
          <Text style={[pdfStyles.th, { flex: 3 } as never]}>Stavka</Text>
          <Text style={[pdfStyles.th, { flex: 1.4, textAlign: "right" } as never]}>Iznos</Text>
        </View>
        {data.breakdown.map((item, idx) => (
          <View key={idx} style={pdfStyles.row} wrap={false}>
            <Text style={[pdfStyles.td, { flex: 3 } as never]}>{item.label}</Text>
            <Text style={[pdfStyles.tdRight, { flex: 1.4 } as never]}>
              {formatMoney(item.amount, data.currency)}
            </Text>
          </View>
        ))}
      </View>

      <View style={pdfStyles.section}>
        <View style={pdfStyles.row}>
          <View style={pdfStyles.col}>
            {data.ipsQrPngBase64 ? (
              <>
                <Text style={pdfStyles.sectionTitle}>IPS QR</Text>
                <Image
                  src={`data:image/png;base64,${data.ipsQrPngBase64}`}
                  style={{ width: 140, height: 140 } as never}
                />
                <Text>Skenirajte kod u aplikaciji svoje banke.</Text>
              </>
            ) : null}
          </View>
          <View style={pdfStyles.col}>
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Ukupno za period</Text>
              <Text style={pdfStyles.totalValue}>
                {formatMoney(data.totalAmount, data.currency)}
              </Text>
            </View>
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Preostalo za plaćanje</Text>
              <Text style={pdfStyles.totalValue}>
                {formatMoney(data.outstandingAmount, data.currency)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {data.footerNote ? (
        <View style={pdfStyles.section}>
          <Text>{data.footerNote}</Text>
        </View>
      ) : null}
    </PropertyDeskDocument>
  );
}
