import { describe, expect, it } from "vitest";
import { TRAINING_STAT_EDITOR_BACKDROP_CLASS } from "@/components/pokedex/TrainingStatEditor";

describe("TrainingStatEditor backdrop", () => {
  it("keeps the chart visible behind the mobile sheet and desktop dialog", () => {
    expect(TRAINING_STAT_EDITOR_BACKDROP_CLASS).toContain("fixed inset-0");
    expect(TRAINING_STAT_EDITOR_BACKDROP_CLASS).toContain("z-[60]");
    expect(TRAINING_STAT_EDITOR_BACKDROP_CLASS).toContain("bg-black/20");
    expect(TRAINING_STAT_EDITOR_BACKDROP_CLASS).not.toContain("backdrop-blur");
    expect(TRAINING_STAT_EDITOR_BACKDROP_CLASS).toContain("items-end");
    expect(TRAINING_STAT_EDITOR_BACKDROP_CLASS).toContain("md:items-center");
    expect(TRAINING_STAT_EDITOR_BACKDROP_CLASS).toContain("md:p-4");
  });
});