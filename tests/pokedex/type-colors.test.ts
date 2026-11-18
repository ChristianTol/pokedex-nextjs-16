import { describe, expect, it } from "vitest";
import { typeBackground, typeColor } from "@/lib/pokedex/type-colors";

describe("typeBackground", () => {
  it("has no background without types", () => {
    expect(typeBackground([])).toBeUndefined();
  });

  it("is one flat tint for a single type", () => {
    const background = typeBackground(["fire"]);
    expect(background).toContain(typeColor("fire"));
    expect(background).toContain("color-mix");
    expect(background).not.toContain("gradient");
  });

  it("is a gradient from the first to the second type", () => {
    const background = typeBackground(["fire", "flying"]) ?? "";
    expect(background).toContain("linear-gradient");
    expect(background.indexOf(typeColor("fire"))).toBeLessThan(
      background.indexOf(typeColor("flying")),
    );
  });

  it("tints with the surface, so the text on it stays readable", () => {
    expect(typeBackground(["water"])).toContain("var(--surface)");
    expect(typeBackground(["water"])).toContain("var(--type-tint)");
  });
});
