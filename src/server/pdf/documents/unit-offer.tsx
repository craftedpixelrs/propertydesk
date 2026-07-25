import { View, Text } from "@react-pdf/renderer";

import { PropertyDeskDocument, formatDate } from "../layout";
import { pdfStyles } from "../theme";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";

export interface UnitOfferPdfData {
  organizationName: string;
  documentNumber?: string;
  issuedAt?: Date;
  unit: {
    code: string;
    type: string;
    area: string;
    rooms?: string | null;
    floor?: string | null;
    projectName: string;
    buildingName?: string | null;
    price: string;
    currency: SupportedCurrency;
    description?: string | null;
  };
  buyer?: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
  };
  agent?: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
  };
  validUntil?: Date | null;
  notes?: string | null;
}

export function UnitOfferPdf(data: UnitOfferPdfData) {
  return (
    <PropertyDeskDocument
      title="Ponuda za jedinicu"
      subtitle={`${data.unit.projectName} · ${data.unit.code}`}
      organizationName={data.organizationName}
      documentNumber={data.documentNumber}
      issuedAt={data.issuedAt}
    >
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Predmet ponude</Text>
        <View style={pdfStyles.row}>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Šifra jedinice</Text>
            <Text style={pdfStyles.cardValue}>{data.unit.code}</Text>
          </View>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Tip</Text>
            <Text style={pdfStyles.cardValue}>{data.unit.type}</Text>
          </View>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Površina</Text>
            <Text style={pdfStyles.cardValue}>{data.unit.area} m²</Text>
          </View>
        </View>
        <View style={pdfStyles.row}>
          <View style={[pdfStyles.col]}>
            <Text style={pdfStyles.cardTitle}>Projekat</Text>
            <Text>{data.unit.projectName}</Text>
          </View>
          {data.unit.buildingName ? (
            <View style={[pdfStyles.col]}>
              <Text style={pdfStyles.cardTitle}>Objekat</Text>
              <Text>{data.unit.buildingName}</Text>
            </View>
          ) : null}
          {data.unit.floor ? (
            <View style={[pdfStyles.col]}>
              <Text style={pdfStyles.cardTitle}>Sprat</Text>
              <Text>{data.unit.floor}</Text>
            </View>
          ) : null}
          {data.unit.rooms ? (
            <View style={[pdfStyles.col]}>
              <Text style={pdfStyles.cardTitle}>Broj soba</Text>
              <Text>{data.unit.rooms}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Cena</Text>
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Ukupna cena</Text>
          <Text style={pdfStyles.totalValue}>
            {formatMoney(data.unit.price, data.unit.currency)}
          </Text>
        </View>
      </View>

      {data.buyer ? (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Kupac</Text>
          <Text>{data.buyer.fullName}</Text>
          {data.buyer.email ? <Text>{data.buyer.email}</Text> : null}
          {data.buyer.phone ? <Text>{data.buyer.phone}</Text> : null}
        </View>
      ) : null}

      {data.agent ? (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Kontakt osoba</Text>
          <Text>{data.agent.fullName}</Text>
          {data.agent.email ? <Text>{data.agent.email}</Text> : null}
          {data.agent.phone ? <Text>{data.agent.phone}</Text> : null}
        </View>
      ) : null}

      {data.notes || data.unit.description ? (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Napomene</Text>
          {data.unit.description ? <Text>{data.unit.description}</Text> : null}
          {data.notes ? <Text>{"\n"}{data.notes}</Text> : null}
        </View>
      ) : null}

      {data.validUntil ? (
        <View style={pdfStyles.section}>
          <Text>Ponuda važi do: {formatDate(data.validUntil)}</Text>
        </View>
      ) : null}
    </PropertyDeskDocument>
  );
}
