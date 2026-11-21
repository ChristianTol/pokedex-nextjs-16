import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PokemonForm, PokemonFormSprites } from "@/lib/pokeapi/detail";

const hookHarness = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  state: null as { key: string; sprites: PokemonFormSprites[] } | null,
}));

vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void)) => {
    hookHarness.effects.push(effect);
  },
  useState: () => [
    hookHarness.state,
    (state: { key: string; sprites: PokemonFormSprites[] }) => {
      hookHarness.state = state;
    },
  ],
}));

import { usePokemonFormSprites } from "@/hooks/usePokemonFormSprites";

const singleForm: PokemonForm[] = [
  { id: 25, name: "pikachu", isDefault: true },
];

const sprites: PokemonFormSprites[] = [
  {
    id: 25,
    gameSprites: {},
    defaultSprite: "/pikachu.png",
    shinyDefaultSprite: null,
    artwork: null,
    shinyArtwork: null,
  },
];

describe("usePokemonFormSprites", () => {
  beforeEach(() => {
    hookHarness.effects = [];
    hookHarness.state = null;
  });

  it("loads sprites for a single form", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sprites),
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(usePokemonFormSprites(25, singleForm).sprites).toEqual([]);
    hookHarness.effects[0]();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith("/api/pokemon/25/forms");
    expect(usePokemonFormSprites(25, singleForm).sprites).toEqual(sprites);
  });

  it("does not fetch when there are no forms", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    usePokemonFormSprites(25, []);
    hookHarness.effects[0]();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores a response after the request becomes stale", async () => {
    let resolveResponse!: (response: {
      ok: boolean;
      json: () => Promise<PokemonFormSprites[]>;
    }) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    usePokemonFormSprites(25, singleForm);
    const cleanup = hookHarness.effects[0]();
    cleanup?.();
    resolveResponse({ ok: true, json: () => Promise.resolve(sprites) });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(hookHarness.state).toBeNull();
    expect(usePokemonFormSprites(25, singleForm).sprites).toEqual([]);
  });
});