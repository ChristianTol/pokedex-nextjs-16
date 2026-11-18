"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, resolveTheme, type Theme } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();
// Kept when localStorage is unavailable (e.g. private mode).
let chosen: Theme | null = null;

function read(): Theme {
  let stored: string | null = chosen;
  if (!stored) {
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // fall back to the system preference
    }
  }
  return resolveTheme(stored, window.matchMedia(DARK_QUERY).matches);
}

function write(theme: Theme) {
  chosen = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // stays in memory
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(DARK_QUERY);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      chosen = null;
      listener();
    }
  };
  media.addEventListener("change", listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The colour theme: stored choice, else the system preference. The `dark`
 * class on <html> is set before first paint by THEME_INIT_SCRIPT and kept in
 * sync here.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);

  const setTheme = useCallback((next: Theme) => {
    write(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);
  const toggle = useCallback(
    () => setTheme(read() === "dark" ? "light" : "dark"),
    [setTheme],
  );

  return useMemo(() => ({ theme, toggle }), [theme, toggle]);
}
