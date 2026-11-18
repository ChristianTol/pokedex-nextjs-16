"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Select } from "@/components/Select";
import { useLanguage } from "@/hooks/useLanguage";
import { usePokemonDetails } from "@/hooks/usePokemonDetails";
import { useUrlSearch } from "@/hooks/useUrlSearch";
import { pickText } from "@/lib/i18n/languages";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import type { PokemonIndexEntry } from "@/lib/pokeapi/index-list";
import {
  bestMultiplier,
  commonGames,
  defenseVerdict,
  offenseVerdict,
  compareGame,
  compareStats,
  parseCompare,
  serializeCompare,
  statTotal,
} from "@/lib/pokedex/compare";
import {
  artworkUrl,
  formatHeight,
  formatName,
  formatNumber,
  formatWeight,
} from "@/lib/pokedex/format";
import { detailForGame } from "@/lib/pokedex/game-detail";
import { formatGame } from "@/lib/pokedex/games";
import { formatMultiplier } from "@/lib/pokedex/matchups";
import { typeBackground } from "@/lib/pokedex/type-colors";
import { EmptySlot } from "./EmptySlot";
import { PokemonPicker } from "./PokemonPicker";
import { TypeBadge } from "./TypeBadge";
import { TypeMatchups } from "./TypeMatchups";
import { MAX_BASE_STAT, STAT_COLORS, STAT_LABELS } from "./stat-style";

/** Totals go up to about 780 for ordinary Pokémon; that is a full bar. */
const MAX_TOTAL = 780;

type Side = "a" | "b";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** One side of a stat row: the bar grows away from the stat's name. */
function StatCell({
  side,
  value,
  other,
  max,
  color,
}: {
  side: Side;
  value: number | undefined;
  other: number | undefined;
  max: number;
  color: string;
}) {
  if (value === undefined) {
    return <td className="px-2 py-1.5 text-center text-muted">–</td>;
  }
  const lead = other === undefined ? 0 : value - other;
  const number = (
    <span className="w-16 shrink-0 tabular-nums">
      <span className={lead > 0 ? "font-bold" : "font-medium"}>{value}</span>
      {lead > 0 && <span className="ml-1 text-xs text-muted">+{lead}</span>}
    </span>
  );
  const bar = (
    <div
      className={`flex h-2 flex-1 overflow-hidden rounded-full bg-surface-muted ${side === "a" ? "justify-end" : ""}`}
    >
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );
  return (
    <td className="px-2 py-1.5 text-sm">
      <div
        className={`flex items-center gap-2 ${side === "a" ? "text-right" : ""}`}
      >
        {side === "a" ? (
          <>
            {bar}
            {number}
          </>
        ) : (
          <>
            {number}
            {bar}
          </>
        )}
      </div>
    </td>
  );
}

const VERDICT_TONE = {
  good: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  bad: "bg-red-500/15 text-red-700 dark:text-red-300",
  neutral: "bg-surface-muted text-muted",
} as const;

function Verdict({
  title,
  text,
  multiplier,
  tone,
}: {
  title: string;
  text: string;
  multiplier: number;
  tone: keyof typeof VERDICT_TONE;
}) {
  // The words always say it; the colour only backs them up.
  const label = formatMultiplier(multiplier) || "×1";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted">{title}</span>
      <span
        className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${VERDICT_TONE[tone]}`}
      >
        {text}
        <span className="tabular-nums">{label}</span>
      </span>
    </div>
  );
}

function PokemonCardSlot({
  entry,
  detail,
  name,
  onRemove,
}: {
  entry: PokemonIndexEntry;
  detail: PokemonDetail | undefined;
  name: string;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div
      className="relative flex min-h-36 items-center gap-4 rounded-2xl border border-border bg-surface p-4"
      style={{ background: detail ? typeBackground(detail.types) : undefined }}
    >
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${name} ${t("compare.remove")}`}
        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-surface-muted leading-none hover:bg-border focus-visible:outline-2 focus-visible:outline-selected"
      >
        ×
      </button>
      <Image
        src={detail?.artwork ?? artworkUrl(entry.id)}
        alt=""
        width={475}
        height={475}
        sizes="112px"
        className="size-24 shrink-0 object-contain sm:size-28"
      />
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">{formatNumber(entry.id)}</span>
        <span className="text-xl font-bold">{name}</span>
        <span className="flex min-h-6 flex-wrap gap-1.5">
          {detail?.types.map((type) => (
            <TypeBadge key={type} type={type} />
          ))}
        </span>
      </div>
    </div>
  );
}

