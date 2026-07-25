import { StyleSheet } from "@react-pdf/renderer";

/**
 * Shared PDF theme. All PropertyDesk PDF documents (offer, price list,
 * sale summary, commission statement) inherit their typography, colours,
 * and spacing tokens from here so they look coherent side by side.
 */

export const pdfColors = {
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  brand: "#0f766e",
  brandLight: "#ecfdf5",
  headerBg: "#f8fafc",
};

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 48,
    fontSize: 10,
    color: pdfColors.text,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.brand,
    paddingBottom: 10,
  },
  brandName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.brand,
  },
  documentTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
    marginBottom: 6,
  },
  documentSubtitle: {
    fontSize: 11,
    color: pdfColors.muted,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    fontSize: 9,
    color: pdfColors.muted,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: pdfColors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: pdfColors.headerBg,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 10,
    color: pdfColors.muted,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
  },
  col: {
    flex: 1,
    paddingRight: 12,
  },
  th: {
    fontSize: 9,
    color: pdfColors.muted,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },
  td: {
    fontSize: 10,
    padding: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
  },
  tdRight: {
    fontSize: 10,
    padding: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: pdfColors.brand,
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    color: pdfColors.brand,
  },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 24,
    fontSize: 8,
    color: pdfColors.muted,
    borderTopWidth: 0.5,
    borderTopColor: pdfColors.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
