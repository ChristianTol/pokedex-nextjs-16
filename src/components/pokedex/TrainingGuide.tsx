import { useState, type MouseEvent, type PointerEvent } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import type { PokemonMovesState } from "@/hooks/usePokemonMoves";
import { pickText } from "@/lib/i18n/languages";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import { formatName } from "@/lib/pokedex/format";
import {
  defensiveTrainingAdviceForStats,
  natureStatEffect,
  RADAR_CHART_STAT_CEILING,
  trainingAdviceForStats,
  trainingStatsForAdviceAtLevel,
  TRAINING_NATURES,
  type TrainingAdvice,
  type TrainingNature,
} from "@/lib/pokedex/training-advice";
import {
  suggestedMovesForBuild,
  type TrainingBuildKind,
} from "@/lib/pokedex/training-builds";
import { STAT_COLORS, STAT_LABELS } from "./stat-style";
import { EvRadarChart } from "./EvRadarChart";
import { TypeIcon } from "./TypeIcon";

const EV_STAT_ORDER = [
  "hp",
  "attack",
  "defense",
  "speed",
  "special-defense",
  "special-attack",
] as const;

const natureLabelKey = (nature: TrainingNature) =>
  `nature.${nature}` satisfies MessageKey;

export type TrainingValueMode = "evs" | "stats";

export function toggleTrainingValueMode(
  mode: TrainingValueMode,
): TrainingValueMode {
  return mode === "evs" ? "stats" : "evs";
}

