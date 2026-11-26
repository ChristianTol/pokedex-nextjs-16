import type { PokemonStat } from "@/lib/pokeapi/detail";
import { gameGeneration } from "./games";

export type TrainingNature =
  | "adamant"
  | "bold"
  | "calm"
  | "careful"
  | "impish"
  | "jolly"
  | "modest"
  | "timid";

export type TrainingAdvice = {
  nature: TrainingNature;
  increasedStat: string;
  decreasedStat: string;
  evs: { stat: string; value: number }[];
};

export type CalculatedLevel100Stats = Record<string, number | null>;

const GAMES_WITHOUT_TRADITIONAL_EVS = new Set([
  "lets-go-pikachu-lets-go-eevee",
  "legends-arceus",
  "champions",
]);

function hasTraditionalEvTraining(game: string | null): game is string {
  if (!game || GAMES_WITHOUT_TRADITIONAL_EVS.has(game)) return false;
  const generation = gameGeneration(game);
  return Number.isFinite(generation) && generation >= 3;
}

const MAX_EV_PER_STAT = 252;

function statValue(stats: PokemonStat[], name: string): number | undefined {
  return stats.find((stat) => stat.name === name)?.value;
}

function isValidStat(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

/** Calculates level-100 stats with 31 IVs and the supplied EVs and nature. */
export function level100StatsForTrainingAdvice(
  baseStats: PokemonStat[],
  advice: TrainingAdvice,
): CalculatedLevel100Stats {
  return Object.fromEntries(
    baseStats.map(({ name, value: baseStat }) => {
      const ev = advice.evs.find((entry) => entry.stat === name)?.value ?? 0;
      if (
        !isValidStat(baseStat) ||
        !Number.isInteger(ev) ||
        ev < 0 ||
        ev > MAX_EV_PER_STAT
      ) {
        return [name, null];
      }

      if (name === "hp" && baseStat === 1) return [name, 1];

      const pointsFromEffort = Math.floor(ev / 4);
      const baseValue = 2 * baseStat + 31 + pointsFromEffort;
      if (name === "hp") return [name, baseValue + 110];

      const natureModifier =
        name === advice.increasedStat
          ? 1.1
          : name === advice.decreasedStat
            ? 0.9
            : 1;
      return [name, Math.floor((baseValue + 5) * natureModifier)];
    }),
  );
}

export function trainingAdviceForStats(
  stats: PokemonStat[],
  game: string | null,
): TrainingAdvice | null {
  if (!hasTraditionalEvTraining(game)) return null;

  const attack = statValue(stats, "attack");
  const specialAttack = statValue(stats, "special-attack");
  const speed = statValue(stats, "speed");
  if (
    !isValidStat(statValue(stats, "hp")) ||
    !isValidStat(attack) ||
    !isValidStat(specialAttack) ||
    !isValidStat(speed)
  ) {
    return null;
  }

  const physical = attack >= specialAttack;
  const fast = speed >= 80;
  const offenseStat = physical ? "attack" : "special-attack";
  // Fast: max Speed, nature raises Speed. Slow: max HP, nature raises offense.
  const increasedStat = fast ? "speed" : offenseStat;
  const decreasedStat = physical ? "special-attack" : "attack";
  const nature: TrainingNature = physical
    ? fast
      ? "jolly"
      : "adamant"
    : fast
      ? "timid"
      : "modest";

  return {
    nature,
    increasedStat,
    decreasedStat,
    evs: [
      { stat: offenseStat, value: MAX_EV_PER_STAT },
      fast
        ? { stat: "speed", value: MAX_EV_PER_STAT }
        : { stat: "hp", value: MAX_EV_PER_STAT },
      fast ? { stat: "hp", value: 4 } : { stat: "speed", value: 4 },
    ],
  };
}

export function defensiveTrainingAdviceForStats(
  stats: PokemonStat[],
  game: string | null,
): TrainingAdvice | null {
  if (!hasTraditionalEvTraining(game)) return null;

  const hp = statValue(stats, "hp");
  const attack = statValue(stats, "attack");
  const defense = statValue(stats, "defense");
  const specialAttack = statValue(stats, "special-attack");
  const specialDefense = statValue(stats, "special-defense");
  const speed = statValue(stats, "speed");
  if (
    !isValidStat(hp) ||
    !isValidStat(attack) ||
    !isValidStat(defense) ||
    !isValidStat(specialAttack) ||
    !isValidStat(specialDefense)
  ) {
    return null;
  }
  // A 1 HP Pokémon (Shedinja) gains nothing from HP EVs, so Speed is needed.
  const hpIsUseless = hp <= 1;
  if (hpIsUseless && !isValidStat(speed)) return null;

  const increasedStat = defense >= specialDefense ? "defense" : "special-defense";
  const decreasedStat = attack >= specialAttack ? "special-attack" : "attack";
  const nature: TrainingNature =
    increasedStat === "defense"
      ? decreasedStat === "attack"
        ? "bold"
        : "impish"
      : decreasedStat === "attack"
        ? "calm"
        : "careful";
  const otherDefense =
    increasedStat === "defense" ? "special-defense" : "defense";

  return {
    nature,
    increasedStat,
    decreasedStat,
    evs: hpIsUseless
      ? [
          { stat: increasedStat, value: MAX_EV_PER_STAT },
          { stat: otherDefense, value: MAX_EV_PER_STAT },
          { stat: "speed", value: 4 },
        ]
      : [
          { stat: "hp", value: MAX_EV_PER_STAT },
          { stat: increasedStat, value: MAX_EV_PER_STAT },
          { stat: otherDefense, value: 4 },
        ],
  };
}
