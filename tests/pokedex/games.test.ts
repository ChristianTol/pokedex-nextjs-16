import { describe, expect, it } from "vitest";
import {
  descriptionGame,
  formatGame,
  gameGeneration,
  releaseIndex,
  versionGroupOf,
} from "@/lib/pokedex/games";

describe("formatGame", () => {
  it("uses the game title", () => {
    expect(formatGame("scarlet-violet")).toBe("Scarlet / Violet");
    expect(formatGame("firered-leafgreen")).toBe("FireRed / LeafGreen");
  });

  it("uses the Japanese title for Japanese, else the English one", () => {
    expect(formatGame("scarlet-violet", "ja")).toBe(
      "スカーレット・バイオレット",
    );
    expect(formatGame("champions", "ja")).toBe("Champions");
    expect(formatGame("scarlet-violet", "de")).toBe("Scarlet / Violet");
  });

  it("falls back to a readable slug for unknown games", () => {
    expect(formatGame("some-new-game")).toBe("Some New Game");
  });
});

describe("gameGeneration", () => {
  it("knows the generation of a game", () => {
    expect(gameGeneration("red-blue")).toBe(1);
    expect(gameGeneration("the-isle-of-armor")).toBe(8);
    expect(gameGeneration("scarlet-violet")).toBe(9);
  });

  it("counts unknown games as the newest", () => {
    expect(gameGeneration("some-new-game")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("versionGroupOf", () => {
  it("maps a version to its game", () => {
    expect(versionGroupOf("blue")).toBe("red-blue");
    expect(versionGroupOf("lets-go-eevee")).toBe(
      "lets-go-pikachu-lets-go-eevee",
    );
    expect(versionGroupOf("unknown")).toBeNull();
  });
});

describe("descriptionGame", () => {
  it("sends an expansion to its main game", () => {
    expect(descriptionGame("the-crown-tundra")).toBe("sword-shield");
    expect(descriptionGame("emerald")).toBe("emerald");
  });
});

describe("releaseIndex", () => {
  it("follows the release order", () => {
    expect(releaseIndex("red-blue")).toBeLessThan(releaseIndex("gold-silver"));
    expect(releaseIndex("emerald")).toBeLessThan(releaseIndex("x-y"));
    expect(releaseIndex("scarlet-violet")).toBeLessThan(
      releaseIndex("legends-za"),
    );
  });

  it("counts unknown games as the newest", () => {
    expect(releaseIndex("some-new-game")).toBeGreaterThan(
      releaseIndex("champions"),
    );
  });
});
