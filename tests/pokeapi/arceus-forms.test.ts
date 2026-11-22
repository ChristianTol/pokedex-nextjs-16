import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPokemonDetail,
  getPokemonFormSprites,
  resolveForm,
} from "@/lib/pokeapi/detail";
import {
  detailForGame,
  formSpriteCandidates,
  spriteForGame,
} from "@/lib/pokedex/game-detail";

const api = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/lib/pokeapi/client", () => ({
  fetchPokeApi: api.fetch,
  idFromUrl: (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1]),
  PokeApiError: class PokeApiError extends Error {
    constructor(
      message: string,
      readonly status?: number,
    ) {
      super(message);
    }
  },
}));

const playableForms = [
  ["normal", 493],
  ["bug", 10041],
  ["dark", 10042],
  ["dragon", 10043],
  ["electric", 10044],
  ["fighting", 10045],
  ["fire", 10046],
  ["flying", 10047],
  ["ghost", 10048],
  ["grass", 10049],
  ["ground", 10050],
  ["ice", 10051],
  ["poison", 10052],
  ["psychic", 10053],
  ["rock", 10054],
  ["steel", 10055],
  ["water", 10056],
  ["fairy", 10085],
] as const;

const formRefs = [
  ...playableForms,
  ["unknown", 10057] as const,
].map(([type, id]) => ({
  name: `arceus-${type}`,
  url: `https://pokeapi.co/api/v2/pokemon-form/${id}/`,
}));

const typeRelations = (type: string) => ({
  name: type,
  damage_relations: {
    double_damage_from: [{ name: type === "fire" ? "water" : "fighting" }],
    half_damage_from: [],
    no_damage_from: [],
    double_damage_to: [{ name: type === "fire" ? "grass" : "ghost" }],
    half_damage_to: [],
    no_damage_to: [],
  },
  past_damage_relations: [],
});

const formResource = (type: string, id: number, withArtwork = true) => ({
  id,
  name: `arceus-${type}`,
  is_default: type === "normal",
  pokemon: { name: "arceus", url: "https://pokeapi.co/api/v2/pokemon/493/" },
  form_names: [
    { name: `${type[0].toUpperCase()}${type.slice(1)} Type`, language: { name: "en" } },
  ],
  types: [{ slot: 1, type: { name: type } }],
  sprites: {
    front_default: `/sprites/arceus-${type}.png`,
    front_shiny: `/sprites/shiny/arceus-${type}.png`,
    versions: {
      "generation-iv": {
        "diamond-pearl": {
          front_default: `/sprites/dp/arceus-${type}.png`,
          front_shiny: `/sprites/dp/shiny/arceus-${type}.png`,
        },
      },
      "generation-ix": {
        "scarlet-violet": {
          front_default: `/sprites/sv/arceus-${type}.png`,
          front_shiny: `/sprites/sv/shiny/arceus-${type}.png`,
        },
      },
    },
    other: {
      "official-artwork": {
        front_default: withArtwork ? `/artwork/arceus-${type}.png` : null,
        front_shiny: withArtwork ? `/artwork/shiny/arceus-${type}.png` : null,
      },
    },
  },
});

const basePokemon = {
  id: 493,
  name: "arceus",
  height: 32,
  weight: 3200,
  types: [{ slot: 1, type: { name: "normal" } }],
  abilities: [{ slot: 1, is_hidden: false, ability: { name: "multitype" } }],
  stats: [],
  moves: [],
  forms: formRefs,
  sprites: {
    front_default: "/sprites/arceus-normal.png",
    front_shiny: "/sprites/shiny/arceus-normal.png",
    versions: {},
    other: { "official-artwork": { front_default: "/artwork/arceus-normal.png" } },
  },
};

const species = {
  id: 493,
  name: "arceus",
  names: [{ name: "Arceus", language: { name: "en" } }],
  flavor_text_entries: [],
  gender_rate: -1,
  genera: [],
  evolution_chain: { url: "https://pokeapi.co/api/v2/evolution-chain/1/" },
  varieties: [
    {
      is_default: true,
      pokemon: { name: "arceus", url: "https://pokeapi.co/api/v2/pokemon/493/" },
    },
  ],
};

const evolutionChain = {
  chain: {
    species: { name: "arceus", url: "https://pokeapi.co/api/v2/pokemon-species/493/" },
    evolution_details: [],
    evolves_to: [],
  },
};

const ability = { names: [], effect_entries: [], flavor_text_entries: [] };

function setArceusApi({
  failFormId,
  withoutArtworkFormId,
}: {
  failFormId?: number;
  withoutArtworkFormId?: number;
} = {}) {
  api.fetch.mockImplementation(async (path: string) => {
    if (path === "/pokemon-species/493") return species;
    if (path === "/pokemon/493") return basePokemon;
    if (path === "/evolution-chain/1") return evolutionChain;
    if (path === "/ability/multitype") return ability;
    if (path.startsWith("/pokemon-form/")) {
      const id = Number(path.split("/").at(-1));
      if (id === failFormId) throw new Error("form resource unavailable");
      const [type] = playableForms.find(([, formId]) => formId === id) ?? [];
      if (!type) throw new Error(`Unknown form ${id}`);
      return formResource(type, id, id !== withoutArtworkFormId);
    }
    if (path === "/type/fire") return typeRelations("fire");
    if (path === "/type/normal") return typeRelations("normal");
    if (path === "/type/fairy") return typeRelations("fairy");
    throw new Error(`Unexpected PokéAPI path: ${path}`);
  });
}

