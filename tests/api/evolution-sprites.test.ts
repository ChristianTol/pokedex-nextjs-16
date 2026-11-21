import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/pokemon/evolution-sprites/route";
import { getPokemonSprites } from "@/lib/pokeapi/detail";

vi.mock("@/lib/pokeapi/detail", () => ({
  getPokemonSprites: vi.fn(),
}));

const request = (query: string) =>
  new Request(`http://localhost/api/pokemon/evolution-sprites${query}`);

describe("evolution-sprites route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the requested sprite data and removes duplicate ids", async () => {
    vi.mocked(getPokemonSprites).mockResolvedValue([]);

    const response = await GET(request("?ids=25,26,25"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(getPokemonSprites).toHaveBeenCalledWith([25, 26]);
  });

  it.each(["", "?ids=1,nope", "?ids=0", `?ids=${Array(51).fill("1").join(",")}`])(
    "rejects invalid or oversized ids (%s)",
    async (query) => {
      const response = await GET(request(query));

      expect(response.status).toBe(400);
      expect(getPokemonSprites).not.toHaveBeenCalled();
    },
  );
});