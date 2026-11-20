"use client";

import { useCallback, useMemo, useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { useShiny } from "@/hooks/useShiny";
import { useLanguage } from "@/hooks/useLanguage";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePokemonSummaries } from "@/hooks/usePokemonSummaries";
import { useUrlSearch } from "@/hooks/useUrlSearch";
import {
  hasLocalizedNames,
  pickText,
  type LocalizedText,
} from "@/lib/i18n/languages";
import type {
  PokemonIndexEntry,
  Region,
  TypeFilter,
} from "@/lib/pokeapi/index-list";
import {
  EMPTY_FILTERS,
  parseFilters,
  parsePokemonParam,
  serializeFilters,
  withPokemon,
  type Filters,
} from "@/lib/pokedex/filters";
import { formatName } from "@/lib/pokedex/format";
import { neighbors } from "@/lib/pokedex/neighbors";
import { queryPokedex, statSortOf, visibleCount } from "@/lib/pokedex/query";
import { STATS_INDEX } from "@/lib/pokedex/stats-data";
import { FilterBar } from "./FilterBar";
import { PokemonCard } from "./PokemonCard";
import { PokemonModal } from "./PokemonModal";

type Props = {
  entries: PokemonIndexEntry[];
  types: TypeFilter[];
  regions: Region[];
};

