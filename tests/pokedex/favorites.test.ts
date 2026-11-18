import { describe, expect, it } from "vitest";
import {
  favoriteSpeciesIds,
  makeFavoriteKey,
  parseFavorites,
  serializeFavorites,
  speciesIdOf,
  toggleFavorite,
  toggleSpeciesFavorite,
} from "@/lib/pokedex/favorites";

describe("makeFavoriteKey", () => {
  it("uses the species id for the default form", () => {
    expect(makeFavoriteKey(6, null, 6)).toBe("6");
    expect(makeFavoriteKey(6, 6, 6)).toBe("6");
  });

  it("adds the form id for alternative forms", () => {
    expect(makeFavoriteKey(6, 10034, 6)).toBe("6:10034");
  });
});

describe("speciesIdOf", () => {
  it("reads the species from either key shape", () => {
    expect(speciesIdOf("25")).toBe(25);
    expect(speciesIdOf("6:10034")).toBe(6);
  });
});

describe("parseFavorites", () => {
  it("round-trips a serialised list", () => {
    const keys = ["25", "6:10034"];
    expect(parseFavorites(serializeFavorites(keys))).toEqual(keys);
  });

  it("returns an empty list for missing or malformed input", () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites("")).toEqual([]);
    expect(parseFavorites("{not json")).toEqual([]);
    expect(parseFavorites('{"a":1}')).toEqual([]);
  });

  it("drops invalid entries and duplicates", () => {
    expect(parseFavorites('["25", 7, "abc", "25", "6:x", "1:2"]')).toEqual([
      "25",
      "1:2",
    ]);
  });
});

describe("toggleFavorite", () => {
  it("adds and removes a key without mutating the input", () => {
    const keys = ["25"];
    expect(toggleFavorite(keys, "6")).toEqual(["25", "6"]);
    expect(toggleFavorite(keys, "25")).toEqual([]);
    expect(keys).toEqual(["25"]);
  });
});

describe("favoriteSpeciesIds", () => {
  it("collapses forms into their species", () => {
    expect(favoriteSpeciesIds(["6", "6:10034", "25"])).toEqual(
      new Set([6, 25]),
    );
  });
});

describe("toggleSpeciesFavorite", () => {
  it("adds the default form when the species has no favorites", () => {
    expect(toggleSpeciesFavorite(["25"], 6)).toEqual(["25", "6"]);
  });

  it("removes every form of a favorite species", () => {
    expect(toggleSpeciesFavorite(["6", "25", "6:10034"], 6)).toEqual(["25"]);
    expect(toggleSpeciesFavorite(["6:10034"], 6)).toEqual([]);
  });
});
