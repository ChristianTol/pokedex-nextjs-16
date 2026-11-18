"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PokemonSummary } from "@/lib/pokeapi/summary";

const CHUNK_SIZE = 30;

/**
 * Lazily loads summaries (types) for the ids that are currently visible.
 * With `withNames`, the species names in other languages are loaded too;
 * ids that were loaded without them are requested again.
 */
export function usePokemonSummaries(
  ids: readonly number[],
  withNames: boolean,
) {
  const [summaries, setSummaries] = useState<Record<number, PokemonSummary>>(
    {},
  );
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  // Ids per request kind, so a failed chunk can be asked for again.
  const requested = useRef({
    plain: new Set<number>(),
    named: new Set<number>(),
  });

  useEffect(() => {
    const done = withNames ? requested.current.named : requested.current.plain;
    const missing = ids.filter((id) => !done.has(id));
    for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
      const chunk = missing.slice(i, i + CHUNK_SIZE);
      chunk.forEach((id) => {
        requested.current.plain.add(id);
        if (withNames) requested.current.named.add(id);
      });
      const names = withNames ? "&names=1" : "";
      fetch(`/api/pokemon/summary?ids=${chunk.join(",")}${names}`)
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json() as Promise<PokemonSummary[]>;
        })
        .then((loaded) => {
          setSummaries((previous) => ({
            ...previous,
            ...Object.fromEntries(loaded.map((s) => [s.id, s])),
          }));
        })
        .catch(() => {
          chunk.forEach((id) => {
            requested.current.plain.delete(id);
            requested.current.named.delete(id);
          });
          setFailed(true);
        });
    }
  }, [ids, withNames, retryKey]);

  const retry = useCallback(() => {
    setFailed(false);
    setRetryKey((key) => key + 1);
  }, []);

  return { summaries, failed, retry };
}
