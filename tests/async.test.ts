import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "@/lib/async";

describe("mapWithConcurrency", () => {
  it("keeps the order of the items", async () => {
    const result = await mapWithConcurrency([30, 10, 20], 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms * 2;
    });
    expect(result).toEqual([60, 20, 40]);
  });

  it("never runs more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    await mapWithConcurrency(
      Array.from({ length: 12 }, (_, i) => i),
      3,
      async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
      },
    );
    expect(peak).toBe(3);
  });

  it("handles empty input and a limit below one", async () => {
    expect(await mapWithConcurrency([], 5, async (x) => x)).toEqual([]);
    expect(await mapWithConcurrency([1, 2], 0, async (x) => x + 1)).toEqual([
      2, 3,
    ]);
  });

  it("rejects when a call fails", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (x) => {
        if (x === 2) throw new Error("boom");
        return x;
      }),
    ).rejects.toThrow("boom");
  });
});
