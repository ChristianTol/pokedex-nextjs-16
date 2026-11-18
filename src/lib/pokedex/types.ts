/** The 18 Pokémon types in PokéAPI id order (id = index + 1). */
export const POKEMON_TYPES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

/** Round 60×60 symbol from the PokéAPI sprites; null for unknown types. */
export function typeIconUrl(type: string): string | null {
  const index = POKEMON_TYPES.findIndex((candidate) => candidate === type);
  if (index < 0) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/sword-shield/small/${index + 1}.png`;
}
