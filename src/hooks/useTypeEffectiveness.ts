"use client";

import { useEffect, useState } from "react";
import type { TypeEffectiveness } from "@/lib/pokedex/move-matchups";

let cached: TypeEffectiveness | null = null;

/** Loads the type chart once, and only when `enabled` first becomes true. */
export function useTypeEffectiveness(enabled: boolean) {
  const [data, setData] = useState<TypeEffectiveness | null>(cached);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || cached) return;
    let cancelled = false;
    fetch("/api/types/effectiveness")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<TypeEffectiveness>;
      })
      .then((table) => {
        cached = table;
        if (!cancelled) setData(table);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  return {
    data,
    loading: enabled && !data && !failed,
    failed: !data && failed,
    retry: () => {
      setFailed(false);
      setAttempt((count) => count + 1);
    },
  };
}
