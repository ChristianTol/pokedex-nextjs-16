import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { TypeTable } from "@/components/pokedex/TypeTable";
import { getTypeCharts } from "@/lib/pokeapi/type-chart";

export const metadata: Metadata = {
  title: "Typetabel · Pokédex",
};

export default async function TypesPage() {
  const charts = await getTypeCharts();
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <AppHeader />
      <TypeTable charts={charts} />
    </main>
  );
}
