import type { PokemonStat } from "@/lib/pokeapi/detail";
import { gameGeneration } from "./games";

/** Every nature with the stat it raises and lowers; neutral natures have neither. */
const NATURE_EFFECTS = {
  hardy: null,
  lonely: ["attack", "defense"],
  brave: ["attack", "speed"],
  adamant: ["attack", "special-attack"],
  naughty: ["attack", "special-defense"],
  bold: ["defense", "attack"],
  docile: null,
  relaxed: ["defense", "speed"],
  impish: ["defense", "special-attack"],
  lax: ["defense", "special-defense"],
  timid: ["speed", "attack"],
  hasty: ["speed", "defense"],
  serious: null,
  jolly: ["speed", "special-attack"],
  naive: ["speed", "special-defense"],
  modest: ["special-attack", "attack"],
  mild: ["special-attack", "defense"],
  quiet: ["special-attack", "speed"],
  bashful: null,
  rash: ["special-attack", "special-defense"],
  calm: ["special-defense", "attack"],
  gentle: ["special-defense", "defense"],
  sassy: ["special-defense", "speed"],
  careful: ["special-defense", "special-attack"],
  quirky: null,
} as const;

export type TrainingNature = keyof typeof NATURE_EFFECTS;

export const TRAINING_NATURES = Object.keys(NATURE_EFFECTS) as TrainingNature[];

/** Stats a nature raises and lowers; both empty for a neutral nature. */
export function natureStatEffect(nature: TrainingNature): {
  increasedStat: string;
  decreasedStat: string;
} {
  const effect = NATURE_EFFECTS[nature];
  return {
    increasedStat: effect?.[0] ?? "",
    decreasedStat: effect?.[1] ?? "",
  };
}

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

/**
 * Level-100 value that reaches the outer ring of the radar chart, for every
 * stat alike. Higher values are clipped to the ring. Estimated from the
 * in-game stat hexagon (Garchomp, Pokémon Moon), so treat it as approximate.
 */
export const RADAR_CHART_STAT_CEILING = 305;

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
