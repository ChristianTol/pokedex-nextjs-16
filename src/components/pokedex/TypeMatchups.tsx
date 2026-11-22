"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { formatName } from "@/lib/pokedex/format";
import {
  formatMultiplier,
  immuneTo,
  multiplierTone,
  offenseGroups,
  resistantTo,
  vulnerableTo,
  type Matchups,
  type Tone,
  type TypeMultiplier,
} from "@/lib/pokedex/matchups";
import { TypeBadge } from "./TypeBadge";

/**
 * Text colour of the (dark) multiplier segment. Cool colours are good for the
 * Pokémon, warm colours are bad, grey is neutral. All pass 4.5:1 on the segment.
 */
function multiplierTextClass(multiplier: number, tone: Tone): string {
  if (tone === "bad") {
    return multiplier >= 4 ? "text-red-300" : "text-orange-300";
  }
  if (tone === "good") {
    return multiplier <= 0.25 ? "text-teal-300" : "text-sky-300";
  }
  return "text-zinc-200";
}

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-base font-semibold">{title}</h4>
      <p className="-mt-3 text-sm text-muted">{description}</p>
      {children}
    </div>
  );
}

function Category({
  title,
  items,
  side,
}: {
  title: string;
  items: TypeMultiplier[];
  side: "offense" | "defense";
}) {
  const { t, tOptional } = useLanguage();
  return (
    <div className="flex flex-col gap-2">
      <h5 className="text-sm font-medium">{title}</h5>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("matchup.none")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map(({ type, multiplier }) => (
            <li
              key={type}
              aria-label={`${tOptional(`type.${type}`) ?? formatName(type)} ${formatMultiplier(multiplier)}`}
            >
              <TypeBadge
                type={type}
                multiplier={multiplier}
                multiplierClass={multiplierTextClass(
                  multiplier,
                  multiplierTone(multiplier, side),
                )}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TypeMatchups({
  matchups,
  stacked = false,
}: {
  matchups: Matchups;
  /** Offensive above defensive, for narrow spots (e.g. next to another Pokémon). */
  stacked?: boolean;
}) {
  const { t } = useLanguage();
  const offense = offenseGroups(matchups.offense);
  const withMultiplier = (types: string[], multiplier: number) =>
    types.map((type) => ({ type, multiplier }));

  return (
    <div
      className={`grid gap-6 ${stacked ? "" : "lg:grid-cols-2 lg:gap-8"}`}
    >
      <Group
        title={t("matchup.attacks")}
        description={t("matchup.offenseDescription")}
      >
        <Category
          title={t("matchup.attackStrong")}
          items={withMultiplier(offense.superEffective, 2)}
          side="offense"
        />
        <Category
          title={t("matchup.attackWeak")}
          items={withMultiplier(offense.notVeryEffective, 0.5)}
          side="offense"
        />
        <Category
          title={t("matchup.attackNone")}
          items={withMultiplier(offense.noEffect, 0)}
          side="offense"
        />
      </Group>

      <Group
        title={t("matchup.defenseHeading")}
        description={t("matchup.defenseDescription")}
      >
        <Category
          title={t("matchup.defenseWeak")}
          items={vulnerableTo(matchups.defense)}
          side="defense"
        />
        <Category
          title={t("matchup.defenseResistant")}
          items={resistantTo(matchups.defense)}
          side="defense"
        />
        <Category
          title={t("matchup.defenseImmune")}
          items={immuneTo(matchups.defense)}
          side="defense"
        />
      </Group>

      <p className="col-span-full border-t border-border/40 pt-3 text-xs text-muted">
        {t("matchup.multiplierLegend")}
      </p>
    </div>
  );
}
