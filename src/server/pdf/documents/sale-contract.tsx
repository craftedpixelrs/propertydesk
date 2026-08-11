import { View, Text } from "@react-pdf/renderer";

import { PropertyDeskDocument, formatDate } from "../layout";
import { pdfStyles } from "../theme";
import type { SaleContractKind } from "@prisma/client";

export interface SaleContractPdfData {
  organizationName: string;
  kind: SaleContractKind;
  templateName: string;
  /**
   * Rendered HTML string returned by `renderSaleContractHtml`. We do
   * NOT try to reflow the operator's original layout — instead we
   * strip tags into paragraphs and render each block with our own
   * A4 typography so the output stays consistent across templates.
   * Contract PDFs are meant to be a formal, printable version of the
   * text; operators can still export a `.docx`-style HTML preview
   * from the UI if they need the exact HTML markup.
   */
  html: string;
  saleUnitCode: string;
  saleProjectName: string;
  buyerFullName: string;
  issuedAt?: Date;
}

const KIND_LABELS: Record<SaleContractKind, string> = {
  PRE_CONTRACT: "Predugovor o kupoprodaji",
  CONTRACT: "Ugovor o kupoprodaji",
};

/**
 * Convert operator-authored HTML into structured PDF blocks. Only
 * a small subset of tags is honoured (p, br, table, tr, td, th, ul,
 * ol, li, strong/b, em/i, h1..h4). Everything else is flattened to
 * plain paragraphs. This keeps the rendered PDF predictable while
 * still letting the operator write rich content.
 */
function htmlToBlocks(html: string): string[] {
  if (!html) return [];
  // Normalise: convert <br> to newlines, then split on paragraph-ish
  // tags. Strip remaining tags. Consumers get one string per block.
  const withNewlines = html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n\n")
    .replace(/<(p|div|li|tr|h[1-6])[^>]*>/gi, "")
    .replace(/<\/?(table|tbody|thead|ul|ol|strong|b|em|i|span)[^>]*>/gi, "")
    .replace(/<td[^>]*>/gi, " ")
    .replace(/<\/td>/gi, "  ")
    .replace(/<th[^>]*>/gi, " ")
    .replace(/<\/th>/gi, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return withNewlines
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SaleContractPdf(data: SaleContractPdfData) {
  const blocks = htmlToBlocks(data.html);
  return (
    <PropertyDeskDocument
      title={KIND_LABELS[data.kind]}
      subtitle={`${data.saleProjectName} · ${data.saleUnitCode}`}
      organizationName={data.organizationName}
      issuedAt={data.issuedAt}
    >
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>{data.templateName}</Text>
        <Text style={{ marginBottom: 4 }}>Kupac: {data.buyerFullName}</Text>
        <Text style={{ color: "#64748b", marginBottom: 12 }}>
          Datum: {formatDate(data.issuedAt ?? new Date())}
        </Text>
      </View>

      {blocks.length === 0 ? (
        <View style={pdfStyles.section}>
          <Text>Nema sadržaja u šablonu.</Text>
        </View>
      ) : (
        blocks.map((block, idx) => (
          <View key={idx} style={{ marginBottom: 8 }} wrap={false}>
            <Text>{block}</Text>
          </View>
        ))
      )}

      <View style={{ ...pdfStyles.section, marginTop: 40 }} wrap={false}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Za prodavca</Text>
            <Text style={{ marginTop: 24 }}>_______________________________</Text>
            <Text style={{ color: "#64748b", marginTop: 4 }}>
              {data.organizationName}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Za kupca</Text>
            <Text style={{ marginTop: 24 }}>_______________________________</Text>
            <Text style={{ color: "#64748b", marginTop: 4 }}>
              {data.buyerFullName}
            </Text>
          </View>
        </View>
      </View>
    </PropertyDeskDocument>
  );
}
