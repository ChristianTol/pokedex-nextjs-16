import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TypeMatchups } from "@/components/pokedex/TypeMatchups";
import type { Matchups } from "@/lib/pokedex/matchups";

const matchups: Matchups = {
  offense: { fire: 2, rock: 0.5, ghost: 0 },
  defense: { water: 4, fire: 0.25, ground: 0 },
};

function renderMatchups(stacked = false, data = matchups) {
  return renderToStaticMarkup(
    createElement(TypeMatchups, { matchups: data, stacked }),
  );
}

describe("TypeMatchups", () => {
  it("explains outgoing and incoming damage, categories, and multipliers", () => {
    const markup = renderMatchups();

    expect(markup).toContain("Aanvallen");
    expect(markup).toContain("Verdedigen");
    expect(markup).toContain("eigen Pokémon-types");
    expect(markup).toContain("ontvangt van aanvallen van elk type");
    expect(markup).toContain("Doet extra schade aan");
    expect(markup).toContain("Doet minder schade aan");
    expect(markup).toContain("Doet geen schade aan");
    expect(markup).toContain("Krijgt extra schade van");
    expect(markup).toContain("Krijgt minder schade van");
    expect(markup).toContain("Krijgt geen schade van");
    expect(markup).toContain("×2/×4 = dubbel/vierdubbel");
    expect(markup).toContain("×½/×¼ = half/kwart");
    expect(markup).toContain("0 = geen schade");
    expect(markup).toContain("×4");
    expect(markup).toContain("×¼");
  });

  it("keeps its stacked layout option while showing the same explanations", () => {
    const standardMarkup = renderMatchups();
    const stackedMarkup = renderMatchups(true);

    expect(standardMarkup).toContain("lg:grid-cols-2 lg:gap-8");
    expect(stackedMarkup).not.toContain("lg:grid-cols-2 lg:gap-8");
    expect(stackedMarkup).toContain("Aanvallen");
    expect(stackedMarkup).toContain("Verdedigen");
    expect(stackedMarkup).toContain("×2/×4 = dubbel/vierdubbel");
  });

  it("keeps empty categories understandable", () => {
    const markup = renderMatchups(false, { offense: {}, defense: {} });

    expect(markup).toContain("Doet extra schade aan");
    expect(markup).toContain("Doet minder schade aan");
    expect(markup).toContain("Krijgt extra schade van");
    expect(markup).toContain(">Geen</p>");
  });
});