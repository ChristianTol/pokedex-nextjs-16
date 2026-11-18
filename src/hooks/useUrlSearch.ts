"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const CHANGE_EVENT = "url-search-change";
/** Marks history entries created by `push`, so `back` knows it can pop them. */
const PUSHED_FLAG = "pushedByApp";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function urlFor(search: string) {
  return `${window.location.pathname}${search}${window.location.hash}`;
}

/**
 * The current url query string ("" on the server, so the page can be
 * prerendered) plus helpers to change it without a navigation:
 * - `replace` swaps the current entry (filters),
 * - `push` adds a history entry (opening a Pokémon), so Back closes it,
 * - `close` undoes a `push` with Back, or replaces if there was none.
 */
export function useUrlSearch() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );

  const replace = useCallback((next: string) => {
    window.history.replaceState(window.history.state, "", urlFor(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const push = useCallback((next: string) => {
    window.history.pushState({ [PUSHED_FLAG]: true }, "", urlFor(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const close = useCallback(
    (fallback: string) => {
      if (window.history.state?.[PUSHED_FLAG]) window.history.back();
      else replace(fallback);
    },
    [replace],
  );

  return useMemo(
    () => ({ search, replace, push, close }),
    [search, replace, push, close],
  );
}
