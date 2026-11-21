import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IntroSkeleton } from "@/components/pokedex/PokemonSkeleton";

describe("IntroSkeleton", () => {
  it("keeps mobile forms before the description and desktop facts after it", () => {
    const markup = renderToStaticMarkup(createElement(IntroSkeleton));
    const mobileForms = markup.indexOf('class="sm:hidden rounded-2xl');
    const formsList = markup.indexOf("<ul", mobileForms);
    const description = markup.indexOf(
      'class="skeleton rounded-md h-5 w-full"',
    );
    const desktopFacts = markup.indexOf(
      'class="hidden min-w-0 sm:block lg:self-center"',
    );
    const mobileFacts = markup.lastIndexOf('class="sm:hidden"');

    expect(mobileForms).toBeGreaterThan(-1);
    expect(mobileForms).toBeLessThan(formsList);
    expect(formsList).toBeLessThan(description);
    expect(description).toBeLessThan(desktopFacts);
    expect(desktopFacts).toBeGreaterThan(-1);
    expect(markup).toContain("lg:self-center");
    expect(desktopFacts).toBeLessThan(mobileFacts);
  });
});