import { POKEMON_TYPES } from "./types";

type NamedType = { name: string };

/** The part of PokéAPI's `damage_relations` we use. */
export type DamageRelations = {
  double_damage_from: NamedType[];
  half_damage_from: NamedType[];
  no_damage_from: NamedType[];
  double_damage_to: NamedType[];
  half_damage_to: NamedType[];
  no_damage_to: NamedType[];
};

export type TypeRelations = {
  name: string;
  damage_relations: DamageRelations;
  /** Earlier type charts, each valid up to and including its generation. */
  past_damage_relations?: {
    generation: { url: string };
    damage_relations: DamageRelations;
  }[];
};

/** A type's damage relations now and in earlier generations (oldest first). */
export type TypeChart = {
  name: string;
  relations: DamageRelations;
  past: { generation: number; relations: DamageRelations }[];
};

/** The type's relations as they were in a generation. */
export function relationsForGeneration(
  chart: TypeChart,
  generation: number,
): TypeRelations {
  const past = chart.past.find((entry) => entry.generation >= generation);
  return {
    name: chart.name,
    damage_relations: past?.relations ?? chart.relations,
  };
}

export type Matchups = {
  /** Damage multiplier per attacking type (4, 2, 1, 0.5, 0.25 or 0). */
  defense: Record<string, number>;
  /**
   * Damage multiplier per defending type when the Pokémon attacks with a move
   * of one of its own types: the best of its types (2, 1, 0.5 or 0).
   */
  offense: Record<string, number>;
};

const has = (list: NamedType[], type: string) =>
  list.some((entry) => entry.name === type);

function defenseAgainst(attacker: string, defenders: TypeRelations[]) {
  return defenders.reduce((multiplier, { damage_relations: relations }) => {
    if (has(relations.no_damage_from, attacker)) return multiplier * 0;
    if (has(relations.double_damage_from, attacker)) return multiplier * 2;
    if (has(relations.half_damage_from, attacker)) return multiplier * 0.5;
    return multiplier;
  }, 1);
}

function offenseAgainst(defender: string, attackers: TypeRelations[]) {
  return Math.max(
    ...attackers.map(({ damage_relations: relations }) => {
      if (has(relations.no_damage_to, defender)) return 0;
      if (has(relations.double_damage_to, defender)) return 2;
      if (has(relations.half_damage_to, defender)) return 0.5;
      return 1;
    }),
  );
}

/** Damage multipliers of a Pokémon with the given (one or two) types. */
export function computeMatchups(ownTypes: TypeRelations[]): Matchups {
  const byType = (multiplier: (type: string) => number) =>
    Object.fromEntries(POKEMON_TYPES.map((type) => [type, multiplier(type)]));
  return {
    defense: byType((type) => defenseAgainst(type, ownTypes)),
    offense: byType((type) => offenseAgainst(type, ownTypes)),
  };
}

export type TypeMultiplier = { type: string; multiplier: number };

function multipliers(
  values: Record<string, number>,
  keep: (multiplier: number) => boolean,
  order: (a: number, b: number) => number,
): TypeMultiplier[] {
  return POKEMON_TYPES.map((type) => ({ type, multiplier: values[type] ?? 1 }))
    .filter(({ multiplier }) => keep(multiplier))
    .sort((a, b) => order(a.multiplier, b.multiplier));
}

/** Defensive: types that deal extra damage, ×4 before ×2, in type order. */
export function vulnerableTo(
  defense: Record<string, number>,
): TypeMultiplier[] {
  return multipliers(
    defense,
    (m) => m > 1,
    (a, b) => b - a,
  );
}

/** Defensive: types that deal less damage, ×¼ before ×½, in type order. */
export function resistantTo(defense: Record<string, number>): TypeMultiplier[] {
  return multipliers(
    defense,
    (m) => m > 0 && m < 1,
    (a, b) => a - b,
  );
}

/** Defensive: types that deal no damage at all. */
export function immuneTo(defense: Record<string, number>): TypeMultiplier[] {
  return multipliers(
    defense,
    (m) => m === 0,
    () => 0,
  );
}

export type OffenseGroups = {
  superEffective: string[];
  notVeryEffective: string[];
  noEffect: string[];
};

/** Offensive: the types grouped by how the Pokémon's own types hit them. */
export function offenseGroups(offense: Record<string, number>): OffenseGroups {
  const typesWhere = (keep: (multiplier: number) => boolean) =>
    POKEMON_TYPES.filter((type) => keep(offense[type] ?? 1));
  return {
    superEffective: typesWhere((m) => m > 1),
    notVeryEffective: typesWhere((m) => m > 0 && m < 1),
    noEffect: typesWhere((m) => m === 0),
  };
}

export type Tone = "good" | "bad" | "neutral";

/**
 * Whether a multiplier is good or bad for the Pokémon: taking ×2 is bad, but
 * dealing ×2 is good. Zero is neutral (immune, or no effect).
 */
export function multiplierTone(
  multiplier: number,
  side: "offense" | "defense",
): Tone {
  if (multiplier === 0 || multiplier === 1) return "neutral";
  const higher = multiplier > 1;
  return higher === (side === "offense") ? "good" : "bad";
}

/** 4 -> "×4", 0.5 -> "×½", 0.25 -> "×¼", 0 -> "0", 1 -> "" */
export function formatMultiplier(multiplier: number): string {
  if (multiplier === 1) return "";
  if (multiplier === 0) return "0";
  if (multiplier === 0.5) return "×½";
  if (multiplier === 0.25) return "×¼";
  return `×${multiplier}`;
}
