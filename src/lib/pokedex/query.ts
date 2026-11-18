import type { LocalizedText } from "@/lib/i18n/languages";
import type { PokemonIndexEntry } from "@/lib/pokeapi/index-list";

import type { IndexedPokemon, SpecialKind } from "./stats-index";

/** What can be sorted on besides number and name; "total" is the sum of the stats. */
export const STAT_SORTS = [
  "total",
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
] as const;

export type StatSort = (typeof STAT_SORTS)[number];

type BasicSort = "id-asc" | "id-desc" | "name-asc" | "name-desc";
export type SortOption = BasicSort | `${StatSort}-${"asc" | "desc"}`;

export const SORT_OPTIONS: readonly SortOption[] = [
  "id-asc",
  "id-desc",
  "name-asc",
  "name-desc",
  // Highest first: that is what you sort on a stat for.
  ...STAT_SORTS.flatMap((stat): SortOption[] => [
    `${stat}-desc`,
    `${stat}-asc`,
  ]),
];

/** "special-attack-desc" -> { stat: "special-attack", direction: "desc" }; null for the others. */
export function statSortOf(
  sort: SortOption,
): { stat: StatSort; direction: "asc" | "desc" } | null {
  const direction = sort.endsWith("-desc") ? "desc" : "asc";
  const stat = STAT_SORTS.find((name) => `${name}-${direction}` === sort);
  return stat ? { stat, direction } : null;
}

export const DEFAULT_SORT: SortOption = "id-asc";

export type PokedexQuery = {
  /** Free text: a name fragment, or a number (optionally prefixed with "#"). */
  search: string;
  /** Ids belonging to the selected type; null means no type filter. */
  typeIds: ReadonlySet<number> | null;
  /** Ids introduced in the selected region's generation; null means no region filter. */
  regionIds: ReadonlySet<number> | null;
  /** Ids of species with a favorite form; null means no favorites filter. */
  favoriteIds: ReadonlySet<number> | null;
  sort: SortOption;
  /** Only legendary, mythical or baby Pokémon (needs `stats`); null shows all. */
  special?: SpecialKind | null;
  /**
   * Stats and special kind by species id. A Pokémon missing from it (newer
   * than the index) is listed last when sorting on a stat and left out when
   * filtering on its kind.
   */
  stats?: ReadonlyMap<number, IndexedPokemon>;
  /**
   * Names in other languages by species id, for the Pokémon that have them
   * loaded; the search matches those too.
   */
  names?: Readonly<Record<number, LocalizedText>>;
};

export function matchesSearch(
  entry: PokemonIndexEntry,
  search: string,
  names?: LocalizedText,
) {
  const trimmed = search.trim().toLowerCase();
  const exact = trimmed.startsWith("#");
  const term = exact ? trimmed.slice(1) : trimmed;
  if (term === "") return true;
  if (/^\d+$/.test(term)) {
    // "#25" is exactly Pikachu; "25" also matches 250-259 while typing.
    const number = String(Number(term));
    return exact
      ? String(entry.id) === number
      : String(entry.id).startsWith(number);
  }
  return (
    entry.name.includes(term) ||
    Object.values(names ?? {}).some((name) => name.toLowerCase().includes(term))
  );
}

function compareStat(
  stats: ReadonlyMap<number, IndexedPokemon> | undefined,
  stat: StatSort,
  direction: "asc" | "desc",
) {
  return (a: PokemonIndexEntry, b: PokemonIndexEntry) => {
    const left = stats?.get(a.id)?.[stat];
    const right = stats?.get(b.id)?.[stat];
    if (left === undefined || right === undefined) {
      if (left === right) return a.id - b.id;
      return left === undefined ? 1 : -1;
    }
    const difference = direction === "desc" ? right - left : left - right;
    return difference || a.id - b.id;
  };
}

function compare(
  sort: SortOption,
  stats: ReadonlyMap<number, IndexedPokemon> | undefined,
) {
  const byStat = statSortOf(sort);
  if (byStat) return compareStat(stats, byStat.stat, byStat.direction);
  switch (sort) {
    case "id-asc":
      return (a: PokemonIndexEntry, b: PokemonIndexEntry) => a.id - b.id;
    case "id-desc":
      return (a: PokemonIndexEntry, b: PokemonIndexEntry) => b.id - a.id;
    case "name-asc":
      return (a: PokemonIndexEntry, b: PokemonIndexEntry) =>
        a.name.localeCompare(b.name, "en");
    default:
      return (a: PokemonIndexEntry, b: PokemonIndexEntry) =>
        b.name.localeCompare(a.name, "en");
  }
}

export function queryPokedex(
  entries: readonly PokemonIndexEntry[],
  {
    search,
    typeIds,
    regionIds,
    favoriteIds,
    sort,
    special = null,
    stats,
    names,
  }: PokedexQuery,
): PokemonIndexEntry[] {
  return entries
    .filter((entry) => typeIds === null || typeIds.has(entry.id))
    .filter((entry) => regionIds === null || regionIds.has(entry.id))
    .filter((entry) => favoriteIds === null || favoriteIds.has(entry.id))
    .filter(
      (entry) => special === null || stats?.get(entry.id)?.special === special,
    )
    .filter((entry) => matchesSearch(entry, search, names?.[entry.id]))
    .sort(compare(sort, stats));
}

/** Infinite scroll paging: 20 on first load, then 30 per scroll. */
export const INITIAL_PAGE_SIZE = 20;
export const NEXT_PAGE_SIZE = 30;

export function visibleCount(pagesLoaded: number): number {
  return INITIAL_PAGE_SIZE + Math.max(0, pagesLoaded - 1) * NEXT_PAGE_SIZE;
}
