// No imports and no runtime-only syntax: `scripts/build-stats-index.ts` runs
// this file straight in Node.

/** The six base stats, in the order they are stored in the index. */
export const INDEXED_STATS = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
] as const;

export type IndexedStat = (typeof INDEXED_STATS)[number];

/** Legendary, mythical and baby Pokémon; a Pokémon is at most one of them. */
export const SPECIAL_KINDS = ["legendary", "mythical", "baby"] as const;

export type SpecialKind = (typeof SPECIAL_KINDS)[number];

/** What the list can sort and filter on, for one Pokémon. */
export type IndexedPokemon = Record<IndexedStat, number> & {
  total: number;
  special: SpecialKind | null;
};

/**
 * One row of the stored index: the six base stats, then the special kind as
 * a number (0 none, 1 legendary, 2 mythical, 3 baby).
 */
export type IndexRow = [number, number, number, number, number, number, number];

/** The stored file. Only default forms; Pokémon newer than `generatedAt` are missing. */
export type StatsIndexFile = {
  generatedAt: string;
  pokemon: Record<string, IndexRow>;
};

export function encodeRow(
  stats: Record<IndexedStat, number>,
  special: SpecialKind | null,
): IndexRow {
  const [hp, attack, defense, spAtk, spDef, speed] = INDEXED_STATS.map(
    (name) => stats[name],
  );
  const kind = special === null ? 0 : SPECIAL_KINDS.indexOf(special) + 1;
  return [hp, attack, defense, spAtk, spDef, speed, kind];
}

export function decodeRow(row: IndexRow): IndexedPokemon {
  const [hp, attack, defense, spAtk, spDef, speed, kind] = row;
  return {
    hp,
    attack,
    defense,
    "special-attack": spAtk,
    "special-defense": spDef,
    speed,
    total: hp + attack + defense + spAtk + spDef + speed,
    special: kind === 0 ? null : (SPECIAL_KINDS[kind - 1] ?? null),
  };
}

/** The index by species id. */
export function decodeIndex(file: StatsIndexFile): Map<number, IndexedPokemon> {
  return new Map(
    Object.entries(file.pokemon).map(([id, row]) => [
      Number(id),
      decodeRow(row),
    ]),
  );
}
