import { normalizeGeoQuery } from "./normalize";

export type SerbiaPlace = {
  name: string;
  city: string;
  kind: "city" | "municipality";
  postalCode: string | null;
  lat: number;
  lng: number;
};

type CityRow = [
  name: string,
  lat: number,
  lng: number,
  postal: string,
  municipalities?: Array<[name: string, postal: string, lat?: number, lng?: number]>,
];

const CITY_ROWS: CityRow[] = [
  [
    "Beograd",
    44.7866,
    20.4489,
    "11000",
    [
      ["Stari grad", "11000", 44.8196, 20.4606],
      ["Savski venac", "11000", 44.798, 20.45],
      ["Vračar", "11000", 44.802, 20.477],
      ["Novi Beograd", "11070", 44.814, 20.41],
      ["Zemun", "11080", 44.843, 20.401],
      ["Palilula", "11060", 44.83, 20.5],
      ["Zvezdara", "11050", 44.79, 20.51],
      ["Voždovac", "11040", 44.76, 20.48],
      ["Rakovica", "11090", 44.75, 20.43],
      ["Čukarica", "11030", 44.78, 20.41],
      ["Surčin", "11271", 44.79, 20.27],
      ["Obrenovac", "11500", 44.655, 20.2],
      ["Barajevo", "11460", 44.58, 20.42],
      ["Sopot", "11450", 44.52, 20.57],
      ["Grocka", "11306", 44.67, 20.72],
      ["Lazarevac", "11550", 44.38, 20.26],
      ["Mladenovac", "11400", 44.44, 20.7],
    ],
  ],
  ["Novi Sad", 45.2671, 19.8335, "21000", [["Novi Sad", "21000"], ["Petrovaradin", "21131"], ["Beočin", "21300"], ["Sremski Karlovci", "21205"]]],
  ["Niš", 43.3209, 21.8958, "18000", [["Medijana", "18000"], ["Palilula", "18000"], ["Pantelej", "18000"], ["Crveni Krst", "18000"], ["Niška Banja", "18205"]]],
  ["Kragujevac", 44.0128, 20.9114, "34000"],
  ["Subotica", 46.1003, 19.6651, "24000"],
  ["Zrenjanin", 45.3816, 20.3868, "23000"],
  ["Pančevo", 44.8708, 20.6403, "26000"],
  ["Čačak", 43.8914, 20.3497, "32000"],
  ["Kraljevo", 43.7258, 20.6896, "36000"],
  ["Novi Pazar", 43.1367, 20.5122, "36300"],
  ["Smederevo", 44.665, 20.926, "11300"],
  ["Leskovac", 42.9981, 21.9461, "16000"],
  ["Užice", 43.8559, 19.843, "31000"],
  ["Vranje", 42.5514, 21.9006, "17500"],
  ["Valjevo", 44.2751, 19.8982, "14000"],
  ["Šabac", 44.7463, 19.691, "15000"],
  ["Sombor", 45.7742, 19.1151, "25000"],
  ["Požarevac", 44.6213, 21.1878, "12000"],
  ["Pirot", 43.1531, 22.5853, "18300"],
  ["Zaječar", 43.9036, 22.275, "19000"],
  ["Kruševac", 43.5803, 21.3336, "37000"],
  ["Jagodina", 43.977, 21.258, "35000"],
  ["Kikinda", 45.8286, 20.4653, "23300"],
  ["Sremska Mitrovica", 44.9764, 19.6122, "22000"],
  ["Vršac", 45.123, 21.298, "26300"],
  ["Loznica", 44.5332, 19.2236, "15300"],
  ["Smederevska Palanka", 44.3655, 20.9587, "11420"],
  ["Inđija", 45.0482, 20.0818, "22320"],
  ["Stara Pazova", 44.985, 20.159, "22300"],
  ["Vrbas", 45.571, 19.641, "21460"],
  ["Bačka Palanka", 45.249, 19.389, "21400"],
  ["Ruma", 45.008, 19.822, "22400"],
  ["Gornji Milanovac", 44.026, 20.46, "32300"],
  ["Aranđelovac", 44.307, 20.56, "34300"],
  ["Požega", 43.845, 20.036, "31210"],
  ["Prijepolje", 43.389, 19.649, "31300"],
  ["Priboj", 43.583, 19.525, "31330"],
  ["Nova Varoš", 43.46, 19.82, "31320"],
  ["Ivanjica", 43.582, 20.23, "32250"],
  ["Lučani", 43.86, 20.14, "32240"],
  ["Paraćin", 43.86, 21.41, "35250"],
  ["Ćuprija", 43.928, 21.37, "35230"],
  ["Despotovac", 44.09, 21.44, "35213"],
  ["Svilajnac", 44.23, 21.2, "35210"],
  ["Velika Plana", 44.334, 21.077, "11320"],
  ["Petrovac na Mlavi", 44.378, 21.419, "12300"],
  ["Veliko Gradište", 44.76, 21.516, "12220"],
  ["Golubac", 44.653, 21.632, "12223"],
  ["Majdanpek", 44.422, 21.936, "19250"],
  ["Negotin", 44.226, 22.531, "19300"],
  ["Kladovo", 44.607, 22.607, "19320"],
  ["Bor", 44.075, 22.096, "19210"],
  ["Knjaževac", 43.566, 22.257, "19350"],
  ["Sokobanja", 43.643, 21.87, "18230"],
  ["Aleksinac", 43.541, 21.705, "18220"],
  ["Prokuplje", 43.234, 21.589, "18400"],
  ["Kuršumlija", 43.139, 21.274, "18430"],
  ["Lebane", 42.917, 21.746, "16230"],
  ["Vlasotince", 42.966, 22.128, "16210"],
  ["Surdulica", 42.69, 22.167, "17530"],
  ["Bosilegrad", 42.501, 22.314, "17540"],
  ["Bujanovac", 42.461, 21.767, "17520"],
  ["Preševo", 42.307, 21.65, "17523"],
  ["Trstenik", 43.617, 21.002, "37240"],
  ["Vrnjačka Banja", 43.623, 20.896, "36210"],
  ["Aleksandrovac", 43.455, 21.051, "37230"],
  ["Brus", 43.384, 21.034, "37220"],
  ["Raška", 43.287, 20.613, "36350"],
  ["Tutin", 42.99, 20.333, "36320"],
  ["Sjenica", 43.267, 20.0, "36310"],
  ["Prijepolje", 43.389, 19.649, "31300"],
  ["Čajetina", 43.75, 19.72, "31310"],
  ["Bajina Bašta", 43.971, 19.567, "31250"],
  ["Kosjerić", 44.0, 19.91, "31260"],
  ["Mionica", 44.252, 20.086, "14242"],
  ["Ljig", 44.226, 20.239, "14240"],
  ["Lajkovac", 44.367, 20.164, "14224"],
  ["Ub", 44.456, 20.073, "14210"],
  ["Vladimirci", 44.615, 19.785, "15225"],
  ["Koceljeva", 44.47, 19.82, "15220"],
  ["Bogatić", 44.837, 19.481, "15350"],
  ["Mali Zvornik", 44.399, 19.106, "15318"],
  ["Ljubovija", 44.19, 19.376, "15320"],
  ["Krupanj", 44.367, 19.362, "15314"],
  ["Osečina", 44.373, 19.604, "14253"],
  ["Šid", 45.128, 19.226, "22240"],
  ["Bačka Topola", 45.815, 19.635, "24300"],
  ["Senta", 45.931, 20.09, "24400"],
  ["Kanjiža", 46.067, 20.05, "24420"],
  ["Ada", 45.8, 20.13, "24430"],
  ["Bečej", 45.619, 20.035, "21220"],
  ["Temerin", 45.409, 19.889, "21235"],
  ["Žabalj", 45.374, 20.057, "21230"],
  ["Titel", 45.206, 20.3, "21240"],
  ["Srbobran", 45.552, 19.802, "21480"],
  ["Kula", 45.61, 19.527, "25230"],
  ["Odžaci", 45.507, 19.26, "25250"],
  ["Apatin", 45.671, 18.985, "25260"],
  ["Kovin", 44.748, 20.977, "26220"],
  ["Bela Crkva", 44.898, 21.417, "26340"],
  ["Alibunar", 45.081, 20.966, "26310"],
  ["Plandište", 45.227, 21.122, "26360"],
  ["Opovo", 45.052, 20.43, "26204"],
  ["Kovačica", 45.112, 20.621, "26210"],
  ["Sečanj", 45.367, 20.772, "23240"],
  ["Novi Bečej", 45.6, 20.132, "23220"],
  ["Nova Crnja", 45.667, 20.6, "23218"],
  ["Žitište", 45.485, 20.55, "23210"],
  ["Čoka", 45.942, 20.143, "23320"],
  ["Novi Kneževac", 46.05, 20.1, "23330"],
  ["Mali Iđoš", 45.707, 19.665, "24321"],
  ["Čantavir", 45.919, 19.766, "24220"],
  ["Pećinci", 44.909, 19.966, "22410"],
  ["Irig", 45.101, 19.858, "22406"],
  ["Beška", 45.131, 20.067, "22324"],
  ["Surčin", 44.79, 20.27, "11271"],
];

