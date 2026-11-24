import type { PokemonMoves, MoveInfo } from "@/lib/pokeapi/moves";
import type { PokemonStat } from "@/lib/pokeapi/detail";
import { gameGeneration } from "./games";
import { learnableMoves } from "./learnable-moves";
import type { TrainingAdvice } from "./training-advice";

export type TrainingBuildKind = "offensive" | "defensive";

const SUPPORT_MOVE_ORDER = [
  "recover",
  "roost",
  "slack-off",
  "soft-boiled",
  "shore-up",
  "synthesis",
  "moonlight",
  "morning-sun",
  "wish",
  "leech-seed",
  "will-o-wisp",
  "thunder-wave",
  "reflect",
  "light-screen",
  "protect",
  "toxic",
  "rest",
];

function preferredDamageClass(
  advice: TrainingAdvice,
  stats: PokemonStat[],
  kind: TrainingBuildKind,
): MoveInfo["damageClass"] {
  const offensiveEv = advice.evs
    .filter(({ stat }) => stat === "attack" || stat === "special-attack")
    .sort((a, b) => b.value - a.value)[0];
  if (offensiveEv) {
    return offensiveEv.stat === "attack" ? "physical" : "special";
  }

  if (kind === "defensive") {
    if (advice.decreasedStat === "attack") return "special";
    if (advice.decreasedStat === "special-attack") return "physical";
  }

  const attack = stats.find(({ name }) => name === "attack")?.value ?? 0;
  const specialAttack =
    stats.find(({ name }) => name === "special-attack")?.value ?? 0;
  return attack >= specialAttack ? "physical" : "special";
}

function rankDamagingMoves(
  candidates: MoveInfo[],
  types: readonly string[],
  damageClass: MoveInfo["damageClass"],
) {
  return candidates
    .filter(
      (move) =>
        (move.damageClass === "physical" || move.damageClass === "special") &&
        move.power !== null &&
        move.power > 0,
    )
    .map((move) => ({
      move,
      stab: types.includes(move.type),
      score:
        move.power! * ((move.accuracy ?? 100) / 100) +
        (move.damageClass === damageClass ? 20 : 0),
    }))
    .sort(
      (a, b) =>
        Number(b.stab) - Number(a.stab) ||
        b.score - a.score ||
        a.move.name.localeCompare(b.move.name),
    );
}

function addDiverse(
  target: MoveInfo[],
  ranked: ReturnType<typeof rankDamagingMoves>,
  count: number,
) {
  const remaining = ranked.filter(
    ({ move }) => !target.some((selected) => selected.name === move.name),
  );
  const usedTypes = new Set(target.map(({ type }) => type));
  const diverse = remaining.filter(({ move }) => !usedTypes.has(move.type));
  const chosen = [...diverse, ...remaining.filter(({ move }) => usedTypes.has(move.type))]
    .slice(0, count)
    .map(({ move }) => move);
  target.push(...chosen);
}

/**
 * Selects up to four illustrative moves only from the selected form's
 * learnset. Generation 3 is excluded because its physical/special split is
 * type-based, unlike the modern move data provided by PokéAPI.
 */
export function suggestedMovesForBuild(
  advice: TrainingAdvice,
  stats: PokemonStat[],
  types: readonly string[],
  moves: PokemonMoves | null,
  game: string | null,
  kind: TrainingBuildKind,
): MoveInfo[] {
  if (
    !game ||
    !moves ||
    moves.game !== game ||
    gameGeneration(game) < 4
  ) {
    return [];
  }

  const candidates = learnableMoves(moves);
  const selected: MoveInfo[] = [];
  if (kind === "defensive") {
    const support = SUPPORT_MOVE_ORDER.map((name) =>
      candidates.find(
        (move) => move.name === name && move.damageClass === "status",
      ),
    ).filter((move): move is MoveInfo => move !== undefined);
    selected.push(...support.slice(0, 2));
  }

  const ranked = rankDamagingMoves(
    candidates,
    types,
    preferredDamageClass(advice, stats, kind),
  );
  const stab = ranked.filter(({ stab: isStab }) => isStab);
  addDiverse(selected, stab, Math.min(2, 4 - selected.length));
  addDiverse(selected, ranked, 4 - selected.length);

  return selected.slice(0, 4);
}