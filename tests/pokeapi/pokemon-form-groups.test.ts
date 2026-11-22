import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPokemonDetail,
  getPokemonFormSprites,
  resolveForm,
} from "@/lib/pokeapi/detail";

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

type FormFixture = {
  id: number;
  name: string;
  isDefault: boolean;
  pokemonId: number;
  type: string;
  homeSprites?: {
    front_default?: string | null;
    front_shiny?: string | null;
  };
};

type VarietyFixture = {
  id: number;
  name: string;
  isDefault: boolean;
  forms: FormFixture[];
};

type SpeciesFixture = {
  id: number;
  name: string;
  varieties: VarietyFixture[];
};

const formRef = ({ id, name }: FormFixture) => ({
  name,
  url: `https://pokeapi.co/api/v2/pokemon-form/${id}/`,
});

const homeSpritesFor = (name: string) => ({
  front_default: `/home/${name}.png`,
  front_shiny: `/home/shiny/${name}.png`,
});

const formResource = (form: FormFixture) => ({
  id: form.id,
  name: form.name,
  is_default: form.isDefault,
  pokemon: {
    name: form.name.split("-").slice(0, -1).join("-"),
    url: `https://pokeapi.co/api/v2/pokemon/${form.pokemonId}/`,
  },
  form_names: [
    { name: form.name, language: { name: "en" } },
  ],
  types: [{ slot: 1, type: { name: form.type } }],
  sprites: {
    front_default: `/sprites/${form.name}.png`,
    front_shiny: `/sprites/shiny/${form.name}.png`,
    versions: {
      "generation-ix": {
        "scarlet-violet": {
          front_default: `/sprites/sv/${form.name}.png`,
          front_shiny: `/sprites/sv/shiny/${form.name}.png`,
        },
      },
    },
    other: {
      ...(form.homeSprites ? { home: form.homeSprites } : {}),
      "official-artwork": {
        front_default: `/artwork/${form.name}.png`,
        front_shiny: `/artwork/shiny/${form.name}.png`,
      },
    },
  },
});

const pokemonResource = (variety: VarietyFixture) => ({
  id: variety.id,
  name: variety.name,
  height: 10,
  weight: 100,
  types: [{ slot: 1, type: { name: variety.forms[0]?.type ?? "normal" } }],
  abilities: [],
  stats: [],
  moves: [],
  forms: variety.forms.map(formRef),
  sprites: {
    front_default: `/sprites/${variety.name}.png`,
    front_shiny: `/sprites/shiny/${variety.name}.png`,
    versions: {},
    other: {
      "official-artwork": {
        front_default: `/artwork/${variety.name}.png`,
        front_shiny: `/artwork/shiny/${variety.name}.png`,
      },
    },
  },
});

const speciesResource = (fixture: SpeciesFixture) => ({
  id: fixture.id,
  name: fixture.name,
  names: [{ name: fixture.name, language: { name: "en" } }],
  flavor_text_entries: [],
  gender_rate: -1,
  genera: [],
  evolution_chain: {
    url: `https://pokeapi.co/api/v2/evolution-chain/${fixture.id}/`,
  },
  varieties: fixture.varieties.map((variety) => ({
    is_default: variety.isDefault,
    pokemon: {
      name: variety.name,
      url: `https://pokeapi.co/api/v2/pokemon/${variety.id}/`,
    },
  })),
});

