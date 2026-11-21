import { describe, expect, it } from "vitest";
import type {
  PokemonDetail,
  PokemonFormSprites,
} from "@/lib/pokeapi/detail";
import { parseGameSprites } from "@/lib/pokeapi/detail";
import {
  abilitiesForGeneration,
  descriptionForGame,
  detailForGame,
  formSpriteCandidates,
  hasSpriteToggle,
  spriteForGame,
  spriteForGameOrLatest,
  statsForGeneration,
} from "@/lib/pokedex/game-detail";

const stats = [
  { name: "hp", value: 35 },
  { name: "attack", value: 55 },
  { name: "defense", value: 40 },
  { name: "special-attack", value: 50 },
  { name: "special-defense", value: 50 },
  { name: "speed", value: 90 },
];
const past = [
  { generation: 1, stats: [{ name: "special", value: 50 }] },
  {
    generation: 5,
    stats: [
      { name: "defense", value: 30 },
      { name: "special-defense", value: 40 },
    ],
  },
];

const value = (list: { name: string; value: number }[], name: string) =>
  list.find((stat) => stat.name === name)?.value;

describe("statsForGeneration", () => {
  it("keeps the current stats for a generation without history", () => {
    expect(statsForGeneration(stats, past, 6)).toEqual(stats);
  });

  it("uses the older values up to and including the entry's generation", () => {
    const result = statsForGeneration(stats, past, 5);
    expect(value(result, "defense")).toBe(30);
    expect(value(result, "special-defense")).toBe(40);
    expect(value(result, "attack")).toBe(55);
  });

  it("merges older and newer entries in generation 1 with one Special stat", () => {
    const result = statsForGeneration(stats, past, 1);
    expect(result.map((stat) => stat.name)).toEqual([
      "hp",
      "attack",
      "defense",
      "special",
      "speed",
    ]);
    expect(value(result, "special")).toBe(50);
    expect(value(result, "defense")).toBe(30);
  });

  it("treats an unknown (newest) game as current", () => {
    expect(statsForGeneration(stats, past, Number.POSITIVE_INFINITY)).toEqual(
      stats,
    );
  });
});

const ability = (slot: number, name: string, hidden = false) => ({
  slot,
  name,
  hidden,
  names: {},
  descriptions: {},
});

describe("abilitiesForGeneration", () => {
  const abilities = [
    ability(1, "cute-charm"),
    ability(2, "magic-guard"),
    ability(3, "friend-guard", true),
  ];
  const past = [
    { generation: 3, slots: [{ slot: 2, ability: null }] },
    { generation: 4, slots: [{ slot: 3, ability: null }] },
  ];
  const names = (list: { name: string }[]) => list.map((a) => a.name);

  it("has none before generation 3", () => {
    expect(abilitiesForGeneration(abilities, past, 2)).toEqual([]);
  });

  it("leaves out slots that were still empty", () => {
    expect(names(abilitiesForGeneration(abilities, past, 3))).toEqual([
      "cute-charm",
    ]);
    expect(names(abilitiesForGeneration(abilities, past, 4))).toEqual([
      "cute-charm",
      "magic-guard",
    ]);
  });

  it("uses today's abilities after the last change", () => {
    expect(abilitiesForGeneration(abilities, past, 5)).toEqual(abilities);
  });

  it("puts back an ability that was replaced", () => {
    const result = abilitiesForGeneration(
      [ability(1, "cursed-body")],
      [
        {
          generation: 6,
          slots: [{ slot: 1, ability: ability(1, "levitate") }],
        },
      ],
      6,
    );
    expect(names(result)).toEqual(["levitate"]);
  });
});

describe("detailForGame", () => {
  const relations = (doubleFrom: string[]) => ({
    double_damage_from: doubleFrom.map((name) => ({ name })),
    half_damage_from: [],
    no_damage_from: [],
    double_damage_to: [],
    half_damage_to: [],
    no_damage_to: [],
  });
  const matchups = (defense: number) => ({
    defense: { fighting: defense },
    offense: {},
  });
  const detail = {
    descriptions: { en: "newest" },
    gameDescriptions: {
      "red-blue": { en: "old" },
      "sword-shield": { en: "SwSh" },
    },
    stats,
    pastStats: past,
    types: ["fairy"],
    pastTypes: [{ generation: 5, types: ["normal"] }],
    pastAbilities: [],
    abilities: [ability(1, "cute-charm")],
    typeCharts: [
      { name: "fairy", relations: relations(["poison"]), past: [] },
      {
        name: "normal",
        relations: relations(["fighting"]),
        past: [{ generation: 1, relations: relations([]) }],
      },
    ],
    matchups: matchups(1),
  } as unknown as PokemonDetail;

  it("uses the stats and types of that game's generation", () => {
    const result = detailForGame(detail, "red-blue");
    expect(value(result.stats, "special")).toBe(50);
    expect(result.types).toEqual(["normal"]);
    expect(result.abilities).toEqual([]);
    // Normal had no weakness to Fighting in generation 1's chart (test data).
    expect(result.matchups.defense.fighting).toBe(1);
  });

  it("keeps the current types after the generation of the old ones", () => {
    const result = detailForGame(detail, "x-y");
    expect(result.types).toEqual(["fairy"]);
    expect(result.matchups.defense.poison).toBe(2);
  });

  it("uses the type chart of the generation", () => {
    const result = detailForGame(detail, "yellow");
    expect(result.types).toEqual(["normal"]);
    expect(result.matchups.defense.fighting).toBe(1);
    expect(detailForGame(detail, "emerald").matchups.defense.fighting).toBe(2);
  });
});

