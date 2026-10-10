import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const evaluate = (source, bindings = {}) => {
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", ...Object.keys(bindings), code)(require, module, module.exports, ...Object.values(bindings));
  return module.exports;
};
const { videoDimensions, portraitMermaid, videoFormatSchema, socialSafeAreaSchema, socialFrame } = evaluate(readFileSync(new URL("../src/layout/videoFormat.ts", import.meta.url), "utf8"));
const { getTimeline } = evaluate(readFileSync(new URL("../src/diagrams/timeline.ts", import.meta.url), "utf8"));
assert.equal(videoFormatSchema.parse(undefined), "horizontal");
assert.equal(socialSafeAreaSchema.parse(undefined), false);
assert.deepEqual(socialFrame(1920, 1080, true), { left: 0, top: 0, scale: 1 });
assert.deepEqual(socialFrame(1080, 1920, false), { left: 0, top: 0, scale: 1 });
const safeFrame = socialFrame(1080, 1920, true);
assert.equal(safeFrame.scale, 0.82);
assert.ok(safeFrame.left >= 0 && safeFrame.top >= 0);
assert.ok(safeFrame.left + 1080 * safeFrame.scale <= 1080);
assert.ok(safeFrame.top + 1920 * safeFrame.scale <= 1920);
// The existing content's 80 px sides and 100 px vertical margins stay well inset.
assert.ok(safeFrame.left + 80 * safeFrame.scale >= 120);
assert.ok(safeFrame.left + 1000 * safeFrame.scale <= 900);
assert.ok(safeFrame.top + 100 * safeFrame.scale >= 160);
assert.ok(safeFrame.top + 1820 * safeFrame.scale <= 1600);
const platforms = ["youtube", "youtube-shorts", "instagram-reels"].map((name) => ({
  name,
  props: JSON.parse(readFileSync(new URL(`../presets/${name}.json`, import.meta.url), "utf8")),
}));
for (const platform of platforms) {
  assert.equal(platform.props.videoFormat, platform.name === "youtube" ? "horizontal" : "vertical");
  assert.equal(platform.props.socialSafeArea, platform.name !== "youtube");
}
assert.deepEqual(videoDimensions(undefined), { width: 1920, height: 1080 });
assert.equal(portraitMermaid("flowchart LR\n A --> B"), "flowchart TB\n A --> B");
assert.equal(portraitMermaid("graph RL\n A --> B"), "graph TB\n A --> B");
assert.equal(portraitMermaid("flowchart TD\n A --> B"), "flowchart TD\n A --> B");
assert.equal(portraitMermaid("sequenceDiagram\n A->>B: LR"), "sequenceDiagram\n A->>B: LR");

const source = ts.createSourceFile("Root.tsx", readFileSync(new URL("../src/Root.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let count = 0;
const visit = (node) => {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "Composition") {
    const attributes = node.attributes.properties;
    const attribute = (name) => attributes.find((entry) => ts.isJsxAttribute(entry) && entry.name.getText(source) === name);
    const id = attribute("id").initializer.text;
    const fps = Number(attribute("fps").initializer.expression.getText(source));
    assert.equal(fps, 30, `${id}: presets sociais usam 30 fps`);
    const props = evaluate(`module.exports = (${attribute("defaultProps").initializer.expression.getText(source)});`);
    const calculate = evaluate(`module.exports = (${attribute("calculateMetadata").initializer.expression.getText(source)});`, { getTimeline, videoDimensions });
    const duration = props.steps ? getTimeline(props.steps, 30).at(-1).end : undefined;
    for (const videoFormat of ["horizontal", "vertical"]) {
      const result = calculate({ props: { ...props, videoFormat } });
      assert.deepEqual({ width: result.width, height: result.height }, videoDimensions(videoFormat), id);
      if (duration !== undefined) assert.equal(result.durationInFrames, duration, `${id}: duração preservada`);
    }
    for (const platform of platforms) {
      const result = calculate({ props: { ...props, ...platform.props } });
      assert.deepEqual({ width: result.width, height: result.height }, videoDimensions(platform.props.videoFormat), `${id}: ${platform.name}`);
      const frames = result.durationInFrames ?? Number(attribute("durationInFrames").initializer.expression.getText(source));
      if (platform.name === "youtube-shorts" && frames / fps > 180) {
        console.warn(`AVISO: ${id} tem ${frames / fps}s; reduza o roteiro a até 180s para publicar como Shorts. Nada será cortado automaticamente.`);
      }
    }
    console.log(`OK: ${id} · 16:9 + 9:16 · mesmo conteúdo e duração`);
    count++;
  }
  ts.forEachChild(node, visit);
};
visit(source);
assert.equal(count, 6, "Todas as seis cenas devem suportar os dois formatos");
console.log("OK: fallback horizontal e orientação Mermaid sem alterar nós/arestas");
console.log("OK: presets YouTube / Shorts / Reels · 30 fps · margens opcionais sem recorte");
