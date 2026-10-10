import React, { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { VSMShadowMap, ACESFilmicToneMapping, Vector3 } from "three";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { RefinedOffice } from "./OfficeModels";

const palette = {
  ink: "#333c36",
  cream: "#f3eee4",
  orange: "#bd8769",
};

type CameraBeat = {
  seconds: number;
  position: [number, number, number];
  target: [number, number, number];
};

// A continuous shot: establish, follow, lower to the chair, reveal the lid,
// then pull back. Each beat is timed to the character's frame-driven actions.
const cameraBeats: CameraBeat[] = [
  { seconds: 0, position: [8.1, 5.1, 9.3], target: [0, 0, 0] },
  { seconds: 2.2, position: [7.8, 4.7, 8.8], target: [0.15, 0.45, 0] },
  { seconds: 5.65, position: [5.7, 2.9, 4.3], target: [2.1, 1.15, 0.4] },
  { seconds: 7.35, position: [5.1, 2.35, 3.15], target: [2.25, 1, 0.3] },
  { seconds: 9.3, position: [4.1, 2.25, 1.55], target: [2.5, 1.35, -0.28] },
  { seconds: 9.85, position: [4.02, 2.22, 1.48], target: [2.5, 1.35, -0.28] },
  { seconds: 11.97, position: [5.25, 2.8, 3.25], target: [2.3, 1.08, 0] },
];

const getCameraVector = (
  frame: number,
  fps: number,
  property: "position" | "target",
) => {
  const times = cameraBeats.map((beat) => beat.seconds * fps);
  const axis = (index: number) =>
    interpolate(
      frame,
      times,
      cameraBeats.map((beat) => beat[property][index]),
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      },
    );
  return new Vector3(axis(0), axis(1), axis(2));
};

const CameraRig: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  // Canvas camera options initialize the camera; they do not animate the
  // existing instance. Apply the frame pose before ThreeCanvas renders it.
  useLayoutEffect(() => {
    camera.position.copy(getCameraVector(frame, fps, "position"));
    camera.lookAt(getCameraVector(frame, fps, "target"));
    camera.updateMatrixWorld();
    invalidate();
  }, [camera, frame, fps, invalidate]);

  return null;
};

const Overlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const reveal = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const titleOpacity =
    reveal *
    interpolate(frame, [1.8 * fps, 2.8 * fps], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        color: palette.ink,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 55,
          left: 66,
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 21,
          fontWeight: 700,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          opacity: titleOpacity,
        }}
      >
        <span
          style={{
            width: 52,
            height: 52,
            border: `2px solid ${palette.ink}`,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 16,
          }}
        >
          MS
        </span>
        Morning Shift
      </div>

      <div
        style={{
          position: "absolute",
          left: 82,
          top: 228,
          width: 690,
          opacity: titleOpacity,
          transform: `translateY(${interpolate(reveal, [0, 1], [34, 0])}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 15,
            color: "rgba(24,33,31,.62)",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 3.6,
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          <span style={{ width: 50, height: 2, background: palette.orange }} />
          Um pequeno ritual diário
        </div>
        <div
          style={{
            fontSize: 104,
            lineHeight: 0.9,
            letterSpacing: -7,
            fontWeight: 600,
          }}
        >
          Começar é
          <br />
          <span
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              color: palette.cream,
            }}
          >
            abrir espaço.
          </span>
        </div>
        <p
          style={{
            width: 470,
            marginTop: 38,
            color: "rgba(24,33,31,.65)",
            fontSize: 20,
            lineHeight: 1.55,
          }}
        >
          Uma manhã tranquila no estúdio. Um passo de cada vez, até a primeira
          ideia ganhar luz.
        </p>
      </div>
    </AbsoluteFill>
  );
};

export const OfficeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#b5c1bb" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows={{ type: VSMShadowMap }}
        style={{ position: "absolute", inset: 0 }}
        camera={{
          position: [8.1, 5.1, 9.3],
          fov: 38,
        }}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <CameraRig frame={frame} fps={fps} />
        <color attach="background" args={["#b5c1bb"]} />
        <fog attach="fog" args={["#b5c1bb", 12, 24]} />
        <ambientLight intensity={0.5} color="#fff5e8" />
        <hemisphereLight args={["#e1e8ea", "#a49480", 0.95]} />
        <directionalLight
          position={[-3.5, 7, 4]}
          intensity={2.6}
          color="#ffefce"
          castShadow
          shadow-radius={12}
          shadow-blurSamples={16}
          shadow-bias={-0.00015}
          shadow-normalBias={0.03}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={24}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        <directionalLight
          position={[5, 4, -3]}
          color="#dce7e6"
          intensity={1.15}
        />
        <pointLight
          position={[2, 4, 2]}
          color="#ffe8cf"
          intensity={4}
          distance={7}
          decay={2}
        />
        <RefinedOffice frame={frame} fps={fps} />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 60% 42%, transparent 40%, rgba(63,49,36,0.12) 100%)",
        }}
      />
      <Overlay frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
