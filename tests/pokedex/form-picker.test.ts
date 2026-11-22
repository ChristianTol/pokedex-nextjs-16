import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PokemonForm, PokemonFormSprites } from "@/lib/pokeapi/detail";
import { FormPicker } from "@/components/pokedex/FormPicker";

const languageState = vi.hoisted(() => ({ language: "nl" }));

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    language: languageState.language,
    t: (key: string) =>
        ({
          "detail.forms": "Vormen",
          "detail.formDefault": "Standaard",
          "detail.shiny": "Shiny",
        })[key] ?? key,
  }),
}));

const forms: PokemonForm[] = [
  { id: 6, name: "charizard", isDefault: true },
  { id: 10034, name: "charizard-mega-x", isDefault: false },
  { id: 10045, name: "charizard-gmax", isDefault: false },
];

const sprites: PokemonFormSprites[] = [
  {
    id: 6,
    gameSprites: { "red-blue": { front: "/charizard.png", shiny: null } },
    defaultSprite: "/charizard-default.png",
    shinyDefaultSprite: null,
    artwork: "/charizard-art.png",
    shinyArtwork: null,
  },
  {
    id: 10034,
    gameSprites: { "red-blue": { front: "/mega-x.png", shiny: null } },
    defaultSprite: "/mega-x-default.png",
    shinyDefaultSprite: null,
    artwork: "/mega-x-art.png",
    shinyArtwork: null,
  },
  {
    id: 10045,
    gameSprites: {
      "sword-shield": { front: "/gmax-animated.webp", shiny: null },
    },
    defaultSprite: "/gmax-static.png",
    shinyDefaultSprite: null,
    artwork: "/gmax-art.png",
    shinyArtwork: null,
  },
];

function renderPicker(
    overrides: Partial<React.ComponentProps<typeof FormPicker>> = {},
) {
  return renderToStaticMarkup(
      createElement(FormPicker, {
        speciesName: "charizard",
        forms,
        sprites,
        formDataLoading: false,
        game: "red-blue",
        showSprite: true,
        currentFormId: 6,
        onSelect: () => {},
        shiny: null,
        onToggleShiny: () => {},
        ...overrides,
      }),
  );
}

