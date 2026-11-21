import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PokemonDetails } from "@/components/pokedex/PokemonDetails";
import type { PokemonMovesState } from "@/hooks/usePokemonMoves";
import type { PokemonDetail } from "@/lib/pokeapi/detail";

vi.mock("@/components/pokedex/EvolutionChain", () => ({
  EvolutionChain: () => null,
  FamilyShinyButton: () => null,
}));

vi.mock("@/components/pokedex/PokemonMoves", () => ({
  PokemonMoves: () => null,
}));

vi.mock("@/components/pokedex/TypeMatchups", () => ({
  TypeMatchups: () => null,
}));

describe("PokemonDetails", () => {
  it("centers the stats section without stretching it to the evolution section height", () => {
    const detail = {
      stats: [{ name: "hp", value: 45 }],
      evolution: {},
      name: "bulbasaur",
      id: 1,
      pokemonId: 1,
      abilities: [],
      matchups: [],
    } as unknown as PokemonDetail;
    const markup = renderToStaticMarkup(
      createElement(PokemonDetails, {
        detail,
        onSelectPokemon: () => {},
        moves: {} as PokemonMovesState,
        shinyIds: new Set<number>(),
        onSetShiny: () => {},
        game: null,
        showSprite: true,
      }),
    );
    const sections = [...markup.matchAll(/<section class="([^"]+)"/g)];

    expect(sections[0]?.[1]).toContain("lg:self-center");
    expect(sections[1]?.[1]).not.toContain("lg:self-center");
  });
});