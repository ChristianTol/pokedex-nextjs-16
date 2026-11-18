import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { TeamBuilder } from "@/components/pokedex/TeamBuilder";
import { getPokemonIndex } from "@/lib/pokeapi/index-list";

export const metadata: Metadata = {
  title: "Team · Pokédex",
};

export default async function TeamPage() {
  const entries = await getPokemonIndex();
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <AppHeader />
      <TeamBuilder entries={entries} />
    </main>
  );
}
