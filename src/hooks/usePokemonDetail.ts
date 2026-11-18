"use client";

import { useCallback, useEffect, useState } from "react";
import type { PokemonDetail } from "@/lib/pokeapi/detail";

type Result = { key: string; detail: PokemonDetail };

/**
 * Loads the details of one Pokémon (optionally a specific form).
 * While another form of the same species is loading, the previous details
 * stay available (with `loading` set) so the window doesn't flash empty.
 */
export function usePokemonDetail(id: number, formId: number | null) {
  const key = `${id}:${formId ?? ""}`;
  const [result, setResult] = useState<Result | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const query = formId === null ? "" : `?form=${formId}`;
    fetch(`/api/pokemon/${id}${query}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<PokemonDetail>;
      })
      .then((detail) => {
        if (!cancelled) setResult({ key, detail });
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [id, formId, key, attempt]);

  const retry = useCallback(() => {
    setFailedKey(null);
    setAttempt((count) => count + 1);
  }, []);

  const detail = result?.detail.id === id ? result.detail : null;
  return {
    detail,
    loading: result?.key !== key && failedKey !== key,
    failed: failedKey === key,
    retry,
  };
}