const places: SerbiaPlace[] = [];
const seen = new Set<string>();

function add(place: SerbiaPlace) {
  const key = `${place.kind}:${normalizeGeoQuery(place.name)}:${normalizeGeoQuery(place.city)}`;
  if (seen.has(key)) return;
  seen.add(key);
  places.push(place);
}

for (const [name, lat, lng, postal, municipalities] of CITY_ROWS) {
  add({
    name,
    city: name,
    kind: "city",
    postalCode: postal,
    lat,
    lng,
  });
  for (const [munName, munPostal, munLat, munLng] of municipalities ?? []) {
    add({
      name: munName,
      city: name,
      kind: "municipality",
      postalCode: munPostal,
      lat: munLat ?? lat,
      lng: munLng ?? lng,
    });
    if (name === "Beograd") {
      add({
        name: munName,
        city: munName,
        kind: "city",
        postalCode: munPostal,
        lat: munLat ?? lat,
        lng: munLng ?? lng,
      });
    }
  }
}

export const SERBIA_PLACES: readonly SerbiaPlace[] = places;

export function suggestSerbiaPlaces(
  kind: "city" | "municipality",
  query: string,
  city?: string,
  limit = 8,
): SerbiaPlace[] {
  const q = normalizeGeoQuery(query);
  const cityNorm = city ? normalizeGeoQuery(city) : "";
  const pool = SERBIA_PLACES.filter((place) => {
    if (place.kind !== kind) return false;
    if (kind === "municipality" && cityNorm) {
      return (
        normalizeGeoQuery(place.city) === cityNorm ||
        normalizeGeoQuery(place.name) === cityNorm
      );
    }
    return true;
  });
  if (!q) {
    return pool.slice(0, limit);
  }
  const scored = pool
    .map((place) => {
      const name = normalizeGeoQuery(place.name);
      let score = 0;
      if (name === q) score = 3;
      else if (name.startsWith(q)) score = 2;
      else if (name.includes(q)) score = 1;
      return { place, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name, "sr"));
  return scored.slice(0, limit).map((row) => row.place);
}

export function findSerbiaCity(name: string): SerbiaPlace | null {
  const q = normalizeGeoQuery(name);
  if (!q) return null;
  return (
    SERBIA_PLACES.find(
      (place) => place.kind === "city" && normalizeGeoQuery(place.name) === q,
    ) ?? null
  );
}

export function postalCodeForMunicipality(
  municipality: string,
  city?: string,
): string | null {
  const q = normalizeGeoQuery(municipality);
  if (!q) return null;
  const cityNorm = city ? normalizeGeoQuery(city) : "";
  const match =
    SERBIA_PLACES.find(
      (place) =>
        place.kind === "municipality" &&
        normalizeGeoQuery(place.name) === q &&
        (!cityNorm || normalizeGeoQuery(place.city) === cityNorm),
    ) ??
    SERBIA_PLACES.find(
      (place) => place.kind === "city" && normalizeGeoQuery(place.name) === q,
    );
  return match?.postalCode ?? null;
}
