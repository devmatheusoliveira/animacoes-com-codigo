import React, { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  Vector3,
  Quaternion,
  DataTexture,
  RGBAFormat,
  RepeatWrapping,
} from "three";
import {
  getCharacterPose,
  LAPTOP_POSITION,
  LAPTOP_SCALE,
  TORSO_PIVOT,
  DESK_POSITION,
  CHAIR_POSITION,
} from "./CharacterRig";

type V3 = [number, number, number];
const C = {
  wood: "#b99476",
  cream: "#eee7db",
  dark: "#3d4844",
  green: "#8a9b8d",
  shirt: "#b78065",
  skin: "#d9ac8c",
  hair: "#43362e",
  pants: "#525b60",
};
const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const SoftBox: React.FC<
  ThreeElements["mesh"] & {
    size: V3;
    radius?: number;
    color: string;
    roughness?: number;
    metalness?: number;
  }
> = ({
  size,
  radius = 0.06,
  color,
  roughness = 0.7,
  metalness = 0,
  ...props
}) => {
  const [width, height, depth] = size;
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        width,
        height,
        depth,
        5,
        Math.min(
          radius,
          width / 2 - 0.001,
          height / 2 - 0.001,
          depth / 2 - 0.001,
        ),
      ),
    [width, height, depth, radius],
  );
  return (
    <mesh {...props} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  );
};
const Ellipsoid: React.FC<{
  position?: V3;
  scale: V3;
  color: string;
  rotation?: V3;
  roughness?: number;
}> = ({ position, scale, color, rotation, roughness = 0.78 }) => (
  <mesh
    position={position}
    scale={scale}
    rotation={rotation}
    castShadow
    receiveShadow
  >
    <sphereGeometry args={[1, 40, 32]} />
    <meshStandardMaterial color={color} roughness={roughness} />
  </mesh>
);

const Segment: React.FC<{ a: V3; b: V3; radius: number; color: string }> = ({
  a,
  b,
  radius,
  color,
}) => {
  const start = new Vector3(...a);
  const end = new Vector3(...b);
  const delta = end.clone().sub(start);
  const quaternion = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    delta.clone().normalize(),
  );
  return (
    <mesh
      position={start.add(end).multiplyScalar(0.5)}
      quaternion={quaternion}
      castShadow
      receiveShadow
    >
      <capsuleGeometry
        args={[radius, Math.max(0.001, delta.length() - radius * 2), 10, 24]}
      />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  );
};

const Plant: React.FC<{ position: V3; scale?: number }> = ({
  position,
  scale = 1,
}) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.29, 0.22, 0.6, 48]} />
      <meshStandardMaterial color="#d0b19c" roughness={0.92} />
    </mesh>
    <mesh position={[0, 0.606, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.263, 40]} />
      <meshStandardMaterial color="#544336" />
    </mesh>
    {Array.from({ length: 9 }, (_, i) => {
      const angle = i * 2.4;
      const length = 0.45 + (i % 3) * 0.16;
      const x = Math.cos(angle) * 0.22;
      const z = Math.sin(angle) * 0.22;
      return (
        <group key={i}>
          <Segment
            a={[0, 0.57, 0]}
            b={[x, 0.95 + length * 0.5, z]}
            radius={0.018}
            color="#66715b"
          />
          <Ellipsoid
            position={[x, 0.95 + length * 0.5, z]}
            scale={[0.12, length * 0.52, 0.042]}
            rotation={[Math.sin(angle) * 0.52, angle, Math.cos(angle) * 0.5]}
            color={i % 2 ? "#78916f" : "#536f5b"}
          />
        </group>
      );
    })}
  </group>
);

