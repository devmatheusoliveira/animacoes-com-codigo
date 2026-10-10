import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  getRemotionEnvironment,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { themes, type ThemeName } from "./themes";
import {radii, typography} from "../design/brand";

type Props = { source: string; themeName: ThemeName; focusNodes: string[] };
type DiagramResult = { svg: string; nodeIds: string[] };

// Mermaid has global configuration. Serialize configuration + rendering so
// concurrent compositions cannot accidentally use one another's theme.
let renderQueue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Promise<DiagramResult>>();

const renderDiagram = (source: string, themeName: ThemeName, id: string) => {
  const key = `${id}:${themeName}:${source}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const result = renderQueue
    .catch(() => undefined)
    .then(async () => {
      const { default: mermaid } = await import("mermaid");
      const theme = themes[themeName];
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        suppressErrorRendering: true,
        deterministicIds: true,
        deterministicIDSeed: "diagram-lesson",
        theme: "base",
        look: "classic",
        htmlLabels: false,
        fontFamily: typography.ui,
        themeVariables: {
          darkMode: themeName === "dark",
          background: theme.surface,
          primaryColor: theme.node,
          primaryTextColor: theme.text,
          primaryBorderColor: theme.nodeBorder,
          lineColor: theme.line,
          secondaryColor: theme.active,
          tertiaryColor: theme.node,
          edgeLabelBackground: theme.surface,
          fontSize: "24px",
          textColor: theme.text,
          nodeTextColor: theme.text,
          mainBkg: theme.node,
          nodeBorder: theme.nodeBorder,
          attributeBackgroundColorOdd: theme.surface,
          attributeBackgroundColorEven: theme.node,
        },
        flowchart: {
          curve: "linear",
          nodeSpacing: 60,
          rankSpacing: 85,
          padding: 30,
          useMaxWidth: false,
        },
        er: {
          useMaxWidth: false,
          fontSize: 22,
          minEntityWidth: 190,
          entityPadding: 18,
        },
      });
      await document.fonts.ready;
      const { svg } = await mermaid.render(id, source);
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      const root = doc.documentElement;
      root.setAttribute("width", "100%");
      root.setAttribute("height", "100%");
      root.setAttribute("preserveAspectRatio", "xMidYMid meet");
      root.setAttribute("style", "max-width:none;width:100%;height:100%");
      root
        .querySelectorAll<SVGRectElement>("g.edgeLabel rect.background")
        .forEach((rect) => {
          rect.style.fill = themes[themeName].surface;
          rect.style.stroke = "none";
          rect.style.opacity = "0.96";
          rect.setAttribute("rx", String(radii.field));
        });
      root
        .querySelectorAll<SVGRectElement>(
          "g.node rect.basic, g.node rect.label-container",
        )
        .forEach((rect) => {
          rect.setAttribute("rx", String(radii.card));
          rect.setAttribute("ry", String(radii.card));
        });
      const nodeIds: string[] = [];
      root
        .querySelectorAll<SVGGElement>("g.node, g.entity")
        .forEach((node, index) => {
          const unscoped = node.id.startsWith(`${id}-`)
            ? node.id.slice(id.length + 1)
            : node.id;
          const nodeId = unscoped
            .replace(/^(flowchart-|entity-)/, "")
            .replace(/-\d+$/, "");
          node.dataset.nodeId = nodeId;
          node.dataset.reveal = String(index);
          nodeIds.push(nodeId);
        });
      return { svg: new XMLSerializer().serializeToString(root), nodeIds };
    });
  renderQueue = result;
  cache.set(key, result);
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  result.catch(() => cache.delete(key));
  return result;
};

export const MermaidDiagram: React.FC<Props> = ({
  source,
  themeName,
  focusNodes,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reactId = useId();
  const id = `mermaid${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const ref = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<DiagramResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = themes[themeName];
  const focusKey = focusNodes.join("\u0000");

  useEffect(() => {
    let active = true;
    let finished = false;
    const handle = delayRender("Preparando diagrama Mermaid", {
      timeoutInMilliseconds: 60000,
    });
    const release = () => {
      if (!finished) {
        continueRender(handle);
        finished = true;
      }
    };
    setError(null);
    setResult(null);
    renderDiagram(source, themeName, id)
      .then((next) => {
        if (active) setResult(next);
        release();
      })
      .catch((cause: unknown) => {
        if (active) {
          const message =
            cause instanceof Error ? cause.message : String(cause);
          setError(message);
          if (getRemotionEnvironment().isRendering)
            cancelRender(new Error(`Mermaid: ${message}`));
        }
        release();
      });
    return () => {
      active = false;
      release();
    };
  }, [source, themeName, id]);

  // Seeking updates frame-derived styles without regenerating the SVG layout.
  const markup = useMemo(() => ({ __html: result?.svg ?? "" }), [result]);
  useLayoutEffect(() => {
    if (!ref.current || !result) return;
    const focus = focusKey ? focusKey.split("\u0000") : [];
    ref.current
      .querySelectorAll<SVGGElement>("[data-node-id]")
      .forEach((node) => {
        const selected =
          focus.length === 0 || focus.includes(node.dataset.nodeId ?? "");
        const reveal = interpolate(
          frame,
          [
            Number(node.dataset.reveal) * fps * 0.1,
            (Number(node.dataset.reveal) * 0.1 + 0.5) * fps,
          ],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        node.style.opacity = String(reveal * (selected ? 1 : 0.76));
        node.style.filter = "none";
        node
          .querySelectorAll<SVGElement>(".label-container, .basic, .entityBox")
          .forEach((shape) => {
            shape.style.stroke =
              selected && focus.length > 0 ? theme.accent : theme.nodeBorder;
            shape.style.strokeWidth =
              selected && focus.length > 0 ? "2px" : "1.5px";
            if (
              shape.classList.contains("label-container") ||
              shape.classList.contains("basic")
            ) {
              shape.style.fill =
                selected && focus.length > 0 ? theme.active : theme.node;
            }
          });
      });
    ref.current
      .querySelectorAll<SVGPathElement>(
        "path.flowchart-link, path.relationshipLine",
      )
      .forEach((path, i) => {
        const reveal = interpolate(
          frame,
          [(0.3 + i * 0.08) * fps, (1 + i * 0.08) * fps],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        path.setAttribute("pathLength", "1");
        path.style.strokeDasharray = "1";
        path.style.strokeDashoffset = String(1 - reveal);
        path.style.strokeWidth = "2px";
        path.style.opacity = "0.85";
      });
  }, [result, frame, fps, focusKey, theme]);

  const unknown = result
    ? focusNodes.filter((node) => !result.nodeIds.includes(node))
    : [];
  if (error)
    return (
      <div
        role="alert"
        style={{
          padding: 35,
          color: theme.text,
          background: theme.node,
          borderRadius: radii.modal,
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <strong style={{ fontSize: 28 }}>Revise o código Mermaid</strong>
        <pre
          style={{
            fontSize: 20,
            whiteSpace: "pre-wrap",
            maxHeight: 290,
            overflow: "auto",
          }}
        >
          {error}
        </pre>
      </div>
    );
  return (
    <>
      <div
        ref={ref}
        data-testid="mermaid-diagram"
        style={{ width: "100%", height: "100%" }}
        dangerouslySetInnerHTML={markup}
      />
      {unknown.length > 0 && !getRemotionEnvironment().isRendering ? (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            fontSize: 17,
            color: theme.accent,
          }}
        >
          IDs não encontrados: {unknown.join(", ")}
        </div>
      ) : null}
    </>
  );
};
