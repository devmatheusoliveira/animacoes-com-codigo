import { useEffect, useMemo, useState } from "react";
import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import { BufferGeometry, EdgesGeometry } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { z } from "zod";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useDelayRender, useRemotionEnvironment, useVideoConfig } from "remotion";
import { getActiveStep, getTimeline } from "./diagrams/timeline";
import { createPlateGeometry } from "./openscad/parametricPlate";
import { getBuildRows } from "./openscad/buildTimeline";
import { socialSafeAreaSchema, videoFormatSchema } from "./layout/videoFormat";
import { SocialSafeFrame } from "./layout/SocialSafeFrame";
import { soundTheme } from "./design/sound";
import {
  brandColors,
  brandThemes,
  codePalette,
  radii,
  shadows,
  typography,
} from "./design/brand";

export const openScadSchema = z.object({
  videoFormat: videoFormatSchema,
  socialSafeArea: socialSafeAreaSchema,
  title: z.string().max(70),
  color: z.string(),
  rotationSpeed: z.number().min(0).max(30),
  centerDiameter: z.number().min(4).max(28).describe("Diâmetro do furo central, em mm"),
  mountDiameter: z.number().min(2).max(10).describe("Diâmetro dos furos de fixação, em mm"),
  exploreMode: z.boolean().describe("Mostrar o resultado imediatamente"),
  animateParameters: z.boolean().describe("Animar a edição do diâmetro no código"),
  continuousBuild: z.boolean().describe("Construir a peça editando um único código"),
  steps: z.array(z.object({
    title: z.string(),
    seconds: z.number().min(8).max(120),
    source: z.string(),
    model: z.string(),
    focuses: z.array(z.object({
      title: z.string(),
      explanation: z.string(),
      lines: z.array(z.number()),
      region: z.enum(["body", "dimensions", "centerHole", "mountHoles"]),
    })).min(1),
  })).min(1),
});

type Props = z.infer<typeof openScadSchema>;
type Asset = { code: string; geometry: BufferGeometry; edges: EdgesGeometry; centerDiameter: number; mountDiameter: number };

const light = brandThemes.light;
const dark = brandThemes.dark;
const accent = brandColors.accent;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const soundEffects = {
  key: soundTheme.typing,
  render: soundTheme.progress,
  movement: soundTheme.movement,
} as const;

const getTypingSegments = (source: string, stage: number, fps: number, continuous: boolean, duration: number) => {
  if (!continuous) return [{ from: 0.4 * fps, end: Math.min(3.4 * fps, duration * 0.3), characters: source.length }];
  if (stage === 0) return [{ from: 0.4 * fps, end: 3.4 * fps, characters: source.length }];
  const lines = source.split("\n");
  if (stage === 1) return [
    { from: 0.4 * fps, end: 1.6 * fps, characters: lines[2]?.length ?? 0 },
    { from: 1.9 * fps, end: 3.8 * fps, characters: lines[4]?.length ?? 0 },
  ];
  return [{ from: 0.4 * fps, end: 3.8 * fps, characters: lines.slice(5, -1).join("\n").length }];
};

const ScadLine: React.FC<{ source: string; visible: number }> = ({ source, visible }) => {
  const tokens = source.match(/\/\/.*|"(?:\\.|[^"\\])*"|\b\d+(?:\.\d+)?\b|\$?[A-Za-z_]\w*|\s+|./g) ?? [];
  let offset = 0;
  return <>{tokens.map((token, index) => {
    const from = offset;
    offset += token.length;
    const color = token.startsWith("//") ? codePalette.comment : token.startsWith('"') ? codePalette.string
      : /^(for|if|else|module|function|let|each)$/.test(token) || token.startsWith("$") ? codePalette.keyword
      : /^(true|false|undef)$/.test(token) ? codePalette.literal : /^\d/.test(token) ? codePalette.number
      : /^[a-zA-Z_]/.test(token) ? source.slice(offset).trimStart().startsWith("(") ? codePalette.function : codePalette.property : codePalette.text;
    return <span key={index} style={{ color }}>{token.slice(0, Math.max(0, visible - from))}</span>;
  })}</>;
};

