"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { formatName } from "@/lib/pokedex/format";
import {
  formatMultiplier,
  multiplierTone,
  type Matchups,
  type Tone,
} from "@/lib/pokedex/matchups";
import {
  teamCoverageGaps,
  teamDefense,
  teamOffense,
  teamWeaknesses,
} from "@/lib/pokedex/team";
import { TypeBadge } from "./TypeBadge";

export type TeamMember = {
  id: number;
  /** Name in the reader's language. */
  name: string;
  matchups: Matchups;
};

const TONE_CLASS: Record<Tone, string> = {
  bad: "bg-red-500/15 font-semibold text-red-700 dark:text-red-300",
  good: "bg-sky-500/15 font-semibold text-sky-700 dark:text-sky-300",
  neutral: "text-muted",
};

function Multiplier({ value }: { value: number }) {
  const label = formatMultiplier(value);
  // The number is always in the cell, so colour is never the only signal.
  if (!label) {
    return (
      <>
        <span aria-hidden="true">·</span>
        <span className="sr-only">×1</span>
      </>
    );
  }
  return <>{label}</>;
}

function TypeList({ types, empty }: { types: string[]; empty: string }) {
  if (types.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {types.map((type) => (
        <li key={type}>
          <TypeBadge type={type} />
        </li>
      ))}
    </ul>
  );
}

/** Wide tables scroll sideways on narrow screens. */
function Scroller({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-selected"
    >
      {children}
    </div>
  );
}

export function TeamAnalysis({ members }: { members: TeamMember[] }) {
  const { t, tOptional } = useLanguage();
  const typeName = (type: string) =>
    tOptional(`type.${type}`) ?? formatName(type);

  const defense = teamDefense(members.map((member) => member.matchups));
  const offense = teamOffense(members.map((member) => member.matchups));
  const weaknesses = teamWeaknesses(defense);
  const gaps = teamCoverageGaps(offense);
  const cell = "px-2 py-1.5 text-center tabular-nums";

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{t("team.weaknesses")}</h3>
          <TypeList types={weaknesses} empty={t("team.noWeaknesses")} />
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{t("team.gaps")}</h3>
          <TypeList types={gaps} empty={t("team.noGaps")} />
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t("team.defense")}</h3>
        <Scroller label={t("team.defense")}>
          <table className="w-full min-w-max border-collapse text-sm">
            <caption className="sr-only">{t("team.defenseCaption")}</caption>
            <thead>
              <tr className="border-b border-border bg-surface-muted/50">
                <th scope="col" className="px-2 py-1.5 text-left font-medium">
                  {t("team.attackType")}
                </th>
                {members.map((member) => (
                  <th
                    key={member.id}
                    scope="col"
                    className="max-w-24 truncate px-2 py-1.5 text-center font-medium"
                    title={member.name}
                  >
                    {member.name}
                  </th>
                ))}
                <th scope="col" className="px-2 py-1.5 text-center font-medium">
                  {t("team.weak")}
                </th>
                <th scope="col" className="px-2 py-1.5 text-center font-medium">
                  {t("team.resistant")}
                </th>
              </tr>
            </thead>
            <tbody>
              {defense.map((row) => (
                <tr
                  key={row.type}
                  className="border-b border-border last:border-0"
                >
                  <th scope="row" className="px-2 py-1.5 text-left font-normal">
                    {typeName(row.type)}
                  </th>
                  {members.map((member) => {
                    const value = member.matchups.defense[row.type] ?? 1;
                    return (
                      <td
                        key={member.id}
                        className={`${cell} ${TONE_CLASS[multiplierTone(value, "defense")]}`}
                      >
                        <Multiplier value={value} />
                      </td>
                    );
                  })}
                  <td
                    className={`${cell} ${row.weak > row.resistant ? TONE_CLASS.bad : ""}`}
                  >
                    {row.weak}
                  </td>
                  <td className={cell}>{row.resistant}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroller>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t("team.offense")}</h3>
        <Scroller label={t("team.offense")}>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{t("team.offenseCaption")}</caption>
            <thead>
              <tr className="border-b border-border bg-surface-muted/50">
                <th scope="col" className="px-2 py-1.5 text-left font-medium">
                  {t("team.defendType")}
                </th>
                <th scope="col" className="px-2 py-1.5 text-center font-medium">
                  {t("team.strongAttackers")}
                </th>
              </tr>
            </thead>
            <tbody>
              {offense.map((row) => (
                <tr
                  key={row.type}
                  className="border-b border-border last:border-0"
                >
                  <th scope="row" className="px-2 py-1.5 text-left font-normal">
                    {typeName(row.type)}
                  </th>
                  <td
                    className={`${cell} ${row.superEffective === 0 ? TONE_CLASS.bad : ""}`}
                  >
                    {row.superEffective}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroller>
      </section>
    </div>
  );
}
