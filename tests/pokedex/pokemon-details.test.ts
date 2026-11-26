import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  abilityDescriptionModeReducer,
  abilityDescriptionForMode,
  PokemonDetails,
  toggleAbilityDescriptionMode,
} from "@/components/pokedex/PokemonDetails";
import { toggleTrainingValueMode } from "@/components/pokedex/TrainingGuide";
import type { PokemonMovesState } from "@/hooks/usePokemonMoves";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import type { MoveInfo, PokemonMoves } from "@/lib/pokeapi/moves";

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
  const render = (
    detail: PokemonDetail,
    game: string | null,
    moves: PokemonMovesState = {} as PokemonMovesState,
  ) =>
    renderToStaticMarkup(
      createElement(PokemonDetails, {
        detail,
        onSelectPokemon: () => {},
        moves,
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

  it("shows clearly qualified offensive and defensive examples for supported games", () => {
    const detail = {
      stats: [
        { name: "hp", value: 80 },
        { name: "attack", value: 130 },
        { name: "defense", value: 80 },
        { name: "special-attack", value: 60 },
        { name: "special-defense", value: 80 },
        { name: "speed", value: 100 },
      ],
      evolution: {},
      name: "charizard",
      id: 6,
      pokemonId: 6,
      abilities: [],
      matchups: [],
    } as unknown as PokemonDetail;

    const markup = render(detail, "sword-shield");
    const sectionTitles = [
      ...markup.matchAll(/<h3 class="text-sm font-semibold text-muted[^\"]*">([^<]+)<\/h3>/g),
    ].map(([, title]) => title);

    expect(markup).toContain("Nature- en EV-richtlijn");
    expect(sectionTitles.slice(-4)).toEqual([
      "Abilities",
      "Sterktes en zwaktes",
      "Nature- en EV-richtlijn",
      "Moves",
    ]);
    expect(markup).toContain(
      "Voorbeelden op basis van basisstats en beschikbare moves; niet competitief geoptimaliseerd.",
    );
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("Toon EV-waarden");
    expect(markup.match(/Berekende stats \(level 100\)/g)).toHaveLength(2);
    expect(markup).toContain(
      "De berekening gaat uit van level 100 en 31 IV’s. De grafiekvorm blijft de EV-verdeling tonen.",
    );
    expect(markup).toContain("rounded-xl border border-border/50 p-4");
    expect(markup).toContain("Aanvallend voorbeeld");
    expect(markup).toContain('tracking-tight">Jolly</p>');
    expect(markup).toContain("aria-hidden=\"true\">↑</span> Verhoogt Snelheid");
    expect(markup).toContain("aria-hidden=\"true\">↓</span> Verlaagt Speciale aanval");
    expect(markup).toContain(
      'data-stat="speed" data-nature-effect="up" class="absolute -translate-x-1/2 -translate-y-1/2 break-words text-center text-xs leading-tight font-semibold text-red-600 dark:text-red-400"',
    );
    expect(markup).toContain(
      'data-stat="special-attack" data-nature-effect="down" class="absolute -translate-x-1/2 -translate-y-1/2 break-words text-center text-xs leading-tight font-semibold text-blue-700 dark:text-blue-400"',
    );
    expect(markup).not.toContain("rounded-full text-white");
    expect(markup.match(/viewBox="0 0 240 240"/g)).toHaveLength(2);
    expect(markup).toContain(
      '<span>Aanval</span><span class="block font-semibold tabular-nums">359</span>',
    );
    expect(markup).toContain(
      '<span>Snelheid</span><span class="block font-semibold tabular-nums text-foreground">328</span>',
    );
    expect(markup).toContain(
      '<span>HP</span><span class="block font-semibold tabular-nums">302</span>',
    );
    expect(markup).toContain(
      '<span>Speciale aanval</span><span class="block font-semibold tabular-nums text-foreground">140</span>',
    );
    const calculatedStatLabels = [
      ...markup.matchAll(
        /data-stat="([^"]+)"[^>]*><span>([^<]+)<\/span><span class="block font-semibold tabular-nums(?: text-foreground)?">(\d+)<\/span><\/span>/g,
      ),
    ].map(([, stat, label, value]) => ({ stat, label, value }));
    const expectedEvStatOrder = [
      { stat: "hp", label: "HP" },
      { stat: "attack", label: "Aanval" },
      { stat: "defense", label: "Verdediging" },
      { stat: "speed", label: "Snelheid" },
      { stat: "special-defense", label: "Speciale verdediging" },
      { stat: "special-attack", label: "Speciale aanval" },
    ];
    expect(calculatedStatLabels.slice(0, 6).map(({ stat, label }) => ({ stat, label }))).toEqual(expectedEvStatOrder);
    expect(calculatedStatLabels.slice(6, 12).map(({ stat, label }) => ({ stat, label }))).toEqual(expectedEvStatOrder);
    expect(calculatedStatLabels.map(({ value }) => value)).toEqual([
      "302", "359", "196", "328", "196", "140",
      "364", "296", "284", "236", "197", "140",
    ]);
    expect(calculatedStatLabels).toHaveLength(12);
    expect(markup).not.toContain("grid w-full grid-cols-2 gap-x-3 gap-y-1.5");
    expect(markup).toContain("Verdedigend voorbeeld");
    expect(markup).toContain('tracking-tight">Impish</p>');
    expect(markup).toContain("aria-hidden=\"true\">↑</span> Verhoogt Verdediging");
    expect(markup).toContain("aria-hidden=\"true\">↓</span> Verlaagt Speciale aanval");
    expect(markup).toContain(
      '<span>Verdediging</span><span class="block font-semibold tabular-nums text-foreground">284</span>',
    );
    expect(markup).toContain(
      '<span>Speciale verdediging</span><span class="block font-semibold tabular-nums">197</span>',
    );
    expect(markup).toContain("Over deze voorbeelden");
    expect(markup).not.toContain("Gebalanceerd alternatief");
    expect(markup).not.toContain("128 Verdediging");
    expect(markup).not.toContain("128 Speciale verdediging");
    expect(markup).toContain("egg moves zijn niet meegenomen");
  });

  it("toggles the shared training chart value mode in both directions", () => {
    expect(toggleTrainingValueMode("evs")).toBe("stats");
    expect(toggleTrainingValueMode("stats")).toBe("evs");
  });

  it("shows game-specific suggestions and does not show stale moves while loading", () => {
    const detail = {
      stats: [
        { name: "hp", value: 80 },
        { name: "attack", value: 130 },
        { name: "defense", value: 80 },
        { name: "special-attack", value: 60 },
        { name: "special-defense", value: 80 },
        { name: "speed", value: 100 },
      ],
      types: ["fire"],
      evolution: {},
      name: "charizard",
      id: 6,
      pokemonId: 6,
      abilities: [],
      matchups: [],
    } as unknown as PokemonDetail;
    const move: MoveInfo = {
      name: "flamethrower",
      names: { en: "Flamethrower" },
      type: "fire",
      damageClass: "special",
      power: 90,
      accuracy: 100,
      pp: 15,
      descriptions: {},
      effects: {},
      effectChance: null,
      priority: 0,
      target: "selected-pokemon",
    };
    const secondMove: MoveInfo = {
      ...move,
      name: "brick-break",
      names: { en: "Brick Break" },
      type: "fighting",
      damageClass: "physical",
      power: 75,
    };
    const moves: PokemonMoves = {
      games: ["sword-shield"],
      game: "sword-shield",
      levelUp: [
        { move: move.name, level: 1 },
        { move: secondMove.name, level: 1 },
      ],
      tutor: [],
      machine: [],
      moves: { [move.name]: move, [secondMove.name]: secondMove },
    };

    const currentMarkup = render(
      detail,
      "sword-shield",
      { data: moves, loading: false, failed: false, retry: () => {} },
    );
    expect(currentMarkup).toContain("Movesuggesties");
    expect(currentMarkup).toContain("Flamethrower");
    expect(currentMarkup).toContain(
      "rounded-full border border-border/50 bg-surface-muted px-2.5 py-1 text-xs font-medium",
    );
    expect(currentMarkup).toContain(
      "%2Fsprites%2Ftypes%2Fgeneration-viii%2Fsword-shield%2Fsmall%2F10.png",
    );
    expect(currentMarkup).toContain(
      "%2Fsprites%2Ftypes%2Fgeneration-viii%2Fsword-shield%2Fsmall%2F2.png",
    );
    expect(currentMarkup).toContain('<span class="sr-only">Vuur</span>');
    expect(currentMarkup).toContain('<span class="sr-only">Vechter</span>');
    expect(currentMarkup).toContain("Brick Break");

    const staleMarkup = render(
      detail,
      "scarlet-violet",
      { data: moves, loading: true, failed: false, retry: () => {} },
    );
    expect(staleMarkup).toContain("Moves voor advies laden…");
    expect(staleMarkup).not.toContain("Flamethrower");

    const failedMarkup = render(
      detail,
      "scarlet-violet",
      { data: moves, loading: false, failed: true, retry: () => {} },
    );
    expect(failedMarkup).toContain("Moves voor dit spel konden niet worden geladen.");
    expect(failedMarkup).not.toContain("Flamethrower");
  });

  it("keeps the offensive example when defensive stats are missing", () => {
    const detail = {
      stats: [
        { name: "hp", value: 80 },
        { name: "attack", value: 130 },
        { name: "special-attack", value: 60 },
        { name: "special-defense", value: 80 },
        { name: "speed", value: 100 },
      ],
      evolution: {},
      name: "charizard",
      id: 6,
      pokemonId: 6,
      abilities: [],
      matchups: [],
    } as unknown as PokemonDetail;

    const markup = render(detail, "sword-shield");

    expect(markup).toContain("Aanvallend voorbeeld");
    expect(markup).toContain('tracking-tight">Jolly</p>');
    expect(markup).toContain("Verdedigend voorbeeld");
    expect(markup).toContain("Geen toepasbare nature- of EV-richtlijn beschikbaar.");
  });

  it("explains when traditional EV advice is unavailable for the selected game", () => {
    const detail = {
      stats: [
        { name: "hp", value: 80 },
        { name: "attack", value: 100 },
        { name: "special-attack", value: 70 },
        { name: "speed", value: 50 },
      ],
      evolution: {},
      name: "pikachu",
      id: 25,
      pokemonId: 25,
      abilities: [],
      matchups: [],
    } as unknown as PokemonDetail;

    expect(render(detail, "legends-arceus")).toContain(
      "Geen toepasbare nature- of EV-richtlijn beschikbaar.",
    );
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
    // No ability toggle (the matchups section has its own).
    expect(render(detail, null)).not.toContain("Spelbeschrijving");
    expect(render(detail, null)).not.toContain("Algemeen effect");
  });

  it("offers a toggle between the Pokémon's own types and its learnable moves", () => {
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

    expect(markup).toMatch(
      /<button[^>]*aria-pressed="false"[^>]*>Eigen types<\/button>/,
    );
    expect(markup).not.toContain("Aan te leren moves");
  });
});