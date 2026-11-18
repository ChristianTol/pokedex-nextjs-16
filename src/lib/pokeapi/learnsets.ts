import { idFromUrl } from "./client";

export type LevelUpMove = { move: string; level: number };

/** What a Pokémon learns in one game, in the three categories we show. */
export type Learnset = {
  /** PokéAPI version group slug, e.g. "scarlet-violet". */
  game: string;
  levelUp: LevelUpMove[];
  tutor: string[];
  machine: string[];
};

export type PokemonMovesResponse = {
  moves: {
    move: { name: string };
    version_group_details: {
      level_learned_at: number;
      move_learn_method: { name: string };
      version_group: { name: string; url: string };
    }[];
  }[];
};

/** Japan-only releases that duplicate Red/Blue. */
const EXCLUDED_GAMES = new Set(["red-green-japan", "blue-japan"]);

/**
 * Groups the learnable moves per game, newest game first (version group ids
 * follow release order). Games without level-up, tutor or TM moves, and the
 * other methods (egg moves, etc.), are left out.
 */
export function parseLearnsets(response: PokemonMovesResponse): Learnset[] {
  const byGame = new Map<string, { id: number; learnset: Learnset }>();

  for (const entry of response.moves) {
    for (const detail of entry.version_group_details) {
      const game = detail.version_group.name;
      const method = detail.move_learn_method.name;
      if (EXCLUDED_GAMES.has(game)) continue;
      if (method !== "level-up" && method !== "tutor" && method !== "machine") {
        continue;
      }

      let slot = byGame.get(game);
      if (!slot) {
        slot = {
          id: idFromUrl(detail.version_group.url),
          learnset: { game, levelUp: [], tutor: [], machine: [] },
        };
        byGame.set(game, slot);
      }
      const { learnset } = slot;
      if (method === "level-up") {
        learnset.levelUp.push({
          move: entry.move.name,
          level: detail.level_learned_at,
        });
      } else if (method === "tutor") {
        learnset.tutor.push(entry.move.name);
      } else {
        learnset.machine.push(entry.move.name);
      }
    }
  }

  return [...byGame.values()]
    .sort((a, b) => b.id - a.id)
    .map(({ learnset }) => ({
      ...learnset,
      // Stable sort: moves on the same level keep PokéAPI's order.
      levelUp: [...learnset.levelUp].sort((a, b) => a.level - b.level),
      tutor: [...learnset.tutor].sort(),
      machine: [...learnset.machine].sort(),
    }));
}

/** The newest game with level-up moves, else simply the newest one. */
export function defaultGame(learnsets: readonly Learnset[]): string | null {
  return (
    learnsets.find((learnset) => learnset.levelUp.length > 0)?.game ??
    learnsets[0]?.game ??
    null
  );
}
