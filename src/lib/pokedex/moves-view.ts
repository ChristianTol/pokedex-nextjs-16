import { TEXT_LANGUAGES, type Language } from "@/lib/i18n/languages";
import type { LevelUpMove } from "@/lib/pokeapi/learnsets";
import type { MoveInfo } from "@/lib/pokeapi/moves";

export const MOVE_TABS = ["levelUp", "tutor", "machine"] as const;
export type MoveTab = (typeof MOVE_TABS)[number];

export type MoveCounts = Record<MoveTab, number>;

/** The tab to show first: the first one with moves, else level-up. */
export function defaultTab(counts: MoveCounts): MoveTab {
  return MOVE_TABS.find((tab) => counts[tab] > 0) ?? "levelUp";
}

/** Power, accuracy and PP are null for moves that don't have them. */
export function formatMoveStat(value: number | null): string {
  return value === null ? "—" : String(value);
}

/** Level 0 is used for moves learned on evolution. */
export function isEvolutionMove(move: LevelUpMove): boolean {
  return move.level === 0;
}

/** Sorts by the name shown to the user, in the user's language. */
export function sortByLabel<T>(
  items: readonly T[],
  label: (item: T) => string,
  locale: string,
): T[] {
  return [...items].sort((a, b) => label(a).localeCompare(label(b), locale));
}

/**
 * The text to show for a move: the in-game description in the user's language,
 * else the short effect in that language, then the same two in English.
 */
export function moveDescription(
  info: Pick<MoveInfo, "descriptions" | "effects">,
  language: Language,
): string | null {
  const own = TEXT_LANGUAGES.find((code) => code === language);
  return (
    (own && (info.descriptions[own] ?? info.effects[own])) ||
    info.descriptions.en ||
    info.effects.en ||
    null
  );
}

/** +1 for moves that go first, -1 for moves that go last. */
export function formatPriority(priority: number): string {
  return priority > 0 ? `+${priority}` : String(priority);
}
