import { describe, expect, it } from "vitest";
import type { Matchups } from "@/lib/pokedex/matchups";
import {
  MAX_TEAM_SIZE,
  addToTeam,
  parseTeam,
  removeFromTeam,
  serializeTeam,
  teamCoverageGaps,
  teamDefense,
  teamOffense,
  teamWeaknesses,
} from "@/lib/pokedex/team";

const matchups = (
  defense: Record<string, number>,
  offense: Record<string, number> = {},
): Matchups => ({ defense, offense });

describe("team membership", () => {
  it("adds a Pokémon once", () => {
    expect(addToTeam([25], 6)).toEqual([25, 6]);
    expect(addToTeam([25], 25)).toEqual([25]);
  });

  it("stops at six", () => {
    const full = [1, 2, 3, 4, 5, 6];
    expect(full).toHaveLength(MAX_TEAM_SIZE);
    expect(addToTeam(full, 7)).toEqual(full);
  });

  it("removes a Pokémon", () => {
    expect(removeFromTeam([25, 6, 1], 6)).toEqual([25, 1]);
    expect(removeFromTeam([25], 3)).toEqual([25]);
  });
});

describe("parseTeam", () => {
  it("round-trips", () => {
    expect(parseTeam(serializeTeam([25, 6]))).toEqual([25, 6]);
  });

  it("drops anything malformed", () => {
    expect(parseTeam(null)).toEqual([]);
    expect(parseTeam("nonsense")).toEqual([]);
    expect(parseTeam('{"a":1}')).toEqual([]);
    expect(parseTeam('[25,"6",-1,1.5,25,3]')).toEqual([25, 3]);
  });

  it("keeps at most six", () => {
    expect(parseTeam("[1,2,3,4,5,6,7,8]")).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("teamDefense", () => {
  const defense = teamDefense([
    matchups({ water: 2, fire: 0.5, ground: 0 }),
    matchups({ water: 2, fire: 1, ground: 1 }),
    matchups({ water: 0.5, fire: 0.25, ground: 4 }),
  ]);
  const row = (type: string) => defense.find((entry) => entry.type === type);

  it("counts weak and resistant members per type", () => {
    expect(row("water")).toEqual({ type: "water", weak: 2, resistant: 1 });
    expect(row("fire")).toEqual({ type: "fire", weak: 0, resistant: 2 });
    expect(row("ground")).toEqual({ type: "ground", weak: 1, resistant: 1 });
  });

  it("counts immunity as resistance and treats missing types as neutral", () => {
    expect(row("ground")?.resistant).toBe(1);
    expect(row("ice")).toEqual({ type: "ice", weak: 0, resistant: 0 });
  });

  it("covers all 18 types", () => {
    expect(defense).toHaveLength(18);
  });

  it("finds the types the team is weak to", () => {
    expect(teamWeaknesses(defense)).toEqual(["water"]);
  });
});

describe("teamOffense", () => {
  const offense = teamOffense([
    matchups({}, { grass: 2, water: 0.5 }),
    matchups({}, { grass: 2, fire: 2 }),
  ]);

  it("counts members that hit a type for extra damage", () => {
    expect(offense.find((row) => row.type === "grass")?.superEffective).toBe(2);
    expect(offense.find((row) => row.type === "fire")?.superEffective).toBe(1);
    expect(offense.find((row) => row.type === "water")?.superEffective).toBe(0);
  });

  it("lists the types nobody hits for extra damage", () => {
    const gaps = teamCoverageGaps(offense);
    expect(gaps).toContain("water");
    expect(gaps).not.toContain("grass");
    expect(gaps).not.toContain("fire");
  });
});
