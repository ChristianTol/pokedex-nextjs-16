"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTeam } from "@/hooks/useTeam";
import { usePokemonDetails } from "@/hooks/usePokemonDetails";
import { pickText } from "@/lib/i18n/languages";
import type { PokemonIndexEntry } from "@/lib/pokeapi/index-list";
import { artworkUrl, formatName, formatNumber } from "@/lib/pokedex/format";
import { MAX_TEAM_SIZE } from "@/lib/pokedex/team";
import { typeBackground } from "@/lib/pokedex/type-colors";
import { EmptySlot } from "./EmptySlot";
import { PokemonPicker } from "./PokemonPicker";
import { TeamAnalysis, type TeamMember } from "./TeamAnalysis";
import { TypeBadge } from "./TypeBadge";

export function TeamBuilder({ entries }: { entries: PokemonIndexEntry[] }) {
  const { language, t } = useLanguage();
  const { team, add, remove } = useTeam();
  const { details, failed, retry } = usePokemonDetails(team);
  const entryById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries],
  );

  const full = team.length >= MAX_TEAM_SIZE;

  const nameOf = (id: number) =>
    pickText(details[id]?.names, language) ??
    formatName(entryById.get(id)?.name ?? String(id));

  const loaded: TeamMember[] = team.flatMap((id) =>
    details[id]
      ? [{ id, name: nameOf(id), matchups: details[id].matchups }]
      : [],
  );
  const loading = team.length > loaded.length && !failed;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="team-title" className="flex flex-col gap-4">
        <h2 id="team-title" className="text-2xl font-bold">
          {t("team.title")}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: MAX_TEAM_SIZE }, (_, slot) => {
            const id = team[slot];
            if (id === undefined) {
              return (
                <li key={`empty-${slot}`} className="flex">
                  <EmptySlot
                    label={t("team.emptySlot")}
                    className="min-h-40 w-full"
                  />
                </li>
              );
            }
            const detail = details[id];
            return (
              <li
                key={id}
                className="relative flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface p-3"
                style={{
                  background: detail ? typeBackground(detail.types) : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label={`${nameOf(id)} ${t("team.remove")}`}
                  className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-surface-muted leading-none hover:bg-border focus-visible:outline-2 focus-visible:outline-selected"
                >
                  ×
                </button>
                <Image
                  src={detail?.artwork ?? artworkUrl(id)}
                  alt=""
                  width={475}
                  height={475}
                  sizes="96px"
                  className="size-24 object-contain"
                />
                <span className="text-xs text-muted">{formatNumber(id)}</span>
                <span className="text-center text-sm font-semibold">
                  {nameOf(id)}
                </span>
                <span className="flex min-h-5 flex-wrap justify-center gap-1">
                  {detail?.types.map((type) => (
                    <TypeBadge key={type} type={type} />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>

        <PokemonPicker
          entries={entries}
          label={t("team.search")}
          actionLabel={t("team.add")}
          onPick={add}
          pickedIds={team}
          pickedLabel={t("team.inTeam")}
          disabled={full}
          disabledNote={t("team.full")}
        />
      </section>

      {team.length === 0 ? (
        <p className="text-muted">{t("team.empty")}</p>
      ) : (
        <section className="flex flex-col gap-4">
          {failed && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-sm"
            >
              <span>{t("team.error")}</span>
              <button
                type="button"
                onClick={retry}
                className="rounded-md bg-accent-solid px-3 py-1 font-medium text-white"
              >
                {t("common.retry")}
              </button>
            </div>
          )}
          {loading && (
            <p className="text-muted" aria-live="polite">
              {t("team.loading")}
            </p>
          )}
          {loaded.length > 0 && <TeamAnalysis members={loaded} />}
        </section>
      )}
    </div>
  );
}
