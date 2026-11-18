import type { LocalizedText } from "@/lib/i18n/languages";
import { fetchPokeApi } from "./client";
import { parseLocalizedNames } from "./detail";

/** What a list card needs beyond the id and name from the index. */
export type PokemonSummary = {
  id: number;
  name: string;
  types: string[];
  /** Species names per language; only present when requested. */
  names?: LocalizedText;
};

type PokemonResponse = {
  id: number;
  name: string;
  types: { slot: number; type: { name: string } }[];
};

export function parseSummary(
  pokemon: PokemonResponse,
  names?: LocalizedText,
): PokemonSummary {
  return {
    id: pokemon.id,
    name: pokemon.name,
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => entry.type.name),
    ...(names && { names }),
  };
}

export async function getPokemonSummary(
  id: number,
  withNames = false,
): Promise<PokemonSummary> {
  const [pokemon, species] = await Promise.all([
    fetchPokeApi<PokemonResponse>(`/pokemon/${id}`),
    withNames
      ? fetchPokeApi<{ names: { name: string; language: { name: string } }[] }>(
          `/pokemon-species/${id}`,
        )
      : null,
  ]);
  return parseSummary(
    pokemon,
    species ? parseLocalizedNames(species.names) : undefined,
  );
}
