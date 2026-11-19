import { DEFAULT_LANGUAGE, LOCALES, type Language } from "@/lib/i18n/languages";

/** "mr-mime" -> "Mr Mime" */
export function formatName(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const FORM_WORDS: Record<string, string> = {
  gmax: "Gigantamax",
  alola: "Alolan",
  galar: "Galarian",
  hisui: "Hisuian",
  paldea: "Paldean",
  phd: "PhD",
};

/** ("charizard", "charizard-mega-x") -> "Mega X"; ("vulpix", "vulpix-alola") -> "Alolan" */
export function formatFormLabel(speciesName: string, formName: string): string {
  const prefix = `${speciesName}-`;
  const suffix = formName.startsWith(prefix)
    ? formName.slice(prefix.length)
    : formName;
  return suffix
    .split("-")
    .map((word) => FORM_WORDS[word] ?? formatName(word))
    .join(" ");
}

/** 25 -> "#025", 1025 -> "#1025" (at least three digits) */
export function formatNumber(id: number): string {
  return `No. ${String(id).padStart(3, "0")}`;
}

/** 1.7 -> "1,7 m" (nl) or "1.7 m" (en) */
export function formatHeight(
  meters: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return `${meters.toLocaleString(LOCALES[language], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} m`;
}

/** 90.5 -> "90,5 kg" (nl) or "90.5 kg" (en) */
export function formatWeight(
  kilograms: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return `${kilograms.toLocaleString(LOCALES[language], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`;
}

/** 12.5 -> "12,5%", 50 -> "50%" */
export function formatPercentage(
  value: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return `${value.toLocaleString(LOCALES[language], { maximumFractionDigits: 1 })}%`;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** 3 -> "III" */
export function formatGeneration(generation: number): string {
  return ROMAN[generation - 1] ?? String(generation);
}

/** ("Kanto", 1) -> "Kanto (Gen I)" */
export function formatRegion(label: string, generation: number): string {
  return `${label} (Gen ${formatGeneration(generation)})`;
}

export function artworkUrl(id: number, shiny = false): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${shiny ? "shiny/" : ""}${id}.png`;
}
