import { describe, expect, it } from "vitest";
import type { PokemonIndexEntry } from "@/lib/pokeapi/index-list";
import {
  SORT_OPTIONS,
  matchesSearch,
  queryPokedex,
  statSortOf,
  visibleCount,
} from "@/lib/pokedex/query";
import { decodeRow } from "@/lib/pokedex/stats-index";

const entries: PokemonIndexEntry[] = [
  { id: 1, name: "bulbasaur" },
  { id: 4, name: "charmander" },
  { id: 6, name: "charizard" },
  { id: 25, name: "pikachu" },
  { id: 250, name: "ho-oh" },
];

const base = {
  search: "",
  typeIds: null,
  regionIds: null,
  favoriteIds: null,
  sort: "id-asc",
} as const;
const ids = (list: PokemonIndexEntry[]) => list.map((entry) => entry.id);

describe("matchesSearch", () => {
  it("matches name fragments case-insensitively", () => {
    expect(matchesSearch(entries[1], "CHAR")).toBe(true);
    expect(matchesSearch(entries[0], "char")).toBe(false);
  });

  it("matches plain numbers by id prefix", () => {
    expect(matchesSearch(entries[3], "25")).toBe(true);
    expect(matchesSearch(entries[4], "25")).toBe(true);
    expect(matchesSearch(entries[3], "5")).toBe(false);
  });

  it("matches numbers with # exactly", () => {
    expect(matchesSearch(entries[3], "#25")).toBe(true);
    expect(matchesSearch(entries[4], "#25")).toBe(false);
    expect(matchesSearch(entries[0], "#0001")).toBe(true);
  });

  it("matches leading zeros", () => {
    expect(matchesSearch(entries[0], "001")).toBe(true);
  });

  it("matches everything for an empty search", () => {
    expect(matchesSearch(entries[0], "   ")).toBe(true);
  });
});

describe("matchesSearch in other languages", () => {
  const names = { ja: "リザードン", de: "Glurak", ko: "리자몽" };

  it("matches a name in any loaded language", () => {
    expect(matchesSearch(entries[2], "リザ", names)).toBe(true);
    expect(matchesSearch(entries[2], "GLUR", names)).toBe(true);
    expect(matchesSearch(entries[2], "리자", names)).toBe(true);
  });

  it("still matches the slug, and rejects what matches neither", () => {
    expect(matchesSearch(entries[2], "zard", names)).toBe(true);
    expect(matchesSearch(entries[2], "ピカ", names)).toBe(false);
    expect(matchesSearch(entries[2], "ピカ")).toBe(false);
  });
});

describe("queryPokedex", () => {
  it("sorts by number in both directions", () => {
    expect(ids(queryPokedex(entries, base))).toEqual([1, 4, 6, 25, 250]);
    expect(ids(queryPokedex(entries, { ...base, sort: "id-desc" }))).toEqual([
      250, 25, 6, 4, 1,
    ]);
  });

  it("sorts by name A-Z and Z-A", () => {
    expect(ids(queryPokedex(entries, { ...base, sort: "name-asc" }))).toEqual([
      1, 6, 4, 250, 25,
    ]);
    expect(ids(queryPokedex(entries, { ...base, sort: "name-desc" }))).toEqual([
      25, 250, 4, 6, 1,
    ]);
  });

  it("filters by type ids and combines with search", () => {
    const fire = new Set([4, 6]);
    expect(ids(queryPokedex(entries, { ...base, typeIds: fire }))).toEqual([
      4, 6,
    ]);
    expect(
      ids(queryPokedex(entries, { ...base, typeIds: fire, search: "zard" })),
    ).toEqual([6]);
  });

  it("filters by region ids", () => {
    const kanto = new Set([1, 4, 6, 25]);
    expect(ids(queryPokedex(entries, { ...base, regionIds: kanto }))).toEqual([
      1, 4, 6, 25,
    ]);
  });

  it("combines type, region, search and sort", () => {
    const fire = new Set([4, 6, 250]);
    const kanto = new Set([1, 4, 6, 25]);
    expect(
      ids(
        queryPokedex(entries, {
          search: "char",
          typeIds: fire,
          regionIds: kanto,
          favoriteIds: null,
          sort: "id-desc",
        }),
      ),
    ).toEqual([6, 4]);
    expect(
      ids(queryPokedex(entries, { ...base, typeIds: fire, regionIds: kanto })),
    ).toEqual([4, 6]);
  });

  it("filters by favorite ids, also combined with other filters", () => {
    const favorites = new Set([4, 25]);
    expect(
      ids(queryPokedex(entries, { ...base, favoriteIds: favorites })),
    ).toEqual([4, 25]);
    expect(
      ids(
        queryPokedex(entries, {
          ...base,
          favoriteIds: favorites,
          typeIds: new Set([4, 6]),
        }),
      ),
    ).toEqual([4]);
    expect(
      ids(queryPokedex(entries, { ...base, favoriteIds: new Set() })),
    ).toEqual([]);
  });

  it("does not mutate the input", () => {
    const copy = [...entries];
    queryPokedex(entries, { ...base, sort: "id-desc" });
    expect(entries).toEqual(copy);
  });
});

