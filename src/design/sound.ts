import { staticFile } from "remotion";

const minimal = (cue: string) => staticFile(`audio/uisfx/minimal/${cue}.mp3`);
const mechanical = (cue: string) => staticFile(`audio/uisfx/mechanical/${cue}.mp3`);

export const soundTheme = {
  pack: "minimal",
  typing: mechanical("typing"),
  progress: minimal("progress-step"),
  movement: minimal("swipe"),
  settle: minimal("snap"),
  entry: minimal("wake"),
  focus: minimal("focus"),
  overview: minimal("collapse"),
  complete: minimal("complete"),
} as const;
