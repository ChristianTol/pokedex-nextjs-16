import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DetailsSkeleton,
  IntroSkeleton,
} from "@/components/pokedex/PokemonSkeleton";

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

  it("centers the stats placeholder without stretching it with the evolution section", () => {
    const markup = renderToStaticMarkup(createElement(DetailsSkeleton));
    const sections = [...markup.matchAll(/<section class="([^"]+)"/g)];

    expect(sections[0]?.[1]).toContain("lg:self-center");
    expect(sections[1]?.[1]).not.toContain("lg:self-center");
  });

  it("includes a training-advice placeholder", () => {
    const markup = renderToStaticMarkup(createElement(DetailsSkeleton));
    const sectionTitles = [
      ...markup.matchAll(/<h3 class="text-sm font-semibold text-muted[^\"]*">([^<]+)<\/h3>/g),
    ].map(([, title]) => title);

    expect(markup).toContain("Nature- en EV-richtlijn");
    expect(sectionTitles.slice(-4)).toEqual([
      "Abilities",
      "Sterktes en zwaktes",
      "Nature- en EV-richtlijn",
      "Moves",
    ]);
    expect(markup.match(/skeleton rounded-md h-44 w-full/g)).toHaveLength(2);
    expect(markup).toContain('class="skeleton rounded-md h-4 w-3/4"');
    expect(markup).toContain('class="skeleton rounded-md h-4 w-36"');
  });
});