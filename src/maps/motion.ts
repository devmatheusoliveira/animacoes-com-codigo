import { Easing, interpolate } from "remotion";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
};

// One continuous shot: three individual spotlights, then a shared comparison.
export const stateFocus = (seconds: number, index: number) => {
  const start = 3 + index * 6;
  return interpolate(seconds, [start, start + 1, start + 4.7, start + 5.6], [0, 1, 1, 0], clamp);
};

export const comparisonReveal = (seconds: number) =>
  interpolate(seconds, [21, 22.4], [0, 1], clamp);

export const currentComparison = (seconds: number) => {
  if (seconds < 3 || seconds >= 21) return -1;
  return Math.min(2, Math.floor((seconds - 3) / 6));
};

type CameraTarget = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Match the SVG projection and frame the lifted state, not its old footprint.
// Each spotlight returns to the exact wide shot before the next one begins.
export const mapCamera = (
  seconds: number,
  targets: CameraTarget[],
  requestedZoom: number,
  elevation: number,
  stateScale: number,
) => {
  let x = 306.5;
  let y = 319.5;
  let zoom = 1;
  const angle = 2.6 * Math.PI / 180;
  targets.forEach((target, index) => {
    const focus = stateFocus(seconds, index);
    const projectedWidth = 1.1 * stateScale * (target.width * Math.cos(angle) + target.height * 0.87 * Math.sin(angle));
    const projectedHeight = 1.1 * stateScale * (target.width * Math.sin(angle) + target.height * 0.87 * Math.cos(angle));
    const fittedZoom = Math.max(1, Math.min(requestedZoom, 860 / Math.max(1, projectedWidth), 530 / Math.max(1, projectedHeight)));
    x += (target.x - 306.5) * focus;
    y += (target.y - 45 * elevation - 319.5) * focus;
    zoom += (fittedZoom - 1) * focus;
  });
  return { x, y, zoom };
};
