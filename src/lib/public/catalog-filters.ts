export const PUBLIC_CATALOG_PAGE_SIZE = 15;

export interface CatalogUnitLike {
  code: string;
  type: string;
  structure: string | null;
  totalArea: string;
  bedrooms: number | null;
  bathrooms: number | null;
  orientation: string | null;
  price: string | null;
}

export interface CatalogFilters {
  q: string;
  type: string;
  bedrooms: string;
  bathrooms: string;
  orientation: string;
  areaMin: string;
  areaMax: string;
  priceMin: string;
  priceMax: string;
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  q: "",
  type: "",
  bedrooms: "",
  bathrooms: "",
  orientation: "",
  areaMin: "",
  areaMax: "",
  priceMin: "",
  priceMax: "",
};

function num(value: string): number | null {
  const raw = String(value).trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function matchesBedrooms(value: number | null, filter: string): boolean {
  if (!filter) return true;
  if (value == null) return false;
  if (filter === "4+") return value >= 4;
  return value === Number(filter);
}

export function filterCatalogUnits<T extends CatalogUnitLike>(
  units: T[],
  filters: CatalogFilters,
): T[] {
  const q = filters.q.trim().toLowerCase();
  const areaMin = num(filters.areaMin);
  const areaMax = num(filters.areaMax);
  const priceMin = num(filters.priceMin);
  const priceMax = num(filters.priceMax);

  return units.filter((unit) => {
    if (q) {
      const hay = `${unit.code} ${unit.structure ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.type && unit.type !== filters.type) return false;
    if (!matchesBedrooms(unit.bedrooms, filters.bedrooms)) return false;
    if (filters.bathrooms) {
      if (unit.bathrooms == null || unit.bathrooms !== Number(filters.bathrooms)) {
        return false;
      }
    }
    if (filters.orientation && unit.orientation !== filters.orientation) {
      return false;
    }
    const area = Number(unit.totalArea);
    if (areaMin != null && !(area >= areaMin)) return false;
    if (areaMax != null && !(area <= areaMax)) return false;
    const price = Number(unit.price ?? "");
    if (priceMin != null && !(Number.isFinite(price) && price >= priceMin)) {
      return false;
    }
    if (priceMax != null && !(Number.isFinite(price) && price <= priceMax)) {
      return false;
    }
    return true;
  });
}

export function paginateCatalog<T>(
  items: T[],
  page: number,
  pageSize = PUBLIC_CATALOG_PAGE_SIZE,
): { items: T[]; page: number; totalPages: number; total: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
  };
}

export function catalogHasFilters(filters: CatalogFilters): boolean {
  return Object.values(filters).some((value) => value.trim().length > 0);
}
