import { describe, expect, it } from "vitest";
import { computeTilt } from "@/lib/pokedex/tilt";

describe("computeTilt", () => {
  it("is flat in the centre", () => {
    const tilt = computeTilt(100, 150, 200, 300, 10);
    expect(tilt.rotateX).toBeCloseTo(0);
    expect(tilt.rotateY).toBeCloseTo(0);
  });

  it("dips the right edge with positive rotateY", () => {
    expect(computeTilt(200, 150, 200, 300, 10).rotateY).toBe(10);
    expect(computeTilt(0, 150, 200, 300, 10).rotateY).toBe(-10);
  });

  it("dips the top edge with positive rotateX", () => {
    expect(computeTilt(100, 0, 200, 300, 10).rotateX).toBe(10);
    expect(computeTilt(100, 300, 200, 300, 10).rotateX).toBe(-10);
  });

  it("clamps pointers outside the card", () => {
    const tilt = computeTilt(-50, 999, 200, 300, 10);
    expect(tilt.rotateY).toBe(-10);
    expect(tilt.rotateX).toBe(-10);
    expect(tilt.glareX).toBe(0);
    expect(tilt.glareY).toBe(100);
  });
});
