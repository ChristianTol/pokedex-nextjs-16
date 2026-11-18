import { DEFAULT_SORT, SORT_OPTIONS, type SortOption } from "./query";
import { SPECIAL_KINDS, type SpecialKind } from "./stats-index";

export type Filters = {
  search: string;
  /** Type slug, e.g. "fire"; null means all types. */
  type: string | null;
  /** Region slug, e.g. "kanto"; null means all regions. */
  region: string | null;
  /** Only show Pokémon with a favorite form. */
  favorites: boolean;
  /** Only legendary, mythical or baby Pokémon; null shows all. */
  special: SpecialKind | null;
  sort: SortOption;
};

export const EMPTY_FILTERS: Filters = {
  search: "",
  type: null,
  region: null,
  favorites: false,
  special: null,
  sort: DEFAULT_SORT,
};

type ParamReader = { get(name: string): string | null };

/** Reads filters from the url; unknown types, regions and sorts are ignored. */
export function parseFilters(
  params: ParamReader,
  validTypes: readonly string[],
  validRegions: readonly string[],
): Filters {
  const type = params.get("type");
  const region = params.get("region");
  const sort = params.get("sort");
  const special = params.get("special");
  return {
    search: params.get("q") ?? "",
    type: type !== null && validTypes.includes(type) ? type : null,
    region: region !== null && validRegions.includes(region) ? region : null,
    favorites: params.get("fav") === "1",
    special: SPECIAL_KINDS.find((kind) => kind === special) ?? null,
    sort: SORT_OPTIONS.find((option) => option === sort) ?? DEFAULT_SORT,
  };
}

/** Builds the query string ("" or "?q=…"); defaults are left out. */
export function serializeFilters(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.search.trim() !== "") params.set("q", filters.search);
  if (filters.type) params.set("type", filters.type);
  if (filters.region) params.set("region", filters.region);
  if (filters.favorites) params.set("fav", "1");
  if (filters.special) params.set("special", filters.special);
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

export function hasActiveFilters(filters: Filters): boolean {
  return serializeFilters(filters) !== "";
}

/** Adds or removes the `pokemon` param (the open detail window) on a query string. */
export function withPokemon(query: string, id: number | null): string {
  const params = new URLSearchParams(query);
  if (id === null) params.delete("pokemon");
  else params.set("pokemon", String(id));
  const next = params.toString();
  return next === "" ? "" : `?${next}`;
}

/** The pokemon id in the query string, if it is a valid positive integer. */
export function parsePokemonParam(query: string): number | null {
  const raw = new URLSearchParams(query).get("pokemon");
  if (raw === null || !/^\d{1,5}$/.test(raw)) return null;
  const id = Number(raw);
  return id >= 1 ? id : null;
}
