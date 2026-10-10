import { z } from "zod";
import { zTextarea } from "@remotion/zod-types";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getActiveStep, getTimeline } from "./diagrams/timeline";
import { socialSafeAreaSchema, videoFormatSchema } from "./layout/videoFormat";
import { SocialSafeFrame } from "./layout/SocialSafeFrame";
import { useLayoutEffect, useRef, useState } from "react";
import {
  brandColors,
  brandThemes,
  codePalette,
  radii,
  shadows,
  typography,
} from "./design/brand";

export const flutterWidgetsSchema = z.object({
  videoFormat: videoFormatSchema,
  socialSafeArea: socialSafeAreaSchema,
  title: z.string().min(1).max(70),
  steps: z
    .array(
      z.object({
        title: z.string().min(1).max(65),
        explanation: zTextarea().max(170),
        seconds: z.number().min(2).max(120),
        code: zTextarea(),
        highlightLines: z.array(z.number()),
        screen: z.enum(["scaffold", "listTile", "button"]),
      }),
    )
    .min(1)
    .max(30),
});

export type FlutterWidgetsProps = z.infer<typeof flutterWidgetsSchema>;

const light = brandThemes.light;
const dark = brandThemes.dark;
const ink = light.text;
const muted = light.textMuted;
const accent = light.accent;

type WidgetFocus = {
  label: string;
  explanation: string;
  code: RegExp;
  region: { x: number; y: number; width: number; height: number; radius: number };
};

// Regions use the phone's 384 × 816 logical viewport, before its 0.75 scale.
const widgetFocus: Record<FlutterWidgetsProps["steps"][number]["screen"], WidgetFocus[]> = {
  scaffold: [
    { label: "appBar · barra superior", explanation: "AppBar ocupa o topo da tela. O parâmetro title define o texto que aparece nessa barra.", code: /appBar:|title:/, region: { x: 14, y: 65, width: 356, height: 55, radius: 12 } },
    { label: "body · conteúdo da página", explanation: "body recebe o widget com o conteúdo principal. Aqui, NoteContent monta a nota que você vê na tela.", code: /body:/, region: { x: 14, y: 139, width: 356, height: 326, radius: 16 } },
    { label: "onPressed · nova nota", explanation: "O botão flutuante chama createNote quando recebe um toque. child define o ícone de adicionar.", code: /floatingActionButton:|onPressed:|child:/, region: { x: 296, y: 727, width: 72, height: 72, radius: 24 } },
  ],
  listTile: [
    { label: "leading · ícone da linha", explanation: "leading coloca um widget antes dos textos. Neste exemplo, ele recebe o ícone de notificações.", code: /leading:/, region: { x: 30, y: 197, width: 51, height: 54, radius: 27 } },
    { label: "title e subtitle · textos", explanation: "title é o texto principal da linha. subtitle adiciona uma descrição logo abaixo dele.", code: /title:|subtitle:/, region: { x: 86, y: 203, width: 198, height: 46, radius: 8 } },
    { label: "trailing · controle de estado", explanation: "trailing recebe o Switch no fim da linha. value define seu estado; onChanged responde à mudança.", code: /trailing:|value:|onChanged:/, region: { x: 296, y: 202, width: 62, height: 44, radius: 23 } },
  ],
  button: [
    { label: "child · conteúdo do botão", explanation: "child recebe o conteúdo do botão. O widget Text mostra o rótulo “Salvar nota”.", code: /child:/, region: { x: 121, y: 742, width: 142, height: 31, radius: 8 } },
    { label: "style · aparência", explanation: "styleFrom cria o estilo do botão. backgroundColor define a cor de fundo que aparece aqui.", code: /style:|backgroundColor:/, region: { x: 14, y: 724, width: 356, height: 67, radius: 34 } },
    { label: "onPressed · ação do toque", explanation: "onPressed chama saveNote ao tocar. A confirmação na tela mostra o resultado dessa ação.", code: /onPressed:/, region: { x: 14, y: 724, width: 356, height: 67, radius: 34 } },
  ],
};

