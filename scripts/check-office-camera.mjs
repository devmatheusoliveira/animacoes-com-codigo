import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "out", "office-camera-sequence");
const serveUrl = await bundle({
  entryPoint: path.join(root, "src", "index.ts"),
  rspack: true,
});
const composition = await selectComposition({
  serveUrl,
  id: "OfficeScene3D",
});

// One browser page must survive across frames. Independent renderStill calls
// remount Canvas and cannot detect a camera frozen during Studio playback.
await renderFrames({
  serveUrl,
  composition,
  inputProps: {},
  outputDir,
  frames: [0, 120, 210, 246, 264, 280, 310, 350],
  concurrency: 1,
  imageFormat: "png",
  scale: 0.5,
  onStart: () =>
    console.log("Checking camera across frames on ONE browser page"),
  onFrameUpdate: (_count, frame) => console.log(`Captured frame ${frame}`),
});
console.log(`Inspect the wide shot, seated shot and close-up in ${outputDir}`);
