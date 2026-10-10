import React, { useMemo } from "react";
import Brazil from "@svg-maps/brazil";
import { Audio } from "@remotion/media";
import { zColor } from "@remotion/zod-types";
import { z } from "zod";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Box2, Color } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { comparisonReveal, currentComparison, mapCamera, stateFocus } from "./maps/motion";
import { socialSafeAreaSchema, videoFormatSchema } from "./layout/videoFormat";
import { SocialSafeFrame } from "./layout/SocialSafeFrame";
import { soundTheme } from "./design/sound";
import {
  brandColors,
  brandThemes,
  motion,
  radii,
  shadows,
  typography,
} from "./design/brand";

const light = brandThemes.light;
const mapSounds = {
  sceneMovement: soundTheme.entry,
  stateMovement: soundTheme.focus,
  settle: soundTheme.settle,
  tick: soundTheme.progress,
  overview: soundTheme.overview,
  complete: soundTheme.complete,
} as const;

const stateIds = ["ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms", "mg", "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "sp", "se", "to"] as const;

export const brazilStatesSchema = z.object({
  videoFormat: videoFormatSchema,
  socialSafeArea: socialSafeAreaSchema,
  title: z.string().max(55),
  metric: z.string().max(45),
  unit: z.string().max(20),
  dataNote: z.string().max(110),
  elevation: z.number().min(0).max(2),
  stateScale: z.number().min(1).max(1.18),
  zoom: z.number().min(1).max(2.5).describe("Zoom máximo no estado destacado"),
  comparisons: z.array(z.object({
    state: z.enum(stateIds),
    value: z.number().min(0).max(999999),
    color: zColor(),
  })).length(3).refine((items) => new Set(items.map((item) => item.state)).size === 3, "Escolha três estados diferentes"),
});

type Props = z.infer<typeof brazilStatesSchema>;

const buildStates = () => {
  const loader = new SVGLoader();
  return Brazil.locations.map((location) => {
    const parsed = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${location.path}" /></svg>`);
    const shapes = parsed.paths.flatMap((path) => SVGLoader.createShapes(path));
    // Parse only the vectors to locate each state's own scale origin.
    // No WebGL renderer, GPU context, texture or triangulated mesh is created.
    const bounds = new Box2().setFromPoints(shapes.flatMap((shape) => shape.getPoints(2)));
    const center = bounds.min.clone().add(bounds.max).multiplyScalar(0.5);
    return {
      ...location,
      center,
      width: bounds.max.x - bounds.min.x,
      height: bounds.max.y - bounds.min.y,
    };
  });
};

const MapPieces: React.FC<Props> = (props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const seconds = frame / fps;
  const states = useMemo(buildStates, []);
  const overview = comparisonReveal(seconds);
  const maximum = Math.max(1, ...props.comparisons.map((item) => item.value));
  const camera = mapCamera(seconds, props.comparisons.map((item) => {
    const state = states.find((entry) => entry.id === item.state)!;
    return { x: state.center.x, y: state.center.y, width: state.width, height: state.height };
  }), props.zoom, props.elevation, props.stateScale);

  const pieces = states.map((state) => {
    const index = props.comparisons.findIndex((item) => item.state === state.id);
    const item = props.comparisons[index];
    const focus = index < 0 ? 0 : stateFocus(seconds, index);
    const lift = index < 0 ? 0 : props.elevation * Math.max(focus, overview * item.value / maximum);
    const scale = 1 + (props.stateScale - 1) * focus;
    const color = new Color(brandColors.line).lerp(new Color(item?.color ?? brandColors.line), Math.max(focus, overview));
    return { ...state, lift, scale, color, selected: index >= 0 && Math.max(focus, overview) > 0.3 };
  }).sort((first, second) => first.lift - second.lift);
  const zoom = interpolate(seconds, [0, 1.8], [0.96, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0.2, 1) }) * camera.zoom;

  return (
    <svg width={portrait ? 940 : 1100} height={portrait ? 690 : 760} viewBox="0 0 1100 760" style={{ position: "absolute", left: portrait ? 70 : 55, top: portrait ? 425 : 220, overflow: "visible" }} aria-label="Comparação entre estados do Brasil">
      <defs>
        <clipPath id="map-viewport"><rect x={35} y={15} width={1030} height={710} rx={24} /></clipPath>
        <filter id="map-ground-shadow" x="-30%" y="-30%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" /></filter>
        <filter id="map-piece-shadow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      {/* Orthographic 2.5D projection: tilt compresses Y, height moves upward.
          Thickness is drawn as vector layers; all output is ordinary SVG. */}
      <g clipPath="url(#map-viewport)">
      <g transform={`translate(540 380) scale(${1.1 * zoom}) rotate(-2.6) scale(1 0.87) translate(${-camera.x} ${-camera.y})`}>
        <g transform="translate(7 13)" fill={brandColors.ink} opacity={0.12} filter="url(#map-ground-shadow)">{states.map((state) => <path key={state.id} d={state.path} />)}</g>
        <g fill={brandColors.muted} opacity={0.28}>{states.map((state) => <path key={state.id} d={state.path} />)}</g>
        {pieces.map((state) => (
          <g key={state.id}>
            {state.lift > 0 && <path d={state.path} transform={`translate(${8 * state.lift} ${11 * state.lift})`} fill={brandColors.ink} opacity={0.12} filter="url(#map-piece-shadow)" />}
            <g transform={`translate(0 ${-45 * state.lift}) translate(${state.center.x} ${state.center.y}) scale(${state.scale * 0.992}) translate(${-state.center.x} ${-state.center.y})`}>
              {[7, 5, 3, 1].map((depth) => <path key={depth} d={state.path} transform={`translate(0 ${depth})`} fill={`#${state.color.clone().multiplyScalar(0.65).getHexString()}`} stroke={`#${state.color.clone().multiplyScalar(0.65).getHexString()}`} strokeWidth={0.7} />)}
              <path d={state.path} fill={`#${state.color.getHexString()}`} stroke={brandColors.white} strokeWidth={state.selected ? 1.4 : 0.8} strokeLinejoin="round" />
              {(!["df", "es", "rj", "al", "se", "pb", "rn"].includes(state.id) || state.selected) && <text x={state.center.x} y={state.center.y} textAnchor="middle" dominantBaseline="central" fontSize={state.selected ? 15 : 11} fontWeight={700} fill={state.selected ? brandColors.white : brandColors.muted}>{state.id.toUpperCase()}</text>}
            </g>
          </g>
        ))}
      </g>
      </g>
    </svg>
  );
};

