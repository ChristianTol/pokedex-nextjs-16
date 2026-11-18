import { describe, expect, it } from "vitest";
import { idFromUrl } from "@/lib/pokeapi/client";
import {
  parseGeneration,
  parseIndex,
  parseTypeMemberIds,
  parseTypeNames,
} from "@/lib/pokeapi/index-list";

const resource = (name: string, path: string, id: number) => ({
  name,
  url: `https://pokeapi.co/api/v2/${path}/${id}/`,
});

describe("idFromUrl", () => {
  it("reads the id with and without trailing slash", () => {
    expect(idFromUrl("https://pokeapi.co/api/v2/pokemon/25/")).toBe(25);
    expect(idFromUrl("https://pokeapi.co/api/v2/pokemon/25")).toBe(25);
  });

  it("throws when there is no id", () => {
    expect(() => idFromUrl("https://pokeapi.co/api/v2/pokemon/")).toThrow();
  });
});

describe("parseIndex", () => {
  it("maps urls to ids and sorts by id", () => {
    const result = parseIndex({
      results: [
        resource("pikachu", "pokemon-species", 25),
        resource("bulbasaur", "pokemon-species", 1),
      ],
    });
    expect(result).toEqual([
      { id: 1, name: "bulbasaur" },
      { id: 25, name: "pikachu" },
    ]);
  });
});

describe("parseTypeNames", () => {
  it("hides non-selectable types", () => {
    const result = parseTypeNames({
      results: [
        resource("fire", "type", 10),
        resource("unknown", "type", 10001),
        resource("shadow", "type", 10002),
        resource("stellar", "type", 19),
      ],
    });
    expect(result).toEqual(["fire"]);
  });
});

describe("parseTypeMemberIds", () => {
  it("keeps only ids from the index, dropping alternative forms", () => {
    const result = parseTypeMemberIds(
      {
        pokemon: [
          { pokemon: resource("charmander", "pokemon", 4) },
          { pokemon: resource("charizard-mega-x", "pokemon", 10034) },
        ],
      },
      new Set([4, 6]),
    );
    expect(result).toEqual([4]);
  });
});

describe("parseGeneration", () => {
  it("maps a generation to its region with sorted species ids", () => {
    const result = parseGeneration({
      id: 2,
      main_region: { name: "johto" },
      pokemon_species: [
        resource("togepi", "pokemon-species", 175),
        resource("chikorita", "pokemon-species", 152),
      ],
    });
    expect(result).toEqual({
      name: "johto",
      generation: 2,
      pokemonIds: [152, 175],
    });
  });
});
