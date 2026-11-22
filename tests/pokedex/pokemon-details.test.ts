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
  const render = (detail: PokemonDetail, game: string | null) =>
    renderToStaticMarkup(
      createElement(PokemonDetails, {
        detail,
        onSelectPokemon: () => {},
        moves: {} as PokemonMovesState,
        shinyIds: new Set<number>(),
        onSetShiny: () => {},
        game,
        showSprite: true,
      }),
    );

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
    const markup = render(detail, null);
    const sections = [...markup.matchAll(/<section class="([^"]+)"/g)];

    expect(sections[0]?.[1]).toContain("lg:self-center");
    expect(sections[1]?.[1]).not.toContain("lg:self-center");
  });

  it("renders the ability description for the selected game", () => {
    const detail = {
      stats: [],
      evolution: {},
      name: "charizard",
      id: 6,
      pokemonId: 6,
      abilities: [
        {
          slot: 1,
          name: "blaze",
          hidden: false,
          names: { en: "Blaze" },
          descriptions: { en: "General effect." },
          gameDescriptions: {
            "x-y": { en: "X/Y flavor text." },
            "sword-shield": { en: "Sword/Shield flavor text." },
          },
        },
      ],
      matchups: [],
    } as unknown as PokemonDetail;

    const xYMarkup = render(detail, "x-y");
    const swordShieldMarkup = render(detail, "sword-shield");

    expect(xYMarkup).toContain("X/Y flavor text.");
    expect(xYMarkup).not.toContain("Sword/Shield flavor text.");
    expect(swordShieldMarkup).toContain("Sword/Shield flavor text.");
    expect(swordShieldMarkup).not.toContain("X/Y flavor text.");
  });
});