import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  isLanguage,
  pickText,
  textLanguageOf,
} from "@/lib/i18n/languages";

describe("isLanguage", () => {
  it("accepts supported languages only", () => {
    expect(isLanguage("de")).toBe(true);
    expect(isLanguage("ja")).toBe(true);
    expect(isLanguage("ko")).toBe(true);
    expect(isLanguage("pt")).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});

describe("detectLanguage", () => {
  it("picks the first supported language and ignores the region", () => {
    expect(detectLanguage(["pt-BR", "de-AT", "fr"])).toBe("de");
    expect(detectLanguage(["nl-BE"])).toBe("nl");
    expect(detectLanguage(["EN-us"])).toBe("en");
    expect(detectLanguage(["ja-JP", "en"])).toBe("ja");
    expect(detectLanguage(["es-MX"])).toBe("es");
    expect(detectLanguage(["it", "en"])).toBe("it");
    expect(detectLanguage(["ko-KR"])).toBe("ko");
  });

  it("returns null when nothing is supported", () => {
    expect(detectLanguage(["zh", "pt"])).toBeNull();
    expect(detectLanguage([])).toBeNull();
  });
});

describe("pickText", () => {
  const text = { en: "Charizard", de: "Glurak", fr: "Dracaufeu" };

  it("returns the text in the requested language", () => {
    expect(pickText(text, "de")).toBe("Glurak");
    expect(pickText(text, "fr")).toBe("Dracaufeu");
  });

  it("falls back to English for Dutch and missing languages", () => {
    expect(pickText(text, "nl")).toBe("Charizard");
    expect(pickText({ en: "Blaze" }, "de")).toBe("Blaze");
  });

  it("returns null without any usable text", () => {
    expect(pickText(undefined, "en")).toBeNull();
    expect(pickText({}, "nl")).toBeNull();
    expect(pickText({ de: "Nur Deutsch" }, "nl")).toBeNull();
  });
});

describe("textLanguageOf", () => {
  it("maps PokéAPI language codes, both kinds of Japanese to ja", () => {
    expect(textLanguageOf("en")).toBe("en");
    expect(textLanguageOf("ja")).toBe("ja");
    expect(textLanguageOf("ja-hrkt")).toBe("ja");
    expect(textLanguageOf("es")).toBe("es");
    expect(textLanguageOf("ko")).toBe("ko");
  });

  it("ignores other languages", () => {
    expect(textLanguageOf("ja-roma")).toBeNull();
    expect(textLanguageOf("zh-hans")).toBeNull();
    expect(textLanguageOf("es-419")).toBeNull();
  });
});
