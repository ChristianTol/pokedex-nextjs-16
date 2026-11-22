import { useEffect, useReducer } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import type { PokemonMovesState } from "@/hooks/usePokemonMoves";
import { pickText, type Language } from "@/lib/i18n/languages";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import { suggestedMovesForBuild } from "@/lib/pokedex/training-builds";
import { abilityDescriptionForGame } from "@/lib/pokedex/game-detail";
import {
  defensiveTrainingAdviceForStats,
  trainingAdviceForStats,
  type TrainingNature,
} from "@/lib/pokedex/training-advice";
import {
  formatHeight,
  formatName,
  formatPercentage,
  formatWeight,
} from "@/lib/pokedex/format";
import { EvolutionChain, FamilyShinyButton } from "./EvolutionChain";
import { PokemonMoves } from "./PokemonMoves";
import { MAX_BASE_STAT, STAT_COLORS, STAT_LABELS } from "./stat-style";
import { TypeIcon } from "./TypeIcon";
import { TypeMatchups } from "./TypeMatchups";

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

export function abilityDescriptionForMode(
  ability: PokemonDetail["abilities"][number],
  game: string | null,
  language: Language,
  showGeneralEffect: boolean,
): string | null {
  const gameDescription = abilityDescriptionForGame(ability, game, language);
  const effectDescription = pickText(ability.effectDescriptions, language);

  return showGeneralEffect
    ? effectDescription ?? gameDescription
    : gameDescription ?? effectDescription;
}

export function toggleAbilityDescriptionMode(showGeneralEffect: boolean) {
  return !showGeneralEffect;
}

type AbilityDescriptionModeState = {
  game: string | null;
  showGeneralEffect: boolean;
};

type AbilityDescriptionModeAction =
  | { type: "reset"; game: string | null }
  | { type: "toggle"; game: string | null };

export function abilityDescriptionModeReducer(
  state: AbilityDescriptionModeState,
  action: AbilityDescriptionModeAction,
): AbilityDescriptionModeState {
  if (action.type === "reset" || state.game !== action.game) {
    return { game: action.game, showGeneralEffect: false };
  }

  return {
    ...state,
    showGeneralEffect: toggleAbilityDescriptionMode(state.showGeneralEffect),
  };
}

/** The surface every block of the window sits on. */
export const CARD =
  "rounded-2xl border border-border/40 bg-surface/35 p-4 sm:p-5";

