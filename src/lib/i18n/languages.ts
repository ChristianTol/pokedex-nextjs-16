export const LANGUAGES = [
  "nl",
  "en",
  "de",
  "fr",
  "ja",
  "es",
  "it",
  "ko",
] as const;
export type Language = (typeof LANGUAGES)[number];

/** Shown on the server and until a language is chosen or detected. */
export const DEFAULT_LANGUAGE: Language = "nl";

/** Used when the browser language is not supported at all. */
export const FALLBACK_LANGUAGE: Language = "en";

export const LANGUAGE_NAMES: Record<Language, string> = {
  nl: "Nederlands",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  ja: "日本語",
  es: "Español",
  it: "Italiano",
  ko: "한국어",
};

/** Locale for number formatting. */
export const LOCALES: Record<Language, string> = {
  nl: "nl-NL",
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  ja: "ja-JP",
  es: "es-ES",
  it: "it-IT",
  ko: "ko-KR",
};

/** Languages PokéAPI has texts for. Dutch has none and falls back to English. */
export const TEXT_LANGUAGES = [
  "en",
  "de",
  "fr",
  "ja",
  "es",
  "it",
  "ko",
] as const;
export type TextLanguage = (typeof TEXT_LANGUAGES)[number];

/**
 * Our text language for a PokéAPI language code. PokéAPI has Japanese twice:
 * "ja" (with kanji) and "ja-hrkt" (kana only); both count as Japanese.
 */
export function textLanguageOf(code: string): TextLanguage | null {
  if (code === "ja-hrkt") return "ja";
  return TEXT_LANGUAGES.find((language) => language === code) ?? null;
}

/** Texts from PokéAPI in the languages it provides. */
export type LocalizedText = Partial<Record<TextLanguage, string>>;

/** Languages in which PokéAPI has Pokémon names (Dutch and English use the slug). */
export function hasLocalizedNames(language: Language): boolean {
  return language !== "nl" && language !== "en";
}

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/** First supported language in a browser preference list ("de-AT" -> "de"). */
export function detectLanguage(preferred: readonly string[]): Language | null {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLanguage(base)) return base;
  }
  return null;
}

/** The text in the user's language, else English, else null. */
export function pickText(
  text: LocalizedText | undefined,
  language: Language,
): string | null {
  if (!text) return null;
  const preferred = TEXT_LANGUAGES.find((candidate) => candidate === language);
  return (preferred && text[preferred]) || text.en || null;
}
