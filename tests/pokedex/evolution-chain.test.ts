import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvolutionChain } from "@/components/pokedex/EvolutionChain";
import { usePokemonEvolutionSprites } from "@/hooks/usePokemonEvolutionSprites";
import type { EvolutionNode, PokemonFormSprites } from "@/lib/pokeapi/detail";

vi.mock("@/hooks/usePokemonEvolutionSprites", () => ({
  usePokemonEvolutionSprites: vi.fn(),
}));

const regionalFormId = 10009;
const sprites: PokemonFormSprites = {
  id: regionalFormId,
  gameSprites: {
    "red-blue": { front: "/regional-red.png", shiny: null },
    "scarlet-violet": { front: "/regional-sv.png", shiny: null },
  },
  defaultSprite: "/regional-default.png",
  shinyDefaultSprite: null,
  artwork: "/regional-art.png",
  shinyArtwork: null,
};

const root: EvolutionNode = {
  id: 37,
  name: "vulpix",
  names: {},
  methods: [],
  evolvesTo: [
    {
      id: 38,
      name: "ninetales",
      formId: regionalFormId,
      names: {},
      methods: [],
      evolvesTo: [],
    },
  ],
};

function renderChain(showSprite: boolean, currentId = 37) {
  return renderToStaticMarkup(
    createElement(EvolutionChain, {
      root,
      formName: "vulpix",
      currentId,
      onSelect: () => {},
      shinyIds: new Set<number>(),
      onSetShiny: () => {},
      game: "scarlet-violet",
      showSprite,
    }),
  );
}

describe("EvolutionChain image mode", () => {
  beforeEach(() => {
    vi.mocked(usePokemonEvolutionSprites).mockReturnValue({
      sprites: new Map([[regionalFormId, sprites]]),
    });
  });

  it("uses the selected game's sprite for a regional form", () => {
    const markup = renderChain(true);

    expect(markup).toContain('src="/regional-sv.png"');
    expect(markup).not.toContain('src="/regional-red.png"');
    expect(usePokemonEvolutionSprites).toHaveBeenCalledWith([37, regionalFormId]);
  });

  it("uses artwork for a regional form in artwork mode", () => {
    const markup = renderChain(false);

    expect(markup).toContain('src="/regional-art.png"');
    expect(markup).not.toContain('src="/regional-sv.png"');
  });

  it("keeps the selected border bright on hover and brightens unselected blocks on hover", () => {
    const markup = renderChain(true);
    const buttons = [...markup.matchAll(/<button\b[\s\S]*?<\/button>/g)].map(
      ([button]) => button,
    );
    const selected = buttons.find((button) =>
      button.includes('aria-current="true"'),
    );
    const unselected = buttons.find((button) =>
      button.includes('src="/regional-sv.png"'),
    );
    const tileClass = 'flex w-24 flex-col sm:w-28 lg:w-24 xl:w-28 items-center gap-1 rounded-xl border p-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-selected ';

    expect(selected).toBeDefined();
    expect(selected).toContain(`${tileClass}border-selected bg-surface-muted"`);
    expect(selected).not.toContain("hover:border-muted");
    expect(unselected).toBeDefined();
    expect(unselected).toContain(
      `${tileClass}border-border hover:border-muted hover:bg-surface-muted"`,
    );
    expect(unselected).toContain('class="size-20 object-contain');
    const spriteIndex = unselected!.indexOf('src="/regional-sv.png"');
    const numberIndex = unselected!.indexOf('class="text-xs text-muted"');
    const nameIndex = unselected!.indexOf('class="text-sm font-medium"');
    expect(spriteIndex).toBeGreaterThan(-1);
    expect(spriteIndex).toBeLessThan(numberIndex);
    expect(numberIndex).toBeLessThan(nameIndex);
  });

  it("moves the selected border styling when another evolution is selected", () => {
    const markup = renderChain(true, 38);
    const buttons = [...markup.matchAll(/<button\b[\s\S]*?<\/button>/g)].map(
      ([button]) => button,
    );
    const selected = buttons.find((button) =>
      button.includes('aria-current="true"'),
    );
    const unselected = buttons.find(
      (button) =>
        button.includes("w-24") && !button.includes('aria-current="true"'),
    );

    expect(selected).toContain("border-selected bg-surface-muted");
    expect(selected).not.toContain("hover:border-muted");
    expect(unselected).toContain(
      "border-border hover:border-muted hover:bg-surface-muted",
    );
  });
});