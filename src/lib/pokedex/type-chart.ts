import { relationsForGeneration, type TypeChart } from "./matchups";
import { POKEMON_TYPES } from "./types";

/** A type's chart and the generation it was introduced in. */
export type TypeChartEntry = { chart: TypeChart; generation: number };

/** The main region of each generation, in generation order (the first is generation 1). */
export const GENERATION_REGIONS = [
  "kanto",
  "johto",
  "hoenn",
  "sinnoh",
  "unova",
  "kalos",
  "alola",
  "galar",
  "paldea",
] as const;

export const NEWEST_GENERATION = GENERATION_REGIONS.length;

/** The generation in the url (`?gen=3`); the newest when it is missing or invalid. */
export function parseGeneration(raw: string | null): number {
  const generation = Number(raw);
  return Number.isInteger(generation) &&
    generation >= 1 &&
    generation <= NEWEST_GENERATION
    ? generation
    : NEWEST_GENERATION;
}

/** The types that exist in a generation (Dark and Steel came in 2, Fairy in 6), in table order. */
export function typesInGeneration(
  entries: readonly TypeChartEntry[],
  generation: number,
): string[] {
  const introduced = new Map(
    entries.map((entry) => [entry.chart.name, entry.generation]),
  );
  return POKEMON_TYPES.filter(
    (type) => (introduced.get(type) ?? 1) <= generation,
  );
}

/**
 * Damage multiplier of every attacking type against every defending type in
 * a generation: 2, 0.5, 0 or 1 (neutral).
 */
export function typeTable(
  entries: readonly TypeChartEntry[],
  generation: number,
): Record<string, Record<string, number>> {
  const types = typesInGeneration(entries, generation);
  const table: Record<string, Record<string, number>> = {};
  for (const attacker of types) {
    const entry = entries.find(
      (candidate) => candidate.chart.name === attacker,
    );
    const relations = entry
      ? relationsForGeneration(entry.chart, generation).damage_relations
      : null;
    const names = (list: { name: string }[] | undefined) =>
      new Set((list ?? []).map((item) => item.name));
    const double = names(relations?.double_damage_to);
    const half = names(relations?.half_damage_to);
    const none = names(relations?.no_damage_to);
    table[attacker] = Object.fromEntries(
      types.map((defender) => [
        defender,
        none.has(defender)
          ? 0
          : double.has(defender)
            ? 2
            : half.has(defender)
              ? 0.5
              : 1,
      ]),
    );
  }
  return table;
}

/** 2 -> "2×", 0.5 -> "½×", 0 -> "0×", 1 -> "" (neutral cells stay empty). */
export function formatChartMultiplier(multiplier: number): string {
  if (multiplier === 2) return "2×";
  if (multiplier === 0.5) return "½×";
  if (multiplier === 0) return "0×";
  return "";
}
