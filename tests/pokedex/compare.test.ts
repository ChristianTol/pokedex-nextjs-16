import { describe, expect, it } from "vitest";
import {
  bestMultiplier,
  commonGames,
  defenseVerdict,
  offenseVerdict,
  compareGame,
  compareStats,
  parseCompare,
  serializeCompare,
  statTotal,
} from "@/lib/pokedex/compare";

describe("parseCompare", () => {
  it("reads both slots and the game", () => {
    expect(parseCompare("?compare=25,6&game=x-y")).toEqual({
      ids: [25, 6],
      game: "x-y",
    });
  });

  it("keeps an empty slot in its place", () => {
    expect(parseCompare("?compare=25").ids).toEqual([25, null]);
    expect(parseCompare("?compare=25,").ids).toEqual([25, null]);
    expect(parseCompare("?compare=,6").ids).toEqual([null, 6]);
  });

  it("ignores what is not a valid id", () => {
    expect(parseCompare("").ids).toEqual([null, null]);
    expect(parseCompare("?compare=abc,0").ids).toEqual([null, null]);
    expect(parseCompare("?compare=-3,1.5").ids).toEqual([null, null]);
    expect(parseCompare("?compare=25,6,9").ids).toEqual([25, 6]);
  });
});

describe("serializeCompare", () => {
  it("round-trips", () => {
    const state = { ids: [25, 6] as [number, number], game: "x-y" };
    expect(serializeCompare(state)).toBe("?compare=25,6&game=x-y");
    expect(parseCompare(serializeCompare(state))).toEqual(state);
  });

  it("leaves out an empty second slot and the game without Pokémon", () => {
    expect(serializeCompare({ ids: [25, null], game: null })).toBe(
      "?compare=25",
    );
    expect(serializeCompare({ ids: [null, 6], game: null })).toBe(
      "?compare=,6",
    );
    expect(serializeCompare({ ids: [null, null], game: "x-y" })).toBe("");
  });
});

describe("compareStats", () => {
  it("puts the stats side by side", () => {
    expect(
      compareStats(
        [
          { name: "hp", value: 35 },
          { name: "speed", value: 90 },
        ],
        [
          { name: "hp", value: 78 },
          { name: "speed", value: 100 },
        ],
      ),
    ).toEqual([
      { name: "hp", a: 35, b: 78 },
      { name: "speed", a: 90, b: 100 },
    ]);
  });

  it("keeps a stat only one of them has", () => {
    expect(
      compareStats(
        [{ name: "special", value: 50 }],
        [{ name: "special-attack", value: 60 }],
      ),
    ).toEqual([
      { name: "special", a: 50, b: undefined },
      { name: "special-attack", a: undefined, b: 60 },
    ]);
  });
});

describe("statTotal", () => {
  it("adds the stats", () => {
    expect(
      statTotal([
        { name: "hp", value: 35 },
        { name: "speed", value: 90 },
      ]),
    ).toBe(125);
    expect(statTotal([])).toBe(0);
  });
});

describe("games", () => {
  it("lists the games both have, in the order of the first", () => {
    expect(
      commonGames(["x-y", "red-blue", "gold-silver"], ["red-blue", "x-y"]),
    ).toEqual(["x-y", "red-blue"]);
    expect(commonGames(["x-y"], [])).toEqual([]);
  });

  it("keeps the chosen game while both have it", () => {
    expect(compareGame("red-blue", ["x-y", "red-blue"])).toBe("red-blue");
    expect(compareGame("gold-silver", ["x-y", "red-blue"])).toBe("x-y");
    expect(compareGame(null, ["x-y"])).toBe("x-y");
    expect(compareGame("x-y", [])).toBeNull();
  });
});

describe("matchups between two Pokémon", () => {
  // A grass/poison Pokémon: weak to fire and psychic, resists water.
  const grassPoison = {
    defense: { fire: 2, psychic: 2, water: 0.5, ground: 1, normal: 1 },
    offense: {},
  };

  it("takes the best of the attacker's types", () => {
    expect(bestMultiplier(["fire"], grassPoison)).toBe(2);
    expect(bestMultiplier(["water", "fire"], grassPoison)).toBe(2);
    expect(bestMultiplier(["water"], grassPoison)).toBe(0.5);
  });

  it("counts a type it has no data for as neutral", () => {
    expect(bestMultiplier(["dragon"], grassPoison)).toBe(1);
    expect(bestMultiplier([], grassPoison)).toBe(1);
  });

  it("judges the attack", () => {
    expect(offenseVerdict(4)).toBe("strong");
    expect(offenseVerdict(2)).toBe("strong");
    expect(offenseVerdict(1)).toBe("neutral");
    expect(offenseVerdict(0.5)).toBe("weak");
    expect(offenseVerdict(0.25)).toBe("weak");
    expect(offenseVerdict(0)).toBe("noEffect");
  });

  it("judges the defence", () => {
    expect(defenseVerdict(2)).toBe("vulnerable");
    expect(defenseVerdict(1)).toBe("neutral");
    expect(defenseVerdict(0.5)).toBe("protected");
    expect(defenseVerdict(0)).toBe("immune");
  });
});
