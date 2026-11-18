"use client";

import { useCallback, useEffect, useState } from "react";
import type { PokemonMoves } from "@/lib/pokeapi/moves";

type Result = { base: string; key: string; data: PokemonMoves };

export type PokemonMovesState = ReturnType<typeof usePokemonMoves>;

/**
 * Loads the moves of one form in one game (`game` null = the default game).
 * Switching games keeps the previous lists visible (with `loading` set).
 * Nothing is loaded while `formId` is null.
 */
export function usePokemonMoves(
  id: number,
  formId: number | null,
  game: string | null,
) {
  const base = `${id}:${formId ?? ""}`;
  const key = `${base}:${game ?? ""}`;
  const [result, setResult] = useState<Result | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (formId === null) return;
    let cancelled = false;
    const query = new URLSearchParams({ form: String(formId) });
    if (game) query.set("game", game);
    fetch(`/api/pokemon/${id}/moves?${query}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<PokemonMoves>;
      })
      .then((data) => {
        if (!cancelled) setResult({ base, key, data });
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [id, formId, game, base, key, attempt]);

  const retry = useCallback(() => {
    setFailedKey(null);
    setAttempt((count) => count + 1);
  }, []);

  return {
    data: result?.base === base ? result.data : null,
    loading: result?.key !== key && failedKey !== key,
    failed: failedKey === key,
    retry,
  };
}