// Tokenize the complete source before slicing it so colors stay stable while typing.
const DartLine: React.FC<{ source: string; visible: number }> = ({ source, visible }) => {
  const tokens = source.match(/\/\/.*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|\s+|./g) ?? [];
  let offset = 0;
  return <>{tokens.map((token, i) => {
    const start = offset;
    offset += token.length;
    const remaining = source.slice(offset).trimStart();
    const color = token.startsWith("//") ? codePalette.comment
      : /^['"]/.test(token) ? codePalette.string
      : /^(const|final|var|return|class|void|new|if|else|extends|super|required)$/.test(token) ? codePalette.keyword
      : /^(true|false|null)$/.test(token) ? codePalette.literal
      : /^(0x[\da-fA-F]+|\d+(\.\d+)?)$/.test(token) ? codePalette.number
      : /^[A-Z]/.test(token) ? codePalette.type
      : remaining.startsWith(":") ? codePalette.property
      : remaining.startsWith("(") ? codePalette.function
      : /^[a-zA-Z_]/.test(token) ? codePalette.property : codePalette.text;
    return <span key={i} style={{ color }}>{token.slice(0, Math.max(0, visible - start))}</span>;
  })}</>;
};

const Pointer: React.FC = () => <svg width="27" height="34" viewBox="0 0 27 34" aria-hidden="true" style={{ filter: "drop-shadow(0 2px 3px #00000080)" }}><path d="M3 2v25l6-6 5 11 5-2-5-10h10z" fill="white" stroke="#17151c" strokeWidth="1.8" strokeLinejoin="round" /></svg>;

const PhonePreview: React.FC<{
  screen: "scaffold" | "listTile" | "button";
  localFrame: number;
  runAt: number;
  interactAt: number;
  revealFrames: number;
  focus: WidgetFocus | null;
  focusOpacity: number;
}> = ({ screen, localFrame, runAt, interactAt, revealFrames, focus, focusOpacity }) => {
  const { fps } = useVideoConfig();
  const tapped = localFrame >= interactAt;
  const tapX = screen === "listTile" ? 326 : screen === "button" ? 192 : 332;
  const tapY = screen === "listTile" ? 224 : screen === "button" ? 757 : 761;
  return (
  <div style={{ width: 304, height: 628, borderRadius: 44, position: "relative", background: brandColors.ink, border: `1px solid ${dark.line}`, boxShadow: shadows.card, flexShrink: 0 }}>
    <div style={{ position: "absolute", inset: 3, borderRadius: 41, background: brandColors.ink }} />
    <div style={{ position: "absolute", left: -3, top: 91, width: 3, height: 23, borderRadius: "2px 0 0 2px", background: dark.line }} />
    <div style={{ position: "absolute", left: -3, top: 140, width: 3, height: 43, borderRadius: "2px 0 0 2px", background: dark.line }} />
    <div style={{ position: "absolute", left: -3, top: 197, width: 3, height: 43, borderRadius: "2px 0 0 2px", background: dark.line }} />
    <div style={{ position: "absolute", right: -3, top: 178, width: 3, height: 65, borderRadius: "0 2px 2px 0", background: dark.line }} />
    <div style={{ position: "absolute", inset: 8, borderRadius: 36, overflow: "hidden", background: light.surface }}>
    <div style={{ width: 384, height: 816, scale: "0.75", transformOrigin: "top left", background: light.surface, position: "relative", fontFamily: typography.ui, color: light.text }}>
      <div style={{ height: 58, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 28px", fontSize: 15, fontWeight: 650 }}>
        <span>9:41</span>
        <svg width="57" height="16" viewBox="0 0 57 16" fill="none" aria-hidden="true">
          <path d="M1 12h3v3H1zm5-4h3v7H6zm5-4h3v11h-3zm5-3h3v14h-3z" fill="currentColor" />
          <path d="M23 4c3-3 7-3 10 0m-8 3c2-2 4-2 6 0m-4 3c1-1 1-1 2 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="28" cy="13" r="1" fill="currentColor" />
          <rect x="38" y="3" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" /><rect x="40" y="5" width="10" height="6" rx="1" fill="currentColor" /><path d="M55 6v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: 13, left: 128, width: 128, height: 34, borderRadius: 22, background: brandColors.ink, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 11 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: dark.line, border: `1px solid ${brandColors.ink}` }} />
      </div>
      <div style={{ position: "absolute", inset: "58px 0 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: light.textMuted, gap: 16, opacity: interpolate(localFrame, [runAt, runAt + 0.45 * revealFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <svg width="50" height="60" viewBox="0 0 50 60" aria-hidden="true"><path d="M8 30 36 2h14L15 37z" fill="#42a5f5" /><path d="m22 43 14-14h14L29 50z" fill="#42a5f5" /><path d="m22 43 7 7 10 10h11L29 39z" fill="#1565c0" /></svg>
        <div style={{ color: light.text, fontSize: 18, fontWeight: 700 }}>Pronto para executar</div>
        <div style={{ fontSize: 14 }}>O resultado aparece aqui.</div>
      </div>
      <div style={{ position: "absolute", inset: "58px 0 0", background: light.surface, opacity: interpolate(localFrame, [runAt + 0.25 * revealFrames, runAt + revealFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), translate: `0 ${interpolate(localFrame, [runAt + 0.25 * revealFrames, runAt + revealFrames], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px` }}>
      {screen === "scaffold" && <>
        <div style={{ height: 70, background: light.surface, display: "flex", alignItems: "center", padding: "0 22px", fontSize: 23, fontWeight: 700 }}>Minhas notas</div>
        <div style={{ padding: "23px 22px" }}>
          <div style={{ color: accent, fontSize: 13, fontWeight: 700, letterSpacing: 1.1 }}>QUARTA-FEIRA, 14 DE MAIO</div>
          <div style={{ fontFamily: typography.display, fontSize: 30, lineHeight: 1.12, fontWeight: 800, marginTop: 13 }}>Ideias para<br />o próximo projeto</div>
          <div style={{ height: 1, background: light.line, margin: "23px 0" }} />
          <div style={{ color: light.textMuted, fontSize: 17, lineHeight: 1.55 }}>Uma tela simples começa com uma boa estrutura. Primeiro, organizamos o conteúdo; depois, escolhemos como cada parte se comporta.</div>
          <div style={{ marginTop: 28, color: light.textMuted, fontSize: 14 }}>Editada há 5 minutos</div>
        </div>
        <div style={{ position: "absolute", right: 23, bottom: 26, width: 58, height: 58, borderRadius: radii.button, background: accent, display: "grid", placeItems: "center", color: brandColors.ink, fontSize: 29 }}>＋</div>
      </>}
      {screen === "listTile" && <>
        <div style={{ height: 70, display: "flex", alignItems: "center", padding: "0 22px", fontSize: 23, fontWeight: 600 }}>Configurações</div>
        <div style={{ padding: "10px 16px" }}>
          <div style={{ color: light.textMuted, fontSize: 13, fontWeight: 700, padding: "9px 8px 14px", letterSpacing: 1 }}>PREFERÊNCIAS</div>
          <div style={{ borderRadius: radii.modal, background: light.surfaceMuted, padding: "7px 11px" }}>
            <div style={{ minHeight: 82, display: "flex", alignItems: "center", gap: 14, padding: "0 7px" }}>
              <div style={{ width: 42, height: 42, borderRadius: 50, background: light.active, color: accent, display: "grid", placeItems: "center", flexShrink: 0 }}><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z" strokeLinejoin="round" /><path d="M10 20a2 2 0 0 0 4 0M12 2v2" strokeLinecap="round" /></svg></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>Notificações</div><div style={{ color: light.textMuted, fontSize: 13, marginTop: 4 }}>Novas mensagens</div></div>
              <div style={{ width: 48, height: 28, borderRadius: 20, background: tapped ? accent : light.line, padding: 3, display: "flex", flexShrink: 0 }}><div style={{ width: 22, height: 22, borderRadius: 20, background: brandColors.white, translate: `${interpolate(localFrame, [interactAt, interactAt + 0.2 * fps], [0, 20], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px 0` }} /></div>
            </div>
          </div>
          <div style={{ marginTop: 20, borderRadius: radii.modal, background: light.surfaceMuted, padding: "17px 19px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ color: accent, fontSize: 20 }}>◷</div><div><div style={{ fontSize: 16, fontWeight: 600 }}>Lembretes</div><div style={{ color: light.textMuted, fontSize: 13, marginTop: 4 }}>Organize seu dia</div></div>
          </div>
        </div>
      </>}
      {screen === "button" && <>
        <div style={{ height: 70, display: "flex", alignItems: "center", padding: "0 22px", fontSize: 23, fontWeight: 600 }}>Nova nota</div>
        <div style={{ margin: "12px 20px", border: `1px solid ${light.line}`, borderRadius: radii.field, padding: "12px 13px", color: light.textMuted, fontSize: 13 }}>Título</div>
        <div style={{ margin: "12px 20px", height: 110, border: `1px solid ${light.line}`, borderRadius: radii.field, padding: "12px 13px", color: light.textMuted, fontSize: 13 }}>Escreva sua nota...</div>
        <div style={{ margin: "24px 20px 0", padding: "0 4px", color: light.textMuted, fontSize: 14 }}>Suas ideias ficam salvas neste dispositivo.</div>
        <div style={{ position: "absolute", bottom: 32, left: 20, right: 20, height: 54, borderRadius: radii.button, background: accent, display: "grid", placeItems: "center", color: brandColors.ink, fontWeight: 700, fontSize: 16 }}>{tapped ? "✓  Salvo" : "Salvar nota"}</div>
      </>}
      {tapped && <div style={{ position: "absolute", bottom: screen === "listTile" ? 55 : 108, left: 20, right: 20, background: dark.surface, color: dark.text, padding: "15px 18px", borderRadius: radii.card, fontSize: 14, opacity: interpolate(localFrame, [interactAt, interactAt + 0.2 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{screen === "button" ? "Nota salva com sucesso." : screen === "listTile" ? "Notificações ativadas." : "Nova nota criada."}</div>}
      </div>
      <div style={{ position: "absolute", left: tapX - 28, top: tapY - 28, width: 56, height: 56, borderRadius: "50%", border: `2px solid ${accent}`, background: light.active, opacity: interpolate(localFrame, [interactAt - 0.3 * fps, interactAt, interactAt + 0.55 * fps], [0, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), scale: interpolate(localFrame, [interactAt - 0.3 * fps, interactAt + 0.55 * fps], [0.5, 1.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      {focus && <div style={{ position: "absolute", left: focus.region.x, top: focus.region.y, width: focus.region.width, height: focus.region.height, borderRadius: focus.region.radius, boxSizing: "border-box", border: `3px solid ${accent}`, boxShadow: "0 0 0 1000px rgba(15, 23, 35, 0.42)", opacity: focusOpacity, pointerEvents: "none" }} />}
      <div style={{ position: "absolute", bottom: 9, left: 134, width: 116, height: 4, borderRadius: 5, background: brandColors.ink }} />
    </div>
    </div>
  </div>
);
};

export const FlutterWidgetsLesson: React.FC<FlutterWidgetsProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const timeline = getTimeline(props.steps, fps);
  const index = getActiveStep(timeline, frame);
  const step = props.steps[index];
  const localFrame = frame - timeline[index].from;
  const stepFrames = timeline[index].end - timeline[index].from;
  const typingStart = Math.min(stepFrames * 0.06, 0.6 * fps);
  const typingEnd = Math.min(stepFrames * 0.4, 4 * fps);
  const runAt = typingEnd + Math.min(stepFrames * 0.08, 0.8 * fps);
  const revealFrames = Math.min(0.55 * fps, stepFrames * 0.055);
  const focusStart = runAt + revealFrames + stepFrames * 0.025;
  const focuses = widgetFocus[step.screen];
  const focusDuration = (stepFrames * 0.98 - focusStart) / focuses.length;
  const focusIndex = Math.min(focuses.length - 1, Math.max(0, Math.floor((localFrame - focusStart) / focusDuration)));
  const focus = localFrame >= focusStart ? focuses[focusIndex] : null;
  const focusFrom = focusStart + focusIndex * focusDuration;
  const focusOpacity = interpolate(localFrame, [focusFrom, focusFrom + Math.min(0.18 * fps, focusDuration * 0.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const interactAt = focusStart + 2 * focusDuration + stepFrames * 0.04;
  const visibleChars = Math.floor(interpolate(localFrame, [typingStart, typingEnd], [0, step.code.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const typing = localFrame < typingEnd;
  const running = localFrame >= runAt && localFrame < runAt + revealFrames;
  const appReady = localFrame >= runAt + revealFrames;
  const lines = step.code.split("\n");
  const currentLine = step.code.slice(0, visibleChars).split("\n").length - 1;
  const firstFocusedLine = focus ? lines.findIndex((line) => focus.code.test(line)) : -1;
  const codeRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [focusedRowY, setFocusedRowY] = useState(99);
  // Wrapped code takes more than one row on mobile. Measure the real line's
  // center so the connector continues pointing to the highlighted parameter.
  useLayoutEffect(() => {
    const row = codeRowRefs.current[firstFocusedLine];
    if (row) setFocusedRowY(row.offsetTop + row.offsetHeight / 2);
  }, [firstFocusedLine, step.code, portrait]);
  let lineOffset = 0;
  const reveal = interpolate(localFrame, [0, 0.35 * fps], [0, 1], { extrapolateRight: "clamp" });

  return <AbsoluteFill style={{ background: light.canvas, color: ink, fontFamily: typography.ui }}>
    <SocialSafeFrame enabled={props.socialSafeArea}>
    <div style={{ position: "absolute", left: portrait ? 80 : 94, top: portrait ? 100 : 52, display: "flex", alignItems: "center", gap: 14, color: accent, letterSpacing: 2.1, fontSize: portrait ? 24 : 16, fontWeight: 700 }}><span style={{ width: portrait ? 40 : 32, height: 3, borderRadius: 2, background: accent }} />FLUTTER  /  MATERIAL 3</div>
    <div style={{ position: "absolute", left: portrait ? 80 : 90, right: portrait ? 80 : 90, top: portrait ? 158 : 86, display: "flex", alignItems: "end", justifyContent: "space-between" }}>
      <h1 style={{ margin: 0, fontFamily: typography.display, fontSize: portrait ? 72 : 62, lineHeight: 1.1, letterSpacing: -1.8, fontWeight: 800 }}>{props.title}</h1>
      {!portrait && <div style={{ color: muted, fontSize: 18, paddingBottom: 8 }}>INTERFACE À ESQUERDA <span style={{ color: light.line, margin: "0 10px" }}>·</span> CÓDIGO À DIREITA</div>}
    </div>

    <div style={{ position: "absolute", left: portrait ? 80 : 90, top: portrait ? 310 : 194, width: portrait ? 920 : 1740, height: portrait ? 1280 : 648, display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", justifyContent: "center", gap: portrait ? 30 : 52 }}>
      <div style={{ width: portrait ? 920 : 700, height: 648, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <PhonePreview screen={step.screen} localFrame={localFrame} runAt={runAt} interactAt={interactAt} revealFrames={revealFrames} focus={focus} focusOpacity={focusOpacity} />
      </div>
      <div style={{ width: portrait ? 920 : 986, height: portrait ? 602 : 648, flexShrink: 0, borderRadius: radii.modal, overflow: "hidden", border: `1px solid ${dark.line}`, background: codePalette.background, boxShadow: shadows.card, position: "relative" }}>
        <div style={{ height: 62, display: "flex", alignItems: "center", padding: "0 27px", borderBottom: `1px solid ${dark.line}`, gap: 9 }}>
          <span style={{ width: 24, height: 3, borderRadius: 2, background: accent }} />
          <span style={{ marginLeft: 10, color: codePalette.text, font: `15px ${typography.mono}` }}>main.dart</span>
          <span style={{ marginLeft: "auto", color: codePalette.muted, fontSize: 13 }}>Dart</span>
          <div style={{ marginLeft: 16, width: 116, height: 34, borderRadius: radii.button, background: accent, color: brandColors.ink, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, scale: interpolate(localFrame, [runAt - 0.12 * fps, runAt, runAt + 0.15 * fps], [1, 0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <svg width="13" height="14" viewBox="0 0 13 14" fill="currentColor" aria-hidden="true"><path d="M2 1v12l10-6z" /></svg>{appReady ? "Running" : "Run"}
          </div>
        </div>
        <div style={{ padding: "19px 24px", fontFamily: typography.mono, fontSize: portrait ? 27 : 19, lineHeight: "36px", color: codePalette.text }}>
          {lines.map((line, lineIndex) => {
            const available = Math.max(0, Math.min(line.length, visibleChars - lineOffset));
            lineOffset += line.length + 1;
            if (lineIndex > currentLine) return null;
            const highlighted = !typing && (focus ? focus.code.test(line) : step.highlightLines.includes(lineIndex + 1));
            return <div key={`${index}-${lineIndex}`} ref={(row) => { codeRowRefs.current[lineIndex] = row; }} style={{ display: "flex", margin: "0 -24px", padding: "0 24px", background: highlighted ? dark.active : typing && lineIndex === currentLine ? "rgba(255, 255, 255, 0.03)" : "transparent", opacity: focus && !highlighted ? 0.35 : !typing && step.highlightLines.length && !highlighted ? 0.65 : 1, borderLeft: highlighted ? `3px solid ${accent}` : "3px solid transparent" }}>
              <span style={{ width: 42, flexShrink: 0, color: highlighted ? accent : codePalette.muted, textAlign: "right", marginRight: 21, userSelect: "none" }}>{lineIndex + 1}</span>
              <span style={{ whiteSpace: portrait ? "pre-wrap" : "pre", overflowWrap: portrait ? "anywhere" : "normal", flex: 1, minWidth: 0 }}><DartLine source={line} visible={available} />{typing && lineIndex === currentLine && <span style={{ display: "inline-block", height: 23, width: 2, verticalAlign: "middle", background: codePalette.text, opacity: Math.floor(localFrame / (fps * 0.35)) % 2 === 0 ? 1 : 0 }} />}</span>
            </div>;
          })}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 38, borderTop: `1px solid ${dark.line}`, padding: "0 26px", display: "flex", alignItems: "center", gap: 10, color: codePalette.muted, fontSize: 13 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: appReady ? brandColors.success : brandColors.warning }} />{typing ? "Escrevendo o widget…" : running ? "Executando no iPhone…" : appReady ? "App atualizado" : "Código pronto · executar"}<span style={{ marginLeft: "auto" }}>Ln {currentLine + 1}  ·  UTF-8  ·  Dart</span></div>
        <div style={{ position: "absolute", left: interpolate(localFrame, [typingEnd, runAt - 0.15 * fps], [portrait ? 700 : 765, portrait ? 830 : 897], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), top: interpolate(localFrame, [typingEnd, runAt - 0.15 * fps], [210, 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), opacity: interpolate(localFrame, [typingEnd, typingEnd + 0.1 * fps, runAt + 0.2 * fps, runAt + 0.45 * fps], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}><Pointer /></div>
      </div>
      {focus && firstFocusedLine >= 0 && <svg width={portrait ? 920 : 1740} height={portrait ? 1280 : 648} viewBox={portrait ? "0 0 920 1280" : "0 0 1740 648"} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none", opacity: focusOpacity }} aria-hidden="true">
        <path d={portrait ? `M ${316 + (focus.region.x + focus.region.width) * 0.75} ${18 + (focus.region.y + focus.region.height / 2) * 0.75} C 940 ${18 + (focus.region.y + focus.region.height / 2) * 0.75}, 940 ${678 + focusedRowY}, 916 ${678 + focusedRowY}` : `M ${206 + (focus.region.x + focus.region.width) * 0.75} ${18 + (focus.region.y + focus.region.height / 2) * 0.75} C 590 ${18 + (focus.region.y + focus.region.height / 2) * 0.75}, 625 ${focusedRowY}, 753 ${focusedRowY}`} fill="none" stroke={accent} strokeWidth="1.8" strokeDasharray="5 6" />
        <circle cx={portrait ? 916 : 753} cy={(portrait ? 678 : 0) + focusedRowY} r="4" fill={accent} />
      </svg>}
    </div>

    <div style={{ position: "absolute", left: portrait ? 80 : 94, right: portrait ? 80 : 94, top: portrait ? 1615 : 868, display: "flex", flexDirection: portrait ? "column" : "row", gap: portrait ? 10 : 22, alignItems: "flex-start", opacity: reveal }}>
      <div style={{ color: accent, fontSize: 16, letterSpacing: 1, fontWeight: 700, paddingTop: 5 }}>{String(index + 1).padStart(2, "0")} / {String(props.steps.length).padStart(2, "0")}</div>
      <div style={{ width: portrait ? "100%" : 345, fontFamily: typography.display, fontSize: portrait ? 38 : 25, lineHeight: 1.2, fontWeight: 800 }}>{focus?.label ?? step.title}</div>
      <div style={{ display: portrait ? "none" : "block", width: 1, height: 56, background: light.line }} />
      <div style={{ color: light.textMuted, fontSize: portrait ? 28 : 21, lineHeight: 1.4, maxWidth: 1000 }}>{focus?.explanation ?? step.explanation}</div>
    </div>
    </SocialSafeFrame>
  </AbsoluteFill>;
};
