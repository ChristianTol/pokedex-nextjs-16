import { describe, expect, it, vi } from "vitest";
import {
  finishFilterSheetClose,
  startFilterSheetCloseAnimation,
  startFilterSheetOpenAnimation,
} from "@/components/pokedex/FilterSheet";

describe("FilterSheet animations", () => {
  it("slides the panel up and fades in its backdrop when opening", () => {
    const panelAnimate = vi.fn(() => ({}) as Animation);
    const backdropAnimate = vi.fn(() => ({}) as Animation);

    startFilterSheetOpenAnimation(
      { animate: panelAnimate },
      { animate: backdropAnimate },
      false,
    );

    expect(panelAnimate).toHaveBeenCalledWith(
      [{ transform: "translateY(100%)" }, { transform: "none" }],
      { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
    expect(backdropAnimate).toHaveBeenCalledWith(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 220, easing: "ease-out" },
    );
  });

  it("slides the panel down and fades the backdrop from their current states", async () => {
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

    const closing = startFilterSheetCloseAnimation(
      { animate: panelAnimate },
      { animate: backdropAnimate },
      false,
      {
        panelTransform: "matrix(1, 0, 0, 1, 0, 120)",
        backdropOpacity: "0.6",
      },
    );

    expect(panelAnimate).toHaveBeenCalledWith(
      [
        { transform: "matrix(1, 0, 0, 1, 0, 120)" },
        { transform: "translateY(100%)" },
      ],
      {
        duration: 220,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards",
      },
    );
    expect(backdropAnimate).toHaveBeenCalledWith(
      [{ opacity: "0.6" }, { opacity: 0 }],
      { duration: 220, easing: "ease-in", fill: "forwards" },
    );

    await closing?.finished;
    closing?.cancel();
    expect(panelAnimation.cancel).toHaveBeenCalledOnce();
    expect(backdropAnimation.cancel).toHaveBeenCalledOnce();
  });

  it("returns null when motion is reduced or Web Animations are unavailable", () => {
    const animate = vi.fn();
    const element = { animate };

    expect(
      startFilterSheetCloseAnimation(element, element, true),
    ).toBeNull();
    expect(
      startFilterSheetCloseAnimation(
        { animate: undefined as unknown as HTMLElement["animate"] },
        element,
        false,
      ),
    ).toBeNull();
    expect(startFilterSheetOpenAnimation(element, element, true)).toEqual([]);
    expect(animate).not.toHaveBeenCalled();
  });

  it("hides the complete overlay before calling the unmount callback", () => {
    const overlay = { style: { visibility: "visible" } };
    const onClose = vi.fn(() => {
      expect(overlay.style.visibility).toBe("hidden");
    });

    finishFilterSheetClose(overlay, onClose);

    expect(overlay.style.visibility).toBe("hidden");
    expect(onClose).toHaveBeenCalledOnce();
  });
});