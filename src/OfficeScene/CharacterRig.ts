import { Vector3 } from "three";

export const ARM_LENGTHS = { upper: 0.43, forearm: 0.38 };
export const TORSO_PIVOT = 0.96;
export const DESK_POSITION: [number, number, number] = [2.25, 0, -0.75];
export const CHAIR_POSITION: [number, number, number] = [2.25, 0, 0.965];
export const LAPTOP_SCALE = 0.6;
export const LAPTOP_POSITION: [number, number, number] = [
  2.25,
  1.26 * 0.82 + 0.0325 * LAPTOP_SCALE,
  -0.26,
];
const xAxis = new Vector3(1, 0, 0);
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const solveArm = (shoulder: Vector3, target: Vector3, pole: Vector3) => {
  const { upper, forearm } = ARM_LENGTHS;
  const offset = target.clone().sub(shoulder);
  const distance = Math.max(
    Math.abs(upper - forearm) + 0.01,
    Math.min(offset.length(), upper + forearm - 0.015),
  );
  const direction =
    offset.lengthSq() > 1e-10 ? offset.normalize() : new Vector3(0, -1, 0);
  let bend = pole.clone().addScaledVector(direction, -pole.dot(direction));
  if (bend.lengthSq() < 1e-8) {
    const fallback =
      Math.abs(direction.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
    bend = fallback.addScaledVector(direction, -fallback.dot(direction));
  }
  bend.normalize();
  const along = (upper ** 2 - forearm ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper ** 2 - along ** 2));
  return {
    shoulder,
    elbow: shoulder
      .clone()
      .addScaledVector(direction, along)
      .addScaledVector(bend, height),
    wrist: shoulder.clone().addScaledVector(direction, distance),
    target,
  };
};

export const getCharacterPose = (seconds: number, opening: number) => {
  const progress = smooth(seconds / 5.1);
  const walk = 1 - smooth((seconds - 4.5) / 0.65);
  const phase = seconds * 7.2;
  const sitting = smooth((seconds - 5.8) / 1.35);
  const rootY = 0.42 * (Math.cos(sitting * 1.3) - 1);
  const rootZ =
    0.3 +
    0.42 * Math.sin(sitting * 1.3) -
    0.055 * sitting +
    1.2 * (1 - progress) +
    0.35 * walk;
  const action =
    smooth((seconds - 7.2) / 1) * (1 - smooth((seconds - 9.65) / 1.25));
  const lean = -action * 0.65 - Math.sin(sitting * Math.PI) * 0.1;
  const sway = Math.sin(phase) * 0.32 * walk;
  const yaw = mix(-Math.PI / 2, 0, smooth((seconds - 4.1) / 1.05));
  const angle = mix(Math.PI / 2, -0.15, opening);

  // Convert the contact point from world space into the torso's local space.
  // The torso bends at the waist, not at the floor under the character.
  const toTorso = (world: Vector3) =>
    world
      .sub(new Vector3(2.25, rootY + TORSO_PIVOT, rootZ))
      .applyAxisAngle(xAxis, -lean)
      .add(new Vector3(0, TORSO_PIVOT, 0));
  const lid = toTorso(
    new Vector3(
      LAPTOP_POSITION[0] + 0.64 * LAPTOP_SCALE + 0.025,
      LAPTOP_POSITION[1] +
        (0.055 + 0.34 * Math.cos(angle)) * LAPTOP_SCALE +
        0.065 * Math.sin(angle),
      LAPTOP_POSITION[2] +
        (-0.38 + 0.34 * Math.sin(angle)) * LAPTOP_SCALE +
        0.065 * Math.cos(angle),
    ),
  );
  // Lift behind the desk edge BEFORE reaching forward, and retrace that
  // clearance waypoint when releasing the lid. Never sweep through the top.
  const clearance = toTorso(new Vector3(2.85, 1.25, 0.35));

  const arm = (side: number) => {
    const shoulder = new Vector3(side * 0.36, 1.61, 0);
    const walkingHand = new Vector3(side * 0.025, -0.69, -0.03)
      .applyAxisAngle(xAxis, side * sway * 0.65)
      .add(shoulder);
    const lap = new Vector3(side * 0.4, 1.02, -0.12);
    const target = walkingHand.lerp(lap, sitting);
    if (side === 1 && seconds >= 7.2) {
      if (seconds < 7.7) {
        target.lerp(clearance, smooth((seconds - 7.2) / 0.5));
      } else if (seconds < 9.65) {
        target.copy(clearance).lerp(lid, smooth((seconds - 7.7) / 0.5));
      } else if (seconds < 10.2) {
        target.copy(lid).lerp(clearance, smooth((seconds - 9.65) / 0.55));
      } else {
        target.copy(clearance).lerp(lap, smooth((seconds - 10.2) / 0.7));
      }
    }
    // Keep the elbow down and back in WORLD space as the torso leans.
    // A torso-relative upward pole makes the shoulders flare unnaturally.
    const pole = new Vector3(side, -0.25, -1);
    if (side === 1) pole.lerp(new Vector3(side, 0.5, 1.5), action);
    pole.applyAxisAngle(xAxis, -lean);
    return solveArm(shoulder, target, pole);
  };
  return {
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
    leftArm: arm(-1),
    rightArm: arm(1),
  };
};
