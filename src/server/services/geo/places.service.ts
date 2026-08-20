import "server-only";

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
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
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

function photonAddressLabel(props: NonNullable<PhotonFeature["properties"]>): string {
  const street = [props.housenumber, props.street].filter(Boolean).join(" ").trim();
  return street || props.name?.trim() || "";
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

export async function suggestAddresses(
  query: string,
  city: string,
): Promise<GeoSuggestion[]> {
  const q = query.trim();
  const cityName = city.trim();
  if (q.length < 2 || !cityName) return [];

  const cityPlace = findSerbiaCity(cityName);
  const params = new URLSearchParams({
    q: `${q}, ${cityName}, Srbija`,
    limit: "8",
    lang: "default",
  });
  if (cityPlace) {
    params.set("lat", String(cityPlace.lat));
    params.set("lon", String(cityPlace.lng));
  }

  const features = await fetchPhoton(params);
  const cityNorm = cityName.toLowerCase();
  return features
    .map((feature) => toAddressSuggestion(feature, cityName))
    .filter((row): row is GeoSuggestion => {
      if (!row?.address) return false;
      const featureCity = (row.city || "").toLowerCase();
      return (
        featureCity.includes(cityNorm) ||
        cityNorm.includes(featureCity) ||
        featureCity.length === 0
      );
    })
    .slice(0, 8);
}

export async function geocodeAddress(
  address: string,
  city: string,
): Promise<GeoSuggestion | null> {
  const q = address.trim();
  const cityName = city.trim();
  if (!q || !cityName) return null;
  const cityPlace = findSerbiaCity(cityName);
  const params = new URLSearchParams({
    q: `${q}, ${cityName}, Srbija`,
    limit: "1",
    lang: "default",
  });
  if (cityPlace) {
    params.set("lat", String(cityPlace.lat));
    params.set("lon", String(cityPlace.lng));
  }
  const features = await fetchPhoton(params);
  return features[0] ? toAddressSuggestion(features[0], cityName) : null;
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
): GeoSuggestion | null {
  const props = feature.properties ?? {};
  if (!isSerbia(props)) return null;
  const label = photonAddressLabel(props);
  if (!label) return null;
  const [lng, lat] = feature.geometry?.coordinates ?? [];
  return {
    label,
    city: props.city?.trim() || fallbackCity,
    municipality: props.district?.trim() || props.county?.trim() || null,
    address: label,
    postalCode: props.postcode?.trim() || null,
    latitude: typeof lat === "number" ? lat : null,
    longitude: typeof lng === "number" ? lng : null,
  };
}
