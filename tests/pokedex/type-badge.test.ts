import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { TypeIcon } from "@/components/pokedex/TypeIcon";

function renderBadge(props: React.ComponentProps<typeof TypeBadge>) {
  return renderToStaticMarkup(createElement(TypeBadge, props));
}

function renderIcon(props: React.ComponentProps<typeof TypeIcon>) {
  return renderToStaticMarkup(createElement(TypeIcon, props));
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

  it("skips the configured image loader for local glyphs but keeps external type icons", () => {
    const glyph = renderIcon({ type: "flying", bare: true });
    const icon = renderIcon({ type: "flying" });

    expect(glyph).toContain('src="/type-icons/glyph/flying.svg"');
    expect(glyph).not.toContain("srcSet=");
    expect(icon).toContain(
      "srcSet=\"/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2FPokeAPI%2Fsprites",
    );
    expect(icon).not.toContain('unoptimized=""');
  });
});