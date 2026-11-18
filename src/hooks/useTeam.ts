"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createPersistedStore } from "@/lib/persisted-store";
import {
  addToTeam,
  parseTeam,
  removeFromTeam,
  serializeTeam,
  type Team,
} from "@/lib/pokedex/team";

const store = createPersistedStore<Team>({
  key: "pokedex:team",
  empty: [],
  parse: parseTeam,
  serialize: serializeTeam,
});

/** The team (species ids) persisted in localStorage; empty during server rendering. */
export function useTeam() {
  const team = useSyncExternalStore(
    store.subscribe,
    store.read,
    () => store.empty,
  );
  const add = useCallback(
    (id: number) => store.write(addToTeam(store.read(), id)),
    [],
  );
  const remove = useCallback(
    (id: number) => store.write(removeFromTeam(store.read(), id)),
    [],
  );
  return { team, add, remove };
}