describe("descriptionForGame", () => {
  const detail = (gameDescriptions: Record<string, Record<string, string>>) =>
    ({
      descriptions: { en: "newest", ja: "最新" },
      gameDescriptions,
    }) as unknown as PokemonDetail;

  const texts = {
    "red-blue": { en: "RB" },
    "x-y": { en: "XY", ja: "XY日" },
    "sword-shield": { en: "SwSh", ja: "剣盾" },
  };

  it("uses the game's own text, without naming another game", () => {
    expect(descriptionForGame(detail(texts), "x-y", "ja")).toEqual({
      text: "XY日",
      fromGame: null,
    });
  });

  it("uses an expansion's main game for the text", () => {
    expect(
      descriptionForGame(detail(texts), "the-isle-of-armor", "en"),
    ).toEqual({ text: "SwSh", fromGame: null });
  });

  it("takes the closest game with text in the language, and names it", () => {
    // Red/Blue has no Japanese; X/Y (generation 6) is closer than Sword/Shield.
    expect(descriptionForGame(detail(texts), "red-blue", "ja")).toEqual({
      text: "XY日",
      fromGame: "x-y",
    });
    expect(descriptionForGame(detail(texts), "scarlet-violet", "ja")).toEqual({
      text: "剣盾",
      fromGame: "sword-shield",
    });
  });

  it("prefers the newer of two equally close games", () => {
    const equal = { "red-blue": { ja: "旧" }, "gold-silver": { ja: "新" } };
    // Yellow is one step from both Red/Blue (before) and Gold/Silver (after).
    expect(descriptionForGame(detail(equal), "yellow", "ja")).toEqual({
      text: "新",
      fromGame: "gold-silver",
    });
  });

  it("uses English when the language has no text in any game", () => {
    expect(
      descriptionForGame(detail({ "red-blue": { en: "RB" } }), "x-y", "de"),
    ).toEqual({ text: "RB", fromGame: "red-blue" });
    expect(descriptionForGame(detail(texts), "x-y", "nl")).toEqual({
      text: "XY",
      fromGame: null,
    });
  });

  it("falls back to the newest text without any per-game texts", () => {
    expect(descriptionForGame(detail({}), "x-y", "ja")).toEqual({
      text: "最新",
      fromGame: null,
    });
  });
});

