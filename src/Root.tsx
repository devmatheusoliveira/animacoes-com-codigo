import {
  AbsoluteFill,
  Composition,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {OfficeScene} from "./OfficeScene/OfficeScene";
import { z } from "zod";
import { zTextarea } from "@remotion/zod-types";
import { MermaidDiagram } from "./diagrams/MermaidDiagram";
import { themes } from "./diagrams/themes";
import { getTimeline, getActiveStep } from "./diagrams/timeline";
import { OpenScadLesson, openScadSchema } from "./OpenScadLesson";
import { BrazilStates, brazilStatesSchema } from "./BrazilStates";
import { portraitMermaid, socialSafeAreaSchema, videoDimensions, videoFormatSchema } from "./layout/videoFormat";
import { SocialSafeFrame } from "./layout/SocialSafeFrame";
import {
  FlutterWidgetsLesson,
  flutterWidgetsSchema,
} from "./FlutterWidgets";
import {
  motion,
  radii,
  shadows,
  typography,
} from "./design/brand";

export const lessonSchema = z.object({
  videoFormat: videoFormatSchema,
  socialSafeArea: socialSafeAreaSchema,
  title: z.string().min(1).max(65),
  subtitle: z.string().max(120),
  series: z.string().max(50),
  mermaid: zTextarea(),
  theme: z.enum(["light", "dark"]),
  steps: z
    .array(
      z.object({
        title: z.string().min(1).max(65),
        explanation: zTextarea().max(170),
        seconds: z.number().min(2).max(120),
        focusNodes: z.array(z.string()),
      }),
    )
    .min(1)
    .max(30),
});

export type LessonProps = z.infer<typeof lessonSchema>;

export const DiagramLesson: React.FC<LessonProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const timeline = getTimeline(props.steps, fps);
  const index = getActiveStep(timeline, frame);
  const step = props.steps[index];
  const theme = themes[props.theme];
  const localFrame = frame - timeline[index].from;
return (
    <AbsoluteFill
      style={{
        background: theme.background,
        color: theme.text,
        fontFamily: typography.ui,
      }}
    >
      <SocialSafeFrame enabled={props.socialSafeArea}>
      <div
        style={{
          position: "absolute",
          left: portrait ? 80 : 90,
          top: portrait ? 105 : 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: theme.accent,
          fontSize: portrait ? 25 : 17,
          letterSpacing: 1.8,
          fontWeight: 650,
        }}
      >
        <span
          style={{
            width: portrait ? 40 : 32,
            height: 3,
            background: theme.accent,
            borderRadius: 2,
          }}
        />
        {props.series}
      </div>
      <div
        style={{
          position: "absolute",
          left: portrait ? 80 : 90,
          right: portrait ? 80 : 90,
          top: portrait ? 165 : 106,
          opacity: interpolate(frame, [0, motion.baseSeconds * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `0 ${interpolate(frame, [0, motion.baseSeconds * fps], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px`,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: typography.display,
            fontSize: portrait ? 78 : props.title.length > 38 ? 64 : 76,
            lineHeight: 1.1,
            fontWeight: typography.weight.extrabold,
            letterSpacing: -2.1,
          }}
        >
          {props.title}
        </h1>
        <p style={{ margin: portrait ? "20px 0 0" : "13px 0 0", fontSize: portrait ? 36 : 27, lineHeight: 1.3, color: theme.muted }}>
          {props.subtitle}
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          left: portrait ? 80 : 90,
          right: portrait ? 80 : 90,
          top: portrait ? 450 : 275,
          height: portrait ? 850 : 535,
          border: `1px solid ${theme.border}`,
          borderRadius: radii.modal,
          background: theme.surface,
          boxShadow: props.theme === "dark" ? "none" : shadows.card,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: "28px 50px" }}>
          <MermaidDiagram
            source={portrait ? portraitMermaid(props.mermaid) : props.mermaid}
            themeName={props.theme}
            focusNodes={step.focusNodes}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: portrait ? 80 : 90,
          right: portrait ? 80 : 90,
          top: portrait ? 1380 : 850,
          display: "flex",
          flexDirection: portrait ? "column" : "row",
          gap: 25,
          alignItems: "flex-start",
          opacity: interpolate(localFrame, [0, motion.baseSeconds * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `0 ${interpolate(localFrame, [0, motion.baseSeconds * fps], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px`,
        }}
      >
        <div
          style={{
            border: `1px solid ${theme.accent}`,
            color: theme.accent,
            width: 46,
            height: 46,
            borderRadius: 23,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
        <div
          style={{
            width: portrait ? "100%" : 405,
            flexShrink: 0,
            fontSize: portrait ? 44 : 32,
            fontFamily: typography.display,
            fontWeight: typography.weight.extrabold,
            lineHeight: 1.25,
            letterSpacing: -0.4,
          }}
        >
          {step.title}
        </div>
        <div
          style={{
            width: 1,
            display: portrait ? "none" : "block",
            minHeight: 70,
            background: theme.border,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontSize: portrait ? 36 : 27,
            lineHeight: 1.38,
            color: theme.muted,
            maxWidth: 1030,
          }}
        >
          {step.explanation}
        </div>
      </div>
      </SocialSafeFrame>
    </AbsoluteFill>
  );
};

export const RemotionRoot = () => (
    <>
      <Composition
        id="OfficeScene3D"
        component={OfficeScene}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
      />
    <Composition
      id="ConsultaAoBanco"
      component={DiagramLesson}
      schema={lessonSchema}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={900}
      defaultProps={{
        videoFormat: "horizontal",
        socialSafeArea: false,
        title: "O caminho de uma consulta",
        subtitle: "Da tela que você abre até os dados que chegam de volta.",
        series: "BANCO DE DADOS  /  01",
        theme: "light",
        mermaid:
          "flowchart LR\n  APP[Aplicação]\n  API[Servidor]\n  DB[(Banco de dados)]\n  APP --> API\n  API --> DB\n  DB --> API\n  API --> APP",
        steps: [
          {
            title: "Tudo começa na tela.",
            explanation:
              "Quando você abre uma tela, a aplicação pede as informações que precisa para montá-la.",
            seconds: 5,
            focusNodes: [],
          },
          {
            title: "O pedido chega ao servidor.",
            explanation:
              "O servidor recebe o pedido, confere as regras e decide quais dados buscar.",
            seconds: 6,
            focusNodes: ["APP", "API"],
          },
          {
            title: "O banco procura os dados.",
            explanation:
              "O servidor envia uma consulta. O banco encontra os registros e os devolve ao servidor.",
            seconds: 6,
            focusNodes: ["API", "DB"],
          },
          {
            title: "A informação volta para você.",
            explanation:
              "O servidor organiza o resultado e responde à aplicação. A tela se atualiza com os dados.",
            seconds: 5,
            focusNodes: ["DB", "API", "APP"],
          },
        ],
      }}
      calculateMetadata={({ props }) => ({
        ...videoDimensions(props.videoFormat),
        durationInFrames: getTimeline(props.steps, 30).slice(-1)[0].end,
      })}
    />
    <Composition
      id="Relacionamentos"
      component={DiagramLesson}
      schema={lessonSchema}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={900}
      defaultProps={{
        videoFormat: "vertical" as const,
        socialSafeArea: false,
        title: "O mapa de uma compra",
        subtitle: "Do cliente até os produtos do pedido.",
        series: "BANCO DE DADOS  /  02",
        theme: "light" as const,
        mermaid: "flowchart LR\n  PESSOA[Clientes]\n  PEDIDO[Pedidos]\n  ITENS[Itens do pedido]\n  CATALOGO[Catálogo de produtos]\n  PESSOA --> PEDIDO\n  PEDIDO --> ITENS\n  ITENS --> CATALOGO",
        steps: [{
          title: "O que conecta uma compra?",
          explanation: "Vamos acompanhar como o cliente se conecta aos produtos escolhidos em um pedido.",
          seconds: 5,
          focusNodes: [],
        }, {
          title: "Tudo começa com o cliente.",
          explanation: "Um cliente pode fazer vários pedidos. Cada pedido fica ligado a quem fez a compra.",
          seconds: 5,
          focusNodes: ["PESSOA", "PEDIDO"],
        }, {
          title: "O pedido reúne os itens.",
          explanation: "Cada pedido pode reunir vários itens. Cada item representa uma das escolhas daquela compra.",
          seconds: 6,
          focusNodes: ["PEDIDO", "ITENS"],
        }, {
          title: "Cada item aponta para um produto.",
          explanation: "O item aponta para um produto do catálogo. Assim, os dados do produto ficam em um único lugar.",
          seconds: 6,
          focusNodes: ["ITENS", "CATALOGO"],
        }, {
          title: "Tudo conectado, sem repetição.",
          explanation: "As relações juntam as informações quando precisamos delas, mantendo cada grupo com seu próprio papel.",
          seconds: 5,
          focusNodes: [],
        }],
      }}
      calculateMetadata={({ props }) => ({
        ...videoDimensions(props.videoFormat),
        durationInFrames: getTimeline(props.steps, 30).slice(-1)[0].end,
      })}
    />
    <Composition
      id="FlutterWidgets"
      component={FlutterWidgetsLesson}
      schema={flutterWidgetsSchema}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={900}
      defaultProps={{
        videoFormat: "vertical" as const,
        socialSafeArea: false,
        title: "Widgets que montam uma tela",
        steps: [{
          title: "Scaffold dá forma à tela.",
          explanation: "Ele organiza as áreas principais do app. O AppBar define o topo; o body recebe o conteúdo da página.",
          seconds: 14,
          screen: "scaffold" as const,
          highlightLines: [1, 2, 3, 4, 5, 6, 7, 8],
          code: "Scaffold(\n  appBar: AppBar(\n    title: const Text('Minhas notas'),\n  ),\n  body: const NoteContent(),\n  floatingActionButton: FloatingActionButton(\n    onPressed: createNote,\n    child: const Icon(Icons.add),\n  ),\n)",
        }, {
          title: "ListTile organiza uma linha.",
          explanation: "leading, title e trailing organizam a linha. No Switch, value define o estado e onChanged responde ao toque.",
          seconds: 14,
          screen: "listTile" as const,
          highlightLines: [2, 3, 4, 5, 6, 7, 8],
          code: "Card(\n  child: ListTile(\n    leading: const Icon(Icons.notifications_outlined),\n    title: const Text('Notificações'),\n    subtitle: const Text('Novas mensagens'),\n    trailing: Switch(\n      value: enabled,\n      onChanged: onChanged,\n    ),\n  ),\n)",
        }, {
          title: "FilledButton destaca uma ação.",
          explanation: "onPressed define o que acontece ao tocar. Se receber null, o botão fica desabilitado; child é seu conteúdo.",
          seconds: 14,
          screen: "button" as const,
          highlightLines: [1, 2, 3, 4, 5, 6],
          code: "FilledButton(\n  onPressed: saveNote,\n  style: FilledButton.styleFrom(\n    backgroundColor: Color(0xFF18C7E6),\n  ),\n  child: const Text('Salvar nota'),\n)",
        }],
      }}
      calculateMetadata={({ props }) => ({
        ...videoDimensions(props.videoFormat),
        durationInFrames: getTimeline(props.steps, 30).slice(-1)[0].end,
      })}
    />
    <Composition
      id="OpenSCAD"
      component={OpenScadLesson}
      schema={openScadSchema}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={1440}
      defaultProps={{
        videoFormat: "vertical" as const,
        socialSafeArea: false,
        title: "Uma peça 3D, escrita em código",
        color: "#18C7E6",
        rotationSpeed: 9,
        centerDiameter: 18,
        mountDiameter: 6,
        exploreMode: false,
        animateParameters: true,
        continuousBuild: true,
        steps: [{
          title: "Começamos com um bloco.",
          seconds: 14,
          source: "models/openscad/01-bloco.scad",
          model: "models/openscad/01-bloco.stl",
          focuses: [{
            title: "cube · paralelepípedo",
            explanation: "cube cria o volume inicial. A lista recebe as medidas nos eixos X, Y e Z.",
            lines: [3],
            region: "body" as const,
          }, {
            title: "Parâmetros · medidas",
            explanation: "64, 44 e 10 definem largura, profundidade e altura da peça, em milímetros.",
            lines: [3],
            region: "dimensions" as const,
          }, {
            title: "center · origem",
            explanation: "center = true centraliza o bloco na origem. Isso facilita posicionar os furos depois.",
            lines: [3],
            region: "body" as const,
          }],
        }, {
          title: "Abrimos o furo central.",
          seconds: 14,
          source: "models/openscad/02-furo.scad",
          model: "models/openscad/02-furo.stl",
          focuses: [{
            title: "difference · subtração",
            explanation: "difference mantém o primeiro sólido e remove os seguintes. O cilindro recorta o bloco.",
            lines: [3, 4, 5],
            region: "centerHole" as const,
          }, {
            title: "cylinder · diâmetro",
            explanation: "d = 18 define o furo. h = 12 atravessa o bloco de 10 mm, evitando faces coincidentes.",
            lines: [5],
            region: "centerHole" as const,
          }, {
            title: "$fn · resolução",
            explanation: "$fn = 96 divide a circunferência em 96 segmentos. Mais segmentos deixam o contorno mais suave.",
            lines: [1, 5],
            region: "centerHole" as const,
          }],
        }, {
          title: "Adicionamos a fixação.",
          seconds: 20,
          source: "models/openscad/03-suporte.scad",
          model: "models/openscad/03-suporte.stl",
          focuses: [{
            title: "for · repetição",
            explanation: "for repete o corte para cada valor de x. Com -23 e 23, criamos dois furos simétricos.",
            lines: [6],
            region: "mountHoles" as const,
          }, {
            title: "translate · posição",
            explanation: "translate desloca o cilindro no eixo X. Os eixos Y e Z continuam na origem.",
            lines: [7],
            region: "mountHoles" as const,
          }, {
            title: "cylinder · fixação",
            explanation: "Cada cilindro tem 6 mm de diâmetro. difference remove esse volume e conclui a peça.",
            lines: [3, 8],
            region: "mountHoles" as const,
          }],
        }],
      }}
      calculateMetadata={({ props }) => ({
        ...videoDimensions(props.videoFormat),
        durationInFrames: getTimeline(props.steps, 30).slice(-1)[0].end,
      })}
    />
    <Composition
      id="OpenSCADPlayground"
      component={OpenScadLesson}
      schema={openScadSchema}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={1800}
      defaultProps={{
        videoFormat: "horizontal",
        socialSafeArea: false,
        title: "Brinque com as medidas",
        color: "#18C7E6",
        rotationSpeed: 9,
        centerDiameter: 18,
        mountDiameter: 6,
        exploreMode: true,
        animateParameters: false,
        continuousBuild: false,
        steps: [
          {
            title: "Suporte paramétrico",
            seconds: 60,
            source: "models/openscad/03-suporte.scad",
            model: "models/openscad/03-suporte.stl",
            focuses: [
              { title: "Parâmetros em tempo real", explanation: "Altere os diâmetros no painel Props para atualizar a peça.", lines: [5, 8], region: "centerHole" },
            ],
          },
        ],
      }}
      calculateMetadata={({ props }) => ({
        ...videoDimensions(props.videoFormat),
        durationInFrames: getTimeline(props.steps, 30).slice(-1)[0].end,
      })}
    />
    <Composition
      id="BrasilEstados"
      component={BrazilStates}
      schema={brazilStatesSchema}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={780}
      defaultProps={{
        videoFormat: "horizontal" as const,
        socialSafeArea: false,
        title: "Estados em perspectiva",
        metric: "Projetos concluídos",
        unit: "projetos",
        dataNote: "Dados fictícios · exemplo de comparação",
        elevation: 1.05,
        stateScale: 1.08,
        zoom: 1.75,
        comparisons: [{
          state: "sp" as const,
          value: 120,
          color: "#18C7E6",
        }, {
          state: "mg" as const,
          value: 84,
          color: "#0F1723",
        }, {
          state: "ba" as const,
          value: 56,
          color: "#61707F",
        }],
      }}
      calculateMetadata={({ props }) => videoDimensions(props.videoFormat)}
    />
</>
);