export function CompareView({ entries }: { entries: PokemonIndexEntry[] }) {
  const { language, t } = useLanguage();
  const { search, replace } = useUrlSearch();
  const state = useMemo(() => parseCompare(search), [search]);
  const entryById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries],
  );
  // An id that is not a Pokémon (e.g. from an edited link) counts as empty.
  const slots = useMemo(
    () =>
      state.ids.map((id) => (id === null ? null : (entryById.get(id) ?? null))),
    [state.ids, entryById],
  );
  const wanted = useMemo(
    () => slots.flatMap((entry) => (entry ? [entry.id] : [])),
    [slots],
  );
  const { details, failed, retry } = usePokemonDetails(wanted);

  const update = (next: Partial<typeof state>) =>
    replace(serializeCompare({ ...state, ...next }));
  const setSlot = (index: 0 | 1, id: number | null) => {
    const ids: typeof state.ids = [...state.ids];
    ids[index] = id;
    update({ ids });
  };

  const [first, second] = slots;
  const detailA = first ? details[first.id] : undefined;
  const detailB = second ? details[second.id] : undefined;
  const both =
    detailA && detailB && first && second ? { detailA, detailB } : null;

  const common = both
    ? commonGames(both.detailA.games, both.detailB.games)
    : [];
  const game = compareGame(state.game, common);
  const shown = both && {
    a: game ? detailForGame(both.detailA, game) : both.detailA,
    b: game ? detailForGame(both.detailB, game) : both.detailB,
  };

  const nameOf = (entry: PokemonIndexEntry) =>
    pickText(details[entry.id]?.names, language) ?? formatName(entry.name);
  const statLabel = (name: string) => {
    const key = STAT_LABELS[name];
    return key ? t(key) : formatName(name);
  };
  const abilityName = (ability: PokemonDetail["abilities"][number]) =>
    pickText(ability.names, language) ?? formatName(ability.name);

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">{t("compare.title")}</h2>

      {/* Each column keeps its search field, also when a Pokémon is chosen:
          picking another one replaces it. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {([0, 1] as const).map((index) => {
          const entry = slots[index];
          return (
            <div key={`slot-${index}`} className="flex flex-col gap-4">
              <PokemonPicker
                entries={entries}
                label={t("compare.search").replace("{n}", String(index + 1))}
                actionLabel={t("compare.select")}
                onPick={(id) => setSlot(index, id)}
                pickedIds={wanted}
                pickedLabel={t("compare.picked")}
              />
              {entry ? (
                <PokemonCardSlot
                  entry={entry}
                  detail={details[entry.id]}
                  name={nameOf(entry)}
                  onRemove={() => setSlot(index, null)}
                />
              ) : (
                <EmptySlot label={t("team.emptySlot")} className="min-h-36" />
              )}
            </div>
          );
        })}
      </div>

      {wanted.length < 2 && <p className="text-muted">{t("compare.empty")}</p>}

      {failed && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-sm"
        >
          <span>{t("detail.error")}</span>
          <button
            type="button"
            onClick={retry}
            className="rounded-md bg-accent-solid px-3 py-1 font-medium text-white"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {wanted.length === 2 && !both && !failed && (
        <p className="text-muted" aria-live="polite">
          {t("detail.loading")}
        </p>
      )}

      {both && shown && first && second && (
        <>
          {game && (
            <div className="flex items-center gap-2">
              <label htmlFor="compare-game" className="text-sm text-muted">
                {t("moves.game")}
              </label>
              <Select
                id="compare-game"
                compact
                className="h-9 max-w-64"
                value={game}
                onChange={(event) => update({ game: event.target.value })}
              >
                {common.map((slug) => (
                  <option key={slug} value={slug}>
                    {formatGame(slug, language)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <Section title={t("detail.stats")}>
            <div
              role="region"
              aria-label={t("detail.stats")}
              tabIndex={0}
              className="overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-selected"
            >
              <table className="w-full min-w-[32rem] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/50 text-sm">
                    <th
                      scope="col"
                      className="w-[42%] px-2 py-1.5 text-right font-semibold"
                    >
                      {nameOf(first)}
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-1.5 text-center font-medium text-muted"
                    >
                      {t("detail.stats")}
                    </th>
                    <th
                      scope="col"
                      className="w-[42%] px-2 py-1.5 text-left font-semibold"
                    >
                      {nameOf(second)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compareStats(shown.a.stats, shown.b.stats).map((row) => (
                    <tr key={row.name} className="border-b border-border">
                      <StatCell
                        side="a"
                        value={row.a}
                        other={row.b}
                        max={MAX_BASE_STAT}
                        color={STAT_COLORS[row.name] ?? "bg-accent"}
                      />
                      <th
                        scope="row"
                        className="px-2 py-1.5 text-center text-sm font-normal text-muted"
                      >
                        {statLabel(row.name)}
                      </th>
                      <StatCell
                        side="b"
                        value={row.b}
                        other={row.a}
                        max={MAX_BASE_STAT}
                        color={STAT_COLORS[row.name] ?? "bg-accent"}
                      />
                    </tr>
                  ))}
                  <tr>
                    <StatCell
                      side="a"
                      value={statTotal(shown.a.stats)}
                      other={statTotal(shown.b.stats)}
                      max={MAX_TOTAL}
                      color="bg-selected"
                    />
                    <th
                      scope="row"
                      className="px-2 py-1.5 text-center text-sm font-semibold"
                    >
                      {t("stat.total")}
                    </th>
                    <StatCell
                      side="b"
                      value={statTotal(shown.b.stats)}
                      other={statTotal(shown.a.stats)}
                      max={MAX_TOTAL}
                      color="bg-selected"
                    />
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title={t("compare.versus")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  [first, second, shown.a, shown.b],
                  [second, first, shown.b, shown.a],
                ] as const
              ).map(([entry, other, self, opponent]) => {
                const opponentName = nameOf(other);
                const attack = bestMultiplier(self.types, opponent.matchups);
                const defence = bestMultiplier(opponent.types, self.matchups);
                const attackVerdict = offenseVerdict(attack);
                const defenceVerdict = defenseVerdict(defence);
                const named = (text: string) =>
                  text.replace("{name}", opponentName);
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-3 rounded-lg border border-border p-3"
                  >
                    <h4 className="font-semibold">{nameOf(entry)}</h4>
                    <Verdict
                      title={t("matchup.offensive")}
                      text={named(t(`compare.${attackVerdict}`))}
                      multiplier={attack}
                      tone={
                        attackVerdict === "strong"
                          ? "good"
                          : attackVerdict === "neutral"
                            ? "neutral"
                            : "bad"
                      }
                    />
                    <Verdict
                      title={t("matchup.defensive")}
                      text={named(t(`compare.${defenceVerdict}`))}
                      multiplier={defence}
                      tone={
                        defenceVerdict === "vulnerable"
                          ? "bad"
                          : defenceVerdict === "neutral"
                            ? "neutral"
                            : "good"
                      }
                    />
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Each Pokémon is one column with all its details. */}
          <div className="grid gap-8 sm:grid-cols-2">
            {(
              [
                [first, shown.a],
                [second, shown.b],
              ] as const
            ).map(([entry, detail]) => (
              <div key={entry.id} className="flex flex-col gap-6">
                <h3 className="text-lg font-bold sm:sr-only">
                  {nameOf(entry)}
                </h3>
                <Section
                  title={`${t("detail.height")} / ${t("detail.weight")}`}
                >
                  <p className="font-semibold">
                    {formatHeight(detail.heightMeters, language)} ·{" "}
                    {formatWeight(detail.weightKg, language)}
                  </p>
                </Section>
                <Section title={t("detail.abilities")}>
                  {detail.abilities.length === 0 ? (
                    <p className="text-sm text-muted">
                      {t("detail.noAbilities")}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {detail.abilities.map((ability) => (
                        <li
                          key={ability.name}
                          className="rounded-lg border border-border bg-surface-muted/50 px-3 py-2"
                        >
                          <p className="flex items-center gap-2 font-medium">
                            {abilityName(ability)}
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
                  <TypeMatchups matchups={detail.matchups} stacked />
                </Section>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
