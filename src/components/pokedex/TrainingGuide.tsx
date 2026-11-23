import { useLanguage } from "@/hooks/useLanguage";
import type { PokemonMovesState } from "@/hooks/usePokemonMoves";
import { pickText } from "@/lib/i18n/languages";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import { formatName } from "@/lib/pokedex/format";
import {
  defensiveTrainingAdviceForStats,
  trainingAdviceForStats,
  type TrainingAdvice,
  type TrainingNature,
} from "@/lib/pokedex/training-advice";
import {
  suggestedMovesForBuild,
  type TrainingBuildKind,
} from "@/lib/pokedex/training-builds";
import { STAT_COLORS, STAT_LABELS } from "./stat-style";
import { TypeIcon } from "./TypeIcon";

const MAX_EV_PER_STAT = 252;

const TRAINING_NATURE_LABELS = {
  adamant: "nature.adamant",
  bold: "nature.bold",
  calm: "nature.calm",
  careful: "nature.careful",
  impish: "nature.impish",
  jolly: "nature.jolly",
  modest: "nature.modest",
  timid: "nature.timid",
} as const satisfies Record<TrainingNature, MessageKey>;

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
  advice,
  detail,
  moves,
  game,
  kind,
}: {
  title: string;
  icon: string;
  advice: TrainingAdvice | null;
  detail: PokemonDetail;
  moves: PokemonMovesState;
  game: string | null;
  kind: TrainingBuildKind;
}) {
  const { t } = useLanguage();
  const statLabel = (name: string) => {
    const key = STAT_LABELS[name];
    return key ? t(key) : formatName(name);
  };

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
            <p className="text-xl font-bold tracking-tight">
              {t(TRAINING_NATURE_LABELS[advice.nature])}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
              <span>
                <span aria-hidden="true">↑</span> {t("detail.natureRaises")}{" "}
                {statLabel(advice.increasedStat)}
              </span>
              <span>
                <span aria-hidden="true">↓</span> {t("detail.natureLowers")}{" "}
                {statLabel(advice.decreasedStat)}
              </span>
            </p>
          </div>
          <div>
            <p className="mb-2 font-medium">{t("detail.evs")}</p>
            <ul className="flex flex-col gap-2 text-sm">
              {advice.evs.map(({ stat, value }) => (
                <li
                  key={stat}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
                >
                  <span className="truncate">{statLabel(stat)}</span>
                  <span className="font-semibold tabular-nums">{value}</span>
                  <div
                    aria-hidden="true"
                    className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-muted"
                  >
                    <div
                      className={`h-full rounded-full ${STAT_COLORS[stat] ?? "bg-accent"}`}
                      style={{
                        width: `${Math.min(100, (value / MAX_EV_PER_STAT) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium">{t("detail.suggestedMoves")}</p>
            <SuggestedMoves
              advice={advice}
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
  const offensive = trainingAdviceForStats(detail.stats, game);
  const defensive = defensiveTrainingAdviceForStats(detail.stats, game);

  if (!offensive && !defensive) {
    return <p className="text-sm text-muted">{t("detail.noTrainingAdvice")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("detail.trainingAdviceSummary")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <BuildCard
          title={t("detail.offensiveExample")}
          icon="⚔️"
          advice={offensive}
          detail={detail}
          moves={moves}
          game={game}
          kind="offensive"
        />
        <BuildCard
          title={t("detail.defensiveExample")}
          icon="🛡️"
          advice={defensive}
          detail={detail}
          moves={moves}
          game={game}
          kind="defensive"
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
