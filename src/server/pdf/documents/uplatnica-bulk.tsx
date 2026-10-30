import { Document, Page, View, Text, Image } from "@react-pdf/renderer";

import { APP_NAME } from "@/lib/constants/app";
import { pdfStyles } from "../theme";
import { formatDate } from "../layout";
import { formatMoney } from "@/lib/formatters/money";
import type { UplatnicaPdfData } from "./uplatnica";

/**
 * Faza 11 — bulk payment-slip PDF. One `Page` per `UplatnicaPdfData`
 * so operators can print or email the entire building's monthly slips
 * in a single file. Keeps the same visual layout as the single
 * uplatnica for recognizability.
 */
export function UplatnicaBulkPdf({
  slips,
  title,
  subtitle,
}: {
  slips: UplatnicaPdfData[];
  title: string;
  subtitle?: string;
}) {
  const issued = new Date();
  return (
    <Document title={title} author={APP_NAME} creator={APP_NAME} producer={APP_NAME}>
      {slips.map((data, idx) => (
        <Page key={idx} size="A4" style={pdfStyles.page} wrap>
          <View style={pdfStyles.header} fixed>
            <Text style={pdfStyles.brandName}>{APP_NAME}</Text>
            <Text style={pdfStyles.documentTitle}>{title}</Text>
            {subtitle ? <Text style={pdfStyles.documentSubtitle}>{subtitle}</Text> : null}
            <View style={pdfStyles.metaRow}>
              <Text>{data.managerName}</Text>
              <Text>
                {`Deo ${idx + 1} / ${slips.length} · `}
                {formatDate(issued)}
              </Text>
            </View>
          </View>

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
            {data.breakdown.map((item, i) => (
              <View key={i} style={pdfStyles.row} wrap={false}>
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

          <View style={pdfStyles.footer} fixed>
            <Text>{APP_NAME} — dokument generisan automatski.</Text>
            <Text render={({ pageNumber, totalPages }) => `Strana ${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  );
}
