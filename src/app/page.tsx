import { PokedexList } from "@/components/pokedex/PokedexList";
import { AppHeader } from "@/components/AppHeader";
import {
  getPokemonIndex,
  getRegions,
  getTypes,
} from "@/lib/pokeapi/index-list";

export default async function Home() {
  const entries = await getPokemonIndex();
  const [types, regions] = await Promise.all([
    getTypes(new Set(entries.map((entry) => entry.id))),
    getRegions(),
  ]);

  return (
    <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-8">
      <AppHeader />
      <PokedexList entries={entries} types={types} regions={regions} />
    </main>
  );
}
