import { normalizeGeoQuery } from "./normalize";

const HOUSE_TRAILING = /^(.*?)[\s,]+(\d+[a-zA-Zа-яА-Я]?)$/u;
const HOUSE_LEADING = /^(\d+[a-zA-Zа-яА-Я]?)[\s,]+(.+)$/u;

export function splitStreetAndNumber(query: string): {
  street: string;
  house: string | null;
} {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (!trimmed) return { street: "", house: null };

  const trailing = trimmed.match(HOUSE_TRAILING);
  if (trailing?.[1] && trailing[2] && trailing[1].replace(/\d/g, "").trim().length >= 2) {
    return { street: trailing[1].trim(), house: trailing[2] };
  }

  const leading = trimmed.match(HOUSE_LEADING);
  if (leading?.[1] && leading[2] && leading[2].replace(/\d/g, "").trim().length >= 2) {
    return { street: leading[2].trim(), house: leading[1] };
  }

  return { street: trimmed, house: null };
}

export function cityNameMatches(
  selectedCity: string,
  candidates: Array<string | null | undefined>,
): boolean {
  const target = normalizeGeoQuery(selectedCity);
  if (!target) return true;
  return candidates.some((value) => {
    const hay = normalizeGeoQuery(value ?? "");
    if (!hay) return false;
    return hay.includes(target) || (hay.length >= 3 && target.includes(hay));
  });
}

export function preferTypedStreetLabel(osmName: string, typedStreet: string): string {
  const typed = typedStreet.trim();
  if (!typed) return osmName;
  const osmHasCyrillic = /\p{Script=Cyrillic}/u.test(osmName);
  const typedHasLatin = /[a-zčćšđž]/i.test(typed);
  const typedLooksComplete = typed.length >= 8 || /\s/.test(typed);
  if (osmHasCyrillic && typedHasLatin && typedLooksComplete) {
    return typed;
  }
  return osmName || typed;
}

export function formatStreetAddress(street: string, house: string | null): string {
  if (!street) return house ?? "";
  return house ? `${street} ${house}` : street;
}

/** ~12 km box around a city centroid, Photon `minLon,minLat,maxLon,maxLat`. */
export function cityBbox(lat: number, lng: number): string {
  return `${(lng - 0.15).toFixed(4)},${(lat - 0.1).toFixed(4)},${(lng + 0.15).toFixed(4)},${(lat + 0.1).toFixed(4)}`;
}
