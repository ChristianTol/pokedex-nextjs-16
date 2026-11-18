"use client";

import { useCallback, useRef, type PointerEvent } from "react";
import { computeTilt } from "@/lib/pokedex/tilt";

/**
 * Tilts a card towards the mouse. Pointer events go on a stationary wrapper
 * (`handlers`) while the transform is applied to the inner element (`tiltRef`),
 * so the measured rect doesn't change as the card rotates. Values are written
 * as CSS variables, which avoids a re-render per mouse move.
 */
export function useTilt<T extends HTMLElement>() {
  const tiltRef = useRef<T>(null);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const card = tiltRef.current;
    if (!card || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const tilt = computeTilt(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height,
    );
    card.style.setProperty("--tilt-x", `${tilt.rotateX}deg`);
    card.style.setProperty("--tilt-y", `${tilt.rotateY}deg`);
    card.style.setProperty("--glare-x", `${tilt.glareX}%`);
    card.style.setProperty("--glare-y", `${tilt.glareY}%`);
    card.dataset.tilting = "true";
  }, []);

  const onPointerLeave = useCallback(() => {
    const card = tiltRef.current;
    if (!card) return;
    for (const name of ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y"]) {
      card.style.removeProperty(name);
    }
    delete card.dataset.tilting;
  }, []);

  return { tiltRef, handlers: { onPointerMove, onPointerLeave } };
}
