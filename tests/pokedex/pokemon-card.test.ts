import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PokemonCard } from "@/components/pokedex/PokemonCard";

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({ language: "en", t: (key: string) => key }),
}));

vi.mock("next/image", async () => {
  const { createElement: renderElement } = await import("react");
  return {
    default: (props: {
      src: string;
      alt: string;
      loading?: "eager" | "lazy";
      width?: number;
      height?: number;
    }) =>
      renderElement("img", {
        src: props.src,
        alt: props.alt,
        loading: props.loading,
        width: props.width,
        height: props.height,
      }),
  };
});

function renderCard(eager: boolean) {
  return renderToStaticMarkup(
    createElement(PokemonCard, {
      entry: { id: 1, name: "bulbasaur" },
      eager,
      onSelect: () => {},
      favorite: false,
      onToggleFavorite: () => {},
      shiny: false,
      onToggleShiny: () => {},
    }),
  );
}

describe("PokemonCard artwork loading", () => {
  it("loads an above-the-fold card eagerly when requested", () => {
    expect(renderCard(true)).toContain('loading="eager"');
  });

  it("keeps later cards lazy", () => {
    expect(renderCard(false)).toContain('loading="lazy"');
  });
});