import { describe, expect, it } from "vitest";
import {
  artworkUrl,
  formatFormLabel,
  formatGeneration,
  formatWeight,
  formatHeight,
  formatName,
  formatNumber,
  formatPercentage,
  formatRegion,
} from "@/lib/pokedex/format";

describe("formatFormLabel", () => {
  it("strips the species prefix and capitalises", () => {
    expect(formatFormLabel("charizard", "charizard-mega-x")).toBe("Mega X");
    expect(formatFormLabel("charizard", "charizard-gmax")).toBe("Gigantamax");
  });

  it("names regional forms", () => {
    expect(formatFormLabel("vulpix", "vulpix-alola")).toBe("Alolan");
    expect(formatFormLabel("tauros", "tauros-paldea-combat-breed")).toBe(
      "Paldean Combat Breed",
    );
  });

  it("keeps special capitalisation", () => {
    expect(formatFormLabel("pikachu", "pikachu-phd")).toBe("PhD");
  });

  it("uses the whole name when the prefix differs", () => {
    expect(formatFormLabel("nidoran-f", "nidoran-f")).toBe("Nidoran F");
  });

  it("uses the official form name for the selected language", () => {
    expect(
      formatFormLabel("charizard", "charizard-mega-x", "de", {
        de: "Mega X",
        en: "Mega X",
      }),
    ).toBe("Mega X");
    expect(
      formatFormLabel("charizard", "charizard-mega-y", "fr", {
        fr: "Méga",
        en: "Mega Y",
      }),
    ).toBe("Méga Y");
  });

  it("translates known form suffixes to Dutch", () => {
    expect(formatFormLabel("vulpix", "vulpix-alola", "nl")).toBe("Alolaans");
    expect(formatFormLabel("charizard", "charizard-gmax", "nl")).toBe(
      "Gigantamax",
    );
    expect(formatFormLabel("charizard", "charizard-mega-x", "nl")).toBe(
      "Mega X",
    );
  });

  it("keeps Calyrex's Rider designation in the Dutch fallback", () => {
    expect(formatFormLabel("calyrex", "calyrex-ice", "nl")).toBe(
      "IJs Ruiter",
    );
    expect(formatFormLabel("calyrex", "calyrex-shadow", "nl")).toBe(
      "Schaduw Ruiter",
    );
  });

  it("uses official Unown form names in Dutch and falls back to letters and symbols", () => {
    expect(formatFormLabel("unown", "unown-a", "nl", { en: "A" })).toBe("A");
    expect(formatFormLabel("unown", "unown-b", "nl")).toBe("B");
    expect(formatFormLabel("unown", "unown-exclamation", "nl")).toBe("!");
    expect(formatFormLabel("unown", "unown-question", "nl")).toBe("?");
  });

  it("falls back to English or the slug and keeps Mega X/Y distinguishable", () => {
    expect(
      formatFormLabel("charizard", "charizard-mega-y", "it", {
        en: "Mega",
      }),
    ).toBe("Mega Y");
    expect(formatFormLabel("rotom", "rotom-frost", "nl")).toBe("Vorst");
    expect(formatFormLabel("pikachu", "pikachu-rock-star", "nl")).toBe(
      "Rock Star",
    );
  });
});

describe("formatHeight", () => {
  it("uses a decimal comma and one decimal", () => {
    expect(formatHeight(1.7)).toBe("1,7 m");
    expect(formatHeight(2)).toBe("2,0 m");
  });

  it("follows the language's number format", () => {
    expect(formatHeight(1.7, "en")).toBe("1.7 m");
    expect(formatHeight(1.7, "de")).toBe("1,7 m");
  });
});

describe("formatPercentage", () => {
  it("drops unneeded decimals", () => {
    expect(formatPercentage(12.5)).toBe("12,5%");
    expect(formatPercentage(50)).toBe("50%");
    expect(formatPercentage(12.5, "en")).toBe("12.5%");
  });
});

describe("formatRegion", () => {
  it("adds the generation as a roman numeral", () => {
    expect(formatRegion("Kanto", 1)).toBe("Kanto (Gen I)");
    expect(formatRegion("Unys", 5)).toBe("Unys (Gen V)");
  });
});

describe("formatName", () => {
  it("capitalises each hyphen-separated part", () => {
    expect(formatName("pikachu")).toBe("Pikachu");
    expect(formatName("mr-mime")).toBe("Mr Mime");
  });
});

describe("formatNumber", () => {
  it("pads to three digits", () => {
    expect(formatNumber(1)).toBe("No. 001");
    expect(formatNumber(25)).toBe("No. 025");
    expect(formatNumber(151)).toBe("No. 151");
  });

  it("keeps counting after 999 without extra zeros", () => {
    expect(formatNumber(999)).toBe("No. 999");
    expect(formatNumber(1000)).toBe("No. 1000");
    expect(formatNumber(1025)).toBe("No. 1025");
  });
});

describe("artworkUrl", () => {
  it("points at the official artwork for the id", () => {
    expect(artworkUrl(25)).toMatch(/official-artwork\/25\.png$/);
  });

  it("points at the shiny artwork when asked", () => {
    expect(artworkUrl(25, true)).toMatch(/official-artwork\/shiny\/25\.png$/);
  });
});

describe("formatWeight", () => {
  it("shows one decimal and follows the language", () => {
    expect(formatWeight(90.5)).toBe("90,5 kg");
    expect(formatWeight(6, "en")).toBe("6.0 kg");
  });
});

describe("formatGeneration", () => {
  it("uses roman numerals", () => {
    expect(formatGeneration(1)).toBe("I");
    expect(formatGeneration(9)).toBe("IX");
  });
});