function Section({
  title,
  action,
  className,
  children,
}: {
  title: string;
  /** Sits at the right of the title; the header keeps its height without it. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col gap-3 ${CARD}${className ? ` ${className}` : ""}`}
    >
      {action === undefined ? (
        <h3 className="text-sm font-semibold text-muted">{title}</h3>
      ) : (
        <div className="flex sm:min-h-7.5 items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-muted">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function GenderBar({ gender }: { gender: PokemonDetail["gender"] }) {
  const { language, t } = useLanguage();
  if (!gender) {
    return <p className="text-sm">{t("detail.genderless")}</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-surface-muted"
        role="img"
        aria-label={`${t("detail.male")} ${formatPercentage(gender.male, language)}, ${t("detail.female")} ${formatPercentage(gender.female, language)}`}
      >
        <div className="bg-sky-500" style={{ width: `${gender.male}%` }} />
        <div className="bg-pink-500" style={{ width: `${gender.female}%` }} />
      </div>
      <p className="flex justify-between text-sm">
        <span>
          ♂ {t("detail.male")} {formatPercentage(gender.male, language)}
        </span>
        <span>
          ♀ {t("detail.female")} {formatPercentage(gender.female, language)}
        </span>
      </p>
    </div>
  );
}

/** Gender and size, for beside the title. */
export function PokemonFacts({ detail }: { detail: PokemonDetail }) {
  const { language, t } = useLanguage();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Section title={t("detail.gender")}>
        <GenderBar gender={detail.gender} />
      </Section>
      <Section title={`${t("detail.height")} / ${t("detail.weight")}`}>
        <p className="text-lg font-semibold">
          {formatHeight(detail.heightMeters, language)} ·{" "}
          {formatWeight(detail.weightKg, language)}
        </p>
      </Section>
    </div>
  );
}

export function PokemonDetails({
  detail,
  onSelectPokemon,
  moves,
  shinyIds,
  onSetShiny,
  game,
  showSprite,
}: {
  detail: PokemonDetail;
  onSelectPokemon: (id: number, formId?: number) => void;
  moves: PokemonMovesState;
  /** Species that are shown shiny (the evolution chain shows each of its own). */
  shinyIds: ReadonlySet<number>;
  onSetShiny: (ids: readonly number[], on: boolean) => void;
  /** The game chosen in the window. */
  game: string | null;
  /** Whether game sprites or artwork are selected in the window. */
  showSprite: boolean;
}) {
  const { language, t, tOptional } = useLanguage();
  const [abilityDescriptionMode, dispatchAbilityDescriptionMode] = useReducer(
    abilityDescriptionModeReducer,
    game,
    (currentGame): AbilityDescriptionModeState => ({
      game: currentGame,
      showGeneralEffect: false,
    }),
  );
  const showGeneralEffect =
    abilityDescriptionMode.game === game &&
    abilityDescriptionMode.showGeneralEffect;

  useEffect(() => {
    if (abilityDescriptionMode.game !== game) {
      dispatchAbilityDescriptionMode({ type: "reset", game });
    }
  }, [abilityDescriptionMode.game, game]);

  const statLabel = (name: string) => {
    const key = STAT_LABELS[name];
    return key ? t(key) : formatName(name);
  };
  const trainingAdvice = trainingAdviceForStats(detail.stats, game);
  const defensiveTrainingAdvice = defensiveTrainingAdviceForStats(
    detail.stats,
    game,
  );
  const trainingMoves =
    moves.loading || moves.failed || moves.data?.game !== game
      ? null
      : moves.data;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* The evolution chain needs more room than the stats. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
        <Section title={t("detail.stats")} className="lg:self-center">
          <ul className="flex flex-col gap-2">
            {detail.stats.map((stat) => (
              <li
                key={stat.name}
                className="grid grid-cols-[8.5rem_2.5rem_1fr] items-center gap-2 text-sm"
              >
                <span className="text-muted">{statLabel(stat.name)}</span>
                <span className="font-semibold tabular-nums">{stat.value}</span>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full rounded-full ${STAT_COLORS[stat.name] ?? "bg-accent"}`}
                    style={{
                      width: `${Math.min(100, (stat.value / MAX_BASE_STAT) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title={t("detail.evolution")}
          action={
            <FamilyShinyButton
              root={detail.evolution}
              formName={detail.name}
              currentId={detail.id}
              shinyIds={shinyIds}
              onSetShiny={onSetShiny}
              className="hidden sm:inline-flex"
            />
          }
        >
          <EvolutionChain
            root={detail.evolution}
            formName={detail.name}
            currentId={detail.id}
            onSelect={onSelectPokemon}
            shinyIds={shinyIds}
            onSetShiny={onSetShiny}
            game={game}
            showSprite={showSprite}
          />
        </Section>
      </div>

      <Section
        title={t("detail.abilities")}
        action={
          detail.abilities.some((ability) =>
            pickText(ability.effectDescriptions, language),
          ) ? (
            <button
              type="button"
              aria-pressed={showGeneralEffect}
              onClick={() =>
                dispatchAbilityDescriptionMode({ type: "toggle", game })
              }
              className="rounded-full border border-border/50 px-3 py-1 text-xs text-muted transition hover:border-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t(
                showGeneralEffect
                  ? "detail.abilityEffect"
                  : "detail.gameDescription",
              )}
            </button>
          ) : undefined
        }
      >
        {detail.abilities.length === 0 ? (
          <p className="text-sm text-muted">{t("detail.noAbilities")}</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-3">
            {detail.abilities.map((ability) => {
              const description = abilityDescriptionForMode(
                ability,
                game,
                language,
                showGeneralEffect,
              );

              return (
                <li
                  key={ability.name}
                  className="rounded-xl bg-surface-muted/60 px-3 py-2"
                >
                  <p className="flex items-center gap-2 font-medium">
                    {pickText(ability.names, language) ??
                      formatName(ability.name)}
                    {ability.hidden && (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-normal text-muted">
                        {t("detail.hidden")}
                      </span>
                    )}
                  </p>
                  <p className="whitespace-pre-line text-sm text-muted">
                    {description ?? t("detail.noDescription")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={t("detail.matchups")}>
        <TypeMatchups matchups={detail.matchups} />
      </Section>

      <Section title={t("detail.trainingAdvice")}>
        {trainingAdvice || defensiveTrainingAdvice ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              {t("detail.trainingAdviceSummary")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: t("detail.offensiveExample"),
                  advice: trainingAdvice,
                  kind: "offensive" as const,
                },
                {
                  title: t("detail.defensiveExample"),
                  advice: defensiveTrainingAdvice,
                  kind: "defensive" as const,
                },
              ].map(({ title, advice, kind }) => (
                <div
                  key={title}
                  className="flex min-w-0 flex-col gap-4 rounded-xl border border-border/50 p-4"
                >
                  <h4 className="flex items-center gap-2 font-semibold">
                    <span aria-hidden="true">
                      {kind === "offensive" ? "⚔️" : "🛡️"}
                    </span>
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
                            <span aria-hidden="true">↑</span>{" "}
                            {t("detail.natureRaises")} {statLabel(advice.increasedStat)}
                          </span>
                          <span>
                            <span aria-hidden="true">↓</span>{" "}
                            {t("detail.natureLowers")} {statLabel(advice.decreasedStat)}
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
                                  style={{ width: `${Math.min(100, (value / 252) * 100)}%` }}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 font-medium">
                          {t("detail.suggestedMoves")}
                        </p>
                        {moves.loading ? (
                          <p className="text-sm text-muted">
                            {t("detail.suggestedMovesLoading")}
                          </p>
                        ) : moves.failed ? (
                          <p className="text-sm text-muted">
                            {t("detail.suggestedMovesError")}
                          </p>
                        ) : trainingMoves ? (
                          (() => {
                            const suggestions = suggestedMovesForBuild(
                              advice,
                              detail.stats,
                              detail.types,
                              trainingMoves,
                              game,
                              kind,
                            );
                            return suggestions.length > 0 ? (
                              <ul className="flex flex-wrap gap-2 text-sm">
                                {suggestions.map((move) => (
                                  <li
                                    key={move.name}
                                    className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/50 bg-surface-muted px-2.5 py-1 text-xs font-medium"
                                  >
                                    <TypeIcon type={move.type} size={16} />
                                    <span className="sr-only">
                                      {tOptional(`type.${move.type}`) ??
                                        formatName(move.type)}
                                    </span>
                                    <span className="min-w-0 break-words">
                                      {pickText(move.names, language) ??
                                        formatName(move.name)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted">
                                {t("detail.noSuggestedMoves")}
                              </p>
                            );
                          })()
                        ) : (
                          <p className="text-sm text-muted">
                            {t("detail.noSuggestedMoves")}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">
                      {t("detail.noTrainingAdvice")}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <details className="text-xs text-muted">
              <summary className="cursor-pointer font-medium">
                {t("detail.trainingAdviceMoreInfo")}
              </summary>
              <p className="mt-2">{t("detail.trainingAdviceCaveat")}</p>
            </details>
          </div>
        ) : (
          <p className="text-sm text-muted">{t("detail.noTrainingAdvice")}</p>
        )}
      </Section>

      <Section title={t("detail.moves")}>
        {/* Keyed, so the tab and opened rows start fresh for every Pokémon and form. */}
        <PokemonMoves key={detail.pokemonId} moves={moves} />
      </Section>
    </div>
  );
}
