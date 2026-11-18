import { describe, expect, it } from "vitest";
import {
  parseShiny,
  serializeShiny,
  setShiny,
  setShinyMany,
} from "@/lib/pokedex/shiny";

describe("parseShiny", () => {
  it("reads a stored list", () => {
    expect(parseShiny("[25,6]")).toEqual([25, 6]);
  });

  it("drops duplicates and anything that is not a species id", () => {
    expect(parseShiny('[25,25,"6",0,-1,1.5,null,7]')).toEqual([25, 7]);
  });

  it("returns an empty list for missing or malformed data", () => {
    expect(parseShiny(null)).toEqual([]);
    expect(parseShiny("")).toEqual([]);
    expect(parseShiny("{oops")).toEqual([]);
    expect(parseShiny('{"a":1}')).toEqual([]);
  });

  it("round-trips with serializeShiny", () => {
    expect(parseShiny(serializeShiny([1, 4, 7]))).toEqual([1, 4, 7]);
  });
});

describe("setShiny", () => {
  it("adds and removes a species", () => {
    expect(setShiny([1], 4, true)).toEqual([1, 4]);
    expect(setShiny([1, 4], 1, false)).toEqual([4]);
  });

  it("returns the same list when nothing changes", () => {
    const ids = [1, 4];
    expect(setShiny(ids, 4, true)).toBe(ids);
    expect(setShiny(ids, 7, false)).toBe(ids);
  });
});

describe("setShinyMany", () => {
  it("turns several species on or off", () => {
    expect(setShinyMany([1], [1, 2, 3], true)).toEqual([1, 2, 3]);
    expect(setShinyMany([1, 2, 9], [1, 2, 3], false)).toEqual([9]);
  });

  it("returns the same list when nothing changes", () => {
    const ids = [1, 2];
    expect(setShinyMany(ids, [1, 2], true)).toBe(ids);
  });
});
