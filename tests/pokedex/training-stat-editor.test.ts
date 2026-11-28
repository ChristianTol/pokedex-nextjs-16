import { describe, expect, it } from "vitest";
import {
  TRAINING_STAT_EDITOR_BACKDROP_CLASS,
  TRAINING_STAT_EDITOR_MOBILE_QUERY,
  trainingChartLayout,
  trainingChartScrollTop,
  trainingDesktopEditorPosition,
} from "@/components/pokedex/TrainingStatEditor";

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

  it("centers the selected chart between the sticky header and the sheet", () => {
    const layout = trainingChartLayout({
      modalTop: 40,
      modalBottom: 940,
      headerBottom: 100,
      sheetTop: 560,
      chartTop: 620,
      chartHeight: 296,
      chartScale: 1,
      scrollTop: 400,
      scrollHeight: 1800,
      clientHeight: 900,
    });

    expect(layout.scale).toBe(1);
    expect(layout.scrollTop).toBe(838);
  });

  it("scales a chart to fit a short mobile viewport above the sheet", () => {
    const layout = trainingChartLayout({
      modalTop: 8,
      modalBottom: 608,
      headerBottom: 72,
      sheetTop: 300,
      chartTop: 400,
      chartHeight: 296,
      chartScale: 1,
      scrollTop: 300,
      scrollHeight: 1400,
      clientHeight: 600,
    });

    expect(layout.scale).toBeCloseTo(0.689);
    expect(layout.scrollTop).toBe(616);
  });

  it("clamps the scroll position to the modal's scroll range", () => {
    const scrollTop = trainingChartScrollTop({
      modalTop: 0,
      modalBottom: 600,
      headerBottom: 60,
      sheetTop: 300,
      chartTop: -100,
      chartHeight: 240,
      scrollTop: 0,
      scrollHeight: 900,
      clientHeight: 600,
    });

    expect(scrollTop).toBe(0);
    expect(TRAINING_STAT_EDITOR_MOBILE_QUERY).toBe("(max-width: 767px)");
  });

  it("places the desktop editor to the right of a chart when that side has room", () => {
    const position = trainingDesktopEditorPosition({
      modalLeft: 100,
      modalRight: 1100,
      visibleTop: 80,
      visibleBottom: 900,
      chartLeft: 300,
      chartRight: 580,
      chartTop: 300,
      chartHeight: 280,
      panelWidth: 400,
      panelHeight: 420,
      viewportWidth: 1200,
    });

    expect(position.left).toBe(596);
    expect(position.width).toBe(400);
    expect(position.top).toBe(230);
    expect(position.maxHeight).toBe(796);
  });

  it("uses the left side for the right-hand chart and adapts to narrow space", () => {
    const position = trainingDesktopEditorPosition({
      modalLeft: 0,
      modalRight: 800,
      visibleTop: 40,
      visibleBottom: 760,
      chartLeft: 400,
      chartRight: 680,
      chartTop: 260,
      chartHeight: 280,
      panelWidth: 400,
      panelHeight: 500,
      viewportWidth: 800,
    });

    expect(position.left).toBe(16);
    expect(position.width).toBe(368);
    expect(position.left + position.width).toBeLessThanOrEqual(384);
    expect(position.maxHeight).toBe(696);
  });
});