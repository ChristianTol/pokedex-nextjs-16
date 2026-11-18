import { fetchPokeApi, idFromUrl } from "./client";

export type PokemonIndexEntry = {
  id: number;
  name: string;
};

type NamedResource = { name: string; url: string };
type ResourceList = { results: NamedResource[] };
type TypeResponse = { pokemon: { pokemon: NamedResource }[] };

/** Types that exist in PokéAPI but are not real filterable Pokémon types. */
const HIDDEN_TYPES = new Set(["unknown", "shadow", "stellar"]);

export function parseIndex(list: ResourceList): PokemonIndexEntry[] {
  return list.results
    .map((resource) => ({ id: idFromUrl(resource.url), name: resource.name }))
    .sort((a, b) => a.id - b.id);
}

export function parseTypeNames(list: ResourceList): string[] {
  return list.results
    .map((resource) => resource.name)
    .filter((name) => !HIDDEN_TYPES.has(name));
}

/**
 * Returns the ids of the given type's Pokémon. Alternative forms (ids above
 * the national dex range) are dropped so the ids line up with the index.
 */
export function parseTypeMemberIds(
  type: TypeResponse,
  knownIds: ReadonlySet<number>,
): number[] {
  return type.pokemon
    .map((entry) => idFromUrl(entry.pokemon.url))
    .filter((id) => knownIds.has(id));
}

/** A region and the generation of Pokémon that were introduced in it. */
export type Region = {
  /** PokéAPI region slug, e.g. "kanto". */
  name: string;
  generation: number;
  pokemonIds: number[];
};

type GenerationResponse = {
  id: number;
  main_region: { name: string };
  pokemon_species: NamedResource[];
};

export function parseGeneration(generation: GenerationResponse): Region {
  return {
    name: generation.main_region.name,
    generation: generation.id,
    pokemonIds: generation.pokemon_species
      .map((species) => idFromUrl(species.url))
      .sort((a, b) => a - b),
  };
}

/** All Pokémon species (id + name), sorted by national dex number. */
export async function getPokemonIndex(): Promise<PokemonIndexEntry[]> {
  return parseIndex(
    await fetchPokeApi<ResourceList>("/pokemon-species?limit=100000"),
  );
}

export async function getTypeNames(): Promise<string[]> {
  return parseTypeNames(await fetchPokeApi<ResourceList>("/type?limit=100"));
}

export async function getTypeMemberIds(
  typeName: string,
  knownIds: ReadonlySet<number>,
): Promise<number[]> {
  const type = await fetchPokeApi<TypeResponse>(
    `/type/${encodeURIComponent(typeName)}`,
  );
  return parseTypeMemberIds(type, knownIds);
}

export type TypeFilter = {
  name: string;
  pokemonIds: number[];
};

/** Every selectable type with the ids of its Pokémon (alternative forms dropped). */
export async function getTypes(
  knownIds: ReadonlySet<number>,
): Promise<TypeFilter[]> {
  const names = await getTypeNames();
  return Promise.all(
    names.map(async (name) => ({
      name,
      pokemonIds: await getTypeMemberIds(name, knownIds),
    })),
  );
}

/** One region per generation, ordered by generation. */
export async function getRegions(): Promise<Region[]> {
  const list = await fetchPokeApi<ResourceList>("/generation?limit=100");
  const generations = await Promise.all(
    list.results.map((resource) =>
      fetchPokeApi<GenerationResponse>(
        `/generation/${idFromUrl(resource.url)}`,
      ),
    ),
  );
  return generations
    .map(parseGeneration)
    .sort((a, b) => a.generation - b.generation);
}
