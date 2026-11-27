import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/lib/i18n/languages";
import { translate } from "@/lib/i18n/messages";
import type { PokemonStat } from "@/lib/pokeapi/detail";
import {
  defensiveTrainingAdviceForStats,
  level100StatsForTrainingAdvice,
  natureStatEffect,
  TRAINING_NATURES,
  trainingAdviceForStats,
} from "@/lib/pokedex/training-advice";

const stats = (
  attack: number,
  specialAttack: number,
  speed: number,
): PokemonStat[] => [
  { name: "hp", value: 80 },
  { name: "attack", value: attack },
  { name: "defense", value: 80 },
  { name: "special-attack", value: specialAttack },
  { name: "special-defense", value: 80 },
  { name: "speed", value: speed },
];

describe("trainingAdviceForStats", () => {
  it("recommends a fast physical example with a valid 252/252/4 spread", () => {
    expect(trainingAdviceForStats(stats(130, 60, 100), "sword-shield")).toEqual({
      nature: "jolly",
      increasedStat: "speed",
      decreasedStat: "special-attack",
      evs: [
        { stat: "attack", value: 252 },
        { stat: "speed", value: 252 },
        { stat: "hp", value: 4 },
      ],
    });
  });

  it("recommends a bulkier physical example for a slower Pokémon", () => {
    expect(trainingAdviceForStats(stats(100, 70, 50), "ruby-sapphire")).toEqual({
      nature: "adamant",
      increasedStat: "attack",
      decreasedStat: "special-attack",
      evs: [
        { stat: "attack", value: 252 },
        { stat: "hp", value: 252 },
        { stat: "speed", value: 4 },
      ],
    });
  });

  it("recommends fast and slower special examples", () => {
    expect(trainingAdviceForStats(stats(60, 130, 100), "scarlet-violet")?.nature).toBe(
      "timid",
    );
    expect(trainingAdviceForStats(stats(60, 130, 50), "legends-za")?.nature).toBe(
      "modest",
    );
  });

  it("uses physical offense deterministically when attack stats are tied", () => {
    expect(trainingAdviceForStats(stats(90, 90, 50), "x-y")?.nature).toBe(
      "adamant",
    );
  });

  it("returns no advice when required stats are missing or invalid", () => {
    expect(
      trainingAdviceForStats(stats(100, 70, 50).slice(1), "sword-shield"),
    ).toBeNull();
    expect(
      trainingAdviceForStats(
        stats(100, 70, 50).map((stat) =>
          stat.name === "speed" ? { ...stat, value: Number.NaN } : stat,
        ),
        "sword-shield",
      ),
    ).toBeNull();
  });

  it.each([
    null,
    "red-blue",
    "gold-silver",
    "lets-go-pikachu-lets-go-eevee",
    "legends-arceus",
    "champions",
    "unknown-game",
  ])("does not provide traditional EV advice for %s", (game) => {
    expect(trainingAdviceForStats(stats(100, 70, 50), game)).toBeNull();
  });
});

describe("level100StatsForTrainingAdvice", () => {
  it("calculates level-100 stats using 31 IVs, EVs, nature, and game rounding", () => {
    const advice = trainingAdviceForStats(stats(130, 60, 100), "sword-shield");
    expect(advice).not.toBeNull();

    expect(level100StatsForTrainingAdvice(stats(130, 60, 100), advice!)).toEqual({
      hp: 302,
      attack: 359,
      defense: 196,
      "special-attack": 140,
      "special-defense": 196,
      speed: 328,
    });
  });

  it("applies a raised defensive nature and its rounding to the right stats", () => {
    const baseStats = stats(100, 70, 50).map((stat) =>
      stat.name === "defense"
        ? { ...stat, value: 120 }
        : stat.name === "special-defense"
          ? { ...stat, value: 80 }
          : stat,
    );
    const advice = defensiveTrainingAdviceForStats(baseStats, "sword-shield");

    expect(advice).not.toBeNull();
    expect(level100StatsForTrainingAdvice(baseStats, advice!)).toMatchObject({
      hp: 364,
      defense: 372,
      "special-defense": 197,
      "special-attack": 158,
    });
  });

  it("keeps Shedinja at one HP and marks missing or invalid base stats unavailable", () => {
    const advice = defensiveTrainingAdviceForStats(
      stats(100, 70, 50).map((stat) =>
        stat.name === "hp" ? { ...stat, value: 1 } : stat,
      ),
      "sword-shield",
    );
    expect(advice).not.toBeNull();

    expect(
      level100StatsForTrainingAdvice(
        [
          { name: "hp", value: 1 },
          { name: "attack", value: Number.NaN },
        ],
        advice!,
      ),
    ).toEqual({ hp: 1, attack: null });
    expect(level100StatsForTrainingAdvice([], advice!)).toEqual({});
  });
});

