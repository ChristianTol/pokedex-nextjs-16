import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import type { PokemonMovesState } from "@/hooks/usePokemonMoves";
import { pickText } from "@/lib/i18n/languages";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import { formatName } from "@/lib/pokedex/format";
import {
  defensiveTrainingAdviceForStats,
  level100StatsForTrainingAdvice,
  natureStatEffect,
  RADAR_CHART_STAT_CEILING,
  trainingAdviceForStats,
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
}: {
  title: string;
  icon: string;
  advice: TrainingAdvice | null;
  detail: PokemonDetail;
  moves: PokemonMovesState;
  game: string | null;
  kind: TrainingBuildKind;
  showCalculatedStats: boolean;
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
    ? level100StatsForTrainingAdvice(detail.stats, advice)
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
              {t(showCalculatedStats ? "detail.level100Stats" : "detail.evs")}
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
  const showCalculatedStats = valueMode === "stats";
  const offensive = trainingAdviceForStats(detail.stats, game);
  const defensive = defensiveTrainingAdviceForStats(detail.stats, game);

  if (!offensive && !defensive) {
    return <p className="text-sm text-muted">{t("detail.noTrainingAdvice")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("detail.trainingAdviceSummary")}</p>
      <div className="flex flex-col items-start gap-2">
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
        <p className="text-xs text-muted">
          {t("detail.level100StatAssumptions")}
        </p>
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
