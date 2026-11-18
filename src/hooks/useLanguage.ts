"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  detectLanguage,
  isLanguage,
  type Language,
} from "@/lib/i18n/languages";
import {
  translate,
  translateOptional,
  type MessageKey,
} from "@/lib/i18n/messages";

const STORAGE_KEY = "pokedex:language";

const listeners = new Set<() => void>();
// Kept when localStorage is unavailable (e.g. private mode).
let chosen: Language | null = null;

function read(): Language {
  if (chosen) return chosen;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // fall through to detection
  }
  return detectLanguage(window.navigator.languages) ?? FALLBACK_LANGUAGE;
}

function write(language: Language) {
  chosen = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // stays in memory
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      chosen = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The interface language: stored choice, else the browser language, else
 * English. Dutch on the server, so the prerendered page is stable.
 */
export function useLanguage() {
  const language = useSyncExternalStore(
    subscribe,
    read,
    () => DEFAULT_LANGUAGE,
  );

  const t = useCallback(
    (key: MessageKey) => translate(language, key),
    [language],
  );
  const tOptional = useCallback(
    (key: string) => translateOptional(language, key),
    [language],
  );
  const setLanguage = useCallback((next: Language) => write(next), []);

  return useMemo(
    () => ({ language, setLanguage, t, tOptional }),
    [language, setLanguage, t, tOptional],
  );
}
