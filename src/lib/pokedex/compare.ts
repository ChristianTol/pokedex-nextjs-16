import type { PokemonStat } from "@/lib/pokeapi/detail";
import type { Matchups } from "./matchups";

/** The two species being compared; an empty slot is null. */
export type CompareIds = [number | null, number | null];

export type CompareState = { ids: CompareIds; game: string | null };

const ID_PATTERN = /^\d{1,5}$/;

function parseId(raw: string | undefined): number | null {
  if (raw === undefined || !ID_PATTERN.test(raw)) return null;
  const id = Number(raw);
  return id >= 1 ? id : null;
}

/** Reads `?compare=25,6&game=x-y`. Slots keep their place: ",6" is an empty first slot. */
export function parseCompare(query: string): CompareState {
  const params = new URLSearchParams(query);
  const [first, second] = (params.get("compare") ?? "").split(",");
  const game = params.get("game");
  return { ids: [parseId(first), parseId(second)], game: game || null };
}

/** The query string ("" or "?compare=…"); empty trailing slots and game are left out. */
export function serializeCompare({ ids, game }: CompareState): string {
  const params = new URLSearchParams();
  if (ids[0] !== null || ids[1] !== null) {
    params.set("compare", `${ids[0] ?? ""},${ids[1] ?? ""}`.replace(/,$/, ""));
  }
  if (game && (ids[0] !== null || ids[1] !== null)) params.set("game", game);
  const query = params.toString().replace(/%2C/g, ",");
  return query === "" ? "" : `?${query}`;
}

export type StatComparison = {
  name: string;
  a: number | undefined;
  b: number | undefined;
};

/** The stats of two Pokémon side by side, in the order of the first one's stats. */
export function compareStats(
  a: readonly PokemonStat[],
  b: readonly PokemonStat[],
): StatComparison[] {
  const valueOf = (list: readonly PokemonStat[], name: string) =>
    list.find((stat) => stat.name === name)?.value;
  const names = [...a, ...b]
    .map((stat) => stat.name)
    .filter((name, index, all) => all.indexOf(name) === index);
  return names.map((name) => ({
    name,
    a: valueOf(a, name),
    b: valueOf(b, name),
  }));
}

export const statTotal = (stats: readonly PokemonStat[]): number =>
  stats.reduce((sum, stat) => sum + stat.value, 0);

/** The games both Pokémon have, newest first (the order of `first`). */
export function commonGames(
  first: readonly string[],
  second: readonly string[],
): string[] {
  return first.filter((game) => second.includes(game));
}

/** The chosen game when both Pokémon have it, otherwise the newest they share. */
export function compareGame(
  chosen: string | null,
  common: readonly string[],
): string | null {
  return chosen && common.includes(chosen) ? chosen : (common[0] ?? null);
}

/**
 * The damage multiplier when a Pokémon attacks with a move of its best type
 * against another Pokémon, from the defender's own matchups.
 */
export function bestMultiplier(
  attackerTypes: readonly string[],
  defender: Matchups,
): number {
  if (attackerTypes.length === 0) return 1;
  return Math.max(...attackerTypes.map((type) => defender.defense[type] ?? 1));
}

export type OffenseVerdict = "strong" | "weak" | "noEffect" | "neutral";
export type DefenseVerdict = "vulnerable" | "protected" | "immune" | "neutral";

/** How well a Pokémon's attacks do against the other one. */
export function offenseVerdict(multiplier: number): OffenseVerdict {
  if (multiplier === 0) return "noEffect";
  if (multiplier > 1) return "strong";
  return multiplier < 1 ? "weak" : "neutral";
}

/** How well a Pokémon stands up to the other one's attacks. */
export function defenseVerdict(multiplier: number): DefenseVerdict {
  if (multiplier === 0) return "immune";
  if (multiplier > 1) return "vulnerable";
  return multiplier < 1 ? "protected" : "neutral";
}