describe("FormPicker", () => {
  it("renders each form as a sprite tile with its label below", () => {
    const markup = renderPicker();

    expect(markup).toContain('src="/charizard.png"');
    expect(markup).toContain('src="/mega-x.png"');
    expect(markup).toContain('src="/gmax-animated.webp"');
    expect(markup.indexOf('src="/mega-x.png"')).toBeLessThan(
        markup.indexOf(">Mega X</span>"),
    );
  });

  it("shows artwork for each form when artwork mode is selected", () => {
    const markup = renderPicker({ showSprite: false });

    expect(markup).toContain('src="/charizard-art.png"');
    expect(markup).toContain('src="/mega-x-art.png"');
    expect(markup).toContain('src="/gmax-art.png"');
    expect(markup).not.toContain('src="/charizard.png"');
    expect(markup).not.toContain('src="/gmax-animated.webp"');
    expect(markup).not.toContain("image-rendering:pixelated");
  });

  it("uses the Dutch form suffix fallback for labels without Dutch API names", () => {
    const markup = renderPicker({
      speciesName: "vulpix",
      forms: [{ id: 10001, name: "vulpix-alola", isDefault: false }],
      sprites: [
        {
          id: 10001,
          names: { en: "Alolan" },
          gameSprites: {},
          defaultSprite: null,
          shinyDefaultSprite: null,
          artwork: null,
          shinyArtwork: null,
        },
      ],
      currentFormId: 10001,
    });

    expect(markup).toContain(">Alolaans</span>");
  });

  it("shows name skeletons while keeping the forms picker available", () => {
    const markup = renderPicker({ formDataLoading: true, sprites: [] });

    expect(markup).toContain(">Standaard</span>");
    expect(markup).toContain(
        'aria-hidden="true" class="skeleton mx-auto block h-4 w-16 rounded-md"',
    );
    expect(markup).not.toContain(">Mega X</span>");
    expect(markup).not.toContain(">Gigantamax</span>");
    expect(markup).toContain('aria-label="Mega X"');
    expect(markup.match(/aria-pressed=/g)).toHaveLength(forms.length);
    expect(markup).not.toContain("skeleton size-20 rounded-lg");
  });

  it("shows the translated form label after loading", () => {
    languageState.language = "en";
    const markup = renderPicker({
      formDataLoading: false,
      sprites: [
        { ...sprites[1], names: { en: "Mega Venusaur" } },
      ],
    });
    languageState.language = "nl";

    expect(markup).toContain(">Mega Venusaur X</span>");
    expect(markup).not.toContain("skeleton mx-auto block h-4");
  });

  it("shows the fallback form label when name loading fails", () => {
    const markup = renderPicker({ formDataLoading: false, sprites: [] });

    expect(markup).toContain(">Mega X</span>");
    expect(markup).not.toContain("skeleton mx-auto block h-4");
  });

  it("keeps the selected form aligned with the selected game's sprite", () => {
    const markup = renderPicker({
      game: "sword-shield",
      currentFormId: 10045,
    });

    expect(markup).toContain('src="/gmax-animated.webp"');
    expect(markup).not.toContain('src="/gmax-static.png"');
  });

  it("uses each form's available game sprite when no game is selected", () => {
    const markup = renderPicker({ game: null });

    expect(markup).toContain('src="/charizard.png"');
    expect(markup).toContain('src="/mega-x.png"');
  });

  it("keeps three forms wrapping on mobile", () => {
    const markup = renderPicker();

    expect(markup).not.toContain("<ul tabindex=");
    expect(markup).toContain(
        'class="flex min-w-0 gap-2 focus-visible:outline-2 focus-visible:outline-selected max-w-full flex-wrap sm:max-w-[21.5rem] sm:flex-nowrap sm:overflow-x-auto sm:pb-1"',
    );
    expect(markup).toContain('class="flex w-20 sm:shrink-0"');
  });

  it("makes four forms a horizontally scrollable mobile row", () => {
    const markup = renderPicker({
      forms: [...forms, { id: 10046, name: "charizard-mega-y", isDefault: false }],
    });

    expect(markup).toContain(
        'tabindex="0" class="flex min-w-0 gap-2 focus-visible:outline-2 focus-visible:outline-selected max-w-[18rem] flex-nowrap overflow-x-auto pb-1 sm:max-w-[21.5rem] sm:flex-nowrap sm:overflow-x-auto sm:pb-1"',
    );
    expect(markup).toContain('class="flex w-20 shrink-0"');
    expect((markup.match(/aria-pressed=/g) ?? [])).toHaveLength(4);
  });

  it("keeps more than four forms in a horizontally scrollable desktop row", () => {
    const markup = renderPicker({
      forms: [
        ...forms,
        { id: 10046, name: "charizard-mega-y", isDefault: false },
        { id: 10047, name: "charizard-gigantamax", isDefault: false },
      ],
    });

    expect(markup).toContain(
        'tabindex="0" class="flex min-w-0 gap-2 focus-visible:outline-2 focus-visible:outline-selected max-w-[18rem] flex-nowrap overflow-x-auto pb-1 sm:max-w-[21.5rem] sm:flex-nowrap sm:overflow-x-auto sm:pb-1"',
    );
    expect(markup).toContain('class="flex w-20 shrink-0"');
    expect((markup.match(/aria-pressed=/g) ?? [])).toHaveLength(5);
  });

  it("marks the active tile and uses the selected border token", () => {
    const markup = renderPicker();

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain(
        'class="flex size-20 items-center justify-center overflow-hidden rounded-xl border-2 p-2 transition-colors border-selected bg-surface-muted"',
    );
  });

  it("keeps keyboard focus visible on the form name without outlining the whole option", () => {
    const markup = renderPicker();
    const formButton = [...markup.matchAll(/<button\b[\s\S]*?<\/button>/g)].find(
        ([button]) => button.includes('aria-label="Standaard"'),
    )?.[0];

    expect(formButton).toContain("focus-visible:outline-none");
    expect(formButton).not.toContain("focus-visible:outline-2");
    expect(formButton).toContain(
        "group-focus-visible:underline group-focus-visible:decoration-2 group-focus-visible:underline-offset-2",
    );
  });

  it("places the shiny control at the right of the title at every screen size", () => {
    const markup = renderPicker({ shiny: true });

    const headingIndex = markup.indexOf("<h3");
    const shinyIndex = markup.indexOf('aria-pressed="true"');
    const formsIndex = markup.indexOf("<ul");

    expect(markup).toContain(
        'class="flex items-center justify-between gap-2"',
    );
    expect(headingIndex).toBeLessThan(shinyIndex);
    expect(shinyIndex).toBeLessThan(formsIndex);
  });

  it("shows the default form tile for a single-form Pokémon", () => {
    const markup = renderPicker({ forms: [forms[0]], shiny: false });

    expect(markup).toContain('src="/charizard.png"');
    expect(markup).toContain(">Standaard</span>");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("border-selected");
    expect((markup.match(/<li/g) ?? [])).toHaveLength(1);
  });

  it("omits the shiny control when the form has no shiny artwork", () => {
    const markup = renderPicker({ shiny: null });

    expect(markup).not.toContain("detail.shiny");
  });
});