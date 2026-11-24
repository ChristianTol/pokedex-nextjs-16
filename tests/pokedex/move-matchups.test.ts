import { describe, expect, it } from "vitest";
import type { MoveInfo, PokemonMoves } from "@/lib/pokeapi/moves";
import {
  damagingMoveTypes,
  moveOffense,
  type TypeEffectiveness,
} from "@/lib/pokedex/move-matchups";

function move(
  name: string,
  type: string,
  damageClass: MoveInfo["damageClass"],
): MoveInfo {
  return {
    name,
    names: { en: name },
    type,
    damageClass,
    power: damageClass === "status" ? null : 80,
    accuracy: 100,
    pp: 10,
    descriptions: {},
    effects: {},
    effectChance: null,
    priority: 0,
    target: "selected-pokemon",
  };
}

function learnset(
  learned: MoveInfo[],
  unlearned: MoveInfo[] = [],
): PokemonMoves {
  return {
    games: ["scarlet-violet"],
    game: "scarlet-violet",
    levelUp: learned.slice(0, 1).map(({ name }) => ({ move: name, level: 1 })),
    tutor: learned.slice(1, 2).map(({ name }) => name),
    machine: learned.slice(2).map(({ name }) => name),
    moves: Object.fromEntries(
      [...learned, ...unlearned].map((entry) => [entry.name, entry]),
    ),
  } as PokemonMoves;
}

const effectiveness: TypeEffectiveness = {
  fire: { grass: 2, water: 0.5, ghost: 1 },
  fighting: { ghost: 0, normal: 2, grass: 1 },
  water: { grass: 0.5, water: 0.5, ghost: 1 },
};

describe("damagingMoveTypes", () => {
  it("lists each type of the damaging moves the Pokémon learns once", () => {
    const moves = learnset([
      move("ember", "fire", "special"),
      move("flare-blitz", "fire", "physical"),
      move("close-combat", "fighting", "physical"),
    ]);

    expect(damagingMoveTypes(moves).sort()).toEqual(["fighting", "fire"]);
  });

  it("ignores status moves and moves the Pokémon does not learn", () => {
    const moves = learnset(
      [move("ember", "fire", "special"), move("soak", "water", "status")],
      [move("surf", "water", "special")],
    );

    expect(damagingMoveTypes(moves)).toEqual(["fire"]);
  });
});

describe("moveOffense", () => {
  it("takes the best multiplier among the learnable damaging moves", () => {
    const moves = learnset([
      move("ember", "fire", "special"),
      move("surf", "water", "special"),
    ]);
    const offense = moveOffense(moves, effectiveness);

    expect(offense?.grass).toBe(2);
    expect(offense?.water).toBe(0.5);
    expect(offense?.ghost).toBe(1);
  });

  it("only reports no effect when every move has none", () => {
    const only = moveOffense(
      learnset([move("close-combat", "fighting", "physical")]),
      effectiveness,
    );
    const mixed = moveOffense(
      learnset([
        move("close-combat", "fighting", "physical"),
        move("ember", "fire", "special"),
      ]),
      effectiveness,
    );

    expect(only?.ghost).toBe(0);
    expect(mixed?.ghost).toBe(1);
  });

  it("treats combinations missing from the table as neutral", () => {
    const offense = moveOffense(
      learnset([move("ember", "fire", "special")]),
      {},
    );

    expect(Object.values(offense ?? {}).every((value) => value === 1)).toBe(
      true,
    );
  });

  it("returns null when the Pokémon learns no damaging moves", () => {
    expect(
      moveOffense(learnset([move("soak", "water", "status")]), effectiveness),
    ).toBeNull();
    expect(moveOffense(learnset([]), effectiveness)).toBeNull();
  });
});
