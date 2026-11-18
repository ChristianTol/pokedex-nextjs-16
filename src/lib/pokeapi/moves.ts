import { mapWithConcurrency } from "@/lib/async";
import {
  TEXT_LANGUAGES,
  textLanguageOf,
  type LocalizedText,
} from "@/lib/i18n/languages";
import { PokeApiError, fetchPokeApi } from "./client";
import { cleanFlavorText, parseLocalizedNames, resolveForm } from "./detail";
import {
  defaultGame,
  parseLearnsets,
  type LevelUpMove,
  type PokemonMovesResponse,
} from "./learnsets";

export type LearnMethod = "level-up" | "tutor" | "machine";

export type DamageClass = "physical" | "special" | "status";

export type MoveInfo = {
  /** PokéAPI slug, e.g. "flamethrower". */
  name: string;
  names: LocalizedText;
  type: string;
  damageClass: DamageClass | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  /** What the game itself says about the move, per language. */
  descriptions: LocalizedText;
  /** The short mechanical effect, per language (PokéAPI has English and French). */
  effects: LocalizedText;
  /** Chance (in percent) that the secondary effect happens; null if none. */
  effectChance: number | null;
  /** Turn order: +1 moves first, -1 moves last. */
  priority: number;
  /** PokéAPI target slug, e.g. "selected-pokemon". */
  target: string;
};

export type PokemonMoves = {
  /** Games this Pokémon has moves in, newest first. */
  games: string[];
  /** The game the lists below belong to; null when there are no moves. */
  game: string | null;
  levelUp: LevelUpMove[];
  tutor: string[];
  machine: string[];
  moves: Record<string, MoveInfo>;
};

type MoveResponse = {
  name: string;
  names: { name: string; language: { name: string } }[];
  type: { name: string };
  damage_class: { name: string } | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_chance: number | null;
  priority: number;
  target: { name: string };
  effect_entries: { short_effect: string; language: { name: string } }[];
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version_group: { name: string };
  }[];
};

const CONCURRENCY = 20;

/**
 * The in-game description per language: the text of the selected game, or
 * else the newest text in that language (entries are ordered by game), so a
 * German reader gets German text from another game before falling back to
 * English.
 */
export function parseMoveDescriptions(
  entries: MoveResponse["flavor_text_entries"],
  game: string,
): LocalizedText {
  const result: LocalizedText = {};
  for (const language of TEXT_LANGUAGES) {
    const own = entries.filter(
      (entry) => textLanguageOf(entry.language.name) === language,
    );
    // Japanese has a kanji and a kana version per game; prefer the kanji one.
    const inGame = own.filter((entry) => entry.version_group.name === game);
    const newest = own.at(-1);
    const entry =
      inGame.find((candidate) => candidate.language.name === language) ??
      inGame[0] ??
      // The newest text; when that is the kana version, its kanji twin.
      own.find(
        (candidate) =>
          candidate.language.name === language &&
          candidate.version_group.name === newest?.version_group.name,
      ) ??
      newest;
    const text = entry ? cleanFlavorText(entry.flavor_text, language) : "";
    if (text) result[language] = text;
  }
  return result;
}

/** "Has a $effect_chance% chance to burn" -> "Has a 10% chance to burn". */
export function fillEffectChance(
  text: string,
  effectChance: number | null,
): string {
  return effectChance === null
    ? text.replace(/\$effect_chance%?\s?/g, "")
    : text.replace(/\$effect_chance/g, String(effectChance));
}

export function parseMoveEffects(
  entries: MoveResponse["effect_entries"],
  effectChance: number | null,
): LocalizedText {
  const result: LocalizedText = {};
  for (const entry of entries) {
    const language = textLanguageOf(entry.language.name);
    if (!language) continue;
    const text = cleanFlavorText(
      fillEffectChance(entry.short_effect, effectChance),
      language,
    );
    if (text) result[language] = text;
  }
  return result;
}

export function parseMoveInfo(move: MoveResponse, game: string): MoveInfo {
  const damageClass = move.damage_class?.name;
  return {
    name: move.name,
    names: parseLocalizedNames(move.names),
    type: move.type.name,
    damageClass:
      damageClass === "physical" ||
      damageClass === "special" ||
      damageClass === "status"
        ? damageClass
        : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    descriptions: parseMoveDescriptions(move.flavor_text_entries, game),
    effects: parseMoveEffects(move.effect_entries, move.effect_chance),
    effectChance: move.effect_chance,
    priority: move.priority,
    target: move.target.name,
  };
}

/**
 * The moves of a species' form in one game. Without `game` the default game
 * is used; `formId` selects an alternative form like in `getPokemonDetail`.
 */
export async function getPokemonMoves(
  id: number,
  formId?: number,
  game?: string,
): Promise<PokemonMoves> {
  const { targetId } = await resolveForm(id, formId);
  const response = await fetchPokeApi<PokemonMovesResponse>(
    `/pokemon/${targetId}`,
  );
  const learnsets = parseLearnsets(response);

  const selected = game
    ? learnsets.find((learnset) => learnset.game === game)
    : learnsets.find((learnset) => learnset.game === defaultGame(learnsets));
  if (game && !selected) {
    throw new PokeApiError(`No moves for ${game}`, 404);
  }
  if (!selected) {
    return {
      games: [],
      game: null,
      levelUp: [],
      tutor: [],
      machine: [],
      moves: {},
    };
  }

  const names = [
    ...new Set([
      ...selected.levelUp.map((entry) => entry.move),
      ...selected.tutor,
      ...selected.machine,
    ]),
  ];
  const infos = await mapWithConcurrency(names, CONCURRENCY, async (name) =>
    parseMoveInfo(
      await fetchPokeApi<MoveResponse>(`/move/${name}`),
      selected.game,
    ),
  );

  return {
    games: learnsets.map((learnset) => learnset.game),
    game: selected.game,
    levelUp: selected.levelUp,
    tutor: selected.tutor,
    machine: selected.machine,
    moves: Object.fromEntries(infos.map((info) => [info.name, info])),
  };
}
