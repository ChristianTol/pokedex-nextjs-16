import { describe, expect, it } from "vitest";
import { STATS_INDEX } from "@/lib/pokedex/stats-data";
import { decodeIndex, decodeRow, encodeRow } from "@/lib/pokedex/stats-index";

const stats = {
  hp: 35,
  attack: 55,
  defense: 40,
  "special-attack": 50,
  "special-defense": 50,
  speed: 90,
};

describe("encodeRow and decodeRow", () => {
  it("round-trips the stats and adds the total", () => {
    const row = encodeRow(stats, null, "none", false);
    expect(row).toEqual([35, 55, 40, 50, 50, 90, 0, 0, 0]);
    expect(decodeRow(row)).toEqual({
      ...stats,
      total: 320,
      special: null,
      forms: "none",
      gigantamax: false,
    });
  });

  it("stores the special kind", () => {
    const special = (kind: "legendary" | "mythical" | "baby") =>
      decodeRow(encodeRow(stats, kind, "none", false)).special;
    expect(special("legendary")).toBe("legendary");
    expect(special("mythical")).toBe("mythical");
    expect(special("baby")).toBe("baby");
  });

  it("stores the forms level", () => {
    const forms = (level: "none" | "forms" | "mega" | "mega-only") =>
      decodeRow(encodeRow(stats, null, level, false)).forms;
    expect(forms("none")).toBe("none");
    expect(forms("forms")).toBe("forms");
    expect(forms("mega")).toBe("mega");
    expect(forms("mega-only")).toBe("mega-only");
  });

  it("reads a row from an older index without the forms level as none", () => {
    const old = [35, 55, 40, 50, 50, 90, 0] as unknown as Parameters<
      typeof decodeRow
    >[0];
    expect(decodeRow(old).forms).toBe("none");
  });
});

describe("decodeIndex", () => {
  it("keys the rows by species id", () => {
    const index = decodeIndex({
      generatedAt: "2026-01-01",
      pokemon: { "25": [35, 55, 40, 50, 50, 90, 0, 1, 1] },
    });
    expect(index.get(25)?.speed).toBe(90);
    expect(index.get(26)).toBeUndefined();
  });
});

describe("the stored index", () => {
  it("has the known Pokémon", () => {
    expect(STATS_INDEX.get(25)).toMatchObject({ speed: 90, special: null });
    expect(STATS_INDEX.get(150)?.special).toBe("legendary");
    expect(STATS_INDEX.get(151)?.special).toBe("mythical");
    expect(STATS_INDEX.get(172)?.special).toBe("baby");
    expect(STATS_INDEX.get(1)?.total).toBe(318);
  });

  it("knows which Pokémon have forms and Megas", () => {
    expect(STATS_INDEX.get(132)?.forms).toBe("none"); // Ditto
    expect(STATS_INDEX.get(25)?.forms).toBe("forms"); // Pikachu
    expect(STATS_INDEX.get(6)?.forms).toBe("mega"); // Charizard, Gigantamax too
    expect(STATS_INDEX.get(383)?.forms).toBe("mega-only"); // Groudon, Primal
  });

  it("knows which Pokémon have a Gigantamax form", () => {
    expect(STATS_INDEX.get(6)?.gigantamax).toBe(true); // Charizard
    expect(STATS_INDEX.get(25)?.gigantamax).toBe(true); // Pikachu
    expect(STATS_INDEX.get(823)?.gigantamax).toBe(true); // Corviknight
    expect(STATS_INDEX.get(150)?.gigantamax).toBe(false); // Mewtwo
    expect(STATS_INDEX.get(132)?.gigantamax).toBe(false); // Ditto
  });

  it("is complete up to the last Pokémon it knows", () => {
    const ids = [...STATS_INDEX.keys()];
    expect(ids.length).toBeGreaterThanOrEqual(1025);
    expect(Math.max(...ids)).toBe(ids.length);
  });
});