const Desk: React.FC = () => {
  const wood = useMemo(() => {
    const n = 128;
    const data = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v =
          230 +
          Math.sin(y * 0.5 + Math.sin(x * 0.025) * 2) * 3 +
          Math.sin(y * 2.8 + x * 0.03);
        const k = (y * n + x) * 4;
        data[k] = v;
        data[k + 1] = v - 7;
        data[k + 2] = v - 15;
        data[k + 3] = 255;
      }
    const t = new DataTexture(data, n, n, RGBAFormat);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(2, 2);
    t.needsUpdate = true;
    return t;
  }, []);
  const top = useMemo(
    () => new RoundedBoxGeometry(3.5, 0.18, 1.5, 6, 0.087),
    [],
  );
  return (
    <group position={DESK_POSITION} scale={[1, 0.82, 1]}>
      <mesh geometry={top} position={[0, 1.17, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.wood} map={wood} roughness={0.54} />
      </mesh>
      {[-1.42, 1.42].flatMap((x) =>
        [-0.48, 0.48].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, 0.56, z]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.055, 0.085, 1.13, 32]} />
            <meshStandardMaterial
              color="#727972"
              roughness={0.5}
              metalness={0.3}
            />
          </mesh>
        )),
      )}
      <group position={[-1.15, 1.28, -0.09]}>
        <mesh position={[0, 0.13, 0]} castShadow>
          <cylinderGeometry args={[0.135, 0.115, 0.25, 40]} />
          <meshStandardMaterial color="#e6d6c1" roughness={0.37} />
        </mesh>
        <mesh position={[0, 0.257, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.112, 32]} />
          <meshStandardMaterial color="#533a2a" />
        </mesh>
        <mesh position={[0.14, 0.14, 0]}>
          <torusGeometry args={[0.083, 0.021, 12, 32]} />
          <meshStandardMaterial color="#e6d6c1" roughness={0.37} />
        </mesh>
      </group>
      <SoftBox
        position={[1.17, 1.3, -0.15]}
        size={[0.52, 0.07, 0.67]}
        color="#889a8c"
        radius={0.022}
      />
      <SoftBox
        position={[1.17, 1.355, -0.15]}
        size={[0.46, 0.04, 0.61]}
        color="#e6dfd1"
        radius={0.014}
      />
      <group position={[1.35, 1.35, -0.48]}>
        <Segment
          a={[-0.18, 0, 0]}
          b={[0.18, 0, 0]}
          radius={0.017}
          color="#74624d"
        />
      </group>
    </group>
  );
};

const Chair: React.FC = () => (
  <group position={CHAIR_POSITION} rotation={[0, Math.PI, 0]}>
    <SoftBox
      position={[0, 0.78, 0]}
      rotation={[-0.1, 0, 0]}
      size={[1.03, 0.94, 0.23]}
      radius={0.113}
      color={C.green}
    />
    <SoftBox
      position={[0, 0.33, 0.3]}
      size={[1.06, 0.21, 0.9]}
      radius={0.104}
      color="#7e9183"
    />
    <Segment
      a={[0, 0.13, 0.25]}
      b={[0, 0.27, 0.25]}
      radius={0.047}
      color="#828783"
    />
    {Array.from({ length: 5 }, (_, i) => {
      const a = (i * Math.PI * 2) / 5;
      const x = Math.cos(a) * 0.47;
      const z = 0.25 + Math.sin(a) * 0.47;
      return (
        <group key={i}>
          <Segment
            a={[0, 0.12, 0.25]}
            b={[x, 0.085, z]}
            radius={0.031}
            color="#656d68"
          />
          <Ellipsoid
            position={[x, 0.055, z]}
            scale={[0.068, 0.055, 0.068]}
            color="#39413e"
          />
        </group>
      );
    })}
  </group>
);

const angleAt = (opening: number) => mix(Math.PI / 2, -0.15, opening);
const Laptop: React.FC<{ opening: number }> = ({ opening }) => (
  <group position={LAPTOP_POSITION} scale={LAPTOP_SCALE}>
    <SoftBox
      size={[1.28, 0.065, 0.84]}
      radius={0.03}
      color="#b7baba"
      metalness={0.55}
      roughness={0.3}
    />
    {Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 10 }, (_, c) => (
        <SoftBox
          key={`${r}-${c}`}
          position={[-0.48 + c * 0.106, 0.038, -0.21 + r * 0.09]}
          size={[0.083, 0.012, 0.06]}
          radius={0.005}
          color="#555f60"
        />
      )),
    )}
    <SoftBox
      position={[0, 0.038, 0.24]}
      size={[0.32, 0.007, 0.17]}
      radius={0.003}
      color="#99a1a0"
    />
    <group position={[0, 0.055, -0.38]} rotation={[angleAt(opening), 0, 0]}>
      <SoftBox
        position={[0, 0.4, 0]}
        size={[1.28, 0.8, 0.042]}
        radius={0.019}
        color="#b7baba"
        roughness={0.3}
        metalness={0.55}
      />
      <SoftBox
        position={[0, 0.4, 0.026]}
        size={[1.17, 0.69, 0.01]}
        radius={0.004}
        color="#313c3d"
      />
      <mesh position={[0, 0.405, 0.032]}>
        <planeGeometry args={[1.1, 0.61]} />
        <meshStandardMaterial
          color="#e1e8e5"
          emissive="#bdcec9"
          emissiveIntensity={opening * 0.25}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[-0.37, 0.405, 0.033]}>
        <planeGeometry args={[0.21, 0.61]} />
        <meshBasicMaterial color="#748e84" />
      </mesh>
      {[0.57, 0.46, 0.35, 0.24].map((y, i) => (
        <mesh key={y} position={[0.08, y, 0.034]}>
          <planeGeometry args={[i === 0 ? 0.67 : 0.52, 0.032]} />
          <meshBasicMaterial color={i === 0 ? "#bc8d75" : "#a1b4ae"} />
        </mesh>
      ))}
    </group>
  </group>
);