export const BrazilStates: React.FC<Props> = (props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const seconds = frame / fps;
  const active = currentComparison(seconds);
  const item = props.comparisons[active];
  const total = props.comparisons.reduce((sum, entry) => sum + entry.value, 0);
  const maximum = Math.max(1, ...props.comparisons.map((entry) => entry.value));
  const name = item ? Brazil.locations.find((state) => state.id === item.state)!.name : "Três estados, lado a lado";
  const count = item ? Math.round(interpolate(seconds, [3 + active * 6, 4.2 + active * 6], [0, item.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0.2, 1) })) : total;
  const stateEntries = [3, 9, 15].map((second, index) => ({ frame: Math.round(second * fps), key: `state-entry-${index}` }));
  const stateSettles = [4, 10, 16].map((second, index) => ({ frame: Math.round(second * fps), key: `state-settle-${index}` }));
  const counterTicks = [3, 9, 15].flatMap((second, state) => Array.from({ length: 6 }, (_, tick) => ({
    frame: Math.round((second + tick * 0.2) * fps),
    key: `counter-${state}-${tick}`,
    volume: 0.01 + ((state + tick) % 2) * 0.003,
  })));
  return (
    <AbsoluteFill style={{ backgroundColor: light.canvas, color: light.text, fontFamily: typography.ui }}>
      <Audio name="Entrada do mapa" src={mapSounds.sceneMovement} from={0} volume={0.07} premountFor={fps} />
      {stateEntries.map((sound) => <Audio key={sound.key} name="Aproximação do estado" src={mapSounds.stateMovement} from={sound.frame} volume={0.075} premountFor={fps} />)}
      {stateSettles.map((sound) => <Audio key={sound.key} name="Estado em destaque" src={mapSounds.settle} from={sound.frame} volume={0.13} premountFor={fps} />)}
      {counterTicks.map((sound) => <Audio key={sound.key} name="Contagem do valor" src={mapSounds.tick} from={sound.frame} durationInFrames={Math.max(1, Math.round(0.1 * fps))} volume={sound.volume} premountFor={fps} />)}
      <Audio name="Comparação final" src={mapSounds.overview} from={21 * fps} volume={0.1} premountFor={fps} />
      <Audio name="Mapa consolidado" src={mapSounds.complete} from={Math.round(22.4 * fps)} volume={0.12} premountFor={fps} />
      <SocialSafeFrame enabled={props.socialSafeArea}>
      <Interactive.Div name="Série" style={{ position: "absolute", left: portrait ? 80 : 90, top: portrait ? 105 : 64, display: "flex", alignItems: "center", gap: 14, fontSize: portrait ? 24 : 18, fontWeight: 700, letterSpacing: 2.4, color: light.accent }}><span style={{ width: portrait ? 40 : 32, height: 3, borderRadius: 2, background: light.accent }} />BRASIL / DADOS EM PERSPECTIVA</Interactive.Div>
      <Interactive.Div name="Título" style={{ position: "absolute", left: portrait ? 80 : 88, right: portrait ? 80 : undefined, top: portrait ? 165 : 111, fontFamily: typography.display, fontSize: portrait ? 86 : 78, lineHeight: 1.04, letterSpacing: -2.4, fontWeight: 800, opacity: interpolate(frame, [0, motion.baseSeconds * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{props.title}</Interactive.Div>
      <div style={{ position: "absolute", left: portrait ? 60 : 45, top: portrait ? 410 : 205, width: portrait ? 960 : 1120, height: portrait ? 700 : 755, borderRadius: radii.modal, background: light.surface, border: `1px solid ${light.line}`, boxShadow: shadows.card }} />
      <MapPieces {...props} />
      <div style={{ position: "absolute", left: portrait ? 80 : 1190, top: portrait ? 1125 : 240, width: portrait ? 920 : 640, height: portrait ? 730 : undefined, boxSizing: "border-box", padding: portrait ? 32 : 36, borderRadius: radii.modal, background: light.surface, border: `1px solid ${light.line}`, boxShadow: shadows.card }}>
        <Interactive.Div name="Métrica" style={{ fontSize: portrait ? 26 : 20, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, color: light.textMuted }}>{props.metric}</Interactive.Div>
        <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 15 }}>
          <div style={{ width: 12, height: 12, borderRadius: 12, backgroundColor: item?.color ?? light.accent }} />
          <div style={{ fontFamily: typography.display, fontSize: portrait ? 40 : 36, fontWeight: 800 }}>{name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 12 }}>
          <div style={{ fontFamily: typography.display, fontSize: portrait ? 112 : 122, fontWeight: 800, letterSpacing: -5, color: item?.color ?? light.text, fontVariantNumeric: "tabular-nums" }}>{count.toLocaleString("pt-BR")}</div>
          <div style={{ fontSize: portrait ? 32 : 25, color: light.textMuted }}>{props.unit}</div>
        </div>
        <div style={{ fontSize: portrait ? 28 : 22, color: light.textMuted, marginTop: 5, marginBottom: portrait ? 35 : 40 }}>{active < 0 ? "Total dos três estados neste exemplo." : `${total > 0 ? Math.round(item.value / total * 100) : 0}% do total dos três estados.`}</div>
        {props.comparisons.map((entry, index) => {
          const reveal = interpolate(seconds, [1 + index * 0.25, 2.3 + index * 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0.2, 1) });
          return (
            <div key={entry.state} style={{ marginBottom: 26, opacity: active < 0 || active === index ? 1 : 0.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: portrait ? 31 : 25, marginBottom: 11 }}>
                <span>{entry.state.toUpperCase()} · {Brazil.locations.find((state) => state.id === entry.state)!.name}</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{Math.round(entry.value * reveal).toLocaleString("pt-BR")}</span>
              </div>
              <div style={{ height: 8, backgroundColor: light.surfaceMuted, borderRadius: 4 }}><div style={{ width: `${entry.value / maximum * reveal * 100}%`, height: 8, backgroundColor: entry.color, borderRadius: 4 }} /></div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: portrait ? 80 : 90, top: portrait ? 366 : undefined, bottom: portrait ? undefined : 83, width: portrait ? 920 : undefined, fontSize: portrait ? 25 : 21, color: light.textMuted }}>
        {seconds < 3 ? "Um território, diferentes resultados." : seconds >= 21 ? "Elevação proporcional aos valores · mesma base de comparação" : "Destaque do estado · elevação em Z + escala + zoom suave"}
      </div>
      <Interactive.Div name="Nota dos dados" style={{ position: "absolute", left: portrait ? 112 : undefined, right: portrait ? 112 : 100, bottom: portrait ? 115 : 83, width: portrait ? 856 : 610, textAlign: portrait ? "left" : "right", fontSize: portrait ? 24 : 21, color: light.textMuted }}>{props.dataNote}</Interactive.Div>
      <div style={{ position: "absolute", left: portrait ? 112 : 90, bottom: portrait ? 80 : 38, fontSize: portrait ? 18 : 16, color: light.textMuted }}>Mapa: MapSVG / @svg-maps/brazil · CC BY 4.0 · projeção vetorial 2.5D</div>
      </SocialSafeFrame>
    </AbsoluteFill>
  );
};
