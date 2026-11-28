import { describe, expect, it, vi } from "vitest";
import {
  TRAINING_STAT_EDITOR_BACKDROP_CLASS,
  TRAINING_STAT_EDITOR_DIMMER_CLASS,
  TRAINING_STAT_EDITOR_MOBILE_QUERY,
  cancelTrainingModalScroll,
  finishTrainingStatEditorClose,
  scrollTrainingModalTo,
  startTrainingStatEditorCloseAnimation,
  startTrainingStatBackdropOpenAnimation,
  startTrainingStatEditorOpenAnimation,
  startTrainingStatSheetAnimation,
  trainingChartLayout,
  trainingChartScrollTop,
  trainingDesktopEditorPosition,
  trainingStatSheetTop,
} from "@/components/pokedex/TrainingStatEditor";

describe("TrainingStatEditor backdrop", () => {
  it("keeps the chart visible behind the mobile sheet and desktop dialog", () => {
    expect(TRAINING_STAT_EDITOR_BACKDROP_CLASS).toContain("fixed inset-0");
    expect(TRAINING_STAT_EDITOR_BACKDROP_CLASS).toContain("z-[60]");
    expect(TRAINING_STAT_EDITOR_BACKDROP_CLASS).not.toContain("bg-black/20");
    expect(TRAINING_STAT_EDITOR_DIMMER_CLASS).toContain("bg-black/20");
    expect(TRAINING_STAT_EDITOR_DIMMER_CLASS).toContain("pointer-events-none");
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

  it("measures the sheet's final layout position independently of its transform", () => {
    expect(trainingStatSheetTop(800, 340)).toBe(460);
  });

  it("slides the mobile sheet up and cancels that animation on cleanup", () => {
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel }) as unknown as Animation);
    const cleanup = startTrainingStatSheetAnimation(
      { animate },
      true,
      false,
    );

    expect(animate).toHaveBeenCalledWith(
      [{ transform: "translateY(100%)" }, { transform: "none" }],
      { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
    cleanup?.();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("skips sheet animation on desktop and when reduced motion is requested", () => {
    const animate = vi.fn();

    expect(startTrainingStatSheetAnimation({ animate }, false, false)).toBeNull();
    expect(startTrainingStatSheetAnimation({ animate }, true, true)).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });

  it("fades the separate backdrop in immediately on both viewport sizes", () => {
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel }) as unknown as Animation);

    const cleanup = startTrainingStatBackdropOpenAnimation({ animate }, false);
    expect(animate).toHaveBeenCalledWith(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 220, easing: "ease-out" },
    );
    cleanup?.();
    expect(cancel).toHaveBeenCalledOnce();
    expect(startTrainingStatBackdropOpenAnimation({ animate }, true)).toBeNull();
    expect(animate).toHaveBeenCalledOnce();
  });

  it("continues closing from the current backdrop and panel animation values", () => {
    const animation = {
      finished: Promise.resolve(),
      cancel: vi.fn(),
    } as unknown as Animation;
    const panelAnimate = vi.fn(() => animation);
    const backdropAnimate = vi.fn(() => animation);

    startTrainingStatEditorCloseAnimation(
      { animate: panelAnimate },
      { animate: backdropAnimate },
      false,
      false,
      {
        panelOpacity: "0.4",
        panelTransform: "matrix(0.98, 0, 0, 0.98, 0, 0)",
        backdropOpacity: "0.5",
      },
    );

    expect(panelAnimate).toHaveBeenCalledWith(
      [
        { opacity: "0.4", transform: "matrix(0.98, 0, 0, 0.98, 0, 0)" },
        { opacity: 0, transform: "scale(0.96)" },
      ],
      { duration: 160, easing: "ease-in", fill: "forwards" },
    );
    expect(backdropAnimate).toHaveBeenCalledWith(
      [{ opacity: "0.5" }, { opacity: 0 }],
      { duration: 160, easing: "ease-in", fill: "forwards" },
    );
  });

  it("continues a mobile close from the partially opened sheet and dimmer", () => {
    const animation = {
      finished: Promise.resolve(),
      cancel: vi.fn(),
    } as unknown as Animation;
    const panelAnimate = vi.fn(() => animation);
    const backdropAnimate = vi.fn(() => animation);

    startTrainingStatEditorCloseAnimation(
      { animate: panelAnimate },
      { animate: backdropAnimate },
      true,
      false,
      {
        panelOpacity: "1",
        panelTransform: "matrix(1, 0, 0, 1, 0, 100)",
        backdropOpacity: "0.2",
      },
    );

    expect(panelAnimate).toHaveBeenCalledWith(
      [
        { transform: "matrix(1, 0, 0, 1, 0, 100)" },
        { transform: "translateY(100%)" },
      ],
      {
        duration: 220,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards",
      },
    );
    expect(backdropAnimate).toHaveBeenCalledWith(
      [{ opacity: "0.2" }, { opacity: 0 }],
      { duration: 220, easing: "ease-in", fill: "forwards" },
    );
  });

  it("animates only the desktop editor after positioning", () => {
    const panelAnimation = {
      finished: Promise.resolve(),
      cancel: vi.fn(),
    } as unknown as Animation;
    const panelAnimate = vi.fn(() => panelAnimation);
    const cleanup = startTrainingStatEditorOpenAnimation(
      { animate: panelAnimate },
      false,
    );

    expect(panelAnimate).toHaveBeenCalledWith(
      [
        { opacity: 0, transform: "scale(0.96)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
    cleanup?.();
    expect(panelAnimation.cancel).toHaveBeenCalledOnce();

    expect(
      startTrainingStatEditorOpenAnimation(
        { animate: panelAnimate },
        true,
      ),
    ).toBeNull();
    expect(panelAnimate).toHaveBeenCalledOnce();
  });

  it("slides the mobile sheet down and fades the backdrop before closing", async () => {
    const panelAnimation = {
      finished: Promise.resolve(),
      cancel: vi.fn(),
    } as unknown as Animation;
    const backdropAnimation = {
      finished: Promise.resolve(),
      cancel: vi.fn(),
    } as unknown as Animation;
    const panelAnimate = vi.fn(() => panelAnimation);
    const backdropAnimate = vi.fn(() => backdropAnimation);
    const closing = startTrainingStatEditorCloseAnimation(
      { animate: panelAnimate },
      { animate: backdropAnimate },
      true,
      false,
    );

    expect(panelAnimate).toHaveBeenCalledWith(
      [{ transform: "translateY(0)" }, { transform: "translateY(100%)" }],
      {
        duration: 220,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards",
      },
    );
    expect(backdropAnimate).toHaveBeenCalledWith(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 220, easing: "ease-in", fill: "forwards" },
    );
    await closing?.finished;
  });

  it("hides the complete overlay before invoking the close callback", () => {
    const backdrop = { style: { visibility: "visible" } };
    const onClose = vi.fn(() => {
      expect(backdrop.style.visibility).toBe("hidden");
    });

    finishTrainingStatEditorClose(backdrop, onClose);

    expect(backdrop.style.visibility).toBe("hidden");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("fades and scales the desktop editor out and skips closing motion for reduced motion", async () => {
    const panelAnimation = {
      finished: Promise.resolve(),
      cancel: vi.fn(),
    } as unknown as Animation;
    const backdropAnimation = {
      finished: Promise.resolve(),
      cancel: vi.fn(),
    } as unknown as Animation;
    const panelAnimate = vi.fn(() => panelAnimation);
    const backdropAnimate = vi.fn(() => backdropAnimation);
    const closing = startTrainingStatEditorCloseAnimation(
      { animate: panelAnimate },
      { animate: backdropAnimate },
      false,
      false,
    );

    expect(panelAnimate).toHaveBeenCalledWith(
      [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(0.96)" },
      ],
      { duration: 160, easing: "ease-in", fill: "forwards" },
    );
    expect(backdropAnimate).toHaveBeenCalledWith(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 160, easing: "ease-in", fill: "forwards" },
    );
    await closing?.finished;

    expect(
      startTrainingStatEditorCloseAnimation(
        { animate: panelAnimate },
        { animate: backdropAnimate },
        true,
        true,
      ),
    ).toBeNull();
    expect(panelAnimate).toHaveBeenCalledOnce();
  });

  it("smoothly scrolls on initial open, uses direct scrolling after layout changes, and can stop motion", () => {
    let position = 120;
    const scrollTo = vi.fn();
    const modal = {
      get scrollTop() {
        return position;
      },
      set scrollTop(value: number) {
        position = value;
      },
      scrollTo,
    } as Pick<HTMLElement, "scrollTop" | "scrollTo">;

    scrollTrainingModalTo(modal, 500, true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 500, behavior: "smooth" });

    scrollTrainingModalTo(modal, 240, false);
    expect(position).toBe(240);
    expect(scrollTo).toHaveBeenCalledOnce();

    cancelTrainingModalScroll(modal);
    expect(position).toBe(240);
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

  it("keeps the editor on its selected side when chart geometry changes", () => {
    const initialPosition = trainingDesktopEditorPosition({
      modalLeft: 0,
      modalRight: 1200,
      visibleTop: 40,
      visibleBottom: 760,
      chartLeft: 250,
      chartRight: 520,
      chartTop: 260,
      chartHeight: 280,
      panelWidth: 400,
      panelHeight: 500,
      viewportWidth: 1200,
    });
    const nextPosition = trainingDesktopEditorPosition({
      modalLeft: 0,
      modalRight: 1200,
      visibleTop: 40,
      visibleBottom: 760,
      chartLeft: 420,
      chartRight: 800,
      chartTop: 220,
      chartHeight: 240,
      panelWidth: 400,
      panelHeight: 500,
      viewportWidth: 1200,
      placement: initialPosition.placement,
    });
    const naturalNextPosition = trainingDesktopEditorPosition({
      modalLeft: 0,
      modalRight: 1200,
      visibleTop: 40,
      visibleBottom: 760,
      chartLeft: 420,
      chartRight: 800,
      chartTop: 220,
      chartHeight: 240,
      panelWidth: 400,
      panelHeight: 500,
      viewportWidth: 1200,
    });

    expect(initialPosition.placement).toBe("right");
    expect(naturalNextPosition.placement).toBe("left");
    expect(nextPosition.placement).toBe("right");
    expect(nextPosition.left).toBeGreaterThanOrEqual(816);
  });
});