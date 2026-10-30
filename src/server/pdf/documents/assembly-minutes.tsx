import { View, Text } from "@react-pdf/renderer";

import { PropertyDeskDocument, formatDate } from "../layout";
import { pdfStyles } from "../theme";

/**
 * Faza 11 — Assembly minutes ("zapisnik sa skupštine stambene zajednice").
 *
 * Rendered after the voting is closed. Lists every agenda item with the
 * final tally (yes/no/abstain in share weight) and whether the item passed
 * under its majority rule.
 */
export interface AssemblyMinutesPdfData {
  managerName: string;
  buildingName: string;
  buildingAddress: string;
  assemblyCode: string;
  assemblyTitle: string;
  type: string;
  scheduledAt: Date;
  completedAt: Date | null;
  location: string | null;
  quorumNote: string | null;
  totalShares: string;
  items: Array<{
    sortOrder: number;
    title: string;
    description: string | null;
    majority: string;
    result: {
      yes: string;
      no: string;
      abstain: string;
      castTotal: string;
      passed: boolean;
    } | null;
  }>;
  signatureLines: string[];
}

const MAJORITY_LABELS: Record<string, string> = {
  SIMPLE: "Prosta većina (>50% prisutnih)",
  ABSOLUTE: "Apsolutna većina (>50% svih)",
  TWO_THIRDS: "Dvotrećinska (⅔ svih)",
};

export function AssemblyMinutesPdf(data: AssemblyMinutesPdfData) {
  return (
    <PropertyDeskDocument
      title={`Zapisnik · ${data.assemblyCode}`}
      subtitle={data.assemblyTitle}
      organizationName={data.managerName}
      documentNumber={data.assemblyCode}
      issuedAt={data.completedAt ?? new Date()}
    >
      <View style={pdfStyles.section}>
        <View style={pdfStyles.row}>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Zgrada</Text>
            <Text style={pdfStyles.cardValue}>{data.buildingName}</Text>
            <Text>{data.buildingAddress}</Text>
          </View>
          <View style={[pdfStyles.col, pdfStyles.card]}>
            <Text style={pdfStyles.cardTitle}>Skupština</Text>
            <Text style={pdfStyles.cardValue}>{data.assemblyTitle}</Text>
            <Text>Tip: {data.type}</Text>
            <Text>Zakazano za: {formatDate(data.scheduledAt)}</Text>
            {data.location ? <Text>Mesto: {data.location}</Text> : null}
          </View>
        </View>
      </View>

      {data.quorumNote ? (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Kvorum</Text>
          <Text>{data.quorumNote}</Text>
        </View>
      ) : null}

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Dnevni red i rezultati</Text>
        {data.items.map((item) => (
          <View
            key={item.sortOrder}
            style={
              { marginBottom: 8, borderBottom: "1pt solid #e5e7eb", paddingBottom: 6 } as never
            }
            wrap={false}
          >
            <Text style={{ fontWeight: 700 } as never}>
              {item.sortOrder + 1}. {item.title}
            </Text>
            {item.description ? <Text>{item.description}</Text> : null}
            <Text>Većina: {MAJORITY_LABELS[item.majority] ?? item.majority}</Text>
            {item.result ? (
              <>
                <Text>
                  Za: {item.result.yes} · Protiv: {item.result.no} · Uzdržan: {item.result.abstain}{" "}
                  · Ukupno glasalo: {item.result.castTotal} / {data.totalShares}
                </Text>
                <Text
                  style={
                    {
                      marginTop: 2,
                      fontWeight: 700,
                      color: item.result.passed ? "#047857" : "#b91c1c",
                    } as never
                  }
                >
                  {item.result.passed ? "USVOJENO" : "NIJE USVOJENO"}
                </Text>
              </>
            ) : (
              <Text>Glasanje nije završeno.</Text>
            )}
          </View>
        ))}
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Potpisi</Text>
        {data.signatureLines.map((line, i) => (
          <Text key={i} style={{ marginTop: 20 } as never}>
            ______________________________ {line}
          </Text>
        ))}
      </View>
    </PropertyDeskDocument>
  );
}