function installFixtures(fixtures: SpeciesFixture[]) {
  const speciesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const varieties = fixtures.flatMap((fixture) => fixture.varieties);
  const varietiesById = new Map(varieties.map((variety) => [variety.id, variety]));
  const forms = varieties.flatMap((variety) => variety.forms);
  const formsById = new Map(forms.map((form) => [form.id, form]));

  api.fetch.mockImplementation(async (path: string) => {
    const [, resource, idText] = path.split("/");
    const id = Number(idText);
    if (resource === "pokemon-species") {
      const fixture = speciesById.get(id);
      if (fixture) return speciesResource(fixture);
    }
    if (resource === "pokemon") {
      const variety = varietiesById.get(id);
      if (variety) return pokemonResource(variety);
    }
    if (resource === "pokemon-form") {
      const form = formsById.get(id);
      if (form) return formResource(form);
    }
    if (resource === "evolution-chain") {
      const fixture = speciesById.get(id);
      if (fixture) {
        return {
          chain: {
            species: {
              name: fixture.name,
              url: `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
            },
            evolution_details: [],
            evolves_to: [],
          },
        };
      }
    }
    if (resource === "type") {
      return {
        name: idText,
        damage_relations: {
          double_damage_from: [],
          half_damage_from: [],
          no_damage_from: [],
          double_damage_to: [],
          half_damage_to: [],
          no_damage_to: [],
        },
        past_damage_relations: [],
      };
    }
    throw new Error(`Unexpected PokéAPI path: ${path}`);
  });
}

const unownForms: FormFixture[] = [
  {
    id: 201,
    name: "unown-a",
    isDefault: true,
    pokemonId: 201,
    type: "psychic",
    homeSprites: homeSpritesFor("unown-a"),
  },
  ...Array.from({ length: 25 }, (_, index) => {
    const letter = String.fromCharCode("b".charCodeAt(0) + index);
    return {
      id: 10001 + index,
      name: `unown-${letter}`,
      isDefault: false,
      pokemonId: 201,
      type: "psychic",
      homeSprites: homeSpritesFor(`unown-${letter}`),
    };
  }),
  {
    id: 10026,
    name: "unown-exclamation",
    isDefault: false,
    pokemonId: 201,
    type: "psychic",
    homeSprites: homeSpritesFor("unown-exclamation"),
  },
  {
    id: 10027,
    name: "unown-question",
    isDefault: false,
    pokemonId: 201,
    type: "psychic",
    homeSprites: homeSpritesFor("unown-question"),
  },
];

describe("Pokémon form resources shared by multiple species varieties", () => {
  beforeEach(() => {
    api.fetch.mockReset();
  });

  it("loads all Unown letter forms and their sprites from the linked form resources", async () => {
    installFixtures([
      {
        id: 201,
        name: "unown",
        varieties: [
          { id: 201, name: "unown", isDefault: true, forms: unownForms },
        ],
      },
    ]);

    const resolved = await resolveForm(201);
    const sprites = await getPokemonFormSprites(201);
    const unownA = sprites.find((sprite) => sprite.id === 201);
    const unownB = sprites.find((sprite) => sprite.id === 10001);
    const question = sprites.find((sprite) => sprite.id === 10027);
    const detail = await getPokemonDetail(201);

    expect(resolved.forms).toHaveLength(28);
    expect(resolved.forms.find((form) => form.isDefault)).toEqual({
      id: 201,
      name: "unown-a",
      isDefault: true,
    });
    expect(question).toMatchObject({
      defaultSprite: "/sprites/unown-question.png",
      names: { en: "unown-question" },
    });
    expect(unownA).toMatchObject({
      artwork: "/home/unown-a.png",
      shinyArtwork: "/home/shiny/unown-a.png",
      defaultSprite: "/sprites/unown-a.png",
      shinyDefaultSprite: "/sprites/shiny/unown-a.png",
      gameSprites: {
        "scarlet-violet": {
          front: "/sprites/sv/unown-a.png",
          shiny: "/sprites/sv/shiny/unown-a.png",
        },
      },
    });
    expect(unownB).toMatchObject({
      artwork: "/home/unown-b.png",
      shinyArtwork: "/home/shiny/unown-b.png",
    });
    expect(sprites).toHaveLength(28);
    for (const form of unownForms) {
      expect(sprites.find((sprite) => sprite.id === form.id)).toMatchObject({
        artwork: form.homeSprites?.front_default,
        shinyArtwork: form.homeSprites?.front_shiny,
      });
    }
    expect(detail).toMatchObject({
      artwork: "/home/unown-a.png",
      shinyArtwork: "/home/shiny/unown-a.png",
    });
  });

  it("falls back to each Unown form's own static sprite when HOME artwork is absent", async () => {
    const formsWithoutHome = unownForms.map((form) => ({
      ...form,
      homeSprites: undefined,
    }));
    installFixtures([
      {
        id: 201,
        name: "unown",
        varieties: [
          { id: 201, name: "unown", isDefault: true, forms: formsWithoutHome },
        ],
      },
    ]);

    const sprites = await getPokemonFormSprites(201);
    const unownA = sprites.find((sprite) => sprite.id === 201);
    const detail = await getPokemonDetail(201);

    expect(unownA).toMatchObject({
      artwork: "/sprites/unown-a.png",
      shinyArtwork: "/sprites/shiny/unown-a.png",
    });
    expect(detail).toMatchObject({
      artwork: "/sprites/unown-a.png",
      shinyArtwork: "/sprites/shiny/unown-a.png",
    });
    expect(sprites.find((sprite) => sprite.id === 10001)).toMatchObject({
      artwork: "/sprites/unown-b.png",
      shinyArtwork: "/sprites/shiny/unown-b.png",
    });
  });

  it("falls back independently when a HOME default or shiny image is missing", async () => {
    const formsWithPartialHome = unownForms.map((form) => ({
      ...form,
      homeSprites:
        form.id === 201
          ? { front_shiny: "/home/shiny/unown-a.png" }
          : form.id === 10001
            ? { front_default: "/home/unown-b.png" }
            : form.homeSprites,
    }));
    installFixtures([
      {
        id: 201,
        name: "unown",
        varieties: [
          { id: 201, name: "unown", isDefault: true, forms: formsWithPartialHome },
        ],
      },
    ]);

    const sprites = await getPokemonFormSprites(201);

    expect(sprites.find((sprite) => sprite.id === 201)).toMatchObject({
      artwork: "/sprites/unown-a.png",
      shinyArtwork: "/home/shiny/unown-a.png",
    });
    expect(sprites.find((sprite) => sprite.id === 10001)).toMatchObject({
      artwork: "/home/unown-b.png",
      shinyArtwork: "/sprites/shiny/unown-b.png",
    });
  });

  it("uses Silvally's selected form type and sprites while keeping its Pokémon ID", async () => {
    const types = [
      "normal", "fighting", "flying", "poison", "ground", "rock", "bug",
      "ghost", "steel", "fire", "water", "grass", "electric", "psychic",
      "ice", "dragon", "dark", "fairy",
    ];
    const forms = types.map((type, index) => ({
      id: index === 0 ? 773 : 10232 + index - 1,
      name: `silvally-${type}`,
      isDefault: index === 0,
      pokemonId: 773,
      type,
    }));
    installFixtures([
      {
        id: 773,
        name: "silvally",
        varieties: [{ id: 773, name: "silvally", isDefault: true, forms }],
      },
    ]);

    const fireId = forms.find((form) => form.name === "silvally-fire")!.id;
    const detail = await getPokemonDetail(773, fireId);

    expect(detail).toMatchObject({
      pokemonId: 773,
      name: "silvally-fire",
      types: ["fire"],
      pastTypes: [],
      artwork: "/artwork/silvally-fire.png",
      forms: expect.arrayContaining([
        { id: fireId, name: "silvally-fire", isDefault: false },
      ]),
    });
  });

  it("uses the form resource's default flag even when its ID differs from the Pokémon ID", async () => {
    installFixtures([
      {
        id: 716,
        name: "xerneas",
        varieties: [
          {
            id: 716,
            name: "xerneas",
            isDefault: true,
            forms: [
              { id: 716, name: "xerneas-active", isDefault: false, pokemonId: 716, type: "fairy" },
              { id: 10132, name: "xerneas-neutral", isDefault: true, pokemonId: 716, type: "fairy" },
            ],
          },
        ],
      },
    ]);

    const resolved = await resolveForm(716);
    const detail = await getPokemonDetail(716);

    expect(resolved.forms.find((form) => form.isDefault)).toEqual({
      id: 10132,
      name: "xerneas-neutral",
      isDefault: true,
    });
    expect(detail).toMatchObject({
      pokemonId: 716,
      name: "xerneas-neutral",
      types: ["fairy"],
    });
  });

  it("keeps Alcremie's form resources alongside its separate Gigantamax variety", async () => {
    installFixtures([
      {
        id: 869,
        name: "alcremie",
        varieties: [
          {
            id: 869,
            name: "alcremie",
            isDefault: true,
            forms: [
              {
                id: 869,
                name: "alcremie-vanilla-cream-strawberry-sweet",
                isDefault: true,
                pokemonId: 869,
                type: "fairy",
              },
              {
                id: 10346,
                name: "alcremie-ruby-cream-strawberry-sweet",
                isDefault: false,
                pokemonId: 869,
                type: "fairy",
              },
            ],
          },
          {
            id: 10223,
            name: "alcremie-gmax",
            isDefault: false,
            forms: [
              {
                id: 10223,
                name: "alcremie-gmax",
                isDefault: true,
                pokemonId: 10223,
                type: "fairy",
              },
            ],
          },
        ],
      },
    ]);

    const resolved = await resolveForm(869);

    expect(resolved.forms).toEqual([
      { id: 869, name: "alcremie-vanilla-cream-strawberry-sweet", isDefault: true },
      { id: 10346, name: "alcremie-ruby-cream-strawberry-sweet", isDefault: false },
      { id: 10223, name: "alcremie-gmax", isDefault: false },
    ]);
    await expect(resolveForm(869, 10223)).resolves.toMatchObject({
      targetId: 10223,
      forms: resolved.forms,
    });
  });
});