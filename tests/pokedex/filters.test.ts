import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  parseFilters,
  parsePokemonParam,
  serializeFilters,
  withPokemon,
} from "@/lib/pokedex/filters";

const types = ["fire", "water"];
const regions = ["kanto", "johto"];
const parse = (query: string) =>
  parseFilters(new URLSearchParams(query), types, regions);

describe("parseFilters", () => {
  it("returns defaults for an empty query", () => {
    expect(parse("")).toEqual(EMPTY_FILTERS);
  });

  it("reads valid values", () => {
    expect(
      parse(
        "q=char&type=fire&region=kanto&fav=1&special=mythical&sort=name-desc",
      ),
    ).toEqual({
      search: "char",
      type: "fire",
      region: "kanto",
      favorites: true,
      special: "mythical",
      sort: "name-desc",
    });
  });

  it("ignores unknown types, regions, sorts and special kinds", () => {
    expect(
      parse("type=lava&region=atlantis&sort=random&special=shiny"),
    ).toEqual(EMPTY_FILTERS);
  });

  it("reads sorts on a stat", () => {
    expect(parse("sort=special-attack-desc").sort).toBe("special-attack-desc");
    expect(parse("sort=speed-asc").sort).toBe("speed-asc");
  });
});

describe("serializeFilters", () => {
  it("writes the favorites flag only when set", () => {
    expect(serializeFilters({ ...EMPTY_FILTERS, favorites: true })).toBe(
      "?fav=1",
    );
    expect(parse("fav=0").favorites).toBe(false);
  });

  it("is empty for default filters", () => {
    expect(serializeFilters(EMPTY_FILTERS)).toBe("");
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("ignores a whitespace-only search", () => {
    expect(serializeFilters({ ...EMPTY_FILTERS, search: "  " })).toBe("");
  });

  it("round-trips active filters", () => {
    const filters = {
      search: "mr mime",
      type: "fire",
      region: "johto",
      favorites: true,
      special: "legendary" as const,
      sort: "speed-desc" as const,
    };
    const query = serializeFilters(filters);
    expect(parse(query)).toEqual(filters);
    expect(hasActiveFilters(filters)).toBe(true);
  });
});

describe("withPokemon", () => {
  it("adds the param and keeps the filters", () => {
    expect(withPokemon("?type=fire", 25)).toBe("?type=fire&pokemon=25");
    expect(withPokemon("", 25)).toBe("?pokemon=25");
  });

  it("replaces an existing id", () => {
    expect(withPokemon("?pokemon=1", 4)).toBe("?pokemon=4");
  });

  it("removes the param", () => {
    expect(withPokemon("?type=fire&pokemon=25", null)).toBe("?type=fire");
    expect(withPokemon("?pokemon=25", null)).toBe("");
  });
});

describe("parsePokemonParam", () => {
  it("reads valid ids and rejects the rest", () => {
    expect(parsePokemonParam("?pokemon=25")).toBe(25);
    expect(parsePokemonParam("")).toBeNull();
    expect(parsePokemonParam("?pokemon=abc")).toBeNull();
    expect(parsePokemonParam("?pokemon=0")).toBeNull();
    expect(parsePokemonParam("?pokemon=-3")).toBeNull();
  });
});