const Leg: React.FC<{
  x: number;
  swing: number;
  phase: number;
  walking: number;
  sitting: number;
}> = ({ x, swing, phase, walking, sitting }) => (
  <group position={[x, 0.92, 0]} rotation={[swing + sitting * 1.3, 0, 0]}>
    <Segment a={[0, 0, 0]} b={[0, -0.43, 0]} radius={0.122} color={C.pants} />
    <group
      position={[0, -0.42, 0]}
      rotation={[
        -Math.max(0, Math.sin(phase)) * 0.44 * walking - sitting * 1.3,
        0,
        0,
      ]}
    >
      <Ellipsoid scale={[0.104, 0.109, 0.104]} color={C.pants} />
      <Segment a={[0, 0, 0]} b={[0, -0.36, 0]} radius={0.098} color={C.pants} />
      <SoftBox
        position={[0, -0.375, -0.062]}
        size={[0.23, 0.135, 0.39]}
        radius={0.065}
        color="#dedbd1"
      />
      <SoftBox
        position={[0, -0.426, -0.062]}
        size={[0.24, 0.046, 0.4]}
        radius={0.021}
        color="#eeeae0"
      />
    </group>
  </group>
);

const Character: React.FC<{ seconds: number; opening: number }> = ({
  seconds,
  opening,
}) => {
  const {
    progress,
    walk,
    phase,
    sitting,
    rootY,
    rootZ,
    action,
    lean,
    sway,
    yaw,
    leftArm,
    rightArm,
  } = getCharacterPose(seconds, opening);
  return (
    <group
      position={[
        mix(-4.25, 2.25, progress),
        rootY + Math.abs(Math.sin(phase)) * 0.022 * walk,
        rootZ,
      ]}
      rotation={[0, yaw, 0]}
    >
      <Leg
        x={-0.16}
        swing={sway}
        phase={phase}
        walking={walk}
        sitting={sitting}
      />
      <Leg
        x={0.16}
        swing={-sway}
        phase={phase + Math.PI}
        walking={walk}
        sitting={sitting}
      />
      <Ellipsoid
        position={[0, 0.96, 0]}
        scale={[0.28, 0.21, 0.185]}
        color={C.pants}
      />
      <group
        position={[0, TORSO_PIVOT, 0]}
        rotation={[lean, 0, Math.sin(phase) * 0.014 * walk]}
      >
        <group position={[0, -TORSO_PIVOT, 0]}>
          <Ellipsoid
            position={[0, 1.36, 0]}
            scale={[0.35, 0.46, 0.235]}
            color={C.shirt}
          />
          <Ellipsoid
            position={[0, 1.69, 0]}
            scale={[0.29, 0.095, 0.195]}
            color={C.shirt}
          />
          <Segment
            a={[0, 1.66, 0]}
            b={[0, 1.85, 0]}
            radius={0.107}
            color={C.skin}
          />
          <mesh position={[0, 1.727, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.122, 0.027, 12, 40]} />
            <meshStandardMaterial color="#a7735c" roughness={0.9} />
          </mesh>
          <group position={[0, 1.99, 0]} rotation={[action * 0.15, 0, 0]}>
            <Ellipsoid
              scale={[0.255, 0.325, 0.235]}
              color={C.skin}
              roughness={0.6}
            />
            <Ellipsoid
              position={[0, 0.174, 0.045]}
              scale={[0.265, 0.18, 0.235]}
              color={C.hair}
            />
            <Ellipsoid
              position={[-0.11, 0.21, -0.105]}
              scale={[0.17, 0.092, 0.18]}
              rotation={[0, 0, -0.18]}
              color={C.hair}
            />
            <Ellipsoid
              position={[0, -0.02, -0.239]}
              scale={[0.051, 0.072, 0.05]}
              color={C.skin}
            />
            {[-1, 1].map((side) => (
              <group key={side}>
                <Ellipsoid
                  position={[side * 0.252, 0.015, 0.01]}
                  scale={[0.043, 0.072, 0.038]}
                  color={C.skin}
                />
                <Ellipsoid
                  position={[side * 0.092, 0.04, -0.218]}
                  scale={[0.019, 0.025, 0.012]}
                  color="#443b35"
                />
                <Ellipsoid
                  position={[side * 0.094, 0.09, -0.21]}
                  scale={[0.04, 0.011, 0.012]}
                  color={C.hair}
                />
              </group>
            ))}
          </group>
          {[leftArm, rightArm].map((arm, index) => (
            <group key={index}>
              <Segment
                a={arm.shoulder.toArray() as V3}
                b={arm.elbow.toArray() as V3}
                radius={0.094}
                color={C.shirt}
              />
              <Ellipsoid
                position={arm.elbow.toArray() as V3}
                scale={[0.076, 0.076, 0.076]}
                color={C.shirt}
              />
              <Segment
                a={arm.elbow.toArray() as V3}
                b={arm.wrist.toArray() as V3}
                radius={0.073}
                color={C.shirt}
              />
              <group
                position={arm.wrist}
                quaternion={new Quaternion().setFromUnitVectors(
                  new Vector3(0, -1, 0),
                  arm.wrist.clone().sub(arm.elbow).normalize(),
                )}
              >
                <Ellipsoid scale={[0.07, 0.093, 0.058]} color={C.skin} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};

export const RefinedOffice: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const seconds = frame / fps;
  const opening = smooth((seconds - 8.2) / 1.4);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial color="#d6ccbb" roughness={0.92} />
      </mesh>
      <SoftBox
        position={[0, 2.7, -4.05]}
        size={[14, 5.4, 0.18]}
        color="#e7e0d3"
        radius={0.08}
      />
      <SoftBox
        position={[-5.52, 2.7, 0]}
        size={[0.18, 5.4, 8.2]}
        color="#e2ddcf"
        radius={0.08}
      />
      <SoftBox
        position={[0, 0.105, -3.88]}
        size={[13.8, 0.21, 0.08]}
        color="#d0c6b7"
        radius={0.035}
      />
      <group position={[-5.41, 2.75, -0.45]} rotation={[0, Math.PI / 2, 0]}>
        <SoftBox size={[5.1, 3.1, 0.055]} radius={0.026} color="#c6d5d2" />
        {[-2.6, 0, 2.6].map((x) => (
          <SoftBox
            key={x}
            position={[x, 0, 0.05]}
            size={[0.075, 3.2, 0.07]}
            radius={0.03}
            color="#abae9f"
          />
        ))}
        <SoftBox
          position={[0, 0, 0.045]}
          size={[5.25, 0.075, 0.07]}
          radius={0.03}
          color="#abae9f"
        />
        <SoftBox
          position={[0, -1.63, 0.04]}
          size={[5.4, 0.15, 0.25]}
          radius={0.065}
          color={C.cream}
        />
      </group>
      <group position={[-2.85, 2.16, -3.8]}>
        <SoftBox size={[3.05, 0.12, 0.52]} radius={0.055} color={C.wood} />
        {[-1, 0.8].map((x) => (
          <SoftBox
            key={x}
            position={[x, -0.12, -0.12]}
            size={[0.08, 0.3, 0.2]}
            radius={0.035}
            color="#8a8e82"
          />
        ))}
        {[-0.98, -0.75, -0.51].map((x, i) => (
          <SoftBox
            key={x}
            position={[x, 0.3, 0]}
            rotation={[0, 0, i === 2 ? -0.09 : 0]}
            size={[0.18, 0.49 + i * 0.04, 0.32]}
            radius={0.025}
            color={["#bfa181", "#e3dac7", "#99a594"][i]}
          />
        ))}
        <Plant position={[0.8, 0.06, 0]} scale={0.5} />
      </group>
      {[1.2, 3.05].map((x, i) => (
        <group key={x} position={[x, 2.85, -3.9]}>
          <SoftBox size={[1.32, 1.65, 0.07]} radius={0.03} color="#c9b69c" />
          <SoftBox
            position={[0, 0, 0.04]}
            size={[1.2, 1.52, 0.018]}
            radius={0.008}
            color="#e8e0cf"
          />
          <mesh position={[0.1, 0.16, 0.054]}>
            <circleGeometry args={[0.33, 64]} />
            <meshStandardMaterial color={i ? "#a9bcb1" : "#caa67c"} />
          </mesh>
          <mesh position={[-0.17, -0.19, 0.055]} rotation={[0, 0, 0.24]}>
            <planeGeometry args={[0.25, 0.57]} />
            <meshStandardMaterial color="#8c9b86" />
          </mesh>
        </group>
      ))}
      <SoftBox
        position={[0.25, 0.019, 1.1]}
        size={[5.5, 0.035, 3.25]}
        radius={0.017}
        color="#c5b4a0"
      />
      <Desk />
      <Chair />
      <Laptop opening={opening} />
      <Character seconds={seconds} opening={opening} />
      <Plant position={[4.75, 0, -3.2]} scale={1.35} />
    </group>
  );
};
