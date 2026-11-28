import { describe, expect, it, vi } from "vitest";
import {
  isPokemonModalSwipeExcluded,
  POKEMON_MODAL_SWIPE_EXCLUDED_SELECTOR,
} from "@/components/pokedex/pokemon-modal-swipe";

describe("PokemonModal swipe exclusions", () => {
  it("ignores a touch on the level slider or one of its stop buttons", () => {
    const closest = vi.fn((selector: string) =>
      selector.includes("[data-pokemon-swipe-exempt]")
        ? ({} as HTMLElement)
        : null,
    );
    const sliderTarget = { closest } as unknown as HTMLElement;

    expect(isPokemonModalSwipeExcluded(sliderTarget)).toBe(true);
    expect(closest).toHaveBeenCalledWith(
      POKEMON_MODAL_SWIPE_EXCLUDED_SELECTOR,
    );
    expect(POKEMON_MODAL_SWIPE_EXCLUDED_SELECTOR).toContain(
      "[data-pokemon-swipe-exempt]",
    );
  });

  it("leaves ordinary content available for the existing swipe behavior", () => {
    const target = {
      closest: vi.fn(() => null),
    } as unknown as HTMLElement;

    expect(isPokemonModalSwipeExcluded(target)).toBe(false);
  });
});