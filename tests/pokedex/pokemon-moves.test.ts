import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PokemonMoves } from "@/components/pokedex/PokemonMoves";
import type { PokemonMovesState } from "@/hooks/usePokemonMoves";
import type { MoveInfo, PokemonMoves as MoveData } from "@/lib/pokeapi/moves";

const mockState = vi.hoisted(() => ({ opened: new Set<string>() }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: ((initialState: unknown) => [
      initialState instanceof Set ? mockState.opened : initialState,
      vi.fn(),
    ]) as unknown as typeof actual.useState,
  };
});

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    language: "en",
    t: (key: string) => key,
    tOptional: (key: string) => key,
  }),
}));

const info: MoveInfo = {
  name: "flamethrower",
  names: {},
  type: "fire",
  damageClass: "special",
  power: 90,
  accuracy: 100,
  pp: 15,
  descriptions: { en: "Move description" },
  effects: {},
  effectChance: 10,
  priority: 0,
  target: "selected-pokemon",
};

function renderMoves(
  data: MoveData,
  opened: string[] = [],
): string {
  mockState.opened = new Set(opened);
  const moves = {
    data,
    loading: false,
    failed: false,
    retry: () => {},
  } as PokemonMovesState;
  return renderToStaticMarkup(createElement(PokemonMoves, { moves }));
}

function makeData(overrides: Partial<MoveData> = {}): MoveData {
  return {
    games: ["scarlet-violet"],
    game: "scarlet-violet",
    levelUp: [{ move: "flamethrower", level: 1 }],
    tutor: [],
    machine: [],
    moves: { flamethrower: info },
    ...overrides,
  };
}

describe("PokemonMoves", () => {
  beforeEach(() => {
    mockState.opened = new Set();
  });

  it("keeps category and stats out of the mobile table columns", () => {
    const markup = renderMoves(makeData());

    expect(markup).toContain(
      'class="w-full table-fixed text-left text-sm sm:table-auto sm:min-w-[34rem]"',
    );
    expect(markup).toContain(
      '<th scope="col" class="hidden px-3 py-2 text-right font-medium sm:table-cell">moves.power</th>',
    );
    expect(markup).toContain(
      '<th scope="col" class="hidden px-3 py-2 font-medium sm:table-cell">moves.category</th>',
    );
    expect(markup).toContain(
      '<td class="hidden px-3 py-2 sm:table-cell"><span class="rounded-full px-2 py-0.5 text-xs font-medium text-white bg-blue-700">class.special</span></td>',
    );
    expect(markup).toContain(
      '<td class="hidden px-3 py-2 text-right tabular-nums sm:table-cell">90</td>',
    );
    expect(markup).toContain("min-w-0 break-words");
    expect(markup).toContain("flex w-full min-w-0 items-center");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain('class="bg-surface-muted/40"');
  });

  it("shows mobile stats below the description and before the other move facts", () => {
    const markup = renderMoves(makeData(), ["levelUp:flamethrower-1-0"]);
    const details = markup.match(
      /<td colSpan="2" class="px-3 pb-3 pt-1 sm:hidden">([\s\S]*?)<\/td>/,
    )?.[1];

    expect(details).toBeDefined();
    expect(details).toContain("90");
    expect(details).toContain("100");
    expect(details).toContain("15");
    expect(details!.indexOf("Move description")).toBeLessThan(
      details!.indexOf("moves.category"),
    );
    expect(details!.indexOf("moves.category")).toBeLessThan(
      details!.indexOf("moves.power"),
    );
    expect(details!.indexOf("moves.power")).toBeLessThan(
      details!.indexOf("moves.accuracy"),
    );
    expect(details!.indexOf("moves.accuracy")).toBeLessThan(
      details!.indexOf("moves.pp"),
    );
    expect(details).toContain('class="flex w-full items-center gap-1.5"');
    expect(details).toContain("class.special");
    expect(details!.indexOf("moves.pp")).toBeLessThan(
      details!.indexOf("moves.effectChance"),
    );
    expect(details!.indexOf("moves.effectChance")).toBeLessThan(
      details!.indexOf("moves.target"),
    );
    expect(markup).toContain(
      '<td colSpan="6" class="hidden px-3 pb-3 pt-1 sm:table-cell">',
    );
  });

  it("shows dashes for missing mobile stats", () => {
    const missingStats = {
      ...info,
      power: null,
      accuracy: null,
      pp: null,
      effectChance: null,
    };
    const markup = renderMoves(
      makeData({ moves: { flamethrower: missingStats } }),
      ["levelUp:flamethrower-1-0"],
    );
    const details = markup.match(
      /<td colSpan="2" class="px-3 pb-3 pt-1 sm:hidden">([\s\S]*?)<\/td>/,
    )?.[1];

    expect(details).toBeDefined();
    expect(details!.match(/—<\/dd>/g)).toHaveLength(3);
    expect(details).not.toContain("moves.effectChance");
  });

  it("uses the matching mobile and desktop detail spans for tutor rows", () => {
    const markup = renderMoves(
      makeData({ levelUp: [], tutor: ["flamethrower"] }),
      ["tutor:flamethrower"],
    );

    expect(markup).toContain(
      '<td colSpan="1" class="px-3 pb-3 pt-1 sm:hidden">',
    );
    expect(markup).toContain(
      '<td colSpan="5" class="hidden px-3 pb-3 pt-1 sm:table-cell">',
    );
  });
});