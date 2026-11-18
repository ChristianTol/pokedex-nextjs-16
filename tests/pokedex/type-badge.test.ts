import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TypeBadge } from "@/components/pokedex/TypeBadge";

function renderBadge(props: React.ComponentProps<typeof TypeBadge>) {
  return renderToStaticMarkup(createElement(TypeBadge, props));
}

describe("TypeBadge", () => {
  it("renders the translated type label in the dark name segment", () => {
    const markup = renderBadge({ type: "grass" });

    expect(markup).toContain(">Gras</span>");
    expect(markup).toContain("clip-path:polygon(0 0, 100% 0, calc(100% - 0.75rem) 100%, 0 100%)");
    expect(markup).toContain("/type-icons/glyph/grass.svg");
    expect(markup).toContain("uppercase");
  });

  it("formats unknown types as a readable label", () => {
    const markup = renderBadge({ type: "unknown-type" });

    expect(markup).toContain(">Unknown Type</span>");
  });

  it("shows optional multipliers while keeping them decorative", () => {
    const markup = renderBadge({
      type: "poison",
      multiplier: 0.5,
      multiplierClass: "text-red-300",
    });

    expect(markup).toContain("×½");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("text-red-300");
  });
});