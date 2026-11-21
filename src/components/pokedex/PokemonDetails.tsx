import { useLanguage } from "@/hooks/useLanguage";
import type { PokemonMovesState } from "@/hooks/usePokemonMoves";
import { pickText } from "@/lib/i18n/languages";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import {
  formatHeight,
  formatName,
  formatPercentage,
  formatWeight,
} from "@/lib/pokedex/format";
import { EvolutionChain, FamilyShinyButton } from "./EvolutionChain";
import { PokemonMoves } from "./PokemonMoves";
import { MAX_BASE_STAT, STAT_COLORS, STAT_LABELS } from "./stat-style";
import { TypeMatchups } from "./TypeMatchups";

/** The surface every block of the window sits on. */
export const CARD =
  "rounded-2xl border border-border/40 bg-surface/35 p-4 sm:p-5";

function Section({
  title,
  action,
  children,
}: {
  title: string;
  /** Sits at the right of the title; the header keeps its height without it. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 ${CARD}`}>
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
  const { language, t } = useLanguage();
  const statLabel = (name: string) => {
    const key = STAT_LABELS[name];
    return key ? t(key) : formatName(name);
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* The evolution chain needs more room than the stats. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
        <Section title={t("detail.stats")}>
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

      <Section title={t("detail.abilities")}>
        {detail.abilities.length === 0 ? (
          <p className="text-sm text-muted">{t("detail.noAbilities")}</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-3">
            {detail.abilities.map((ability) => (
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
                <p className="text-sm text-muted">
                  {pickText(ability.descriptions, language) ??
                    t("detail.noDescription")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("detail.matchups")}>
        <TypeMatchups matchups={detail.matchups} />
      </Section>

      <Section title={t("detail.moves")}>
        {/* Keyed, so the tab and opened rows start fresh for every Pokémon and form. */}
        <PokemonMoves key={detail.pokemonId} moves={moves} />
      </Section>
    </div>
  );
}
