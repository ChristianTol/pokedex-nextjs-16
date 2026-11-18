import { describe, expect, it } from "vitest";
import { parseSummary } from "@/lib/pokeapi/summary";

describe("parseSummary", () => {
  it("keeps id and name and orders types by slot", () => {
    expect(
      parseSummary({
        id: 6,
        name: "charizard",
        types: [
          { slot: 2, type: { name: "flying" } },
          { slot: 1, type: { name: "fire" } },
        ],
      }),
    ).toEqual({ id: 6, name: "charizard", types: ["fire", "flying"] });
  });
});
