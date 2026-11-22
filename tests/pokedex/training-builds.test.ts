import { describe, expect, it } from "vitest";
import type { PokemonStat } from "@/lib/pokeapi/detail";
import type { MoveInfo, PokemonMoves } from "@/lib/pokeapi/moves";
import {
  suggestedMovesForBuild,
  type TrainingBuildKind,
} from "@/lib/pokedex/training-builds";
import type { TrainingAdvice } from "@/lib/pokedex/training-advice";

const stats: PokemonStat[] = [
  { name: "hp", value: 80 },
  { name: "attack", value: 120 },
  { name: "defense", value: 80 },
  { name: "special-attack", value: 70 },
  { name: "special-defense", value: 80 },
  { name: "speed", value: 100 },
];

const offensiveAdvice: TrainingAdvice = {
  nature: "jolly",
  increasedStat: "speed",
  decreasedStat: "special-attack",
  evs: [
    { stat: "attack", value: 252 },
    { stat: "speed", value: 252 },
    { stat: "hp", value: 4 },
  ],
};

const defensiveAdvice: TrainingAdvice = {
  nature: "impish",
  increasedStat: "defense",
  decreasedStat: "special-attack",
  evs: [
    { stat: "hp", value: 252 },
    { stat: "defense", value: 252 },
    { stat: "special-defense", value: 4 },
  ],
};

function move(
  name: string,
  type: string,
  damageClass: MoveInfo["damageClass"],
  power: number | null,
  accuracy: number | null = 100,
): MoveInfo {
  return {
    name,
    names: { en: name },
    type,
    damageClass,
    power,
    accuracy,
    pp: 10,
    descriptions: {},
    effects: {},
    effectChance: null,
    priority: 0,
    target: "selected-pokemon",
  };
}

function learnset(
  entries: MoveInfo[],
  game = "scarlet-violet",
): PokemonMoves {
  return {
    games: [game],
    game,
    levelUp: entries.map(({ name }) => ({ move: name, level: 1 })),
    tutor: [],
    machine: [],
    moves: Object.fromEntries(entries.map((entry) => [entry.name, entry])),
  };
}

function suggest(
  kind: TrainingBuildKind,
  moves: PokemonMoves,
  types: string[] = ["fire", "flying"],
  advice = kind === "offensive" ? offensiveAdvice : defensiveAdvice,
  selectedStats = stats,
  game: string | null = "scarlet-violet",
) {
  return suggestedMovesForBuild(
    advice,
    selectedStats,
    types,
    moves,
    game,
    kind,
  );
}

describe("suggestedMovesForBuild", () => {
  it("prefers learned STAB and matching-category moves, then diverse coverage", () => {
    const data = learnset([
      move("flare-blitz", "fire", "physical", 120),
      move("brave-bird", "flying", "physical", 120),
      move("earthquake", "ground", "physical", 100),
      move("surf", "water", "special", 90),
      move("fire-blast", "fire", "special", 110),
      move("dragon-claw", "dragon", "physical", 80),
    ]);
    data.levelUp.pop();
    data.machine = ["earthquake", "earthquake", "surf", "fire-blast"];

    expect(suggest("offensive", data).map(({ name }) => name)).toEqual([
      "brave-bird",
      "flare-blitz",
      "earthquake",
      "surf",
    ]);
  });

  it("adds known support moves to defensive suggestions", () => {
    const data = learnset([
      move("recover", "normal", "status", null),
      move("roost", "flying", "status", null),
      move("flare-blitz", "fire", "physical", 120),
      move("brave-bird", "flying", "physical", 120),
      move("earthquake", "ground", "physical", 100),
    ]);

    expect(suggest("defensive", data).map(({ name }) => name)).toEqual([
      "recover",
      "roost",
      "flare-blitz",
      "brave-bird",
    ]);
  });

  it("returns at most four distinct moves and supports translated names", () => {
    const data = learnset([
      move("move-a", "fire", "physical", 100),
      move("move-b", "flying", "physical", 90),
      move("move-c", "ground", "physical", 80),
      move("move-d", "water", "physical", 70),
      move("move-e", "rock", "physical", 60),
    ]);
    data.tutor = ["move-a", "move-b"];

    const results = suggest("offensive", data);
    expect(results).toHaveLength(4);
    expect(new Set(results.map(({ name }) => name)).size).toBe(4);
    expect(results[0]?.names.en).toBe("move-a");
  });

  it("does not suggest moves from a different game or an unknown generation 3 split", () => {
    const data = learnset([move("flamethrower", "fire", "special", 90)]);
    expect(suggest("offensive", data, ["fire"], offensiveAdvice, stats, "x-y")).toEqual(
      [],
    );
    expect(
      suggest("offensive", learnset([move("flamethrower", "fire", "special", 90)], "ruby-sapphire"), ["fire"], offensiveAdvice, stats, "ruby-sapphire"),
    ).toEqual([]);
  });

  it("returns no fabricated moves when the selected game has no learned data", () => {
    const data = learnset([move("flamethrower", "fire", "special", 90)]);
    data.levelUp = [];
    data.tutor = [];
    data.machine = [];
    expect(suggest("offensive", data)).toEqual([]);
    expect(
      suggestedMovesForBuild(
        offensiveAdvice,
        stats,
        ["fire"],
        null,
        "scarlet-violet",
        "offensive",
      ),
    ).toEqual([]);
  });
});