describe("defensiveTrainingAdviceForStats", () => {
  it("recommends a physical defense with Impish and a valid EV spread", () => {
    const advice = defensiveTrainingAdviceForStats(
      stats(100, 70, 50).map((stat) =>
        stat.name === "defense"
          ? { ...stat, value: 120 }
          : stat.name === "special-defense"
            ? { ...stat, value: 80 }
            : stat,
      ),
      "sword-shield",
    );

    expect(advice).toEqual({
      nature: "impish",
      increasedStat: "defense",
      decreasedStat: "special-attack",
      evs: [
        { stat: "hp", value: 252 },
        { stat: "defense", value: 252 },
        { stat: "special-defense", value: 4 },
      ],
    });
  });

  it("selects Bold, Careful, and Calm according to defenses and offense", () => {
    const baseStats = stats(70, 100, 50);
    const physicalDefense = baseStats.map((stat) =>
      stat.name === "defense"
        ? { ...stat, value: 120 }
        : stat.name === "special-defense"
          ? { ...stat, value: 80 }
          : stat,
    );
    const specialDefense = baseStats.map((stat) =>
      stat.name === "defense"
        ? { ...stat, value: 80 }
        : stat.name === "special-defense"
          ? { ...stat, value: 120 }
          : stat,
    );

    expect(
      defensiveTrainingAdviceForStats(physicalDefense, "sword-shield")?.nature,
    ).toBe("bold");
    expect(
      defensiveTrainingAdviceForStats(specialDefense, "sword-shield")?.nature,
    ).toBe("calm");
    expect(
      defensiveTrainingAdviceForStats(
        specialDefense.map((stat) =>
          stat.name === "attack" ? { ...stat, value: 110 } : stat,
        ),
        "sword-shield",
      )?.nature,
    ).toBe("careful");
  });

  it("uses HP and the chosen defense EVs, with four points in the other defense", () => {
    const advice = defensiveTrainingAdviceForStats(
      stats(100, 70, 50).map((stat) =>
        stat.name === "defense"
          ? { ...stat, value: 80 }
          : stat.name === "special-defense"
            ? { ...stat, value: 120 }
            : stat,
      ),
      "scarlet-violet",
    );

    expect(advice?.evs).toEqual([
      { stat: "hp", value: 252 },
      { stat: "special-defense", value: 252 },
      { stat: "defense", value: 4 },
    ]);
    expect(advice?.evs.reduce((sum, entry) => sum + entry.value, 0)).toBe(508);
  });

  it("does not invest EVs in HP for a one-HP Pokémon", () => {
    const advice = defensiveTrainingAdviceForStats(
      stats(100, 70, 50).map((stat) =>
        stat.name === "hp" ? { ...stat, value: 1 } : stat,
      ),
      "sword-shield",
    );

    expect(advice?.evs).toEqual([
      { stat: "defense", value: 252 },
      { stat: "special-defense", value: 252 },
      { stat: "speed", value: 4 },
    ]);
    expect(advice?.evs.some(({ stat }) => stat === "hp")).toBe(false);
  });

  it("uses Defense and physical nature deterministically when values tie", () => {
    const advice = defensiveTrainingAdviceForStats(
      stats(90, 90, 50),
      "sword-shield",
    );

    expect(advice?.nature).toBe("impish");
    expect(advice?.increasedStat).toBe("defense");
  });

  it("returns no advice when required defensive stats are missing or invalid", () => {
    expect(
      defensiveTrainingAdviceForStats(
        stats(100, 70, 50).filter((stat) => stat.name !== "special-defense"),
        "sword-shield",
      ),
    ).toBeNull();
    expect(
      defensiveTrainingAdviceForStats(
        stats(100, 70, 50).map((stat) =>
          stat.name === "defense" ? { ...stat, value: -1 } : stat,
        ),
        "sword-shield",
      ),
    ).toBeNull();
  });

  it.each([null, "lets-go-pikachu-lets-go-eevee", "legends-arceus"])(
    "does not provide defensive EV advice for %s",
    (game) => {
      expect(defensiveTrainingAdviceForStats(stats(100, 70, 50), game)).toBeNull();
    },
  );
});
describe("natures", () => {
  it("lists all 25 natures, five of them neutral", () => {
    expect(TRAINING_NATURES).toHaveLength(25);
    const neutral = TRAINING_NATURES.filter(
      (nature) => natureStatEffect(nature).increasedStat === "",
    );
    expect(neutral.sort()).toEqual([
      "bashful",
      "docile",
      "hardy",
      "quirky",
      "serious",
    ]);
  });

  it("raises and lowers the right stats", () => {
    expect(natureStatEffect("jolly")).toEqual({
      increasedStat: "speed",
      decreasedStat: "special-attack",
    });
    expect(natureStatEffect("quiet")).toEqual({
      increasedStat: "special-attack",
      decreasedStat: "speed",
    });
  });

  it("never raises and lowers the same stat, and never touches HP", () => {
    for (const nature of TRAINING_NATURES) {
      const { increasedStat, decreasedStat } = natureStatEffect(nature);
      if (increasedStat === "") continue;
      expect(increasedStat).not.toBe(decreasedStat);
      expect(increasedStat).not.toBe("hp");
      expect(decreasedStat).not.toBe("hp");
    }
  });

  it("has a label in every language", () => {
    for (const language of LANGUAGES) {
      for (const nature of TRAINING_NATURES) {
        expect(translate(language, `nature.${nature}`)).toBeTruthy();
      }
    }
  });
});
