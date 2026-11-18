"use client";

import { useMemo } from "react";
import { Select } from "@/components/Select";
import { useLanguage } from "@/hooks/useLanguage";
import { useUrlSearch } from "@/hooks/useUrlSearch";
import { formatName, formatRegion } from "@/lib/pokedex/format";
import {
  GENERATION_REGIONS,
  NEWEST_GENERATION,
  formatChartMultiplier,
  parseGeneration,
  typeTable,
  typesInGeneration,
  type TypeChartEntry,
} from "@/lib/pokedex/type-chart";
import { TypeBadge } from "./TypeBadge";
import { TypeIcon } from "./TypeIcon";

const CELL_TONE: Record<number, string> = {
  2: "bg-red-500/15 font-semibold text-red-700 dark:text-red-300",
  0.5: "bg-sky-500/15 font-semibold text-sky-700 dark:text-sky-300",
  0: "bg-surface-muted font-semibold text-foreground",
};

export function TypeTable({ charts }: { charts: TypeChartEntry[] }) {
  const { t, tOptional } = useLanguage();
  const { search, replace } = useUrlSearch();
  const generation = parseGeneration(new URLSearchParams(search).get("gen"));
  const types = useMemo(
    () => typesInGeneration(charts, generation),
    [charts, generation],
  );
  const table = useMemo(
    () => typeTable(charts, generation),
    [charts, generation],
  );
  const typeName = (type: string) =>
    tOptional(`type.${type}`) ?? formatName(type);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("types.title")}</h2>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>{t("detail.generation")}</span>
          <Select
            compact
            className="h-9"
            value={generation}
            onChange={(event) => {
              const next = Number(event.target.value);
              replace(next === NEWEST_GENERATION ? "" : `?gen=${next}`);
            }}
          >
            {GENERATION_REGIONS.map((region, index) => (
              <option key={region} value={index + 1}>
                {formatRegion(
                  tOptional(`region.${region}`) ?? formatName(region),
                  index + 1,
                )}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {([2, 0.5, 0] as const).map((multiplier) => (
          <li key={multiplier} className="flex items-center gap-2">
            <span
              className={`inline-flex min-w-9 justify-center rounded px-1.5 py-0.5 ${CELL_TONE[multiplier]}`}
            >
              {formatChartMultiplier(multiplier)}
            </span>
            {t(
              multiplier === 2
                ? "matchup.superEffective"
                : multiplier === 0.5
                  ? "matchup.notVeryEffective"
                  : "matchup.noEffect",
            )}
          </li>
        ))}
        <li className="text-muted">{t("types.neutral")}</li>
      </ul>

      <div
        role="region"
        aria-label={t("types.title")}
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-selected"
      >
        <table className="border-collapse text-sm">
          <caption className="sr-only">{t("types.caption")}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-36 bg-surface px-2 py-2 text-left align-bottom text-xs font-medium text-muted"
              >
                {t("team.attackType")} ↓ / {t("team.defendType")} →
              </th>
              {types.map((type) => (
                <th
                  key={type}
                  scope="col"
                  className="w-10 min-w-10 px-1 py-2 align-bottom font-normal"
                >
                  <span className="flex flex-col items-center gap-1.5">
                    <span className="text-xs [writing-mode:vertical-rl]">
                      {typeName(type)}
                    </span>
                    <TypeIcon type={type} size={20} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((attacker) => (
              <tr key={attacker} className="border-t border-border">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface px-2 py-1 text-left font-normal"
                >
                  <TypeBadge type={attacker} />
                </th>
                {types.map((defender) => {
                  const multiplier = table[attacker]?.[defender] ?? 1;
                  const label = formatChartMultiplier(multiplier);
                  return (
                    <td
                      key={defender}
                      className={`h-9 px-1 text-center tabular-nums ${CELL_TONE[multiplier] ?? ""}`}
                    >
                      {label || <span className="sr-only">1×</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
