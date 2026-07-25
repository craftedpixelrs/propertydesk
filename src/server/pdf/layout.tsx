import { Page, Document, View, Text } from "@react-pdf/renderer";
import type { ReactNode } from "react";

import { APP_NAME } from "@/lib/constants/app";
import { pdfStyles } from "./theme";

interface PropertyDeskDocumentProps {
  title: string;
  subtitle?: string;
  organizationName: string;
  documentNumber?: string;
  issuedAt?: Date;
  children: ReactNode;
}

/**
 * Shared A4 wrapper. Every PDF template renders as a `PropertyDeskDocument`
 * so header/footer + brand row look identical across offer / price list /
 * sale / commission statements.
 */
export function PropertyDeskDocument(props: PropertyDeskDocumentProps) {
  const issued = props.issuedAt ?? new Date();
  return (
    <Document
      title={props.title}
      author={APP_NAME}
      creator={APP_NAME}
      producer={APP_NAME}
    >
      <Page size="A4" style={pdfStyles.page} wrap>
        <View style={pdfStyles.header} fixed>
          <Text style={pdfStyles.brandName}>{APP_NAME}</Text>
          <Text style={pdfStyles.documentTitle}>{props.title}</Text>
          {props.subtitle ? <Text style={pdfStyles.documentSubtitle}>{props.subtitle}</Text> : null}
          <View style={pdfStyles.metaRow}>
            <Text>{props.organizationName}</Text>
            <Text>
              {props.documentNumber ? `Br. ${props.documentNumber} · ` : ""}
              {formatDate(issued)}
            </Text>
          </View>
        </View>

        {props.children}

        <View style={pdfStyles.footer} fixed>
          <Text>{APP_NAME} — dokument generisan automatski.</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Strana ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("sr-Latn-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