describe("visibleCount", () => {
  it("starts at 20 and grows by 30 per scroll", () => {
    expect(visibleCount(1)).toBe(20);
    expect(visibleCount(2)).toBe(50);
    expect(visibleCount(3)).toBe(80);
  });
});

describe("queryPokedex with names", () => {
  it("finds a Pokémon by a loaded name, but only those that have names", () => {
    const result = queryPokedex(entries, {
      ...base,
      search: "ピカ",
      names: { 25: { ja: "ピカチュウ" } },
    });
    expect(ids(result)).toEqual([25]);
  });
});

describe("sorting and filtering on stats", () => {
  // hp, attack, defense, special attack, special defense, speed, kind
  const stats = new Map([
    [1, decodeRow([45, 49, 49, 65, 65, 45, 0])],
    [4, decodeRow([39, 52, 43, 60, 50, 65, 0])],
    [25, decodeRow([35, 55, 40, 50, 50, 90, 0])],
    [250, decodeRow([106, 130, 90, 110, 154, 90, 1])],
  ]);
  const run = (query: Partial<Parameters<typeof queryPokedex>[1]>) =>
    ids(queryPokedex(entries, { ...base, stats, ...query }));

  it("sorts high to low and low to high", () => {
    expect(run({ sort: "speed-desc" }).slice(0, 2)).toEqual([25, 250]);
    expect(run({ sort: "hp-asc" }).slice(0, 2)).toEqual([25, 4]);
  });

  it("sorts on the total of the stats", () => {
    expect(run({ sort: "total-desc" })[0]).toBe(250);
    expect(run({ sort: "total-asc" })[0]).toBe(4);
  });

  it("breaks ties by number", () => {
    // 25 and 250 are both 90 fast.
    expect(run({ sort: "speed-desc" }).slice(0, 2)).toEqual([25, 250]);
    expect(run({ sort: "speed-asc" }).slice(-3)).toEqual([25, 250, 6]);
  });

  it("puts Pokémon missing from the index last, in either direction", () => {
    expect(run({ sort: "attack-desc" }).at(-1)).toBe(6);
    expect(run({ sort: "attack-asc" }).at(-1)).toBe(6);
  });

  it("filters on the special kind and leaves out unknown Pokémon", () => {
    expect(run({ special: "legendary" })).toEqual([250]);
    expect(run({ special: "baby" })).toEqual([]);
    expect(run({ special: null })).toHaveLength(5);
  });
});

describe("statSortOf", () => {
  it("reads stat sorts and nothing else", () => {
    expect(statSortOf("special-defense-asc")).toEqual({
      stat: "special-defense",
      direction: "asc",
    });
    expect(statSortOf("total-desc")).toEqual({
      stat: "total",
      direction: "desc",
    });
    expect(statSortOf("id-asc")).toBeNull();
    expect(statSortOf("name-desc")).toBeNull();
  });

  it("has a stat sort for every direction", () => {
    expect(SORT_OPTIONS).toHaveLength(4 + 7 * 2);
  });
});
