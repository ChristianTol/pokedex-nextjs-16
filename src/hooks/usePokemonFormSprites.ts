"use client";

import { useEffect, useState } from "react";
import type { PokemonForm, PokemonFormSprites } from "@/lib/pokeapi/detail";

type Result = { key: string; sprites: PokemonFormSprites[] };

/** Loads form sprites separately; stale results never cross species or forms. */
export function usePokemonFormSprites(
  speciesId: number,
  forms: readonly PokemonForm[],
) {
  const formsKey = forms.map((form) => form.id).join(",");
  const key = `${speciesId}:${formsKey}`;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (forms.length === 0) return;
    let cancelled = false;
    fetch(`/api/pokemon/${speciesId}/forms`)
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
  }, [speciesId, forms.length, formsKey, key]);

  return { sprites: result?.key === key ? result.sprites : [] };
}