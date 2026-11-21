"use client";

import { useEffect, useState } from "react";
import type { PokemonFormSprites } from "@/lib/pokeapi/detail";

type Result = { key: string; sprites: PokemonFormSprites[] };

/** Loads visible evolution forms without letting stale chains mix together. */
export function usePokemonEvolutionSprites(ids: readonly number[]) {
  const key = [...new Set(ids)].sort((a, b) => a - b).join(",");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/pokemon/evolution-sprites?ids=${key}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<PokemonFormSprites[]>;
      })
      .then((sprites) => {
        if (!cancelled) setResult({ key, sprites });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, sprites: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const sprites =
    result?.key === key
      ? new Map(result.sprites.map((sprite) => [sprite.id, sprite]))
      : new Map<number, PokemonFormSprites>();
  return { sprites };
}