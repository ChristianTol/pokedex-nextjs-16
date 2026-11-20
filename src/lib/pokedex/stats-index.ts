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

/**
 * Which forms a species has: none, other forms only (regional, Gigantamax,
 * …), a Mega Evolution or Primal Reversion next to other forms, or only a
 * Mega Evolution or Primal Reversion.
 */
export const FORMS_LEVELS = ["none", "forms", "mega", "mega-only"] as const;

export type FormsLevel = (typeof FORMS_LEVELS)[number];

/** What the list can sort and filter on, for one Pokémon. */
export type IndexedPokemon = Record<IndexedStat, number> & {
  total: number;
  special: SpecialKind | null;
  forms: FormsLevel;
  /** Has a Gigantamax form. */
  gigantamax: boolean;
};

/**
 * The choices of the forms filter, in the order of the dropdown:
 * - "mega": every species with a Mega or Primal form, whatever else it has;
 * - "with-mega": those that have other forms next to it;
 * - "without-mega": species whose forms are not Mega or Primal;
 * - "gigantamax": species with a Gigantamax form.
 */
export const FORMS_FILTERS = [
  "mega",
  "gigantamax",
  "with-mega",
  "without-mega",
] as const;

export type FormsFilter = (typeof FORMS_FILTERS)[number];

/** Whether a Pokémon passes the filter; one missing from the index never does. */
export function matchesForms(
  pokemon: IndexedPokemon | undefined,
  filter: FormsFilter,
): boolean {
  switch (filter) {
    case "mega":
      return pokemon?.forms === "mega" || pokemon?.forms === "mega-only";
    case "with-mega":
      return pokemon?.forms === "mega";
    case "without-mega":
      return pokemon?.forms === "forms";
    case "gigantamax":
      return pokemon?.gigantamax === true;
  }
}

/**
 * One row of the stored index: the six base stats, then the special kind as
 * a number (0 none, 1 legendary, 2 mythical, 3 baby), then the forms level
 * as a number (0 none, 1 other forms, 2 mega or primal next to other forms,
 * 3 only mega or primal), then 1 if it has a Gigantamax form, else 0.
 */
export type IndexRow = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** The stored file. Only default forms; Pokémon newer than `generatedAt` are missing. */
export type StatsIndexFile = {
  generatedAt: string;
  pokemon: Record<string, IndexRow>;
};

export function encodeRow(
  stats: Record<IndexedStat, number>,
  special: SpecialKind | null,
  forms: FormsLevel,
  gigantamax: boolean,
): IndexRow {
  const [hp, attack, defense, spAtk, spDef, speed] = INDEXED_STATS.map(
    (name) => stats[name],
  );
  const kind = special === null ? 0 : SPECIAL_KINDS.indexOf(special) + 1;
  return [
    hp,
    attack,
    defense,
    spAtk,
    spDef,
    speed,
    kind,
    FORMS_LEVELS.indexOf(forms),
    gigantamax ? 1 : 0,
  ];
}

export function decodeRow(row: IndexRow): IndexedPokemon {
  const [hp, attack, defense, spAtk, spDef, speed, kind, forms, gmax] = row;
  return {
    hp,
    attack,
    defense,
    "special-attack": spAtk,
    "special-defense": spDef,
    speed,
    total: hp + attack + defense + spAtk + spDef + speed,
    special: kind === 0 ? null : (SPECIAL_KINDS[kind - 1] ?? null),
    forms: FORMS_LEVELS[forms ?? 0] ?? "none",
    gigantamax: gmax === 1,
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
