import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { getPokemonFormSprites } from "@/lib/pokeapi/detail";

const pokemon = (id: number) => ({
  id,
  forms: [{ url: `https://pokeapi.co/api/v2/pokemon-form/${id}/` }],
  sprites: { front_default: `/pokemon-${id}.png`, versions: {} },
});

describe("getPokemonFormSprites form names", () => {
  beforeEach(() => {
    api.fetch.mockReset();
  });

  it("loads localized form names and isolates a failed form-name request", async () => {
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
      if (path === "/pokemon/6") return pokemon(6);
      if (path === "/pokemon/10034") return pokemon(10034);
      if (path === "/pokemon-form/6") {
        return {
          form_names: [
            { name: "Normal", language: { name: "en" } },
            { name: "Normal", language: { name: "de" } },
          ],
        };
      }
      if (path === "/pokemon-form/10034") {
        throw new Error("form name unavailable");
      }
      throw new Error(`Unexpected PokéAPI path: ${path}`);
    });

    const forms = await getPokemonFormSprites(6);

    expect(forms[0]).toMatchObject({
      id: 6,
      names: { en: "Normal", de: "Normal" },
      defaultSprite: "/pokemon-6.png",
    });
    expect(forms[1]).toMatchObject({
      id: 10034,
      names: {},
      defaultSprite: "/pokemon-10034.png",
    });
  });
});