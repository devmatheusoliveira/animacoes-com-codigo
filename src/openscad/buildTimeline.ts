export type CodeRow = { source: string; visible: number; cursor: boolean };

const progress = (frame: number, from: number, end: number, length: number) =>
  Math.floor(Math.max(0, Math.min(1, (frame - from) / (end - from))) * length);

const writeRows = (source: string, visible: number, writing: boolean): CodeRow[] => {
  let offset = 0;
  const current = source.slice(0, visible).split("\n").length - 1;
  return source.split("\n").map((line, index) => {
    const chars = Math.max(0, Math.min(line.length, visible - offset));
    offset += line.length + 1;
    return { source: line, visible: chars, cursor: writing && index === current };
  }).filter((_, index) => index <= current);
};

// Retain existing lines; type only the operation being added to this document.
export const getBuildRows = (source: string, stage: number, frame: number, fps: number): CodeRow[] => {
  const lines = source.split("\n");
  const full = (line: string): CodeRow => ({ source: line, visible: line.length, cursor: false });
  if (stage === 0) return writeRows(source, progress(frame, 0.4 * fps, 3.4 * fps, source.length), frame < 3.4 * fps);
  if (stage === 1) {
    if (frame < 0.4 * fps) return [...lines.slice(0, 2), lines[3].trimStart()].map(full);
    return [
      ...lines.slice(0, 2).map(full),
      { source: lines[2], visible: progress(frame, 0.4 * fps, 1.6 * fps, lines[2].length), cursor: frame < 1.9 * fps },
      full(lines[3]),
      { source: lines[4], visible: progress(frame, 1.9 * fps, 3.8 * fps, lines[4].length), cursor: frame >= 1.9 * fps && frame < 3.8 * fps },
      full(frame >= 1.6 * fps ? lines[5] : ""),
    ];
  }
  const prefix = lines.slice(0, 5).map(full);
  const insertion = lines.slice(5, -1).join("\n");
  if (frame < 0.4 * fps) return [...prefix, full(lines[lines.length - 1])];
  const added = writeRows(insertion, progress(frame, 0.4 * fps, 3.8 * fps, insertion.length), frame < 3.8 * fps);
  return [...prefix, ...added, full(lines[lines.length - 1])];
};