export function PokedexList({ entries, types, regions }: Props) {
  const { search, replace, push, close } = useUrlSearch();
  const { language, t } = useLanguage();
  const [pagesLoaded, setPagesLoaded] = useState(1);
  const { speciesIds: favoriteIds, toggleSpecies } = useFavorites();
  const { shinyIds, set: setShiny, toggle: toggleShiny } = useShiny();
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);

  const selected = useMemo(() => {
    const id = parsePokemonParam(search);
    return id === null
      ? null
      : (entries.find((entry) => entry.id === id) ?? null);
  }, [search, entries]);

  const filters = useMemo(
    () =>
      parseFilters(
        new URLSearchParams(search),
        types.map((type) => type.name),
        regions.map((region) => region.name),
      ),
    [search, types, regions],
  );

  const typeIds = useMemo(() => {
    const type = types.find((candidate) => candidate.name === filters.type);
    return type ? new Set(type.pokemonIds) : null;
  }, [types, filters.type]);
  const regionIds = useMemo(() => {
    const region = regions.find(
      (candidate) => candidate.name === filters.region,
    );
    return region ? new Set(region.pokemonIds) : null;
  }, [regions, filters.region]);

  // Names that have come in with the summaries, so the search can match them.
  // Kept in state because the results decide which summaries get loaded.
  const [loadedNames, setLoadedNames] = useState<Record<number, LocalizedText>>(
    {},
  );
  const searching = filters.search.trim() !== "";

  const results = useMemo(
    () =>
      queryPokedex(entries, {
        search: filters.search,
        typeIds,
        regionIds,
        favoriteIds: filters.favorites ? favoriteIds : null,
        sort: filters.sort,
        special: filters.special,
        forms: filters.forms,
        stats: STATS_INDEX,
        names: searching ? loadedNames : undefined,
      }),
    [
      entries,
      filters.search,
      filters.sort,
      filters.favorites,
      filters.special,
      filters.forms,
      typeIds,
      regionIds,
      favoriteIds,
      searching,
      loadedNames,
    ],
  );

  // Sorting on a stat shows that stat on the cards, so the order is readable.
  const byStat = statSortOf(filters.sort);
  const statText = (id: number) => {
    const value = byStat && STATS_INDEX.get(id)?.[byStat.stat];
    return value === undefined || !byStat
      ? undefined
      : `${t(`stat.${byStat.stat}`)} ${value}`;
  };

  const visible = useMemo(
    () => results.slice(0, visibleCount(pagesLoaded)),
    [results, pagesLoaded],
  );
  const visibleIds = useMemo(() => visible.map((entry) => entry.id), [visible]);
  const hasMore = visible.length < results.length;

  // Prev/next walk the list as it was while the open Pokémon was in it, so
  // un-hearting a favorite (or opening a link the filters exclude) keeps them.
  const [browseList, setBrowseList] = useState(results);
  if (
    selected &&
    browseList !== results &&
    results.some((entry) => entry.id === selected.id)
  ) {
    setBrowseList(results);
  }
  const neighborEntries = useMemo(() => {
    const list = browseList.some((entry) => entry.id === selected?.id)
      ? browseList
      : entries;
    return neighbors(list, selected?.id ?? 0);
  }, [browseList, entries, selected]);

  // The Pokémon next to the open one are loaded too, so their names on the
  // prev/next buttons and their tint are ready when you step to them.
  const summaryIds = useMemo(
    () => [
      ...visibleIds,
      ...[neighborEntries.previous, neighborEntries.next].flatMap((entry) =>
        entry && !visibleIds.includes(entry.id) ? [entry.id] : [],
      ),
    ],
    [visibleIds, neighborEntries],
  );

  const { summaries, failed, retry } = usePokemonSummaries(
    summaryIds,
    hasLocalizedNames(language),
  );

  const unseen = Object.values(summaries).filter(
    (summary) => summary.names && loadedNames[summary.id] !== summary.names,
  );
  if (unseen.length > 0) {
    setLoadedNames({
      ...loadedNames,
      ...Object.fromEntries(
        unseen.map((summary) => [summary.id, summary.names as LocalizedText]),
      ),
    });
  }

  const around = useMemo(() => {
    const describe = (entry: PokemonIndexEntry | null) =>
      entry && {
        id: entry.id,
        name:
          pickText(summaries[entry.id]?.names, language) ??
          formatName(entry.name),
      };
    return {
      previous: describe(neighborEntries.previous),
      next: describe(neighborEntries.next),
    };
  }, [neighborEntries, summaries, language]);

  const updateFilters = useCallback(
    (next: Partial<Filters>) => {
      setPagesLoaded(1);
      // Otherwise the shrunken list leaves the sentinel in view and reloads.
      window.scrollTo({ top: 0 });
      replace(
        withPokemon(
          serializeFilters({ ...filters, ...next }),
          selected?.id ?? null,
        ),
      );
    },
    [filters, replace, selected],
  );
  const openPokemon = useCallback(
    (entry: PokemonIndexEntry, rect: DOMRect) => {
      setOriginRect(rect);
      push(withPokemon(search, entry.id));
    },
    [push, search],
  );
  // Replaces rather than pushes: the window stays one history entry, so Back
  // and the close button still leave it in a single step.
  const switchPokemon = useCallback(
    (id: number) => replace(withPokemon(search, id)),
    [replace, search],
  );
  const closePokemon = useCallback(
    () => close(withPokemon(search, null)),
    [close, search],
  );
  const toggleCardShiny = useCallback(
    (entry: PokemonIndexEntry) => toggleShiny(entry.id),
    [toggleShiny],
  );
  const toggleFavorite = useCallback(
    (entry: PokemonIndexEntry) => toggleSpecies(entry.id),
    [toggleSpecies],
  );
  const clearFilters = useCallback(
    () => updateFilters(EMPTY_FILTERS),
    [updateFilters],
  );

  // New identity per page, so the observer re-fires if the sentinel stays in view.
  const loadMore = useCallback(
    () => setPagesLoaded(pagesLoaded + 1),
    [pagesLoaded],
  );
  const sentinelRef = useInfiniteScroll(loadMore, hasMore);

  return (
    <>
      <FilterBar
        filters={filters}
        types={types}
        regions={regions}
        resultCount={results.length}
        onChange={updateFilters}
        onClear={clearFilters}
      />
      {failed && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
        >
          <span>{t("list.summaryError")}</span>
          <button
            type="button"
            onClick={retry}
            className="rounded-md bg-accent-solid px-3 py-1 font-medium text-white"
          >
            {t("common.retry")}
          </button>
        </div>
      )}
      {results.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {filters.favorites && favoriteIds.size === 0
            ? t("list.noFavorites")
            : t("list.empty")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {visible.map((entry) => (
              <PokemonCard
                key={entry.id}
                entry={entry}
                types={summaries[entry.id]?.types}
                names={summaries[entry.id]?.names}
                typesLoading={!summaries[entry.id] && !failed}
                nameLoading={
                  hasLocalizedNames(language) &&
                  !summaries[entry.id]?.names &&
                  !failed
                }
                onSelect={openPokemon}
                favorite={favoriteIds.has(entry.id)}
                onToggleFavorite={toggleFavorite}
                shiny={shinyIds.has(entry.id)}
                onToggleShiny={toggleCardShiny}
                statText={statText(entry.id)}
              />
            ))}
          </div>
          {/* Loading more happens ahead of the scroll position (see
              useInfiniteScroll), so there is nothing to show here until the end. */}
          <div
            ref={sentinelRef}
            role={hasMore ? undefined : "status"}
            className="py-8 text-center text-sm text-muted"
          >
            {hasMore ? null : t("list.end")}
          </div>
        </>
      )}
      {selected && (
        <PokemonModal
          entry={selected}
          originRect={originRect}
          onClose={closePokemon}
          onSelectPokemon={switchPokemon}
          previous={around.previous}
          next={around.next}
          initialTypes={summaries[selected.id]?.types}
          initialNames={summaries[selected.id]?.names}
          shinyIds={shinyIds}
          onToggleShiny={() => toggleShiny(selected.id)}
          onSetShiny={setShiny}
        />
      )}
    </>
  );
}
