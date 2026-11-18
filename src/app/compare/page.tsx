import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { CompareView } from "@/components/pokedex/CompareView";
import { getPokemonIndex } from "@/lib/pokeapi/index-list";

export const metadata: Metadata = {
  title: "Vergelijken · Pokédex",
};

export default async function ComparePage() {
  const entries = await getPokemonIndex();
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <AppHeader />
      <CompareView entries={entries} />
    </main>
  );
}
