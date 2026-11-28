import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PokedexList } from "@/components/pokedex/PokedexList";

const state = vi.hoisted(() => ({ search: "" }));

vi.mock("@/hooks/useUrlSearch", () => ({
  useUrlSearch: () => ({
    search: state.search,
    replace: () => {},
    push: () => {},
    close: () => {},
  }),
}));

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({ language: "en", t: (key: string) => key }),
}));

vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({ speciesIds: new Set<number>(), toggleSpecies: () => {} }),
}));

vi.mock("@/hooks/useShiny", () => ({
  useShiny: () => ({
    shinyIds: new Set<number>(),
    set: () => {},
    toggle: () => {},
  }),
}));

vi.mock("@/hooks/useInfiniteScroll", () => ({
  useInfiniteScroll: () => () => {},
}));

vi.mock("@/hooks/usePokemonSummaries", () => ({
  usePokemonSummaries: () => ({ summaries: {}, failed: false, retry: () => {} }),
}));

vi.mock("@/components/pokedex/FilterBar", () => ({ FilterBar: () => null }));

vi.mock("@/components/pokedex/PokemonModal", () => ({
  PokemonModal: () => null,
}));

vi.mock("@/components/pokedex/PokemonCard", async () => {
  const { createElement: renderElement } = await import("react");
  return {
    PokemonCard: ({
      entry,
      eager,
    }: {
      entry: { id: number };
      eager?: boolean;
    }) =>
      renderElement("div", {
        "data-pokemon-card-id": entry.id,
        "data-image-loading": eager ? "eager" : "lazy",
      }),
  };
});

const entries = [
  { id: 1, name: "bulbasaur" },
  { id: 4, name: "charmander" },
  { id: 5, name: "charmeleon" },
  { id: 6, name: "charizard" },
  { id: 25, name: "pikachu" },
  { id: 37, name: "vulpix" },
  { id: 58, name: "growlithe" },
];

function cardLoadingStates(search: string) {
  state.search = search;
  const markup = renderToStaticMarkup(
    createElement(PokedexList, {
      entries,
      types: [{ name: "fire", pokemonIds: [4, 5, 6, 37, 58] }],
      regions: [],
    }),
  );
  return [...markup.matchAll(/data-pokemon-card-id="(\d+)" data-image-loading="(eager|lazy)"/g)].map(
    ([, id, loading]) => ({ id: Number(id), loading }),
  );
}

describe("PokedexList eager card boundary", () => {
  beforeEach(() => {
    state.search = "";
  });

  it("eagerly loads only the first five visible results", () => {
    expect(cardLoadingStates("")).toEqual([
      { id: 1, loading: "eager" },
      { id: 4, loading: "eager" },
      { id: 5, loading: "eager" },
      { id: 6, loading: "eager" },
      { id: 25, loading: "eager" },
      { id: 37, loading: "lazy" },
      { id: 58, loading: "lazy" },
    ]);
  });

  it("applies the boundary after filtering and sorting current results", () => {
    expect(cardLoadingStates("?type=fire&sort=name-desc")).toEqual([
      { id: 37, loading: "eager" },
      { id: 58, loading: "eager" },
      { id: 5, loading: "eager" },
      { id: 4, loading: "eager" },
      { id: 6, loading: "eager" },
    ]);
  });
});