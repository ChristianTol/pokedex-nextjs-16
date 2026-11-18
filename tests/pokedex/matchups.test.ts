import { describe, expect, it } from "vitest";
import {
  computeMatchups,
  formatMultiplier,
  immuneTo,
  multiplierTone,
  offenseGroups,
  relationsForGeneration,
  resistantTo,
  vulnerableTo,
  type TypeRelations,
} from "@/lib/pokedex/matchups";
import { POKEMON_TYPES, typeIconUrl } from "@/lib/pokedex/types";

const named = (...names: string[]) => names.map((name) => ({ name }));

const relations = (
  r: Partial<Record<keyof TypeRelations["damage_relations"], string[]>>,
): TypeRelations["damage_relations"] => ({
  double_damage_from: named(...(r.double_damage_from ?? [])),
  half_damage_from: named(...(r.half_damage_from ?? [])),
  no_damage_from: named(...(r.no_damage_from ?? [])),
  double_damage_to: named(...(r.double_damage_to ?? [])),
  half_damage_to: named(...(r.half_damage_to ?? [])),
  no_damage_to: named(...(r.no_damage_to ?? [])),
});

const fire: TypeRelations = {
  name: "fire",
  damage_relations: relations({
    double_damage_from: ["ground", "rock", "water"],
    half_damage_from: ["bug", "steel", "fire", "grass", "ice", "fairy"],
    double_damage_to: ["bug", "steel", "grass", "ice"],
    half_damage_to: ["fire", "water", "rock", "dragon"],
  }),
};
const flying: TypeRelations = {
  name: "flying",
  damage_relations: relations({
    double_damage_from: ["rock", "electric", "ice"],
    half_damage_from: ["bug", "grass", "fighting"],
    no_damage_from: ["ground"],
    double_damage_to: ["fighting", "bug", "grass"],
    half_damage_to: ["rock", "steel", "electric"],
  }),
};
const normal: TypeRelations = {
  name: "normal",
  damage_relations: relations({
    double_damage_from: ["fighting"],
    no_damage_from: ["ghost"],
    half_damage_to: ["rock", "steel"],
    no_damage_to: ["ghost"],
  }),
};

describe("computeMatchups: defense", () => {
  it("covers all 18 types", () => {
    const { defense, offense } = computeMatchups([fire]);
    expect(Object.keys(defense)).toEqual([...POKEMON_TYPES]);
    expect(Object.keys(offense)).toEqual([...POKEMON_TYPES]);
  });

  it("uses a single type as is", () => {
    const { defense } = computeMatchups([fire]);
    expect(defense.water).toBe(2);
    expect(defense.grass).toBe(0.5);
    expect(defense.normal).toBe(1);
  });

  it("multiplies the effects of a dual type (Charizard)", () => {
    const { defense } = computeMatchups([fire, flying]);
    expect(defense.rock).toBe(4); // 2 × 2
    expect(defense.water).toBe(2);
    expect(defense.electric).toBe(2);
    expect(defense.ice).toBe(1); // 0.5 × 2 cancel out
    expect(defense.grass).toBe(0.25); // 0.5 × 0.5
    expect(defense.bug).toBe(0.25);
    expect(defense.fighting).toBe(0.5);
    expect(defense.ground).toBe(0); // immunity beats the weakness of fire
  });
});

describe("computeMatchups: offense", () => {
  it("uses a single type as is", () => {
    const { offense } = computeMatchups([normal]);
    expect(offense.rock).toBe(0.5);
    expect(offense.ghost).toBe(0);
    expect(offense.fire).toBe(1);
  });

  it("takes the best of both types of a dual type (Charizard)", () => {
    const { offense } = computeMatchups([fire, flying]);
    expect(offense.fighting).toBe(2); // flying
    expect(offense.steel).toBe(2); // fire beats flying's ×½
    expect(offense.water).toBe(1); // fire ×½, but flying is neutral
    expect(offense.rock).toBe(0.5); // both ×½
  });
});

describe("offenseGroups", () => {
  it("groups the types, in type order", () => {
    expect(offenseGroups(computeMatchups([fire, flying]).offense)).toEqual({
      superEffective: ["fighting", "bug", "steel", "grass", "ice"],
      notVeryEffective: ["rock"],
      noEffect: [],
    });
  });

  it("separates not very effective from no effect", () => {
    expect(offenseGroups(computeMatchups([normal]).offense)).toEqual({
      superEffective: [],
      notVeryEffective: ["rock", "steel"],
      noEffect: ["ghost"],
    });
  });
});