function SuggestedMoves({
  advice,
  detail,
  moves,
  game,
  kind,
}: {
  advice: TrainingAdvice;
  detail: PokemonDetail;
  moves: PokemonMovesState;
  game: string | null;
  kind: TrainingBuildKind;
}) {
  const { language, t, tOptional } = useLanguage();

  if (moves.loading) {
    return (
      <p className="text-sm text-muted">{t("detail.suggestedMovesLoading")}</p>
    );
  }
  if (moves.failed) {
    return (
      <p className="text-sm text-muted">{t("detail.suggestedMovesError")}</p>
    );
  }

  const suggestions =
    moves.data?.game === game
      ? suggestedMovesForBuild(
          advice,
          detail.stats,
          detail.types,
          moves.data,
          game,
          kind,
        )
      : [];
  if (suggestions.length === 0) {
    return <p className="text-sm text-muted">{t("detail.noSuggestedMoves")}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {suggestions.map((move) => (
        <li
          key={move.name}
          className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/50 bg-surface-muted px-2.5 py-1 text-xs font-medium"
        >
          <TypeIcon type={move.type} size={16} />
          <span className="sr-only">
            {tOptional(`type.${move.type}`) ?? formatName(move.type)}
          </span>
          <span className="min-w-0 break-words">
            {pickText(move.names, language) ?? formatName(move.name)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BuildCard({
  title,
  icon,
  advice: recommended,
  detail,
  moves,
  game,
  kind,
  showCalculatedStats,
  level,
}: {
  title: string;
  icon: string;
  advice: TrainingAdvice | null;
  detail: PokemonDetail;
  moves: PokemonMovesState;
  game: string | null;
  kind: TrainingBuildKind;
  showCalculatedStats: boolean;
  level: number;
}) {
  const { t } = useLanguage();
  const statLabel = (name: string) => {
    const key = STAT_LABELS[name];
    return key ? t(key) : formatName(name);
  };
  const [chosenNature, setChosenNature] = useState<TrainingNature | null>(
    null,
  );
  // The recommended nature is the starting point; the picker overrides it.
  const nature = chosenNature ?? recommended?.nature;
  const advice: TrainingAdvice | null =
    recommended && nature
      ? { ...recommended, nature, ...natureStatEffect(nature) }
      : null;
  const calculatedStats = advice
    ? trainingStatsForAdviceAtLevel(detail.stats, advice, level)
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-border/50 p-4">
      <h4 className="flex items-center gap-2 font-semibold">
        <span aria-hidden="true">{icon}</span>
        {title}
      </h4>
      {advice ? (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-muted">
              {t("detail.recommendedNature")}
            </p>
            <select
              aria-label={t("detail.chooseNature")}
              value={advice.nature}
              onChange={(event) =>
                setChosenNature(event.target.value as TrainingNature)
              }
              className="mt-1 max-w-full rounded-lg border border-border/50 bg-surface-muted px-2 py-1 text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {TRAINING_NATURES.map((option) => {
                const effect = natureStatEffect(option);
                return (
                  <option key={option} value={option}>
                    {t(natureLabelKey(option))}
                    {effect.increasedStat
                      ? ` (↑ ${statLabel(effect.increasedStat)}, ↓ ${statLabel(effect.decreasedStat)})`
                      : ""}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
              {advice.increasedStat ? (
                <>
                  <span>
                    <span aria-hidden="true">↑</span>{" "}
                    {t("detail.natureRaises")}{" "}
                    {statLabel(advice.increasedStat)}
                  </span>
                  <span>
                    <span aria-hidden="true">↓</span>{" "}
                    {t("detail.natureLowers")}{" "}
                    {statLabel(advice.decreasedStat)}
                  </span>
                </>
              ) : (
                <span>{t("detail.natureNeutral")}</span>
              )}
            </p>
          </div>
          <div>
            <p className="mb-2 font-medium">
              {showCalculatedStats
                ? t("detail.level100Stats").replace("{level}", String(level))
                : t("detail.evs")}
            </p>
            <EvRadarChart
              increasedStat={advice.increasedStat}
              decreasedStat={advice.decreasedStat}
              stats={EV_STAT_ORDER.map((stat) => ({
                stat,
                label: statLabel(stat),
                value: showCalculatedStats
                  ? (calculatedStats?.[stat] ?? 0)
                  : (advice.evs.find((ev) => ev.stat === stat)?.value ?? 0),
                maxValue: showCalculatedStats
                  ? RADAR_CHART_STAT_CEILING
                  : undefined,
                displayValue: showCalculatedStats
                  ? (calculatedStats?.[stat] ?? t("detail.unavailableStat"))
                  : undefined,
                color: STAT_COLORS[stat] ?? "bg-accent",
              }))}
            />
          </div>
          <div>
            <p className="mb-2 font-medium">{t("detail.suggestedMoves")}</p>
            <SuggestedMoves
              advice={recommended ?? advice}
              detail={detail}
              moves={moves}
              game={game}
              kind={kind}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">{t("detail.noTrainingAdvice")}</p>
      )}
    </div>
  );
}

const TRAINING_LEVEL_STOPS = [20, 40, 60, 80] as const;

export function TrainingLevelStops({
  level,
  onSelectLevel,
  levelLabel,
}: {
  level: number;
  onSelectLevel: (level: number) => void;
  levelLabel: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {TRAINING_LEVEL_STOPS.map((stop) => (
        <button
          key={stop}
          type="button"
          aria-label={`${levelLabel} ${stop}`}
          aria-pressed={level === stop}
          title={`${levelLabel} ${stop}`}
          onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            onSelectLevel(stop);
          }}
          onPointerMove={(event: PointerEvent<HTMLButtonElement>) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

            const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!bounds) return;

            const rangeWidth = Math.max(1, bounds.width - 16);
            const position = Math.min(
              1,
              Math.max(0, (event.clientX - bounds.left - 8) / rangeWidth),
            );
            onSelectLevel(Math.round(1 + position * 99));
          }}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            if (event.detail === 0) onSelectLevel(stop);
          }}
          style={{
            left: `calc(${((stop - 1) / 99) * 100}% + ${8 - ((stop - 1) / 99) * 16}px)`,
          }}
          className="group pointer-events-auto absolute top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#047857] dark:focus-visible:outline-[#6ee7b7]"
        >
          <span
            aria-hidden="true"
            className={`rounded-full transition-transform group-hover:scale-125 group-focus-visible:scale-125 ${
              level === stop
                ? "size-3 border-2 border-[#047857] bg-[#047857] dark:border-[#6ee7b7] dark:bg-[#6ee7b7]"
                : "size-2 bg-border"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/** Example nature, EV spread and moves for an offensive and a defensive build. */
export function TrainingGuide({
  detail,
  moves,
  game,
}: {
  detail: PokemonDetail;
  moves: PokemonMovesState;
  game: string | null;
}) {
  const { t } = useLanguage();
  const [valueMode, setValueMode] = useState<TrainingValueMode>("stats");
  const [level, setLevel] = useState(100);
  const showCalculatedStats = valueMode === "stats";
  const offensive = trainingAdviceForStats(detail.stats, game);
  const defensive = defensiveTrainingAdviceForStats(detail.stats, game);

  if (!offensive && !defensive) {
    return <p className="text-sm text-muted">{t("detail.noTrainingAdvice")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("detail.trainingAdviceSummary")}</p>
      <div className="flex flex-col items-start gap-3">
        <button
          type="button"
          aria-pressed={showCalculatedStats}
          onClick={() =>
            setValueMode((current) => toggleTrainingValueMode(current))
          }
          className="rounded-lg border border-border/50 bg-surface-muted px-3 py-1.5 text-sm font-medium hover:bg-surface-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t(
            showCalculatedStats
              ? "detail.showEvValues"
              : "detail.showLevel100Stats",
          )}
        </button>
        {showCalculatedStats && (
          <>
            <label className="grid w-full max-w-xs gap-1 text-sm font-medium">
              <span className="flex items-center justify-between">
                <span>{t("detail.calculatedLevel")}</span>
                <output aria-live="polite" className="tabular-nums">
                  {level}
                </output>
              </span>
              <span className="relative block h-10 w-full">
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={level}
                  aria-label={t("detail.calculatedLevel")}
                  onChange={(event) => setLevel(Number(event.currentTarget.value))}
                  className="absolute inset-0 z-0 m-0 h-full w-full accent-[#047857] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#047857] dark:accent-[#6ee7b7] dark:focus-visible:outline-[#6ee7b7]"
                />
                <TrainingLevelStops
                  level={level}
                  onSelectLevel={setLevel}
                  levelLabel={t("detail.calculatedLevel")}
                />
              </span>
            </label>
            <p className="text-xs text-muted">
              {t("detail.level100StatAssumptions")}
            </p>
          </>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <BuildCard
          title={t("detail.offensiveExample")}
          icon="⚔️"
          advice={offensive}
          detail={detail}
          moves={moves}
          game={game}
          kind="offensive"
          showCalculatedStats={showCalculatedStats}
          level={level}
        />
        <BuildCard
          title={t("detail.defensiveExample")}
          icon="🛡️"
          advice={defensive}
          detail={detail}
          moves={moves}
          game={game}
          kind="defensive"
          showCalculatedStats={showCalculatedStats}
          level={level}
        />
      </div>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer font-medium">
          {t("detail.trainingAdviceMoreInfo")}
        </summary>
        <p className="mt-2">{t("detail.trainingAdviceCaveat")}</p>
      </details>
    </div>
  );
}
