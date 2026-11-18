import { describe, expect, it } from "vitest";
import {
  defaultTab,
  formatMoveStat,
  formatPriority,
  isEvolutionMove,
  moveDescription,
  sortByLabel,
} from "@/lib/pokedex/moves-view";

describe("defaultTab", () => {
  it("picks the first tab that has moves", () => {
    expect(defaultTab({ levelUp: 5, tutor: 2, machine: 9 })).toBe("levelUp");
    expect(defaultTab({ levelUp: 0, tutor: 2, machine: 9 })).toBe("tutor");
    expect(defaultTab({ levelUp: 0, tutor: 0, machine: 9 })).toBe("machine");
  });

  it("falls back to level-up when there are no moves at all", () => {
    expect(defaultTab({ levelUp: 0, tutor: 0, machine: 0 })).toBe("levelUp");
  });
});

describe("formatMoveStat", () => {
  it("shows a dash for missing values but keeps zero", () => {
    expect(formatMoveStat(90)).toBe("90");
    expect(formatMoveStat(0)).toBe("0");
    expect(formatMoveStat(null)).toBe("—");
  });
});

describe("isEvolutionMove", () => {
  it("treats level 0 as an evolution move", () => {
    expect(isEvolutionMove({ move: "air-slash", level: 0 })).toBe(true);
    expect(isEvolutionMove({ move: "scratch", level: 1 })).toBe(false);
  });
});

describe("sortByLabel", () => {
  it("sorts by the shown label and leaves the input alone", () => {
    const items = ["b", "a", "c"];
    const labels: Record<string, string> = { a: "Zap", b: "Äpfel", c: "Mond" };
    expect(sortByLabel(items, (x) => labels[x], "de")).toEqual(["b", "c", "a"]);
    expect(items).toEqual(["b", "a", "c"]);
  });
});

describe("moveDescription", () => {
  const info = {
    descriptions: { en: "In-game text", de: "Spieltext" },
    effects: { en: "Short effect", fr: "Effet court" },
  };

  it("prefers the description in the user's language", () => {
    expect(moveDescription(info, "de")).toBe("Spieltext");
  });

  it("uses the effect in the user's language when there is no description", () => {
    expect(moveDescription(info, "fr")).toBe("Effet court");
  });

  it("falls back to English for Dutch and missing languages", () => {
    expect(moveDescription(info, "nl")).toBe("In-game text");
    expect(
      moveDescription(
        { descriptions: {}, effects: { en: "Only effect" } },
        "de",
      ),
    ).toBe("Only effect");
  });

  it("returns null without any text", () => {
    expect(moveDescription({ descriptions: {}, effects: {} }, "en")).toBeNull();
  });
});

describe("formatPriority", () => {
  it("shows a plus sign for moves that go first", () => {
    expect(formatPriority(1)).toBe("+1");
    expect(formatPriority(0)).toBe("0");
    expect(formatPriority(-6)).toBe("-6");
  });
});