export const OpenScadLesson: React.FC<Props> = (props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const previewWidth = portrait ? 920 : 780;
  const previewHeight = portrait ? 560 : 840;
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const { isRendering } = useRemotionEnvironment();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const paths = JSON.stringify(props.steps.map(({ source, model }) => ({ source, model })));
  const centerDiameter = Math.round(props.centerDiameter * 10) / 10;
  const mountDiameter = Math.round(props.mountDiameter * 10) / 10;

  useEffect(() => {
    const handle = isRendering ? delayRender("Atualizando código OpenSCAD e malhas STL") : null;
    let active = true;
    const controller = new AbortController();
    setUpdating(true);
    setError("");
    const loader = new STLLoader();
    const files: { source: string; model: string }[] = JSON.parse(paths);
    const timer = setTimeout(() => {
    Promise.all(files.map(async ({ source, model }) => {
      let code: string;
      let modelUrl = staticFile(model);
      if (centerDiameter !== 18 || mountDiameter !== 6) {
        const stage = source.split("/").pop()?.replace(/\.scad$/, "") ?? "";
        const response = await fetch(`http://127.0.0.1:3031/render?stage=${encodeURIComponent(stage)}&center=${centerDiameter}&mount=${mountDiameter}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Falha ao atualizar a peça.");
        code = result.code;
        modelUrl = result.model;
      } else {
        const response = await fetch(staticFile(source), { signal: controller.signal });
        if (!response.ok) throw new Error(`Não foi possível carregar ${source}`);
        code = (await response.text()).trimEnd();
      }
      const response = await fetch(modelUrl, { signal: controller.signal });
      if (!response.ok) throw new Error(`Não foi possível carregar ${model}`);
      const geometry = loader.parse(await response.arrayBuffer());
      // OpenSCAD uses Z-up; Three.js uses Y-up. Keep original model dimensions.
      geometry.rotateX(-Math.PI / 2);
      geometry.computeVertexNormals();
      return { code, geometry, edges: new EdgesGeometry(geometry, 25), centerDiameter, mountDiameter };
    })).then((loaded) => {
      if (active) { setAssets(loaded); setUpdating(false); }
      else loaded.forEach(({ geometry, edges }) => { geometry.dispose(); edges.dispose(); });
      if (handle !== null) continueRender(handle);
    }).catch((err) => {
      if (active) {
        setUpdating(false);
        setError("Ative o serviço com npm run openscad:live para atualizar a geometria.");
        if (isRendering) cancelRender(err);
      }
      if (handle !== null) continueRender(handle);
    });
    }, isRendering ? 0 : 250);
    return () => { active = false; controller.abort(); clearTimeout(timer); if (handle !== null) continueRender(handle); };
  }, [paths, centerDiameter, mountDiameter, isRendering, delayRender, continueRender, cancelRender]);

  const timeline = getTimeline(props.steps, fps);
  const index = getActiveStep(timeline, frame);
  const step = props.steps[index];
  const localFrame = frame - timeline[index].from;
  const duration = timeline[index].end - timeline[index].from;
  const continuous = props.continuousBuild && !props.exploreMode;
  const parameterDemo = props.animateParameters && !props.exploreMode && step.model.endsWith("03-suporte.stl");
  const editStart = duration * 0.45;
  const editPeriod = duration * 0.2;
  const editIndex = Math.min(2, Math.max(0, Math.floor((localFrame - editStart) / editPeriod)));
  const editFrom = editStart + editIndex * editPeriod;
  const editFrame = localFrame - editFrom;
  const demoActive = parameterDemo && localFrame >= editStart;
  const previousDiameter = [centerDiameter, 26, 10][editIndex];
  const targetDiameter = [26, 10, centerDiameter][editIndex];
  const editingNumber = demoActive && editFrame < 0.7 * fps;
  const deletingNumber = editingNumber && editFrame < 0.28 * fps;
  const displayedNumber = !demoActive ? String(centerDiameter) : deletingNumber
    ? String(previousDiameter).slice(0, Math.max(0, String(previousDiameter).length - Math.floor((editFrame / (0.28 * fps)) * (String(previousDiameter).length + 1))))
    : String(targetDiameter).slice(0, Math.min(String(targetDiameter).length, Math.floor(((editFrame - 0.28 * fps) / (0.42 * fps)) * (String(targetDiameter).length + 1))));
  const animatedDiameter = demoActive ? Math.round(interpolate(editFrame, [0.7 * fps, 1.15 * fps], [previousDiameter, targetDiameter], clamp) * 10) / 10 : centerDiameter;
  const demoGeometry = useMemo(() => createPlateGeometry(animatedDiameter, mountDiameter), [animatedDiameter, mountDiameter]);
  const demoEdges = useMemo(() => new EdgesGeometry(demoGeometry, 25), [demoGeometry]);
  useEffect(() => () => { demoGeometry.dispose(); demoEdges.dispose(); }, [demoGeometry, demoEdges]);
  const typingEnd = continuous ? (index === 0 ? 3.4 : 3.8) * fps : Math.min(3.4 * fps, duration * 0.3);
  const runAt = typingEnd + (continuous ? 0 : 0.7 * fps);
  const modelAt = runAt + (continuous ? 0 : 0.5 * fps);
  const focusAt = modelAt + 0.4 * fps;
  const focusDuration = ((parameterDemo ? editStart : duration) - focusAt) / step.focuses.length;
  const focusIndex = Math.min(step.focuses.length - 1, Math.max(0, Math.floor((localFrame - focusAt) / focusDuration)));
  const focus = demoActive ? { title: editIndex === 0 ? "Aumentando o furo" : editIndex === 1 ? "Diminuindo o furo" : "Voltando ao valor inicial", explanation: `Editamos apenas d: de ${previousDiameter} para ${targetDiameter} mm. O furo acompanha o novo diâmetro; o restante da peça continua igual.`, lines: [5], region: "centerHole" } : props.exploreMode ? { title: "Parâmetros em tempo real", explanation: "Altere centerDiameter e mountDiameter no painel Props. O código e a peça são recompilados juntos pelo OpenSCAD.", lines: [5, 8], region: "centerHole" } : localFrame >= focusAt ? step.focuses[focusIndex] : null;
  const ready = props.exploreMode || (continuous && index > 0) || localFrame >= modelAt;
  const typing = !props.exploreMode && localFrame < typingEnd;
  const compiledAsset = assets[index];
  const previousAsset = continuous && index > 0 && localFrame < modelAt ? assets[index - 1] : null;
  const asset = compiledAsset && demoActive ? { ...compiledAsset, geometry: demoGeometry, edges: demoEdges, centerDiameter: animatedDiameter } : compiledAsset && previousAsset ? { ...compiledAsset, geometry: previousAsset.geometry, edges: previousAsset.edges } : compiledAsset;
  if (!asset) return <AbsoluteFill
    style={{
      background: light.canvas,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: typography.ui,
      fontSize: 27,
      color: accent,
      transformOrigin: "18% 50%",
      translate: "0px 1px"
    }}
  >{error || "Carregando a peça 3D…"}</AbsoluteFill>;
  const visible = props.exploreMode ? asset.code.length : Math.floor(interpolate(localFrame, [0.4 * fps, typingEnd], [0, asset.code.length], clamp));
  const lines = asset.code.split("\n");
  const buildRows = continuous ? getBuildRows(asset.code, index, localFrame, fps) : null;
  const codeRows = buildRows ?? lines.map((source, lineIndex) => ({ source, visible: source.length, cursor: typing && lineIndex === asset.code.slice(0, visible).split("\n").length - 1 }));
  const editedLineIndex = demoActive ? lines.findIndex((line) => /cylinder\(h = 12, d =/.test(line)) : -1;
  const editedParts = editedLineIndex >= 0 ? lines[editedLineIndex].match(/^(.*d = )([\d.]+)(.*)$/) : null;
  const currentLine = buildRows ? Math.max(0, buildRows.findIndex((row) => row.cursor)) : asset.code.slice(0, visible).split("\n").length - 1;
  const rotation = ((frame / fps) * props.rotationSpeed * Math.PI) / 180 - 0.25;
  const ringXs = focus?.region === "mountHoles" ? [-23, 23] : [0];
  const ringRadius = focus?.region === "mountHoles" ? asset.mountDiameter / 2 : asset.centerDiameter / 2;
  let offset = 0;

  const typingSounds = props.exploreMode ? [] : timeline.flatMap((item, stage) => {
    const stepDuration = item.end - item.from;
    const source = assets[stage]?.code ?? "";
    return getTypingSegments(source, stage, fps, continuous, stepDuration).flatMap(({ from, end, characters }, segment) => {
      return Array.from({ length: characters }, (_, character) => ({
        frame: item.from + Math.floor(from + character * (end - from) / Math.max(1, characters)),
        key: `${stage}-${segment}-${character}`,
        volume: 0.018 + ((stage + character) % 3) * 0.003,
      }));
    });
  });
  const renderSounds = props.exploreMode ? [] : timeline.map((item, stage) => ({
    frame: item.from + Math.round((continuous ? (stage === 0 ? 3.4 : 3.8) : Math.min(3.4, props.steps[stage].seconds * 0.3) + 1.2) * fps),
    key: `render-${stage}`,
  }));
  const movementSounds = props.exploreMode ? [] : timeline.slice(1).map((item, transition) => ({
    frame: item.from,
    key: `movement-${transition}`,
  }));
  const finalStepDuration = timeline[timeline.length - 1].end - timeline[timeline.length - 1].from;
  const finalEditStart = finalStepDuration * 0.45;
  const finalEditPeriod = finalStepDuration * 0.2;
  const parameterTypingSounds = props.exploreMode || !props.animateParameters ? [] : Array.from({ length: 3 }, (_, edit) => {
    const from = timeline[timeline.length - 1].from + Math.round(finalEditStart + edit * finalEditPeriod);
    const previous = String([centerDiameter, 26, 10][edit]);
    const target = String([26, 10, centerDiameter][edit]);
    const deleting = Array.from({ length: previous.length }, (_, character) => ({
      frame: from + Math.floor(character * 0.28 * fps / Math.max(1, previous.length)),
      key: `parameter-delete-${edit}-${character}`,
      volume: 0.018 + ((edit + character) % 3) * 0.003,
    }));
    const writing = Array.from({ length: target.length }, (_, character) => ({
      frame: from + Math.round(0.28 * fps) + Math.floor(character * 0.42 * fps / Math.max(1, target.length)),
      key: `parameter-write-${edit}-${character}`,
      volume: 0.018 + ((edit + character + 1) % 3) * 0.003,
    }));
    return [...deleting, ...writing];
  }).flat();
  const parameterSounds = props.exploreMode || !props.animateParameters ? [] : Array.from({ length: 3 }, (_, edit) => ({
    frame: timeline[timeline.length - 1].from + Math.round(finalEditStart + edit * finalEditPeriod + 0.7 * fps),
    key: `parameter-${edit}`,
  }));

  return <AbsoluteFill style={{ background: light.canvas, color: light.text, fontFamily: typography.ui }}>
    {typingSounds.map((sound) => <Audio key={sound.key} name="Digitação" src={soundEffects.key} from={sound.frame} durationInFrames={Math.max(1, Math.round(0.11 * fps))} volume={sound.volume} premountFor={fps} />)}
    {parameterTypingSounds.map((sound) => <Audio key={sound.key} name="Digitação de parâmetro" src={soundEffects.key} from={sound.frame} durationInFrames={Math.max(1, Math.round(0.11 * fps))} volume={sound.volume * 1.4} premountFor={fps} />)}
    {renderSounds.map((sound) => <Audio key={sound.key} name="Compilação" src={soundEffects.render} from={sound.frame} volume={0.18} premountFor={fps} />)}
    {movementSounds.map((sound) => <Audio key={sound.key} name="Transição da peça" src={soundEffects.movement} from={sound.frame} volume={0.11} premountFor={fps} />)}
    {parameterSounds.map((sound) => <Audio key={sound.key} name="Atualização de parâmetro" src={soundEffects.render} from={sound.frame} volume={0.13} premountFor={fps} />)}
    <SocialSafeFrame enabled={props.socialSafeArea}>
    <div style={{ position: "absolute", left: portrait ? 80 : 90, top: portrait ? 100 : 80, width: previewWidth, height: previewHeight, borderRadius: radii.modal, overflow: "hidden", border: `1px solid ${light.line}`, background: light.surface, boxShadow: shadows.card }}>
      <ThreeCanvas width={previewWidth} height={previewHeight} premountFor={fps} shadows camera={{ position: [80, 94, 115], fov: 37, zoom: portrait ? 1.2 : 1.12 }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[60, 100, 50]} intensity={3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-80} shadow-camera-right={80} shadow-camera-top={80} shadow-camera-bottom={-80} shadow-bias={-0.001} />
        <directionalLight position={[-50, 30, -60]} intensity={1.6} color={brandColors.softGray} />
        <gridHelper args={[160, 16, brandColors.line, brandColors.softGray]} position={[0, -5.2, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5.15, 0]} receiveShadow><planeGeometry args={[220, 220]} /><shadowMaterial transparent opacity={0.13} /></mesh>
        <group visible={ready} rotation={[0, rotation, 0]} scale={props.exploreMode || continuous ? 1 : interpolate(localFrame, [modelAt, modelAt + 0.5 * fps], [0.86, 1], clamp)}>
          <mesh geometry={asset.geometry} castShadow receiveShadow><meshStandardMaterial color={props.color} roughness={0.48} metalness={0.16} /></mesh>
          <lineSegments geometry={asset.edges}><lineBasicMaterial color={brandColors.ink} transparent opacity={0.22} /></lineSegments>
          {(focus?.region === "centerHole" || focus?.region === "mountHoles") && ringXs.map((x) => <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 5.25, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[ringRadius, 0.45, 12, 96]} /><meshBasicMaterial color={accent} /></mesh>
            <mesh><cylinderGeometry args={[ringRadius, ringRadius, 14, 48, 1, true]} /><meshBasicMaterial color={accent} transparent opacity={0.19} depthWrite={false} /></mesh>
          </group>)}
          {(focus?.region === "body" || focus?.region === "dimensions") && <mesh><boxGeometry args={[64.8, 10.8, 44.8]} /><meshBasicMaterial color={accent} wireframe transparent opacity={0.7} /></mesh>}
        </group>
      </ThreeCanvas>
      <div style={{ position: "absolute", left: 26, top: 22, display: "flex", alignItems: "center", gap: 10, fontSize: portrait ? 21 : 15, color: light.textMuted }}><span style={{ width: 7, height: 7, borderRadius: 6, background: ready && !updating ? brandColors.success : brandColors.warning }} />{demoActive || continuous && ready ? "Prévia automática · atualização ao editar" : updating ? "Atualizando a geometria…" : ready ? "STL gerado pelo OpenSCAD" : "Aguardando renderização"}</div>
      {!ready && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 15 }}><div style={{ fontSize: 52, color: light.line, fontFamily: typography.mono }}>{"{ }"}</div><div style={{ fontSize: 19, color: light.textMuted }}>O código vira uma peça.</div></div>}
      {ready && <div style={{ position: "absolute", left: 27, right: 27, bottom: 26, display: "flex", justifyContent: "space-between", alignItems: "end" }}>
        <div><div style={{ color: accent, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>PEÇA {String(index + 1).padStart(2, "0")}</div><div style={{ fontFamily: typography.display, fontSize: 24, fontWeight: 800, marginTop: 6 }}>{step.title}</div></div>
        <div style={{ fontFamily: typography.mono, fontSize: 15, color: light.textMuted }}>64 × 44 × 10 mm</div>
      </div>}
      {focus && <div style={{ position: "absolute", top: 58, right: 26, color: light.text, background: light.active, border: `1px solid ${accent}`, borderRadius: radii.field, padding: "8px 13px", fontSize: 14 }}>{focus.region === "centerHole" ? `Furo central · Ø${asset.centerDiameter} mm` : focus.region === "mountHoles" ? `Fixação · 2 × Ø${asset.mountDiameter} mm` : "Volume e dimensões"}</div>}
      {props.exploreMode && <div style={{ position: "absolute", left: 26, bottom: 108, display: "flex", gap: 10, color: light.textMuted, fontSize: 15 }}><span style={{ background: light.surfaceMuted, borderRadius: radii.field, padding: "8px 12px" }}>Central: {asset.centerDiameter} mm</span><span style={{ background: light.surfaceMuted, borderRadius: radii.field, padding: "8px 12px" }}>Fixação: {asset.mountDiameter} mm</span></div>}
      {error && <div style={{ position: "absolute", left: 24, right: 24, top: 104, padding: 16, borderRadius: radii.card, color: brandColors.error, background: brandColors.errorSurface, fontSize: 17 }}>{error}</div>}
    </div>

    <div style={{ position: "absolute", left: portrait ? 80 : 900, top: portrait ? 700 : 80, width: portrait ? 920 : 930, height: portrait ? 1020 : 840, borderRadius: radii.modal, overflow: "hidden", border: `1px solid ${dark.line}`, background: codePalette.background, boxShadow: shadows.card }}>
      <div style={{ height: 62, padding: "0 25px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${dark.line}` }}>
        <span style={{ width: 24, height: 3, borderRadius: 2, background: accent }} />
        <span style={{ font: `16px ${typography.mono}`, color: codePalette.text, marginLeft: 10 }}>{continuous ? "suporte.scad" : step.source.split("/").pop()}</span>
        <div style={{ marginLeft: "auto", color: brandColors.ink, background: accent, borderRadius: radii.button, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, scale: continuous ? 1 : interpolate(localFrame, [runAt - 0.12 * fps, runAt, runAt + 0.15 * fps], [1, 0.94, 1], clamp) }}><span style={{ fontSize: 12 }}>▶</span>{continuous ? "Prévia automática" : ready ? "Renderizado" : "Render · F6"}</div>
      </div>
      <div style={{ padding: "25px 24px", fontFamily: typography.mono, fontSize: portrait ? 27 : 23, lineHeight: portrait ? "43px" : "41px" }}>
        {codeRows.map((row, lineIndex) => {
          const line = row.source;
          const chars = continuous ? row.visible : Math.max(0, Math.min(line.length, visible - offset));
          offset += line.length + 1;
          if (!continuous && lineIndex > currentLine) return null;
          const selected = focus?.lines.includes(lineIndex + 1);
          return <div key={`${index}-${lineIndex}`} style={{ display: "flex", margin: "0 -24px", padding: "0 24px", borderLeft: selected ? `3px solid ${accent}` : "3px solid transparent", background: selected ? dark.active : typing && lineIndex === currentLine ? "rgba(255, 255, 255, 0.03)" : "transparent", opacity: focus && !selected ? 0.36 : 1 }}>
            <span style={{ color: selected ? accent : codePalette.muted, width: 34, flexShrink: 0, marginRight: 22, textAlign: "right" }}>{lineIndex + 1}</span>
            <span style={{ whiteSpace: portrait ? "pre-wrap" : "pre", overflowWrap: portrait ? "anywhere" : "normal", flex: 1, minWidth: 0 }}>{lineIndex === editedLineIndex && editedParts ? <><ScadLine source={editedParts[1]} visible={editedParts[1].length} /><span style={{ color: codePalette.number, background: dark.active, borderRadius: 3 }}>{displayedNumber}<span style={{ display: "inline-block", width: 2, height: 25, verticalAlign: "middle", background: codePalette.number, opacity: editingNumber || Math.floor(localFrame / (0.4 * fps)) % 2 === 0 ? 1 : 0 }} /></span><ScadLine source={editedParts[3]} visible={editedParts[3].length} /></> : <ScadLine source={line} visible={chars} />}{row.cursor && <span style={{ display: "inline-block", width: 2, height: 25, verticalAlign: "middle", background: codePalette.text, opacity: Math.floor(localFrame / (0.35 * fps)) % 2 === 0 ? 1 : 0 }} />}</span>
          </div>;
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 39, borderTop: `1px solid ${dark.line}`, padding: "0 25px", display: "flex", alignItems: "center", justifyContent: "space-between", color: codePalette.muted, fontSize: 13 }}><span>{editingNumber ? "Editando o diâmetro…" : demoActive ? `d = ${targetDiameter} · prévia atualizada` : typing ? "Escrevendo a geometria…" : !ready ? "Compilando o modelo…" : "Malha STL · rotação sincronizada"}</span><span>OpenSCAD</span></div>
      {!props.exploreMode && !continuous && <div style={{ position: "absolute", left: interpolate(localFrame, [typingEnd, runAt - 0.12 * fps], [685, 825], clamp), top: interpolate(localFrame, [typingEnd, runAt - 0.12 * fps], [240, 30], clamp), opacity: interpolate(localFrame, [typingEnd, typingEnd + 0.15 * fps, runAt + 0.2 * fps, runAt + 0.4 * fps], [0, 1, 1, 0], clamp) }}><svg width="25" height="33" viewBox="0 0 25 33"><path d="M2 1v24l6-6 5 12 5-2-5-11h10z" fill="white" stroke="#151419" strokeWidth="1.5" /></svg></div>}
    </div>

    </SocialSafeFrame>
  </AbsoluteFill>;
};
