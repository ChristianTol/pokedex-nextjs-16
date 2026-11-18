export type Tilt = {
  /** Rotation around the x axis in degrees. */
  rotateX: number;
  /** Rotation around the y axis in degrees. */
  rotateY: number;
  /** Pointer position as a percentage of the card, for the glare. */
  glareX: number;
  glareY: number;
};

export const MAX_TILT_DEGREES = 12;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * The side of the card under the pointer dips away from the viewer (as if
 * pressed), so the card leans in the direction of the mouse. `x` and `y` are
 * relative to the card's top-left corner.
 */
export function computeTilt(
  x: number,
  y: number,
  width: number,
  height: number,
  max = MAX_TILT_DEGREES,
): Tilt {
  const px = clamp(x / width, 0, 1);
  const py = clamp(y / height, 0, 1);
  return {
    rotateX: (0.5 - py) * 2 * max,
    rotateY: (px - 0.5) * 2 * max,
    glareX: px * 100,
    glareY: py * 100,
  };
}
