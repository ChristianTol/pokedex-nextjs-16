export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "pokedex:theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** A stored choice wins; otherwise the system preference decides. */
export function resolveTheme(
  stored: unknown,
  systemPrefersDark: boolean,
): Theme {
  if (isTheme(stored)) return stored;
  return systemPrefersDark ? "dark" : "light";
}

/**
 * Runs in <head> before the first paint, so the page never flashes the wrong
 * theme. Mirrors `resolveTheme`; keep the two in sync.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
