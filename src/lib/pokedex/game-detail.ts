import type {
  PastAbilities,
  PastStats,
  PokemonAbility,
  PokemonDetail,
  PokemonFormSprites,
  PokemonStat,
} from "@/lib/pokeapi/detail";
import { pickText, type Language } from "@/lib/i18n/languages";
import {
  descriptionGame,
  gameGeneration,
  releaseIndex,
  spriteKeys,
} from "./games";
import { computeMatchups, relationsForGeneration } from "./matchups";

/** Abilities were introduced in generation 3. */
const FIRST_ABILITY_GENERATION = 3;

/**
 * The abilities in a generation: the current slots with the older entries
 * laid over them, like `statsForGeneration`. Nothing before generation 3.
 */
export function abilitiesForGeneration(
  abilities: readonly PokemonAbility[],
  past: readonly PastAbilities[],
  generation: number,
): PokemonAbility[] {
  if (generation < FIRST_ABILITY_GENERATION) return [];
  const bySlot = new Map(abilities.map((ability) => [ability.slot, ability]));
  const applicable = past
    .filter((entry) => entry.generation >= generation)
    .sort((a, b) => b.generation - a.generation);
  for (const entry of applicable) {
    for (const { slot, ability } of entry.slots) {
      if (ability) bySlot.set(slot, ability);
      else bySlot.delete(slot);
    }
  }
  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}

/**
 * The base stats in a generation. Past stats list only what differed, and an
 * entry holds for its generation and every earlier one, so the oldest entry
 * that still applies is laid over the newer ones. Generation 1 had a single
 * Special stat instead of Sp. Atk and Sp. Def.
 */
export function statsForGeneration(
  stats: readonly PokemonStat[],
  past: readonly PastStats[],
  generation: number,
): PokemonStat[] {
  const values = new Map(stats.map((stat) => [stat.name, stat.value]));
  const applicable = past
    .filter((entry) => entry.generation >= generation)
    .sort((a, b) => b.generation - a.generation);
  for (const entry of applicable) {
    for (const stat of entry.stats) values.set(stat.name, stat.value);
  }

  const result: PokemonStat[] = [];
  for (const { name } of stats) {
    if (generation === 1 && name === "special-attack") {
      const special = values.get("special") ?? values.get(name);
      if (special !== undefined)
        result.push({ name: "special", value: special });
    } else if (generation === 1 && name === "special-defense") {
      continue;
    } else {
      result.push({ name, value: values.get(name) ?? 0 });
    }
  }
  return result;
}

/**
 * The Pokédex text to show for a game, in the reader's language. When the
 * game has no text in that language, the one from the closest game that has
 * (the newer one when two are equally close) is used, and `fromGame` names
 * it so the screen can say so. English is tried when the language has no text
 * in any game. `fromGame` is null when the text belongs to the game itself.
 */
export function descriptionForGame(
  detail: PokemonDetail,
  game: string,
  language: Language,
): { text: string | null; fromGame: string | null } {
  const own = descriptionGame(game);
  const ownIndex = releaseIndex(own);
  const texts = detail.gameDescriptions;
  const wanted = language === "en" ? ["en"] : [language, "en"];

  for (const code of wanted) {
    const closest = Object.keys(texts)
      .filter((candidate) => pickCode(texts[candidate], code))
      .sort((a, b) => {
        const distance =
          Math.abs(releaseIndex(a) - ownIndex) -
          Math.abs(releaseIndex(b) - ownIndex);
        return distance || releaseIndex(b) - releaseIndex(a);
      })[0];
    if (closest) {
      return {
        text: pickCode(texts[closest], code) ?? null,
        fromGame: closest === own ? null : closest,
      };
    }
  }
  return { text: pickText(detail.descriptions, language), fromGame: null };
}

/** The selected game's ability flavor text, or the general ability effect. */
export function abilityDescriptionForGame(
  ability: Pick<PokemonAbility, "descriptions" | "gameDescriptions">,
  game: string | null,
  language: Language,
): string | null {
  const gameDescription = game
    ? pickText(ability.gameDescriptions[descriptionGame(game)], language)
    : null;
  return gameDescription ?? pickText(ability.descriptions, language);
}

function pickCode(text: PokemonDetail["descriptions"], code: string) {
  return (text as Record<string, string | undefined>)[code];
}

/**
 * The pixel sprite of a Pokémon in a game, or null when the game has none
 * (e.g. newer than the sprites PokéAPI has, or the Pokémon is not in it).
 * A game without a shiny sprite shows the normal one.
 */
export function spriteForGame(
  sprites: PokemonDetail["gameSprites"],
  game: string,
  shiny: boolean,
): string | null {
  for (const key of spriteKeys(game)) {
    const sprite = sprites[key];
    if (sprite) return (shiny && sprite.shiny) || sprite.front;
  }
  return null;
}

/** Uses the chosen game's sprite, or the newest available one without a game. */
export function spriteForGameOrLatest(
  sprites: PokemonDetail["gameSprites"],
  game: string | null,
  shiny: boolean,
): string | null {
  if (game) return spriteForGame(sprites, game, shiny);
  const newest = Object.values(sprites).at(-1);
  return newest ? (shiny && newest.shiny ? newest.shiny : newest.front) : null;
}

/** Whether the sprite and artwork buttons would actually show different images. */
export function hasSpriteToggle(
  sprite: string | null,
  artwork: string | null,
): boolean {
  return sprite !== null && artwork !== null && sprite !== artwork;
}

/** Candidate sprites for a form tile, preferring the selected image style. */
export function formSpriteCandidates(
  form: PokemonFormSprites,
  game: string | null,
  shiny: boolean,
  showSprite = true,
  fallbackToLatestGameSprite = false,
): string[] {
  const gameSprite =
    spriteForGameOrLatest(form.gameSprites, game, shiny) ??
    (fallbackToLatestGameSprite && game
      ? spriteForGameOrLatest(form.gameSprites, null, shiny)
      : null);
  const defaultSprite = shiny
    ? (form.shinyDefaultSprite ?? form.defaultSprite)
    : form.defaultSprite;
  const artwork = shiny
    ? (form.shinyArtwork ?? form.artwork)
    : form.artwork;
  const candidates = showSprite
    ? [gameSprite, defaultSprite, artwork]
    : [artwork, gameSprite, defaultSprite];
  return [...new Set(candidates.filter((url): url is string => url !== null))];
}

/**
 * The details as they were in a game: the stats, abilities, types and type
 * chart of its generation. What PokéAPI has
 * no history for stays as it is now.
 */
export function detailForGame(
  detail: PokemonDetail,
  game: string,
): PokemonDetail {
  const generation = gameGeneration(game);
  const types =
    detail.pastTypes.find((entry) => entry.generation >= generation)?.types ??
    detail.types;
  const charts = types.flatMap((name) => {
    const chart = detail.typeCharts.find((entry) => entry.name === name);
    return chart ? [relationsForGeneration(chart, generation)] : [];
  });
  return {
    ...detail,
    stats: statsForGeneration(detail.stats, detail.pastStats, generation),
    abilities: abilitiesForGeneration(
      detail.abilities,
      detail.pastAbilities,
      generation,
    ),
    types,
    matchups:
      charts.length === types.length
        ? computeMatchups(charts)
        : detail.matchups,
  };
}
