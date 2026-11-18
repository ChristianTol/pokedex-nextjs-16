import { describe, expect, it } from "vitest";
import type { DamageRelations } from "@/lib/pokedex/matchups";
import {
  NEWEST_GENERATION,
  formatChartMultiplier,
  parseGeneration,
  typeTable,
  typesInGeneration,
  type TypeChartEntry,
} from "@/lib/pokedex/type-chart";
import { POKEMON_TYPES } from "@/lib/pokedex/types";

const relations = (
  partial: Partial<Record<keyof DamageRelations, string[]>>,
): DamageRelations => {
  const list = (key: keyof DamageRelations) =>
    (partial[key] ?? []).map((name) => ({ name }));
  return {
    double_damage_from: list("double_damage_from"),
    half_damage_from: list("half_damage_from"),
    no_damage_from: list("no_damage_from"),
    double_damage_to: list("double_damage_to"),
    half_damage_to: list("half_damage_to"),
    no_damage_to: list("no_damage_to"),
  };
};

/** Every type, mostly empty; the ones we care about get relations. */
function entries(
  special: Record<
    string,
    {
      relations?: DamageRelations;
      past?: { generation: number; relations: DamageRelations }[];
      generation?: number;
    }
  >,
): TypeChartEntry[] {
  return POKEMON_TYPES.map((type) => ({
    generation: special[type]?.generation ?? 1,
    chart: {
      name: type,
      relations: special[type]?.relations ?? relations({}),
      past: special[type]?.past ?? [],
    },
  }));
}

describe("typesInGeneration", () => {
  const all = entries({
    dark: { generation: 2 },
    steel: { generation: 2 },
    fairy: { generation: 6 },
  });

  it("leaves out types that did not exist yet", () => {
    const first = typesInGeneration(all, 1);
    expect(first).toHaveLength(15);
    expect(first).not.toContain("dark");
    expect(first).not.toContain("fairy");
    expect(typesInGeneration(all, 2)).toHaveLength(17);
    expect(typesInGeneration(all, 6)).toHaveLength(18);
  });
});

describe("typeTable", () => {
  const all = entries({
    fire: {
      relations: relations({
        double_damage_to: ["grass", "ice"],
        half_damage_to: ["water"],
      }),
    },
    normal: { relations: relations({ no_damage_to: ["ghost"] }) },
    ghost: {
      relations: relations({ double_damage_to: ["psychic", "ghost"] }),
      // In generation 1 Ghost did nothing to Psychic.
      past: [
        {
          generation: 1,
          relations: relations({ no_damage_to: ["psychic"] }),
        },
      ],
    },
  });

  it("gives 2, 0.5, 0 and 1", () => {
    const table = typeTable(all, NEWEST_GENERATION);
    expect(table.fire.grass).toBe(2);
    expect(table.fire.water).toBe(0.5);
    expect(table.normal.ghost).toBe(0);
    expect(table.fire.normal).toBe(1);
  });

  it("uses the chart of the generation", () => {
    expect(typeTable(all, NEWEST_GENERATION).ghost.psychic).toBe(2);
    expect(typeTable(all, 1).ghost.psychic).toBe(0);
    expect(typeTable(all, 2).ghost.psychic).toBe(2);
  });

  it("has a row and a column per type that exists", () => {
    const table = typeTable(
      entries({ dark: { generation: 2 }, fairy: { generation: 6 } }),
      1,
    );
    expect(Object.keys(table)).toHaveLength(16);
    expect(Object.keys(table.normal)).toHaveLength(16);
    expect(table.dark).toBeUndefined();
  });
});

describe("formatChartMultiplier", () => {
  it("writes 2×, ½× and 0× and leaves neutral empty", () => {
    expect(formatChartMultiplier(2)).toBe("2×");
    expect(formatChartMultiplier(0.5)).toBe("½×");
    expect(formatChartMultiplier(0)).toBe("0×");
    expect(formatChartMultiplier(1)).toBe("");
  });
});

describe("parseGeneration", () => {
  it("reads 1 to 9 and falls back to the newest", () => {
    expect(parseGeneration("3")).toBe(3);
    expect(parseGeneration(null)).toBe(NEWEST_GENERATION);
    expect(parseGeneration("0")).toBe(NEWEST_GENERATION);
    expect(parseGeneration("10")).toBe(NEWEST_GENERATION);
    expect(parseGeneration("abc")).toBe(NEWEST_GENERATION);
    expect(parseGeneration("2.5")).toBe(NEWEST_GENERATION);
  });
});
