"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PokemonDetail } from "@/lib/pokeapi/detail";

/**
 * Loads the details of several Pokémon once (they stay while others come
 * and go). `failed` is set when one of `ids` could not be loaded.
 */
export function usePokemonDetails(ids: readonly number[]) {
  const [details, setDetails] = useState<Record<number, PokemonDetail>>({});
  const [failedIds, setFailedIds] = useState<ReadonlySet<number>>(new Set());
  const [retryKey, setRetryKey] = useState(0);
  const requested = useRef(new Set<number>());

  useEffect(() => {
    for (const id of ids) {
      if (requested.current.has(id)) continue;
      requested.current.add(id);
      fetch(`/api/pokemon/${id}`)
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json() as Promise<PokemonDetail>;
        })
        .then((detail) =>
          setDetails((previous) => ({ ...previous, [id]: detail })),
        )
        .catch(() => {
          requested.current.delete(id);
          setFailedIds((previous) => new Set(previous).add(id));
        });
    }
  }, [ids, retryKey]);

  const retry = useCallback(() => {
    setFailedIds(new Set());
    setRetryKey((key) => key + 1);
  }, []);

  // Only Pokémon still wanted count.
  const failed = ids.some((id) => failedIds.has(id));
  return { details, failed, retry };
}
