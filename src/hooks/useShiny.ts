"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createPersistedStore } from "@/lib/persisted-store";
import {
  parseShiny,
  serializeShiny,
  setShinyMany,
  type ShinyIds,
} from "@/lib/pokedex/shiny";

const store = createPersistedStore<ShinyIds>({
  key: "pokedex:shiny",
  empty: [],
  parse: parseShiny,
  serialize: serializeShiny,
});

/** Which Pokémon are shown shiny, persisted in localStorage. */
export function useShiny() {
  const ids = useSyncExternalStore(
    store.subscribe,
    store.read,
    () => store.empty,
  );
  const shinyIds = useMemo(() => new Set(ids), [ids]);

  const set = useCallback((targets: readonly number[], on: boolean) => {
    const current = store.read();
    const next = setShinyMany(current, targets, on);
    if (next !== current) store.write(next);
  }, []);
  const toggle = useCallback(
    (id: number) => set([id], !store.read().includes(id)),
    [set],
  );

  return { shinyIds, set, toggle };
}
