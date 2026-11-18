"use client";

import { useEffect } from "react";
import { IconSelect } from "@/components/IconSelect";
import { Select } from "@/components/Select";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, LANGUAGE_NAMES, isLanguage } from "@/lib/i18n/languages";

type Props = {
  /** Without the word "Language" and less wide; for tight spots like a toolbar. */
  compact?: boolean;
  /** Only a round globe button; the list opens when it is pressed. */
  round?: boolean;
};

export function LanguageSelect({ compact = false, round = false }: Props) {
  const { language, setLanguage, t } = useLanguage();

  // Keep the document language in sync for screen readers and hyphenation.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  if (round) {
    return (
      <IconSelect
        aria-label={t("language.label")}
        icon={
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
          </svg>
        }
        value={language}
        onChange={(event) => {
          if (isLanguage(event.target.value)) setLanguage(event.target.value);
        }}
      >
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_NAMES[code]}
          </option>
        ))}
      </IconSelect>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      {/* The select itself says which language is active; the word is only
          kept for screen readers on small screens to save room. */}
      <span className={compact ? "sr-only" : "sr-only sm:not-sr-only"}>
        {t("language.label")}
      </span>
      <Select
        compact
        className={compact ? "h-9 max-w-24 sm:max-w-none" : undefined}
        value={language}
        onChange={(event) => {
          if (isLanguage(event.target.value)) setLanguage(event.target.value);
        }}
      >
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_NAMES[code]}
          </option>
        ))}
      </Select>
    </label>
  );
}
