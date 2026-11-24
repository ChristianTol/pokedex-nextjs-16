import type { MoveInfo, PokemonMoves } from "@/lib/pokeapi/moves";

/** Every move of the list that the Pokémon learns by level, tutor or machine. */
export function learnableMoves(moves: PokemonMoves): MoveInfo[] {
  const names = new Set([
    ...moves.levelUp.map(({ move }) => move),
    ...moves.tutor,
    ...moves.machine,
  ]);
  const knownMoves = new Map(
    Object.values(moves.moves).map((move) => [move.name, move]),
  );
  return [...knownMoves.values()].filter((move) => names.has(move.name));
}
