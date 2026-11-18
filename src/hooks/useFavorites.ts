"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createPersistedStore } from "@/lib/persisted-store";
import {
  favoriteSpeciesIds,
  parseFavorites,
  serializeFavorites,
  toggleFavorite,
  toggleSpeciesFavorite,
  type FavoriteKey,
} from "@/lib/pokedex/favorites";

// Module-level store, so every component sees the same list.
const store = createPersistedStore<readonly FavoriteKey[]>({
  key: "pokedex:favorites",
  empty: [],
  parse: parseFavorites,
  serialize: serializeFavorites,
});

/** Favorites persisted in localStorage; empty during server rendering. */
export function useFavorites() {
  const keys = useSyncExternalStore(
    store.subscribe,
    store.read,
    () => store.empty,
  );

  const speciesIds = useMemo(() => favoriteSpeciesIds(keys), [keys]);
  const toggle = useCallback(
    (key: FavoriteKey) => store.write(toggleFavorite(store.read(), key)),
    [],
  );
  const toggleSpecies = useCallback(
    (speciesId: number) =>
      store.write(toggleSpeciesFavorite(store.read(), speciesId)),
    [],
  );

  return { keys, speciesIds, toggle, toggleSpecies };
}
