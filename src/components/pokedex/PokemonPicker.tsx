"use client";

import Image from "next/image";
import { useId, useMemo, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import type { PokemonIndexEntry } from "@/lib/pokeapi/index-list";
import { artworkUrl, formatName, formatNumber } from "@/lib/pokedex/format";
import { matchesSearch } from "@/lib/pokedex/query";

const MAX_RESULTS = 8;

type Props = {
  entries: readonly PokemonIndexEntry[];
  /** Says what the pick is for, e.g. "Search a Pokémon to add". */
  label: string;
  /** Appended to a name for the button label, e.g. "add to team". */
  actionLabel: string;
  onPick: (id: number) => void;
  /** Already chosen; shown but not clickable. */
  pickedIds?: readonly number[];
  /** Shown on a picked result, e.g. "In team". */
  pickedLabel?: string;
  disabled?: boolean;
  /** Shown instead of results while disabled (e.g. "Your team is full"). */
  disabledNote?: string;
};

/** A search field with the matching Pokémon below it, to pick one. */
export function PokemonPicker({
  entries,
  label,
  actionLabel,
  onPick,
  pickedIds = [],
  pickedLabel,
  disabled = false,
  disabledNote,
}: Props) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const searchId = useId();

  const results = useMemo(
    () =>
      search.trim() === ""
        ? []
        : entries
            .filter((entry) => matchesSearch(entry, search))
            .slice(0, MAX_RESULTS),
    [entries, search],
  );

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={searchId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={searchId}
        type="search"
        value={search}
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("filters.search")}
        className="h-10 w-full max-w-md rounded-lg border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-selected disabled:opacity-50"
      />
      {disabled && disabledNote && (
        <p className="text-sm text-muted">{disabledNote}</p>
      )}
      {!disabled && search.trim() !== "" && results.length === 0 && (
        <p className="text-sm text-muted">{t("list.empty")}</p>
      )}
      {!disabled && results.length > 0 && (
        <ul className="grid max-w-md gap-1">
          {results.map((entry) => {
            const picked = pickedIds.includes(entry.id);
            const name = formatName(entry.name);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  disabled={picked}
                  onClick={() => {
                    onPick(entry.id);
                    setSearch("");
                  }}
                  aria-label={`${name} ${actionLabel}`}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-1.5 text-left text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-selected disabled:opacity-50 disabled:hover:bg-surface"
                >
                  <Image
                    src={artworkUrl(entry.id)}
                    alt=""
                    width={475}
                    height={475}
                    sizes="40px"
                    className="size-10 object-contain"
                  />
                  <span className="w-12 text-muted">
                    {formatNumber(entry.id)}
                  </span>
                  <span className="flex-1 font-medium">{name}</span>
                  {picked && pickedLabel && (
                    <span className="text-xs text-muted">{pickedLabel}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
