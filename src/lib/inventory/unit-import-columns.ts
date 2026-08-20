import { t, type Locale, type TranslationKey } from "@/lib/i18n";

export type UnitImportField =
  | "code"
  | "type"
  | "status"
  | "buildingCode"
  | "entranceCode"
  | "floorLabel"
  | "totalArea"
  | "internalArea"
  | "terraceArea"
  | "gardenArea"
  | "basePrice"
  | "finalPrice"
  | "currency"
  | "vatRate"
  | "bedrooms"
  | "bathrooms"
  | "orientation"
  | "publicDescription"
  | "internalNotes"
  | "externalReference";

export const UNIT_IMPORT_TEMPLATE_COLUMNS: UnitImportField[] = [
  "code",
  "type",
  "status",
  "buildingCode",
  "entranceCode",
  "floorLabel",
  "totalArea",
  "internalArea",
  "terraceArea",
  "gardenArea",
  "basePrice",
  "finalPrice",
  "currency",
  "vatRate",
  "bedrooms",
  "bathrooms",
  "orientation",
  "publicDescription",
  "internalNotes",
  "externalReference",
];

export const REQUIRED_IMPORT_FIELDS: UnitImportField[] = [
  "code",
  "type",
  "totalArea",
  "basePrice",
];

export function unitImportHeaderKey(
  field: UnitImportField,
): TranslationKey {
  return `inventory.import.headers.${field}` as TranslationKey;
}

export function unitImportHeader(field: UnitImportField, locale: Locale): string {
  return t(unitImportHeaderKey(field), undefined, locale);
}

export function normalizeImportHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

const EXTRA_ALIASES: Record<string, UnitImportField> = {
  sifra: "code",
  unitcode: "code",
  tip: "type",
  unittype: "type",
  objekat: "buildingCode",
  building: "buildingCode",
  ulaz: "entranceCode",
  entrance: "entranceCode",
  sprat: "floorLabel",
  floor: "floorLabel",
  ukupna: "totalArea",
  povrsina: "totalArea",
  area: "totalArea",
  neto: "internalArea",
  netarea: "internalArea",
  terasa: "terraceArea",
  terrace: "terraceArea",
  basta: "gardenArea",
  garden: "gardenArea",
  cena: "basePrice",
  price: "basePrice",
  valuta: "currency",
  pdv: "vatRate",
  vat: "vatRate",
  spavace: "bedrooms",
  rooms: "bedrooms",
  kupatila: "bathrooms",
  orijentacija: "orientation",
  opis: "publicDescription",
  description: "publicDescription",
  napomena: "internalNotes",
  notes: "internalNotes",
  referenca: "externalReference",
  reference: "externalReference",
};

function buildAliases(): Record<string, UnitImportField> {
  const out: Record<string, UnitImportField> = { ...EXTRA_ALIASES };
  for (const field of UNIT_IMPORT_TEMPLATE_COLUMNS) {
    out[normalizeImportHeader(field)] = field;
    out[normalizeImportHeader(unitImportHeader(field, "sr-Latn"))] = field;
    out[normalizeImportHeader(unitImportHeader(field, "en"))] = field;
  }
  return out;
}

const ALIASES = buildAliases();

export function guessImportField(header: string): UnitImportField | null {
  return ALIASES[normalizeImportHeader(header)] ?? null;
}
