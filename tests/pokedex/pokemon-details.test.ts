import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  abilityDescriptionModeReducer,
  abilityDescriptionForMode,
  PokemonDetails,
  toggleAbilityDescriptionMode,
} from "@/components/pokedex/PokemonDetails";
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

  it("shows game descriptions by default and offers the general-effect mode", () => {
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
          effectDescriptions: { en: "Detailed effect explanation." },
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
    expect(xYMarkup).not.toContain("Detailed effect explanation.");
    expect(xYMarkup).not.toContain("Sword/Shield flavor text.");
    expect(xYMarkup).toContain('aria-pressed="false"');
    expect(xYMarkup).toContain("Spelbeschrijving");
    expect(swordShieldMarkup).toContain("Sword/Shield flavor text.");
    expect(swordShieldMarkup).not.toContain("Detailed effect explanation.");
    expect(swordShieldMarkup).not.toContain("X/Y flavor text.");
  });

  it("switches between game and general descriptions with a fallback to the available text", () => {
    const ability = {
      slot: 1,
      name: "blaze",
      hidden: false,
      names: { en: "Blaze" },
      descriptions: {},
      effectDescriptions: { en: "General effect." },
      gameDescriptions: { "x-y": { en: "X/Y flavor text." } },
    } as PokemonDetail["abilities"][number];

    let showGeneralEffect = false;
    expect(
      abilityDescriptionForMode(ability, "x-y", "en", showGeneralEffect),
    ).toBe("X/Y flavor text.");

    showGeneralEffect = toggleAbilityDescriptionMode(showGeneralEffect);
    expect(
      abilityDescriptionForMode(ability, "x-y", "en", showGeneralEffect),
    ).toBe("General effect.");

    showGeneralEffect = toggleAbilityDescriptionMode(showGeneralEffect);
    expect(
      abilityDescriptionForMode(ability, "x-y", "en", showGeneralEffect),
    ).toBe("X/Y flavor text.");
    expect(
      abilityDescriptionForMode(ability, "unknown-game", "en", true),
    ).toBe("General effect.");
  });

  it("resets the ability description mode whenever the selected game changes", () => {
    const gameMode = abilityDescriptionModeReducer(
      { game: "x-y", showGeneralEffect: false },
      { type: "toggle", game: "x-y" },
    );

    expect(gameMode.showGeneralEffect).toBe(true);
    expect(
      abilityDescriptionModeReducer(gameMode, {
        type: "toggle",
        game: "x-y",
      }),
    ).toEqual({ game: "x-y", showGeneralEffect: false });

    const changedGameMode = abilityDescriptionModeReducer(gameMode, {
      type: "toggle",
      game: "sword-shield",
    });
    expect(changedGameMode).toEqual({
      game: "sword-shield",
      showGeneralEffect: false,
    });

    expect(
      abilityDescriptionModeReducer(changedGameMode, {
        type: "reset",
        game: null,
      }),
    ).toEqual({ game: null, showGeneralEffect: false });
    expect(
      abilityDescriptionModeReducer(changedGameMode, {
        type: "reset",
        game: "x-y",
      }),
    ).toEqual({ game: "x-y", showGeneralEffect: false });
  });

  it("falls back to the game description when no general effect exists", () => {
    const ability = {
      slot: 1,
      name: "blaze",
      hidden: false,
      names: { en: "Blaze" },
      descriptions: {},
      effectDescriptions: {},
      gameDescriptions: { "x-y": { en: "X/Y flavor text." } },
    } as PokemonDetail["abilities"][number];

    expect(abilityDescriptionForMode(ability, "x-y", "en", true)).toBe(
      "X/Y flavor text.",
    );
  });

  it("uses the English full effect fallback when no other description exists", () => {
    const detail = {
      stats: [],
      evolution: {},
      name: "bulbasaur",
      id: 1,
      pokemonId: 1,
      abilities: [
        {
          slot: 1,
          name: "overgrow",
          hidden: false,
          names: { en: "Overgrow" },
          descriptions: {},
          effectDescriptions: { en: "Boosts Grass-type moves at low HP." },
          gameDescriptions: {},
        },
      ],
      matchups: [],
    } as unknown as PokemonDetail;

    const markup = render(detail, null);

    expect(markup).toContain("Boosts Grass-type moves at low HP.");
    expect(markup).not.toContain("No description available.");
    expect(markup).toContain("aria-pressed=\"false\"");
  });

  it("does not repeat a full effect identical to the existing description", () => {
    const detail = {
      stats: [],
      evolution: {},
      name: "bulbasaur",
      id: 1,
      pokemonId: 1,
      abilities: [
        {
          slot: 1,
          name: "overgrow",
          hidden: false,
          names: { en: "Overgrow" },
          descriptions: { en: "The same effect." },
          effectDescriptions: { en: "The same effect." },
          gameDescriptions: {},
        },
      ],
      matchups: [],
    } as unknown as PokemonDetail;

    const markup = render(detail, null);

    expect(markup.match(/The same effect\./g)).toHaveLength(1);
    expect(markup).not.toContain("Algemeen effect:");
  });

  it("shows the no-description fallback when both ability texts are missing", () => {
    const detail = {
      stats: [],
      evolution: {},
      name: "bulbasaur",
      id: 1,
      pokemonId: 1,
      abilities: [
        {
          slot: 1,
          name: "overgrow",
          hidden: false,
          names: { en: "Overgrow" },
          descriptions: {},
          effectDescriptions: {},
          gameDescriptions: {},
        },
      ],
      matchups: [],
    } as unknown as PokemonDetail;

    expect(render(detail, null)).toContain("Geen beschrijving beschikbaar.");
    expect(render(detail, null)).not.toContain("aria-pressed");
  });
});