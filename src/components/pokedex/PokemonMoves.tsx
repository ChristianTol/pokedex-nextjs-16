"use client";

import { useId, useMemo, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import type { PokemonMovesState } from "@/hooks/usePokemonMoves";
import { LOCALES, pickText } from "@/lib/i18n/languages";
import type { MessageKey } from "@/lib/i18n/messages";
import type { DamageClass, MoveInfo } from "@/lib/pokeapi/moves";
import { formatName } from "@/lib/pokedex/format";
import {
  MOVE_TABS,
  defaultTab,
  formatMoveStat,
  formatPriority,
  isEvolutionMove,
  moveDescription,
  sortByLabel,
  type MoveTab,
} from "@/lib/pokedex/moves-view";
import { TypeIcon } from "./TypeIcon";

type Props = {
  /** The moves of the form on screen in the game chosen in the window. */
  moves: PokemonMovesState;
};

const TAB_LABELS: Record<MoveTab, MessageKey> = {
  levelUp: "moves.levelUp",
  tutor: "moves.tutor",
  machine: "moves.machine",
};

const EMPTY_LABELS: Record<MoveTab, MessageKey> = {
  levelUp: "moves.noLevelUp",
  tutor: "moves.noTutor",
  machine: "moves.noMachine",
};

const CLASS_LABELS: Record<DamageClass, MessageKey> = {
  physical: "class.physical",
  special: "class.special",
  status: "class.status",
};

const CLASS_COLORS: Record<DamageClass, string> = {
  physical: "bg-orange-700",
  special: "bg-blue-700",
  status: "bg-zinc-600",
};

type Row = { key: string; move: string; level?: number };

export function PokemonMoves({ moves }: Props) {
  const { language, t, tOptional } = useLanguage();
  const ids = useId();
  const [tabChoice, setTabChoice] = useState<MoveTab | null>(null);
  // Rows that are opened up, as "<tab>:<row key>".
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const toggleRow = (key: string) =>
    setOpened((previous) => {
      const next = new Set(previous);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const { data, loading, failed, retry } = moves;

  const counts = {
    levelUp: data?.levelUp.length ?? 0,
    tutor: data?.tutor.length ?? 0,
    machine: data?.machine.length ?? 0,
  };
  const tab = tabChoice ?? defaultTab(counts);

  const label = (move: string): string => {
    const info = data?.moves[move];
    return pickText(info?.names, language) ?? formatName(move);
  };

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    if (tab === "levelUp") {
      return data.levelUp.map((entry, index) => ({
        key: `${entry.move}-${entry.level}-${index}`,
        move: entry.move,
        level: entry.level,
      }));
    }
    const names = tab === "tutor" ? data.tutor : data.machine;
    const pick = (move: string) =>
      pickText(data.moves[move]?.names, language) ?? formatName(move);
    return sortByLabel(names, pick, LOCALES[language]).map((move) => ({
      key: move,
      move,
    }));
  }, [data, tab, language]);

  function onTabKeyDown(event: React.KeyboardEvent, current: MoveTab) {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next =
      MOVE_TABS[
        (MOVE_TABS.indexOf(current) + step + MOVE_TABS.length) %
          MOVE_TABS.length
      ];
    setTabChoice(next);
    document.getElementById(`${ids}-tab-${next}`)?.focus();
  }

  if (!data) {
    return failed ? (
      <div
        role="alert"
        className="flex items-center justify-between gap-3 text-sm"
      >
        <span className="text-muted">{t("moves.error")}</span>
        <button
          type="button"
          onClick={retry}
          className="rounded-md bg-accent-solid px-3 py-1 font-medium text-white"
        >
          {t("common.retry")}
        </button>
      </div>
    ) : (
      <p className="text-sm text-muted" aria-live="polite">
        {t("moves.loading")}
      </p>
    );
  }

  // Forms without any move (e.g. Gigantamax) have no games either.
  if (!data.game) {
    return <p className="text-sm text-muted">{t("moves.none")}</p>;
  }

  return (
    <div
      aria-busy={loading}
      className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-50" : ""}`}
    >
      {failed && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-sm"
        >
          <span>{t("moves.error")}</span>
          <button
            type="button"
            onClick={retry}
            className="rounded-md bg-accent-solid px-3 py-1 font-medium text-white"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      <div role="tablist" className="flex gap-1 border-b border-border">
        {MOVE_TABS.map((name) => {
          const active = name === tab;
          return (
            <button
              key={name}
              id={`${ids}-tab-${name}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${ids}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTabChoice(name)}
              onKeyDown={(event) => onTabKeyDown(event, name)}
              className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-selected ${
                active
                  ? "border-selected text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t(TAB_LABELS[name])}{" "}
              <span className="text-xs text-muted">{counts[name]}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`${ids}-panel`}
        role="tabpanel"
        aria-labelledby={`${ids}-tab-${tab}`}
      >
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            {t(EMPTY_LABELS[tab])}
          </p>
        ) : (
          /* relative: keeps the absolutely positioned sr-only texts inside this
             scroll area instead of stretching the whole window. */
          <div
            role="region"
            tabIndex={0}
            aria-labelledby={`${ids}-tab-${tab}`}
            className="relative max-h-96 overflow-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-selected"
          >
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="sticky top-0 bg-surface-muted text-xs text-muted">
                <tr>
                  {tab === "levelUp" && (
                    <th scope="col" className="w-14 px-3 py-2 font-medium">
                      {t("moves.level")}
                    </th>
                  )}
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("moves.move")}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("moves.category")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {t("moves.power")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {t("moves.accuracy")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {t("moves.pp")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowKey = `${tab}:${row.key}`;
                  return (
                    <MoveRow
                      key={row.key}
                      row={row}
                      info={data.moves[row.move]}
                      label={label(row.move)}
                      showLevel={tab === "levelUp"}
                      expanded={opened.has(rowKey)}
                      onToggle={() => toggleRow(rowKey)}
                      detailId={`${ids}-${rowKey}`}
                      typeName={(type) =>
                        tOptional(`type.${type}`) ?? formatName(type)
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MoveRow({
  row,
  info,
  label,
  showLevel,
  expanded,
  onToggle,
  detailId,
  typeName,
}: {
  row: Row;
  info: MoveInfo | undefined;
  label: string;
  showLevel: boolean;
  expanded: boolean;
  onToggle: () => void;
  detailId: string;
  typeName: (type: string) => string;
}) {
  const { language, t, tOptional } = useLanguage();
  const description = info ? moveDescription(info, language) : null;
  const facts = [
    info?.effectChance != null && {
      label: t("moves.effectChance"),
      value: `${info.effectChance}%`,
    },
    info &&
      info.priority !== 0 && {
        label: t("moves.priority"),
        value: formatPriority(info.priority),
      },
    info && {
      label: t("moves.target"),
      value: tOptional(`target.${info.target}`) ?? formatName(info.target),
    },
  ].filter((fact) => fact !== false && fact !== undefined);

  return (
    <>
      <tr className="border-t border-border hover:bg-surface-muted/60">
        {showLevel && (
          <td className="px-3 py-2 tabular-nums text-muted">
            {isEvolutionMove({ move: row.move, level: row.level ?? 1 })
              ? t("moves.evolution")
              : row.level}
          </td>
        )}
        <th scope="row" className="p-0 font-medium">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={onToggle}
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selected"
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className={`size-3 shrink-0 text-muted transition-transform motion-reduce:transition-none ${
                expanded ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3l5 5-5 5" />
            </svg>
            {info && (
              <>
                <TypeIcon type={info.type} size={20} />
                <span className="sr-only">{typeName(info.type)}</span>
              </>
            )}
            {label}
          </button>
        </th>
        <td className="px-3 py-2">
          {info?.damageClass && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${CLASS_COLORS[info.damageClass]}`}
            >
              {t(CLASS_LABELS[info.damageClass])}
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {formatMoveStat(info?.power ?? null)}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {formatMoveStat(info?.accuracy ?? null)}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {formatMoveStat(info?.pp ?? null)}
        </td>
      </tr>
      {expanded && (
        <tr id={detailId} className="bg-surface-muted/40">
          <td colSpan={showLevel ? 6 : 5} className="px-3 pb-3 pt-1">
            <p className="max-w-prose text-sm leading-relaxed">
              {description ?? t("detail.noDescription")}
            </p>
            {facts.length > 0 && (
              <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                {facts.map((fact) => (
                  <div key={fact.label} className="flex gap-1.5">
                    <dt>{fact.label}</dt>
                    <dd className="font-medium text-foreground">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
