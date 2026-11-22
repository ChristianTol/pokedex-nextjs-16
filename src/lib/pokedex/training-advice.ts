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

export function trainingAdviceForStats(
  stats: PokemonStat[],
  game: string | null,
): TrainingAdvice | null {
  if (!hasTraditionalEvTraining(game)) return null;

  const valueFor = (name: string) =>
    stats.find((stat) => stat.name === name)?.value;
  const hp = valueFor("hp");
  const attack = valueFor("attack");
  const specialAttack = valueFor("special-attack");
  const speed = valueFor("speed");
  if (
    hp === undefined ||
    attack === undefined ||
    specialAttack === undefined ||
    speed === undefined ||
    [hp, attack, specialAttack, speed].some(
      (value) => !Number.isFinite(value) || value < 0,
    )
  ) {
    return null;
  }

  const physical = attack >= specialAttack;
  const fast = speed >= 80;
  const offenseStat = physical ? "attack" : "special-attack";

  if (physical) {
    return fast
      ? {
          nature: "jolly",
          increasedStat: "speed",
          decreasedStat: "special-attack",
          evs: [
            { stat: offenseStat, value: 252 },
            { stat: "speed", value: 252 },
            { stat: "hp", value: 4 },
          ],
        }
      : {
          nature: "adamant",
          increasedStat: "attack",
          decreasedStat: "special-attack",
          evs: [
            { stat: offenseStat, value: 252 },
            { stat: "hp", value: 252 },
            { stat: "speed", value: 4 },
          ],
        };
  }

  return fast
    ? {
        nature: "timid",
        increasedStat: "speed",
        decreasedStat: "attack",
        evs: [
          { stat: offenseStat, value: 252 },
          { stat: "speed", value: 252 },
          { stat: "hp", value: 4 },
        ],
      }
    : {
        nature: "modest",
        increasedStat: "special-attack",
        decreasedStat: "attack",
        evs: [
          { stat: offenseStat, value: 252 },
          { stat: "hp", value: 252 },
          { stat: "speed", value: 4 },
        ],
      };
}

export function defensiveTrainingAdviceForStats(
  stats: PokemonStat[],
  game: string | null,
): TrainingAdvice | null {
  if (!hasTraditionalEvTraining(game)) return null;

  const valueFor = (name: string) =>
    stats.find((stat) => stat.name === name)?.value;
  const hp = valueFor("hp");
  const attack = valueFor("attack");
  const defense = valueFor("defense");
  const specialAttack = valueFor("special-attack");
  const specialDefense = valueFor("special-defense");
  const speed = valueFor("speed");
  if (
    hp === undefined ||
    attack === undefined ||
    defense === undefined ||
    specialAttack === undefined ||
    specialDefense === undefined ||
    [hp, attack, defense, specialAttack, specialDefense].some(
      (value) => !Number.isFinite(value) || value < 0,
    ) ||
    (hp <= 1 &&
      (speed === undefined || !Number.isFinite(speed) || speed < 0))
  ) {
    return null;
  }

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
    evs:
      hp <= 1
        ? [
            { stat: increasedStat, value: 252 },
            { stat: otherDefense, value: 252 },
            { stat: "speed", value: 4 },
          ]
        : [
            { stat: "hp", value: 252 },
            { stat: increasedStat, value: 252 },
            { stat: otherDefense, value: 4 },
          ],
  };
}