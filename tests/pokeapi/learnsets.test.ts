import { describe, expect, it } from "vitest";
import { defaultGame, parseLearnsets } from "@/lib/pokeapi/learnsets";

const detail = (game: string, id: number, method: string, level = 0) => ({
  level_learned_at: level,
  move_learn_method: { name: method },
  version_group: {
    name: game,
    url: `https://pokeapi.co/api/v2/version-group/${id}/`,
  },
});

describe("parseLearnsets", () => {
  const response = {
    moves: [
      {
        move: { name: "scratch" },
        version_group_details: [
          detail("red-blue", 1, "level-up", 1),
          detail("scarlet-violet", 25, "level-up", 1),
        ],
      },
      {
        move: { name: "ember" },
        version_group_details: [
          detail("red-blue", 1, "level-up", 9),
          detail("scarlet-violet", 25, "level-up", 7),
        ],
      },
      {
        move: { name: "growl" },
        version_group_details: [detail("scarlet-violet", 25, "level-up", 1)],
      },
      {
        move: { name: "flamethrower" },
        version_group_details: [
          detail("red-blue", 1, "machine"),
          detail("scarlet-violet", 25, "machine"),
        ],
      },
      {
        move: { name: "dragon-pulse" },
        version_group_details: [detail("scarlet-violet", 25, "tutor")],
      },
      {
        move: { name: "belly-drum" },
        version_group_details: [
          detail("scarlet-violet", 25, "egg"),
          detail("gold-silver", 3, "egg"),
        ],
      },
      {
        move: { name: "mega-punch" },
        version_group_details: [detail("red-green-japan", 99, "machine")],
      },
    ],
  };

  it("orders games newest first and drops games without usable moves", () => {
    expect(parseLearnsets(response).map((l) => l.game)).toEqual([
      "scarlet-violet",
      "red-blue",
    ]);
  });

  it("splits moves over the three categories", () => {
    const [scarletViolet] = parseLearnsets(response);
    expect(scarletViolet.tutor).toEqual(["dragon-pulse"]);
    expect(scarletViolet.machine).toEqual(["flamethrower"]);
    expect(scarletViolet.levelUp.map((m) => m.move)).toEqual([
      "scratch",
      "growl",
      "ember",
    ]);
  });

  it("sorts level-up moves by level, keeping order within a level", () => {
    const [scarletViolet, redBlue] = parseLearnsets(response);
    expect(scarletViolet.levelUp).toEqual([
      { move: "scratch", level: 1 },
      { move: "growl", level: 1 },
      { move: "ember", level: 7 },
    ]);
    expect(redBlue.levelUp).toEqual([
      { move: "scratch", level: 1 },
      { move: "ember", level: 9 },
    ]);
  });

  it("ignores egg moves and Japan-only releases", () => {
    const games = parseLearnsets(response);
    expect(games.flatMap((g) => g.machine)).not.toContain("mega-punch");
    expect(games.some((g) => g.game === "gold-silver")).toBe(false);
    expect(games.flatMap((g) => g.levelUp.map((m) => m.move))).not.toContain(
      "belly-drum",
    );
  });

  it("returns nothing for a Pokémon without moves", () => {
    expect(parseLearnsets({ moves: [] })).toEqual([]);
  });
});

describe("defaultGame", () => {
  const learnset = (game: string, levelUp: number) => ({
    game,
    levelUp: Array.from({ length: levelUp }, (_, i) => ({
      move: `m${i}`,
      level: i,
    })),
    tutor: [],
    machine: ["x"],
  });

  it("is the newest game that has level-up moves", () => {
    expect(
      defaultGame([
        learnset("champions", 0),
        learnset("scarlet-violet", 3),
        learnset("sword-shield", 4),
      ]),
    ).toBe("scarlet-violet");
  });

  it("falls back to the newest game, or null", () => {
    expect(defaultGame([learnset("champions", 0), learnset("x-y", 0)])).toBe(
      "champions",
    );
    expect(defaultGame([])).toBeNull();
  });
});
