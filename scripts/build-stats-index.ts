/**
 * Builds `src/data/pokemon-stats.json`: for every Pokémon its base stats and
 * whether it is legendary, mythical or a baby, and whether it has other forms
 * a Mega Evolution or Primal Reversion, or a Gigantamax form. PokéAPI has no bulk endpoint
 * for these, so this takes two requests per Pokémon (about 2000). Run it
 * again when new Pokémon have come out:
 *
 *   npm run build:index
 */
import { writeFile } from "node:fs/promises";
import {
  INDEXED_STATS,
  encodeRow,
  type FormsLevel,
  type IndexedStat,
  type SpecialKind,
  type StatsIndexFile,
} from "../src/lib/pokedex/stats-index.ts";

const BASE_URL = "https://pokeapi.co/api/v2";
const OUTPUT = new URL("../src/data/pokemon-stats.json", import.meta.url);
const CONCURRENCY = 8;
const RETRIES = 4;

type Species = {
  id: number;
  is_legendary: boolean;
  is_mythical: boolean;
  is_baby: boolean;
  varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
};
type PokemonResponse = {
  stats: { base_stat: number; stat: { name: string } }[];
};

async function get<T>(url: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      if (attempt >= RETRIES) throw new Error(`${url}: ${error}`);
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1]);

function specialKind(species: Species): SpecialKind | null {
  if (species.is_mythical) return "mythical";
  if (species.is_legendary) return "legendary";
  if (species.is_baby) return "baby";
  return null;
}

/** Mega and Primal slugs look like "charizard-mega-x" and "groudon-primal". */
function formsLevel(species: Species): FormsLevel {
  const others = species.varieties.filter((variety) => !variety.is_default);
  if (others.length === 0) return "none";
  const isMega = (variety: (typeof others)[number]) =>
    /-(mega|primal)(-|$)/.test(variety.pokemon.name);
  if (!others.some(isMega)) return "forms";
  return others.every(isMega) ? "mega-only" : "mega";
}

/** Gigantamax slugs look like "charizard-gmax". */
function hasGigantamax(species: Species): boolean {
  return species.varieties.some((variety) =>
    variety.pokemon.name.endsWith("-gmax"),
  );
}

async function rowFor(id: number) {
  const species = await get<Species>(`${BASE_URL}/pokemon-species/${id}`);
  const standard =
    species.varieties.find((variety) => variety.is_default) ??
    species.varieties[0];
  const pokemon = await get<PokemonResponse>(
    `${BASE_URL}/pokemon/${idFromUrl(standard.pokemon.url)}`,
  );
  const stats = Object.fromEntries(
    pokemon.stats.map((entry) => [entry.stat.name, entry.base_stat]),
  ) as Record<IndexedStat, number>;
  for (const name of INDEXED_STATS) {
    if (typeof stats[name] !== "number") {
      throw new Error(`Pokémon ${id} has no ${name} stat`);
    }
  }
  return [
    id,
    encodeRow(
      stats,
      specialKind(species),
      formsLevel(species),
      hasGigantamax(species),
    ),
  ] as const;
}

const list = await get<{ results: { url: string }[] }>(
  `${BASE_URL}/pokemon-species?limit=100000`,
);
const ids = list.results
  .map((entry) => idFromUrl(entry.url))
  .sort((a, b) => a - b);
console.log(`Loading ${ids.length} Pokémon…`);

const rows: (readonly [number, ReturnType<typeof encodeRow>])[] = [];
let next = 0;
async function worker() {
  while (next < ids.length) {
    const id = ids[next++];
    rows.push(await rowFor(id));
    if (rows.length % 100 === 0) console.log(`${rows.length}/${ids.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

rows.sort((a, b) => a[0] - b[0]);
const file: StatsIndexFile = {
  generatedAt: new Date().toISOString().slice(0, 10),
  pokemon: Object.fromEntries(rows.map(([id, row]) => [String(id), row])),
};
await writeFile(OUTPUT, `${JSON.stringify(file)}\n`);
console.log(`Wrote ${rows.length} Pokémon to src/data/pokemon-stats.json`);
