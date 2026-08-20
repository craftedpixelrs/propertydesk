import "server-only";

import {
  cityBbox,
  cityNameMatches,
  formatStreetAddress,
  preferTypedStreetLabel,
  splitStreetAndNumber,
} from "@/lib/geo/address-query";
import {
  findSerbiaCity,
  postalCodeForMunicipality,
  suggestSerbiaPlaces,
  type SerbiaPlace,
} from "@/lib/geo/serbia";

export type GeoSuggestion = {
  label: string;
  city: string;
  municipality: string | null;
  address: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type GeoSuggestKind = "city" | "municipality" | "address";

const PHOTON_URL = "https://photon.komoot.io/api/";
const USER_AGENT = "PropertyDesk/1.0 (geo@propertydesk.app)";

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number | string;
    osm_id?: number | string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    locality?: string;
    county?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
  };
};

function placeToSuggestion(place: SerbiaPlace): GeoSuggestion {
  return {
    label: place.name,
    city: place.city,
    municipality: place.kind === "municipality" ? place.name : null,
    address: null,
    postalCode: place.postalCode,
    latitude: place.lat,
    longitude: place.lng,
  };
}

function photonStreetName(props: NonNullable<PhotonFeature["properties"]>): string {
  return (props.street ?? props.name ?? "").trim();
}

function isSerbia(props: NonNullable<PhotonFeature["properties"]>): boolean {
  const code = (props.countrycode ?? "").toLowerCase();
  const country = (props.country ?? "").toLowerCase();
  return code === "rs" || country.includes("serbia") || country.includes("srbija");
}

export function suggestLocalPlaces(
  kind: Exclude<GeoSuggestKind, "address">,
  query: string,
  city?: string,
): GeoSuggestion[] {
  return suggestSerbiaPlaces(kind, query, city).map(placeToSuggestion);
}

async function fetchStreetFeatures(
  street: string,
  cityName: string,
): Promise<PhotonFeature[]> {
  const cityPlace = findSerbiaCity(cityName);
  const seen = new Set<string>();
  const out: PhotonFeature[] = [];

  const variants: URLSearchParams[] = [
    new URLSearchParams({
      q: street,
      limit: "8",
      lang: "en",
      layer: "street",
    }),
    new URLSearchParams({
      q: `${street}, ${cityName}`,
      limit: "8",
      lang: "en",
      layer: "street",
    }),
  ];

  for (const params of variants) {
    if (cityPlace) {
      params.set("lat", String(cityPlace.lat));
      params.set("lon", String(cityPlace.lng));
      params.set("bbox", cityBbox(cityPlace.lat, cityPlace.lng));
    }
    for (const feature of await fetchPhoton(params)) {
      const props = feature.properties ?? {};
      const key = `${props.osm_id ?? ""}:${photonStreetName(props)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(feature);
    }
    if (out.length >= 8) break;
  }

  return out;
}

export async function suggestAddresses(
  query: string,
  city: string,
): Promise<GeoSuggestion[]> {
  const q = query.trim();
  const cityName = city.trim();
  if (q.length < 2 || !cityName) return [];

  const { street, house } = splitStreetAndNumber(q);
  const search = street.length >= 2 ? street : q;
  const features = await fetchStreetFeatures(search, cityName);

  return features
    .map((feature) => toAddressSuggestion(feature, cityName, search, house))
    .filter((row): row is GeoSuggestion => Boolean(row?.address))
    .slice(0, 8);
}

export async function geocodeAddress(
  address: string,
  city: string,
): Promise<GeoSuggestion | null> {
  const items = await suggestAddresses(address, city);
  return items[0] ?? null;
}

export function lookupPostalCode(municipality: string, city?: string): string | null {
  return postalCodeForMunicipality(municipality, city);
}

async function fetchPhoton(params: URLSearchParams): Promise<PhotonFeature[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${PHOTON_URL}?${params.toString()}`, {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { features?: PhotonFeature[] };
    return Array.isArray(body.features) ? body.features : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function toAddressSuggestion(
  feature: PhotonFeature,
  fallbackCity: string,
  typedStreet?: string,
  house?: string | null,
): GeoSuggestion | null {
  const props = feature.properties ?? {};
  if (!isSerbia(props)) return null;
  if (
    !cityNameMatches(fallbackCity, [
      props.city,
      props.district,
      props.locality,
    ])
  ) {
    return null;
  }
  const osmStreet = photonStreetName(props);
  const street = preferTypedStreetLabel(osmStreet, typedStreet ?? osmStreet);
  const label = formatStreetAddress(street, house ?? props.housenumber ?? null);
  if (!label) return null;
  const [lng, lat] = feature.geometry?.coordinates ?? [];
  return {
    label,
    city: fallbackCity,
    municipality:
      props.district?.trim() ||
      props.locality?.trim() ||
      props.county?.trim() ||
      null,
    address: label,
    postalCode: props.postcode?.trim() || null,
    latitude: typeof lat === "number" ? lat : null,
    longitude: typeof lng === "number" ? lng : null,
  };
}
