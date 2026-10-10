export type TimedStep = { seconds: number };
export type TimelineItem = { from: number; end: number };
// Share one rounding rule between playback, progress and render duration.
export const getTimeline = (
  steps: readonly TimedStep[],
  fps: number,
): TimelineItem[] => {
  let from = 0;
  return steps.map((step) => {
    const item = {
      from,
      end: from + Math.max(1, Math.round(step.seconds * fps)),
    };
    from = item.end;
    return item;
  });
};
export const getActiveStep = (
  timeline: readonly TimelineItem[],
  frame: number,
): number => {
  const found = timeline.findIndex((item) => frame < item.end);
  return found === -1 ? timeline.length - 1 : found;
};