describe("vulnerableTo", () => {
  it("lists the types that deal extra damage, ×4 first", () => {
    const { defense } = computeMatchups([fire, flying]);
    expect(vulnerableTo(defense)).toEqual([
      { type: "rock", multiplier: 4 },
      { type: "water", multiplier: 2 },
      { type: "electric", multiplier: 2 },
    ]);
  });

  it("is empty when nothing is effective", () => {
    expect(vulnerableTo({ normal: 1, fire: 0.5, ghost: 0 })).toEqual([]);
  });
});

describe("resistantTo", () => {
  it("lists ×¼ before ×½, in type order, without immunities", () => {
    const { defense } = computeMatchups([fire, flying]);
    expect(resistantTo(defense)).toEqual([
      { type: "bug", multiplier: 0.25 },
      { type: "grass", multiplier: 0.25 },
      { type: "fighting", multiplier: 0.5 },
      { type: "steel", multiplier: 0.5 },
      { type: "fire", multiplier: 0.5 },
      { type: "fairy", multiplier: 0.5 },
    ]);
  });

  it("is empty when nothing is resisted", () => {
    expect(resistantTo({ normal: 1, fire: 2, ghost: 0 })).toEqual([]);
  });
});

describe("immuneTo", () => {
  it("lists only the types that deal no damage", () => {
    const { defense } = computeMatchups([fire, flying]);
    expect(immuneTo(defense)).toEqual([{ type: "ground", multiplier: 0 }]);
  });

  it("keeps type order and is empty without immunities", () => {
    expect(immuneTo({ normal: 0, ghost: 0, fire: 0.5 })).toEqual([
      { type: "normal", multiplier: 0 },
      { type: "ghost", multiplier: 0 },
    ]);
    expect(immuneTo({ normal: 1, fire: 2 })).toEqual([]);
  });
});

describe("formatMultiplier", () => {
  it("writes compact labels and nothing for neutral", () => {
    expect([4, 2, 1, 0.5, 0.25, 0].map(formatMultiplier)).toEqual([
      "×4",
      "×2",
      "",
      "×½",
      "×¼",
      "0",
    ]);
  });
});

describe("multiplierTone", () => {
  it("is bad to take extra damage and good to resist it", () => {
    expect([4, 2].map((m) => multiplierTone(m, "defense"))).toEqual([
      "bad",
      "bad",
    ]);
    expect([0.5, 0.25].map((m) => multiplierTone(m, "defense"))).toEqual([
      "good",
      "good",
    ]);
  });

  it("is the other way around when the Pokémon attacks", () => {
    expect(multiplierTone(2, "offense")).toBe("good");
    expect(multiplierTone(0.5, "offense")).toBe("bad");
  });

  it("treats zero and neutral damage as neutral on both sides", () => {
    for (const side of ["offense", "defense"] as const) {
      expect(multiplierTone(0, side)).toBe("neutral");
      expect(multiplierTone(1, side)).toBe("neutral");
    }
  });
});

describe("typeIconUrl", () => {
  it("maps types to their PokéAPI id", () => {
    expect(typeIconUrl("normal")).toMatch(/small\/1\.png$/);
    expect(typeIconUrl("fire")).toMatch(/small\/10\.png$/);
    expect(typeIconUrl("fairy")).toMatch(/small\/18\.png$/);
  });

  it("returns null for unknown types", () => {
    expect(typeIconUrl("shadow")).toBeNull();
  });
});

describe("relationsForGeneration", () => {
  const current = relations({ double_damage_from: ["dark"] });
  const old = relations({ double_damage_from: [] });
  const chart = {
    name: "ghost",
    relations: current,
    past: [{ generation: 5, relations: old }],
  };

  it("uses the oldest chart that still covers the generation", () => {
    expect(relationsForGeneration(chart, 1).damage_relations).toBe(old);
    expect(relationsForGeneration(chart, 5).damage_relations).toBe(old);
  });

  it("uses the current chart after the last change", () => {
    expect(relationsForGeneration(chart, 6).damage_relations).toBe(current);
    expect(
      relationsForGeneration(chart, Number.POSITIVE_INFINITY).damage_relations,
    ).toBe(current);
  });
});
