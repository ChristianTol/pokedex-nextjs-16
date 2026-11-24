import type { PokemonMoves } from "@/lib/pokeapi/moves";
import { learnableMoves } from "./learnable-moves";
import { POKEMON_TYPES } from "./types";

/** Damage multiplier of every attacking type against every defending type. */
export type TypeEffectiveness = Record<string, Record<string, number>>;

/** The types of the damaging moves (not status moves) the Pokémon can learn. */
export function damagingMoveTypes(moves: PokemonMoves): string[] {
  return [
    ...new Set(
      learnableMoves(moves)
        .filter(
          (move) =>
            move.damageClass === "physical" || move.damageClass === "special",
        )
        .map((move) => move.type),
    ),
  ];
}

/**
 * Damage multiplier per defending type of the best damaging move the Pokémon
 * can learn. Same shape as `Matchups.offense`, which only looks at its own
 * types. Null when it learns no damaging moves.
 */
export function moveOffense(
  moves: PokemonMoves,
  effectiveness: TypeEffectiveness,
): Record<string, number> | null {
  const types = damagingMoveTypes(moves);
  if (types.length === 0) return null;
  return Object.fromEntries(
    POKEMON_TYPES.map((defender) => [
      defender,
      Math.max(...types.map((type) => effectiveness[type]?.[defender] ?? 1)),
    ]),
  );
}
