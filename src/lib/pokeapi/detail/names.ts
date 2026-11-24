import { textLanguageOf, type LocalizedText } from "@/lib/i18n/languages";
import type { NameEntry } from "./responses";

/**
 * Keeps the names in the languages we show. Japanese with kanji ("ja") wins
 * over the kana-only version ("ja-hrkt").
 */
export function parseLocalizedNames(names: NameEntry[]): LocalizedText {
  const result: LocalizedText = {};
  for (const entry of names) {
    const language = textLanguageOf(entry.language.name);
    if (!language) continue;
    if (entry.language.name === "ja-hrkt" && result[language]) continue;
    result[language] = entry.name;
  }
  return result;
}