describe("formSpriteCandidates", () => {
  const form = (
    overrides: Partial<PokemonFormSprites> = {},
  ): PokemonFormSprites => ({
    id: 25,
    gameSprites: {
      "red-blue": { front: "/red.png", shiny: "/red-shiny.png" },
      "sword-shield": { front: "/sword.png", shiny: null },
    },
    defaultSprite: "/default.png",
    shinyDefaultSprite: "/default-shiny.png",
    artwork: "/artwork.png",
    shinyArtwork: "/artwork-shiny.png",
    ...overrides,
  });

  it("uses the selected game's shiny sprite before the default sprite", () => {
    expect(formSpriteCandidates(form(), "red-blue", true)).toEqual([
      "/red-shiny.png",
      "/default-shiny.png",
      "/artwork-shiny.png",
    ]);
  });

  it("falls back through default sprites and artwork when the game is missing", () => {
    expect(formSpriteCandidates(form(), "scarlet-violet", false)).toEqual([
      "/default.png",
      "/artwork.png",
    ]);
    expect(formSpriteCandidates(form(), "scarlet-violet", true)).toEqual([
      "/default-shiny.png",
      "/artwork-shiny.png",
    ]);
  });

  it("can fall back to the newest game sprite when the selected game has none", () => {
    expect(formSpriteCandidates(form(), "scarlet-violet", false)).toEqual([
      "/default.png",
      "/artwork.png",
    ]);
    expect(
      formSpriteCandidates(form(), "scarlet-violet", false, true, true),
    ).toEqual(["/sword.png", "/default.png", "/artwork.png"]);
    expect(
      formSpriteCandidates(form(), "scarlet-violet", true, true, true),
    ).toEqual([
      "/sword.png",
      "/default-shiny.png",
      "/artwork-shiny.png",
    ]);
    expect(
      formSpriteCandidates(form(), "red-blue", false, true, true),
    ).toEqual(["/red.png", "/default.png", "/artwork.png"]);
    expect(
      formSpriteCandidates(form(), "scarlet-violet", false, false, true),
    ).toEqual(["/artwork.png", "/sword.png", "/default.png"]);
  });

  it("uses the newest available game sprite when there is no selected game", () => {
    expect(formSpriteCandidates(form(), null, false)[0]).toBe("/sword.png");
  });

  it("uses the same newest sprite for the main image when no game is selected", () => {
    expect(spriteForGameOrLatest(form().gameSprites, null, false)).toBe(
      "/sword.png",
    );
    expect(
      spriteForGameOrLatest(
        {
          "red-blue": { front: "/red.png", shiny: "/red-shiny.png" },
          "sword-shield": { front: "/sword.png", shiny: "/sword-shiny.png" },
        },
        null,
        true,
      ),
    ).toBe("/sword-shiny.png");
    expect(
      spriteForGameOrLatest(
        { "red-blue": { front: "/red.png", shiny: null } },
        null,
        true,
      ),
    ).toBe("/red.png");
    expect(spriteForGameOrLatest({}, null, false)).toBeNull();
    expect(
      spriteForGameOrLatest(form().gameSprites, "red-blue", false),
    ).toBe("/red.png");
  });

  it("does not offer an image toggle when the alternatives are identical", () => {
    expect(hasSpriteToggle("/sprite.png", "/artwork.png")).toBe(true);
    expect(hasSpriteToggle("/same.png", "/same.png")).toBe(false);
    expect(hasSpriteToggle(null, "/artwork.png")).toBe(false);
  });

  it("prefers artwork when artwork mode is selected", () => {
    expect(formSpriteCandidates(form(), "red-blue", false, false)).toEqual([
      "/artwork.png",
      "/red.png",
      "/default.png",
    ]);
  });

  it("falls back to available sprites if the preferred artwork is missing", () => {
    expect(
      formSpriteCandidates(
        form({ artwork: null, shinyArtwork: null }),
        "red-blue",
        false,
        false,
      ),
    ).toEqual(["/red.png", "/default.png"]);
  });

  it("returns no candidates when all sprite and artwork URLs are missing", () => {
    expect(
      formSpriteCandidates(
        form({
          gameSprites: {},
          defaultSprite: null,
          shinyDefaultSprite: null,
          artwork: null,
          shinyArtwork: null,
        }),
        "red-blue",
        false,
      ),
    ).toEqual([]);
  });
});

describe("spriteForGame", () => {
  const sprites = {
    "red-blue": { front: "rb.png", shiny: null },
    gold: { front: "gold.png", shiny: "gold-s.png" },
    "ultra-sun-ultra-moon": { front: "usum.png", shiny: null },
  };

  it("finds the sprite of the game itself", () => {
    expect(spriteForGame(sprites, "red-blue", false)).toBe("rb.png");
  });

  it("uses the shiny sprite when there is one, else the normal one", () => {
    expect(spriteForGame(sprites, "gold-silver", true)).toBe("gold-s.png");
    expect(spriteForGame(sprites, "red-blue", true)).toBe("rb.png");
  });

  it("selects the corrected Scarlet/Violet Kyurem sprites, including shiny", () => {
    const formSprites = (id: number) =>
      parseGameSprites({
        id,
        sprites: {
          front_default: null,
          versions: {
            "generation-ix": {
              "scarlet-violet": {
                front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/${id}.webp`,
                front_shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/shiny/${id}.webp`,
              },
            },
          },
        },
      } as unknown as Parameters<typeof parseGameSprites>[0]);
    const blackKyuremSprites = formSprites(10022);
    const whiteKyuremSprites = formSprites(10023);

    expect(spriteForGame(blackKyuremSprites, "scarlet-violet", false)).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/10023.webp",
    );
    expect(spriteForGame(blackKyuremSprites, "scarlet-violet", true)).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/shiny/10023.webp",
    );
    expect(spriteForGame(whiteKyuremSprites, "scarlet-violet", false)).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/10022.webp",
    );
    expect(spriteForGame(whiteKyuremSprites, "scarlet-violet", true)).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/shiny/10022.webp",
    );
  });

  it("borrows the sprites of the game a game shares them with", () => {
    expect(spriteForGame(sprites, "sun-moon", false)).toBe("usum.png");
  });

  it("is null for a game without sprites", () => {
    expect(spriteForGame(sprites, "legends-za", false)).toBeNull();
  });
});
