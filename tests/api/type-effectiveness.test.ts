import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/types/effectiveness/route";
import { getTypeCharts } from "@/lib/pokeapi/type-chart";

vi.mock("@/lib/pokeapi/type-chart", () => ({
  getTypeCharts: vi.fn(),
}));

const relations = (to: Partial<Record<string, string[]>>) => ({
  double_damage_from: [],
  half_damage_from: [],
  no_damage_from: [],
  double_damage_to: (to.double ?? []).map((name) => ({ name })),
  half_damage_to: (to.half ?? []).map((name) => ({ name })),
  no_damage_to: (to.none ?? []).map((name) => ({ name })),
});

describe("type effectiveness route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the damage multiplier per attacking and defending type", async () => {
    vi.mocked(getTypeCharts).mockResolvedValue([
      {
        generation: 1,
        chart: {
          name: "fire",
          relations: relations({ double: ["grass"], half: ["water"] }),
          past: [],
        },
      },
      {
        generation: 1,
        chart: {
          name: "normal",
          relations: relations({ none: ["ghost"] }),
          past: [],
        },
      },
    ]);

    const response = await GET();
    const table = await response.json();

    expect(response.status).toBe(200);
    expect(table.fire.grass).toBe(2);
    expect(table.fire.water).toBe(0.5);
    expect(table.normal.ghost).toBe(0);
    expect(table.fire.normal).toBe(1);
  });

  it("answers 502 when the chart cannot be loaded", async () => {
    vi.mocked(getTypeCharts).mockRejectedValue(new Error("offline"));

    expect((await GET()).status).toBe(502);
  });
});
