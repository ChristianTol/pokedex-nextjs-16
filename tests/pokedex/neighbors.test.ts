import { describe, expect, it } from "vitest";
import { neighbors } from "@/lib/pokedex/neighbors";

const list = [{ id: 4 }, { id: 25 }, { id: 133 }];

describe("neighbors", () => {
  it("returns the entries around the given one", () => {
    expect(neighbors(list, 25)).toEqual({
      previous: { id: 4 },
      next: { id: 133 },
    });
  });

  it("has no previous entry at the start and no next at the end", () => {
    expect(neighbors(list, 4)).toEqual({ previous: null, next: { id: 25 } });
    expect(neighbors(list, 133)).toEqual({
      previous: { id: 25 },
      next: null,
    });
  });

  it("has neither when the entry is not in the list", () => {
    expect(neighbors(list, 6)).toEqual({ previous: null, next: null });
    expect(neighbors([], 6)).toEqual({ previous: null, next: null });
  });
});