describe("Arceus forms", () => {
  beforeEach(() => {
    api.fetch.mockReset();
    setArceusApi();
  });

  it("exposes the 18 playable type forms and chooses Normal by default", async () => {
    const result = await resolveForm(493);

    expect(result.forms).toHaveLength(18);
    expect(result.forms.some((form) => form.name === "arceus-unknown")).toBe(false);
    expect(result.forms.find((form) => form.isDefault)).toEqual({
      id: 493,
      name: "arceus-normal",
      isDefault: true,
    });
    expect(result).toMatchObject({
      targetId: 493,
      selected: { formResourceId: 493 },
    });
  });

  it("loads form artwork, game sprites, shiny sprites and localized names independently", async () => {
    setArceusApi({ failFormId: 10056 });
    const forms = await getPokemonFormSprites(493);
    const fire = forms.find((form) => form.id === 10046)!;
    const failedWater = forms.find((form) => form.id === 10056)!;

    expect(forms).toHaveLength(18);
    expect(fire).toMatchObject({
      names: { en: "Fire Type" },
      defaultSprite: "/sprites/arceus-fire.png",
      shinyDefaultSprite: "/sprites/shiny/arceus-fire.png",
      artwork: "/artwork/arceus-fire.png",
      shinyArtwork: "/artwork/shiny/arceus-fire.png",
      gameSprites: {
        "diamond-pearl": {
          front: "/sprites/dp/arceus-fire.png",
          shiny: "/sprites/dp/shiny/arceus-fire.png",
        },
      },
    });
    expect(formSpriteCandidates(fire, "scarlet-violet", true)).toEqual([
      "/sprites/sv/shiny/arceus-fire.png",
      "/sprites/shiny/arceus-fire.png",
      "/artwork/shiny/arceus-fire.png",
    ]);
    expect(failedWater).toMatchObject({
      id: 10056,
      gameSprites: {},
      defaultSprite: null,
      names: {},
    });
  });

  it("applies the selected form type, sprites, and matchups while keeping moves on Pokémon 493", async () => {
    const detail = await getPokemonDetail(493, 10046);
    const diamondPearl = detailForGame(detail, "diamond-pearl");
    const scarletViolet = detailForGame(detail, "scarlet-violet");

    expect(detail).toMatchObject({
      id: 493,
      pokemonId: 493,
      name: "arceus-fire",
      forms: expect.arrayContaining([
        { id: 10046, name: "arceus-fire", isDefault: false },
      ]),
      types: ["fire"],
      artwork: "/artwork/arceus-fire.png",
      shinyArtwork: "/artwork/shiny/arceus-fire.png",
    });
    expect(diamondPearl.types).toEqual(["fire"]);
    expect(scarletViolet.types).toEqual(["fire"]);
    expect(scarletViolet.matchups.defense.water).toBe(2);
    expect(scarletViolet.matchups.offense.grass).toBe(2);
    expect(spriteForGame(detail.gameSprites, "diamond-pearl", false)).toBe(
      "/sprites/dp/arceus-fire.png",
    );
    expect(spriteForGame(detail.gameSprites, "scarlet-violet", false)).toBe(
      "/sprites/sv/arceus-fire.png",
    );
    expect(detail.gameSprites["scarlet-violet"]).toEqual({
      front: "/sprites/sv/arceus-fire.png",
      shiny: "/sprites/sv/shiny/arceus-fire.png",
    });
  });

  it("uses Normal before the Fairy type existed and Fairy from generation six", async () => {
    const detail = await getPokemonDetail(493, 10085);

    expect(detailForGame(detail, "black-white").types).toEqual(["normal"]);
    expect(detailForGame(detail, "x-y").types).toEqual(["fairy"]);
    expect(detailForGame(detail, "black-white").matchups.defense.fighting).toBe(2);
  });

  it("falls back to the selected form's sprite rather than Normal artwork", async () => {
    setArceusApi({ withoutArtworkFormId: 10046 });
    const detail = await getPokemonDetail(493, 10046);

    expect(detail.artwork).toBe("/sprites/arceus-fire.png");
    expect(detail.shinyArtwork).toBe("/sprites/shiny/arceus-fire.png");
  });

  it("rejects IDs outside Arceus' own form list", async () => {
    await expect(resolveForm(493, 10058)).rejects.toMatchObject({ status: 404 });
  });

  it("keeps other Pokémon forms on the existing variety path", async () => {
    api.fetch.mockImplementation(async (path: string) => {
      if (path === "/pokemon-species/6") {
        return {
          varieties: [
            {
              is_default: true,
              pokemon: { name: "charizard", url: "https://pokeapi.co/api/v2/pokemon/6/" },
            },
            {
              is_default: false,
              pokemon: {
                name: "charizard-mega-x",
                url: "https://pokeapi.co/api/v2/pokemon/10034/",
              },
            },
          ],
        };
      }
      if (path === "/pokemon/6") {
        return { id: 6, name: "charizard", forms: [{ name: "charizard", url: "/pokemon-form/6/" }] };
      }
      if (path === "/pokemon/10034") {
        return {
          id: 10034,
          name: "charizard-mega-x",
          forms: [{ name: "charizard-mega-x", url: "/pokemon-form/10034/" }],
        };
      }
      throw new Error(`Unexpected PokéAPI path: ${path}`);
    });

    await expect(resolveForm(6, 10034)).resolves.toMatchObject({
      targetId: 10034,
      forms: [
        { id: 6, name: "charizard", isDefault: true },
        { id: 10034, name: "charizard-mega-x", isDefault: false },
      ],
    });
  });
});