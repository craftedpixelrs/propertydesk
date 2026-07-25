import { View, Text } from "@react-pdf/renderer";

import { PropertyDeskDocument } from "../layout";
import { pdfStyles } from "../theme";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";

export interface PriceListPdfData {
  organizationName: string;
  projectName: string;
  documentNumber?: string;
  issuedAt?: Date;
  units: Array<{
    code: string;
    type: string;
    area: string;
    rooms?: string | null;
    floor?: string | null;
    status: string;
    price: string;
    currency: SupportedCurrency;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Dostupno",
  ON_HOLD: "Zadržano",
  RESERVED: "Rezervisano",
  DEPOSIT_PAID: "Kapara",
  CONTRACTED: "Ugovoreno",
  SOLD: "Prodato",
  BLOCKED: "Blokirano",
  NOT_FOR_SALE: "Nije u prodaji",
};

export function PriceListPdf(data: PriceListPdfData) {
  const cols = [
    { key: "code", label: "Šifra", flex: 1.4 },
    { key: "type", label: "Tip", flex: 1.1 },
    { key: "area", label: "Površina", flex: 0.9 },
    { key: "rooms", label: "Sobe", flex: 0.6 },
    { key: "floor", label: "Sprat", flex: 0.6 },
    { key: "status", label: "Status", flex: 1.1 },
    { key: "price", label: "Cena", flex: 1.4 },
  ];

  return (
    <PropertyDeskDocument
      title="Cenovnik projekta"
      subtitle={data.projectName}
      organizationName={data.organizationName}
      documentNumber={data.documentNumber}
      issuedAt={data.issuedAt}
    >
      <View style={[pdfStyles.section, pdfStyles.row]} fixed>
        {cols.map((c) => (
          <Text
            key={c.key}
            style={[pdfStyles.th, { flex: c.flex } as never, c.key === "price" ? { textAlign: "right" as const } : {}]}
          >
            {c.label}
          </Text>
        ))}
      </View>

      {data.units.length === 0 ? (
        <View style={pdfStyles.section}>
          <Text>Nema jedinica u ponudi.</Text>
        </View>
      ) : (
        data.units.map((u, idx) => (
          <View
            key={`${u.code}-${idx}`}
            style={pdfStyles.row}
            wrap={false}
          >
            <Text style={[pdfStyles.td, { flex: 1.4 } as never]}>{u.code}</Text>
            <Text style={[pdfStyles.td, { flex: 1.1 } as never]}>{u.type}</Text>
            <Text style={[pdfStyles.td, { flex: 0.9 } as never]}>{u.area} m²</Text>
            <Text style={[pdfStyles.td, { flex: 0.6 } as never]}>{u.rooms ?? "—"}</Text>
            <Text style={[pdfStyles.td, { flex: 0.6 } as never]}>{u.floor ?? "—"}</Text>
            <Text style={[pdfStyles.td, { flex: 1.1 } as never]}>
              {STATUS_LABELS[u.status] ?? u.status}
            </Text>
            <Text style={[pdfStyles.tdRight, { flex: 1.4 } as never]}>
              {formatMoney(u.price, u.currency)}
            </Text>
          </View>
        ))
      )}
    </PropertyDeskDocument>
  );
}
