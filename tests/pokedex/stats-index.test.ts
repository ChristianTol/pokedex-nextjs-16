import { describe, expect, it } from "vitest";
import { STATS_INDEX } from "@/lib/pokedex/stats-data";
import { decodeIndex, decodeRow, encodeRow } from "@/lib/pokedex/stats-index";

const stats = {
  hp: 35,
  attack: 55,
  defense: 40,
  "special-attack": 50,
  "special-defense": 50,
  speed: 90,
};

describe("encodeRow and decodeRow", () => {
  it("round-trips the stats and adds the total", () => {
    const row = encodeRow(stats, null);
    expect(row).toEqual([35, 55, 40, 50, 50, 90, 0]);
    expect(decodeRow(row)).toEqual({ ...stats, total: 320, special: null });
  });

  it("stores the special kind", () => {
    expect(decodeRow(encodeRow(stats, "legendary")).special).toBe("legendary");
    expect(decodeRow(encodeRow(stats, "mythical")).special).toBe("mythical");
    expect(decodeRow(encodeRow(stats, "baby")).special).toBe("baby");
  });
});

describe("decodeIndex", () => {
  it("keys the rows by species id", () => {
    const index = decodeIndex({
      generatedAt: "2026-01-01",
      pokemon: { "25": [35, 55, 40, 50, 50, 90, 0] },
    });
    expect(index.get(25)?.speed).toBe(90);
    expect(index.get(26)).toBeUndefined();
  });
});

describe("the stored index", () => {
  it("has the known Pokémon", () => {
    expect(STATS_INDEX.get(25)).toMatchObject({ speed: 90, special: null });
    expect(STATS_INDEX.get(150)?.special).toBe("legendary");
    expect(STATS_INDEX.get(151)?.special).toBe("mythical");
    expect(STATS_INDEX.get(172)?.special).toBe("baby");
    expect(STATS_INDEX.get(1)?.total).toBe(318);
  });

  it("is complete up to the last Pokémon it knows", () => {
    const ids = [...STATS_INDEX.keys()];
    expect(ids.length).toBeGreaterThanOrEqual(1025);
    expect(Math.max(...ids)).toBe(ids.length);
  });
});
